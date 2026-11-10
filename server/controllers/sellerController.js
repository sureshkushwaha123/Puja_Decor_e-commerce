import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { getSellerTokenClaims } from "../middlewares/authSeller.js";
import { getStaffAccounts } from "../services/otpSecurity.js";

const sellerCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict',
    path: '/api',
};

const confirmedOrderFilter = {$or:[{paymentType:"COD"}, {isPaid:true}]};

const indiaOffsetMs = 330 * 60 * 1000;
const toIndiaWallDate = (date) => new Date(new Date(date).getTime() + indiaOffsetMs);
const startOfIndiaDay = (date) => {
    const indiaDate = toIndiaWallDate(date);
    return new Date(Date.UTC(indiaDate.getUTCFullYear(), indiaDate.getUTCMonth(), indiaDate.getUTCDate()) - indiaOffsetMs);
};

export const getSellerDashboard = async (req, res) => {
    try {
        const now = new Date();
        const indiaNow = toIndiaWallDate(now);
        const today = startOfIndiaDay(now);
        const weekStart = new Date(today);
        weekStart.setUTCDate(weekStart.getUTCDate() - 6);
        const monthStart = new Date(Date.UTC(indiaNow.getUTCFullYear(), indiaNow.getUTCMonth(), 1) - indiaOffsetMs);
        const sixMonthsAgo = new Date(Date.UTC(indiaNow.getUTCFullYear(), indiaNow.getUTCMonth() - 5, 1) - indiaOffsetMs);
        const pendingStatuses = ["dispatched", "Dispatched", "shipped", "Shipped", "delivered", "Delivered", "complete", "Complete", "completed", "Completed", "cancelled", "Cancelled", "canceled", "Canceled", "refunded", "Refunded"];
        const lowStockFilter = {
            status:{$ne:"Archived"},
            $or:[
                {stockQuantity:{$type:"number", $lt:2}},
                {stockQuantity:{$exists:false}, inStock:false},
            ],
        };

        const [
            revenueRows,
            weeklyOrders,
            monthlyOrders,
            totalProducts,
            pendingOrders,
            lowStockProducts,
            lowStockCount,
            customers,
            chartOrders,
            recentOrders,
        ] = await Promise.all([
            Order.aggregate([{$match:confirmedOrderFilter}, {$group:{_id:null, total:{$sum:"$amount"}}}]),
            Order.countDocuments({...confirmedOrderFilter, createdAt:{$gte:weekStart}}),
            Order.countDocuments({...confirmedOrderFilter, createdAt:{$gte:monthStart}}),
            Product.countDocuments({}),
            Order.countDocuments({...confirmedOrderFilter, status:{$nin:pendingStatuses}}),
            Product.find(lowStockFilter).select("name sku stockQuantity image category inStock").sort({stockQuantity:1}).limit(8).lean(),
            Product.countDocuments(lowStockFilter),
            User.countDocuments({email:{$nin:getStaffAccounts().map(({email}) => email)}}),
            Order.find({...confirmedOrderFilter, createdAt:{$gte:sixMonthsAgo}}).select("amount createdAt").lean(),
            Order.find(confirmedOrderFilter)
                .populate("userId", "name email")
                .populate("items.product", "name")
                .populate("address")
                .sort({createdAt:-1})
                .limit(6)
                .lean(),
        ]);

        const weekly = Array.from({length:7}, (_, index) => {
            const date = toIndiaWallDate(new Date(weekStart.getTime() + index * 86400000));
            return {date:date.toISOString().slice(0, 10), label:date.toLocaleDateString("en-IN", {weekday:"short", timeZone:"UTC"}), revenue:0, orders:0};
        });
        const monthly = Array.from({length:6}, (_, index) => {
            const date = new Date(Date.UTC(indiaNow.getUTCFullYear(), indiaNow.getUTCMonth() - 5 + index, 1));
            return {month:`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`, label:date.toLocaleDateString("en-IN", {month:"short", timeZone:"UTC"}), revenue:0, orders:0};
        });

        for (const order of chartOrders) {
            const indiaDate = toIndiaWallDate(order.createdAt);
            const dayBucket = weekly[ Math.floor((startOfIndiaDay(order.createdAt) - weekStart) / 86400000) ];
            if (dayBucket) {
                dayBucket.revenue += Number(order.amount || 0);
                dayBucket.orders += 1;
            }
            const monthKey = `${indiaDate.getUTCFullYear()}-${String(indiaDate.getUTCMonth() + 1).padStart(2, "0")}`;
            const monthBucket = monthly.find((entry) => entry.month === monthKey);
            if (monthBucket) {
                monthBucket.revenue += Number(order.amount || 0);
                monthBucket.orders += 1;
            }
        }

        const totalRevenue = Number(revenueRows[0]?.total || 0);
        return res.json({
            success:true,
            metrics:{totalRevenue, weeklyOrders, monthlyOrders, totalProducts, pendingOrders, lowStockCount, customers},
            lowStockProducts:lowStockProducts.map((product) => ({...product, stockQuantity:product.stockQuantity ?? 0})),
            recentOrders,
            analytics:{weekly, monthly},
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({success:false, message:error.message});
    }
};

//seller isAuth : /api/seller/is-auth

export const isSellerAuth = async (req, res) => {
    return res.json({success:Boolean(getSellerTokenClaims(req.cookies?.sellerToken))});
}


// seller logout: /api/seller/logout

export const sellerLogout = async (req, res) => {
    try {
        res.clearCookie('sellerToken', sellerCookieOptions);
        return res.json({success:true, message:"logged out successfully"});
    } catch (error) {
        console.error(error.message);
        return res.json({success:false, message: error.message});
    }
}
