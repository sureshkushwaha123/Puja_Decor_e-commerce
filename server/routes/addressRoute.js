import express from "express";
import authUser from "../middlewares/authUser.js";
import { addAddress, getAddress, reverseGeocodeAddress } from "../controllers/addressController.js";

const addressRouter = express.Router();

addressRouter.post('/add', authUser, addAddress);

addressRouter.get('/get', authUser, getAddress);
addressRouter.get('/reverse-geocode', authUser, reverseGeocodeAddress);

export default addressRouter;
