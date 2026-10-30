import express from 'express';
import {
    isAuth,
    logout,
    requestCustomerOtp,
    verifyCustomerOtp,
} from '../controllers/UserController.js';
import authUser from '../middlewares/authUser.js';

const userRouter = express.Router();

userRouter.post('/otp/request', requestCustomerOtp)
userRouter.post('/otp/verify', verifyCustomerOtp)
userRouter.get('/is-auth', authUser, isAuth)
userRouter.get('/logout', authUser, logout)


export default userRouter;
