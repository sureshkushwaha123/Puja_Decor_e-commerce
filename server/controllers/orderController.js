
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Razorpay from "razorpay";
import crypto from "node:crypto";

//importing stripe from its package which we already installed during backend setup
import Stripe from "stripe";

const prepareOrderItems = async (items) => {
    if (!Array.isArray(items) || items.length === 0) throw new Error("Invalid order data");
    const quantities = new Map();
    for (const item of items) {
        if (!item?.product || !Number.isInteger(item.quantity) || item.quantity < 1) {
            throw new Error("Invalid item quantity");
        }
        const id = String(item.product);
        quantities.set(id, (quantities.get(id) || 0) + item.quantity);
    }

    const products = await Product.find({_id:{$in:[...quantities.keys()]}});
    const productById = new Map(products.map((product) => [product._id.toString(), product]));
    const normalizedItems = [];
    for (const [id, quantity] of quantities) {
        const product = productById.get(id);
        if (!product || product.status === "Archived") throw new Error("One or more products are unavailable");
        if (Number.isInteger(product.stockQuantity) && product.stockQuantity < quantity) {
            throw new Error(`${product.name} does not have enough stock`);
        }
        if (!Number.isInteger(product.stockQuantity) && !product.inStock) {
            throw new Error(`${product.name} is out of stock`);
        }
        normalizedItems.push({
            product:product._id,
            quantity,
            unitPrice:product.offerPrice,
            productName:product.name,
            productImage:product.image?.[0] || "",
        });
    }
    return normalizedItems;
};

// Reserve tracked inventory atomically per product. Legacy listings continue
// to use their existing inStock flag because they have no recorded quantity.
const reserveInventory = async (items) => {
    const reserved = [];
    try {
        for (const item of items) {
            const product = await Product.findById(item.product).select("name status stockQuantity inStock");
            if (!product || product.status === "Archived") throw new Error("One or more products are unavailable");
            if (!Number.isInteger(product.stockQuantity)) {
                if (!product.inStock) throw new Error(`${product.name} is out of stock`);
                continue;
            }
            const updated = await Product.findOneAndUpdate(
                {_id:item.product, status:{$ne:"Archived"}, stockQuantity:{$gte:item.quantity}},
                {$inc:{stockQuantity:-item.quantity}},
                {new:true}
            );
            if (!updated) throw new Error(`${product.name} does not have enough stock`);
            reserved.push(item);
            if (updated.stockQuantity === 0) {
                await Product.updateOne({_id:item.product, stockQuantity:0}, {$set:{inStock:false}});
            }
        }
        return reserved;
    } catch (error) {
        await restoreInventory(reserved);
        throw error;
    }
};

const restoreInventory = async (items) => {
    for (const item of items) {
        await Product.updateOne({_id:item.product}, {$inc:{stockQuantity:item.quantity}, $set:{inStock:true}});
    }
};

const getOrderAmounts = (items) => {
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const taxAmount = Math.floor(subtotal * 0.02);
    return {subtotal, taxAmount, amount:subtotal + taxAmount};
};

const getRazorpay = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error("Razorpay credentials are not configured");
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

// Create a pending application order and its Razorpay order.
export const createRazorpayOrder = async (req, res) => {
    try {
        const { items, address } = req.body;
        if (!address) {
            return res.status(400).json({ success: false, message: "Invalid order data" });
        }
        const normalizedItems = await prepareOrderItems(items);
        const {subtotal, taxAmount, amount} = getOrderAmounts(normalizedItems);
        const amountInPaise = Math.round(amount * 100);
        if (amountInPaise < 100) {
            return res.status(400).json({ success: false, message: "Order amount must be at least 100 paise" });
        }

        const order = await Order.create({
            userId: req.userId, items:normalizedItems, address, subtotal, taxAmount, amount,
            paymentType: "Online", status: "Payment Pending",
        });
        const razorpayOrder = await getRazorpay().orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt: order._id.toString(),
        });
        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        return res.json({
            success: true,
            order_id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
        });
    } catch (error) {
        const status = error.statusCode === 401 || error.statusCode === 403 ? 401 : 400;
        return res.status(status).json({ success: false, message: error.message || "Unable to create payment order" });
    }
};

