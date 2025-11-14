
import Order from "../models/Order.js";
import Product from "../models/Product.js";

//importing stripe from its package which we already installed during backend setup
import Stripe from "stripe";

// place order cod: /api/order/cod
export const placeOrderCOD = async (req, res) => {
    try {
        const userId = req.userId; // ✅ From JWT middleware
        const { items, address } = req.body;

        if (!address || items.length === 0) {
            return res.json({success: false, message: "Invalid order data"});
        } 
        //cal amount using item

        let amount = await items.reduce(async (acc, item) => {
            const product = await Product.findById(item.product);
            return (await acc) + product.offerPrice * item.quantity;
        },0);

        //add tax charge (2%)
        amount += Math.floor(amount * 0.02);

        await Order.create({userId, items, address, amount, paymentType:"COD", status:"Placed"});

        return res.json({success:true, message:"Order placed successfully"});
    } catch (error) {
        return res.json({success:false, message: error.message});
        
    }
}

// place order stripe(online): /api/order/stripe (the payment used is stripe )
export const placeOrderStripe = async (req, res) => {
    try {
        const userId = req.userId; // ✅
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
        }).populate('items.product address').sort({createdAt:-1});

        return res.json({ success: true, orders });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
} 
