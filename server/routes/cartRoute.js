import express from "express";
import authUser from "../middlewares/authUser.js";
import { updateCart } from "../controllers/cartController.js"; // note: should be a named export

const cartRouter = express.Router(); // ✅ use express.Router()

cartRouter.post('/update', authUser, updateCart);

export default cartRouter;
