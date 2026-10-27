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

await connectDB();
await connectCloudinary();

// Allow deployed frontend origins and local Vite ports during development.
const allowedOrigins = ['https://pujadecor.vercel.app'];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
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
        return callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true,
};

// Middleware configuration
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

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