export const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: signature } = req.body;
        if (!paymentId || !orderId || !signature) {
            return res.status(400).json({ success: false, message: "Missing payment verification fields" });
        }
        const order = await Order.findOne({ razorpayOrderId: orderId, userId: req.userId });
        if (!order) return res.status(400).json({ success: false, message: "Payment order not found" });

        const expected = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${orderId}|${paymentId}`)
            .digest("hex");
        const expectedBuffer = Buffer.from(expected, "hex");
        const signatureBuffer = Buffer.from(signature, "hex");
        if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
            return res.status(400).json({ success: false, message: "Payment signature verification failed" });
        }

        if (order.isPaid) return res.json({success:true, message:"Payment already verified"});
        const verifyingOrder = await Order.findOneAndUpdate(
            {_id:order._id, isPaid:false, status:"Payment Pending"},
            {$set:{status:"Payment Verifying"}},
            {new:true}
        );
        if (!verifyingOrder) return res.status(409).json({success:false, message:"This payment is already being verified"});

        let reservedItems = [];
        try {
            reservedItems = await reserveInventory(order.items);
            const result = await Order.updateOne({_id:order._id, status:"Payment Verifying"}, {$set:{isPaid:true, status:"Placed"}});
            if (result.matchedCount !== 1) throw new Error("Unable to confirm this payment");
        } catch (inventoryError) {
            await restoreInventory(reservedItems);
            await Order.updateOne({_id:order._id, status:"Payment Verifying"}, {$set:{status:"Payment Pending"}});
            return res.status(409).json({success:false, message:inventoryError.message});
        }
        return res.json({ success: true, message: "Payment verified" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || "Unable to verify payment" });
    }
};

// place order cod: /api/order/cod
export const placeOrderCOD = async (req, res) => {
    try {
        const userId = req.userId;
        const { items, address } = req.body;
        if (!address) return res.status(400).json({success:false, message:"Invalid order data"});

        const normalizedItems = await prepareOrderItems(items);
        const amounts = getOrderAmounts(normalizedItems);
        const reservedItems = await reserveInventory(normalizedItems);
        try {
            await Order.create({userId, items:normalizedItems, address, ...amounts, paymentType:"COD", status:"Placed"});
        } catch (error) {
            await restoreInventory(reservedItems);
            throw error;
        }
        return res.json({success:true, message:"Order placed successfully"});
    } catch (error) {
        return res.status(400).json({success:false, message:error.message});
    }
}
// place order stripe(online): /api/order/stripe (the payment used is stripe )
export const placeOrderStripe = async (req, res) => {
    try {
        const userId = req.userId; // âœ…
        const { items, address } = req.body;

        //from where the request is coming
        const {origin} = req.headers;

        if (!address || items.length === 0) {
            return res.json({success: false, message: "Invalid order data"});
        } 

        let productData=[];
        //cal amount using item
        let amount = await items.reduce(async (acc, item) => {
            const product = await Product.findById(item.product);
            //add product data to productData array
            productData.push({
                name: product.name,
                price: product.offerPrice,
                quantity: item.quantity,
            })
            return (await acc) + product.offerPrice * item.quantity;
        },0);

        //add tax charge (2%)
        amount += Math.floor(amount * 0.02);

        const order= await Order.create({
            userId, 
            items, 
            address, 
            amount, 
            paymentType:"Online", 
            status:"Placed"}
        );

        //initialize stripe
        const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

        //create line items for stripe checkout
        const line_items = productData.map((item)=>{
            return {
                price_data: {
                    currency: 'inr',
                    product_data: {
                        name: item.name,
                    },
                    unit_amount: Math.floor(item.price + item.price*0.02) * 100 //amount in paise
                }, 
                quantity: item.quantity,
            }
        })

        //create stripe checkout session
        const session = await stripeInstance.checkout.sessions.create({
            line_items,
            mode: 'payment',
            success_url: `${origin}/loader?next=my-orders}`,
            cancel_url: `${origin}/cart`,
            metadata: {
                orderId: order._id.toString(),
                userId,
            }
        })
        return res.json({success:true, url: session.url});
    } catch (error) {
        return res.json({success:false, message: error.message});
        
    }
}

// get orders by userID: /api/order/user

export const getUserOrders = async (req, res) => {
    // console.log("Fetched orders request body:", req.userId);

    try {
        const userId = req.userId;
        const orders = await Order.find({ 
            userId,
            $or:[{paymentType:"COD"}, {isPaid:true}]
        }).populate('items.product address').sort({createdAt:-1});


        return res.json({ success: true, orders });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
} 

// get all orders (for seller/Admin): /api/order/seller


export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({ 
            $or:[{paymentType:"COD"}, {isPaid:true}]
        }).populate('items.product address').populate('userId', 'name email').sort({createdAt:-1});

        return res.json({ success: true, orders });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
} 
