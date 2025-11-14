import express from "express";
import authUser from "../middlewares/authUser.js";
import { getAllOrders, getUserOrders, placeOrderCOD, placeOrderStripe } from "../controllers/orderController.js";
import authSeller from "../middlewares/authSeller.js";

const orderRouter = express.Router();

orderRouter.post('/cod', authUser, placeOrderCOD )
//for online payment using stripe
orderRouter.post('/stripe', authUser, placeOrderStripe )
orderRouter.get('/user', authUser, getUserOrders )
orderRouter.get('/seller', authSeller, getAllOrders )

export default orderRouter;