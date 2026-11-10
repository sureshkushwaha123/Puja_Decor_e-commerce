import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';
import connectDB from './configs/db.js';
import 'dotenv/config';
import userRouter from './routes/UserRoute.js';
import sellerRouter from './routes/sellerRoute.js';
import connectCloudinary from './configs/cloudinary.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import addressRouter from './routes/addressRoute.js';
import orderRouter from './routes/orderRoute.js';

const app = express();
const port = process.env.PORT || 4000;
app.set('trust proxy', 1);

await connectDB();
await connectCloudinary();

// Allow the production custom domain, its canonical www host, the Vercel
// preview hostname, and any explicitly configured frontend origin.
const configuredFrontendOrigins = [
    process.env.FRONTEND_URL,
    ...(process.env.FRONTEND_URLS || '').split(','),
].map((value) => {
    try {
        return value?.trim() ? new URL(value.trim()).origin : null;
    } catch {
        return null;
    }
}).filter(Boolean);
const allowedOrigins = new Set([
    'https://pujadecor.in',
    'https://www.pujadecor.in',
    'https://pujadecor.vercel.app',
    ...configuredFrontendOrigins,
]);
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        if (process.env.NODE_ENV !== 'production') {
            try {
                const { hostname, protocol } = new URL(origin);
                if (protocol === 'http:' && ['localhost', '127.0.0.1'].includes(hostname)) {
                    return callback(null, true);
                }
            } catch {
                // Reject malformed origins below.
            }
        }
        const error = new Error('Origin is not allowed by CORS');
        error.status = 403;
        return callback(error);
    },
    credentials: true,
};

// Middleware configuration
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.use((error, req, res, next) => {
    if (error?.message === 'Origin is not allowed by CORS') {
        return res.status(403).json({success:false, message:'Origin is not allowed'});
    }
    return next(error);
});

app.get('/', (req, res) => res.send("API is running..."));
app.use('/api/user', userRouter);
app.use('/api/seller', sellerRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/address', addressRouter);
app.use('/api/order', orderRouter);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
