

import express from 'express';
import { isSellerAuth, sellerLogout } from '../controllers/sellerController.js';
import { requestStaffOtp, verifyStaffOtp } from '../controllers/UserController.js';
import authSeller from '../middlewares/authSeller.js';

const sellerRouter = express.Router();

sellerRouter.post('/otp/request', requestStaffOtp);
sellerRouter.post('/otp/verify', verifyStaffOtp);
sellerRouter.get('/is-auth', authSeller, isSellerAuth );
sellerRouter.get('/logout',  sellerLogout );

export default sellerRouter;
