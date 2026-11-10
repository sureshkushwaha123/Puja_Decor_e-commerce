

import express from 'express';
import { getSellerDashboard, isSellerAuth, sellerLogout } from '../controllers/sellerController.js';
import { requestStaffOtp, verifyStaffOtp } from '../controllers/UserController.js';
import authSeller from '../middlewares/authSeller.js';

const sellerRouter = express.Router();

sellerRouter.post('/otp/request', requestStaffOtp);
sellerRouter.post('/otp/verify', verifyStaffOtp);
// This endpoint only reports session state. Protected seller APIs still require authSeller.
sellerRouter.get('/is-auth', isSellerAuth );
sellerRouter.get('/dashboard', authSeller, getSellerDashboard);
sellerRouter.get('/logout',  sellerLogout );

export default sellerRouter;
