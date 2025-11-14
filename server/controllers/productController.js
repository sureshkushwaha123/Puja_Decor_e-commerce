import { v2 as cloudinary } from "cloudinary";
import Product from "../models/product.js";



//add product: /api/product/add
export const addProduct = async (req, res) => {
    try {
        let productData = JSON.parse(req.body.productData);


        const images =  req.files;

        let imageUrls = await Promise.all(
            images.map(async (item) => {
                let result = await cloudinary.uploader.upload(item.path, {resource_type:"image"});
                return result.secure_url;
            })

        )

        await Product.create({...productData, image: imageUrls});


        return res.json({success:true, message:"Product added successfully"});

    } catch (error) {
        console.error(error.message);
        return res.json({success:false, message: error.message});
    }
}


//get product: /api/product/list
export const productList = async (req, res) => {
    try {
        const products = await Product.find({});
        return res.json({ success: true, products });
    } catch (error) {
        console.error(error.message);
        return res.json({ success: false, message: error.message });
    }
}


//get single product: /api/product/:id
export const productById = async (req, res) => {
    try {
        const {id} = req.body;
        const product = await Product.findById(id);
        return res.json({ success: true, product });
    } catch (error) {
        console.error(error.message);
        return res.json({ success: false, message: error.message });
    }
}


//change product insock: /api/product/stock
export const changeStock = async (req, res) => {
    try {
        const { id, inStock } = req.body;
        await Product.findByIdAndUpdate(id, { inStock });
        return res.json({ success: true, message: "Stock updated successfully" });
    } catch (error) {
        console.error(error.message);
        return res.json({ success: false, message: error.message });
    }
}
