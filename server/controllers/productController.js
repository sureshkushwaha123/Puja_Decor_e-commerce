import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import {createUniqueShortIdentifier, isIdentifierDuplicate} from "../services/productIdentifiers.js";

const parseProductData = (raw) => {
    const data = JSON.parse(raw || "{}");
    const name = String(data.name || "").trim();
    const category = String(data.category || "").trim();
    const variant = String(data.variant || "").trim();
    const price = Number(data.price);
    const offerPrice = Number(data.offerPrice);
    const description = Array.isArray(data.description)
        ? data.description.map((line) => String(line).trim()).filter(Boolean)
        : String(data.description || "").split("\n").map((line) => line.trim()).filter(Boolean);

    if (!name || !category || !Number.isFinite(price) || price <= 0 || !Number.isFinite(offerPrice) || offerPrice < 0 || offerPrice > price) {
        throw new Error("Enter a product name, category, valid price, and offer price no higher than the price");
    }
    if (variant.length > 120) throw new Error("Product variant must be 120 characters or fewer");
    if (data.stockQuantity !== undefined && (!Number.isInteger(Number(data.stockQuantity)) || Number(data.stockQuantity) < 0)) {
        throw new Error("Stock quantity must be a whole number of zero or more");
    }

    return {
        name,
        category,
        variant,
        description,
        price,
        offerPrice,
        stockQuantity: data.stockQuantity === undefined ? undefined : Number(data.stockQuantity),
        status: ["Active", "Archived"].includes(data.status) ? data.status : "Active",
        isFeatured: Boolean(data.isFeatured),
    };
};

const uploadImages = async (files = []) => Promise.all(files.map(async (file) => {
    const result = await cloudinary.uploader.upload(file.path, { resource_type: "image" });
    return result.secure_url;
}));

// A legacy inStock=false value means zero available units. Positive quantities
// cannot be inferred from the old boolean and remain explicitly untracked.
const backfillLegacyOutOfStock = async () => {
    await Product.updateMany({stockQuantity:null, inStock:false}, {$set:{stockQuantity:0}});
};

const getAvailableStock = (product) => Number.isInteger(product.stockQuantity)
    ? product.stockQuantity
    : product.inStock === false ? 0 : null;

const getStockStatus = (quantity) => quantity === null
    ? "Not tracked"
    : quantity === 0 ? "Out of Stock"
        : quantity < 2 ? "Low Stock" : "In Stock";

// Add product: /api/product/add
export const addProduct = async (req, res) => {
    try {
        if ((req.files || []).length < 1 || req.files.length > 4) {
            return res.status(400).json({success:false, message:"Add between 1 and 4 product images"});
        }
        const productData = parseProductData(req.body.productData);
        if (productData.stockQuantity === undefined) {
            return res.status(400).json({success:false, message:"Enter the stock quantity"});
        }
        const imageUrls = await uploadImages(req.files);
        const productToCreate = {...productData, image:imageUrls, inStock:productData.stockQuantity > 0};
        let created = false;
        for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
            try {
                await Product.create(productToCreate);
                created = true;
            } catch (error) {
                if (!isIdentifierDuplicate(error) || attempt === 2) throw error;
            }
        }
        return res.json({success:true, message:"Product added successfully"});
    } catch (error) {
        console.error(error.message);
        const status = error.name === "ValidationError" || error instanceof SyntaxError || error.code === 11000 ? 400 : 500;
        return res.status(status).json({success:false, message:error.code === 11000 ? "Could not reserve a unique product identifier. Please try again." : error.message});
    }
};

// Public storefront catalog. Legacy products without a status remain active.
export const productList = async (req, res) => {
    try {
        const products = await Product.find({status:{$ne:"Archived"}}).sort({createdAt:-1});
        return res.json({success:true, products});
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({success:false, message:error.message});
    }
};

// All products for the authenticated seller panel, including archived listings.
export const sellerProductList = async (req, res) => {
    try {
        await backfillLegacyOutOfStock();
        const products = await Product.find({}).sort({createdAt:-1});
        const stockRows = products.map((product) => {
            const productData = product.toObject();
            const availableStock = getAvailableStock(productData);
            return {
                ...productData,
                totalStock:Number.isInteger(productData.stockQuantity) ? productData.stockQuantity : null,
                availableStock,
                stockTracked:availableStock !== null,
                stockStatus:getStockStatus(availableStock),
            };
        });
        const activeStockRows = stockRows.filter((product) => product.status !== "Archived");
        const inventorySummary = {
            totalProducts:stockRows.length,
            totalStockUnits:stockRows.reduce((total, product) => total + (product.totalStock ?? 0), 0),
            lowStockProducts:activeStockRows.filter((product) => product.availableStock !== null && product.availableStock < 2).length,
            outOfStockProducts:activeStockRows.filter((product) => product.availableStock === 0).length,
            untrackedProducts:stockRows.filter((product) => !product.stockTracked).length,
        };
        return res.json({success:true, products:stockRows, inventorySummary});
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({success:false, message:error.message});
    }
};

// Get one active product: /api/product/:id
export const productById = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id;
        if (!mongoose.isValidObjectId(id)) return res.status(404).json({success:false, message:"Product not found"});
        const product = await Product.findOne({_id:id, status:{$ne:"Archived"}});
        if (!product) return res.status(404).json({success:false, message:"Product not found"});
        return res.json({success:true, product});
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({success:false, message:error.message});
    }
};

// Edit an existing product and retain any selected Cloudinary images.
export const updateProduct = async (req, res) => {
    try {
        if ((req.files || []).length > 4) return res.status(400).json({success:false, message:"A product can have at most 4 images"});
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({success:false, message:"Product not found"});
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({success:false, message:"Product not found"});

        const productData = parseProductData(req.body.productData);
        const parsed = JSON.parse(req.body.productData || "{}");
        let existingImages = product.image || [];
        if (parsed.keepImages !== undefined) {
            if (!Array.isArray(parsed.keepImages)) return res.status(400).json({success:false, message:"Invalid product images"});
            existingImages = parsed.keepImages.filter((image) => product.image.includes(image));
        }
        const imageUrls = [...existingImages, ...await uploadImages(req.files)];
        if (imageUrls.length < 1 || imageUrls.length > 4) {
            return res.status(400).json({success:false, message:"Keep between 1 and 4 product images"});
        }

        const updateFields = {
            name:productData.name,
            description:productData.description,
            category:productData.category,
            variant:productData.variant,
            price:productData.price,
            offerPrice:productData.offerPrice,
            image:imageUrls,
            status:productData.status,
            isFeatured:productData.isFeatured,
        };
        const updateFilter = {_id:product._id};
        const update = {$set:updateFields};
        if (productData.variant) {
            updateFields.variantId = product.variantId || await createUniqueShortIdentifier(Product, 'variantId');
        } else {
            update.$unset = {variantId:''};
        }
        if (productData.stockQuantity !== undefined) {
            const currentQuantity = getAvailableStock(product.toObject());
            const expectedQuantity = Object.hasOwn(parsed, "expectedStockQuantity")
                ? parsed.expectedStockQuantity
                : currentQuantity;
            if (expectedQuantity !== currentQuantity) {
                return res.status(409).json({success:false, message:"Stock changed while you were editing. Refresh and try again."});
            }
            if (Number.isInteger(product.stockQuantity)) {
                updateFilter.stockQuantity = product.stockQuantity;
            } else {
                updateFilter.stockQuantity = null;
                updateFilter.$or = [
                    {inStock:product.inStock},
                    {inStock:{$exists:false}},
                ];
            }
            updateFields.stockQuantity = productData.stockQuantity;
            updateFields.inStock = productData.stockQuantity > 0;
            if (currentQuantity !== productData.stockQuantity) {
                update.$push = {stockAdjustments:{$each:[{
                    ...(currentQuantity === null ? {} : {previousQuantity:currentQuantity}),
                    newQuantity:productData.stockQuantity,
                    reason:"Manual Correction",
                    adjustedAt:new Date(),
                }], $slice:-50}};
            }
        }
        let updatedProduct;
        for (let attempt = 0; attempt < 3 && !updatedProduct; attempt += 1) {
            try {
                updatedProduct = await Product.findOneAndUpdate(updateFilter, update, {new:true, runValidators:true});
            } catch (error) {
                const variantIdConflict = error.code === 11000 && (error.keyPattern?.variantId || error.keyValue?.variantId);
                if (!variantIdConflict || attempt === 2 || !productData.variant) throw error;
                updateFields.variantId = await createUniqueShortIdentifier(Product, 'variantId');
            }
        }
        if (!updatedProduct) return res.status(409).json({success:false, message:"Stock changed while you were editing. Refresh and try again."});
        return res.json({success:true, message:"Product updated successfully"});
    } catch (error) {
        console.error(error.message);
        const status = error.name === "ValidationError" || error instanceof SyntaxError || error.code === 11000 ? 400 : 500;
        return res.status(status).json({success:false, message:error.message});
    }
};

export const updateProductStatus = async (req, res) => {
    try {
        const {status} = req.body;
        if (!mongoose.isValidObjectId(req.params.id) || !["Active", "Archived"].includes(status)) {
            return res.status(400).json({success:false, message:"Choose Active or Archived status"});
        }
        const product = await Product.findByIdAndUpdate(req.params.id, {status}, {new:true, runValidators:true});
        if (!product) return res.status(404).json({success:false, message:"Product not found"});
        return res.json({success:true, message:`Product ${status.toLowerCase()} successfully`});
    } catch (error) {
        return res.status(500).json({success:false, message:error.message});
    }
};

export const updateProductFeatured = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id) || typeof req.body.isFeatured !== "boolean") {
            return res.status(400).json({success:false, message:"Invalid featured product setting"});
        }
        const product = await Product.findByIdAndUpdate(req.params.id, {isFeatured:req.body.isFeatured}, {new:true});
        if (!product) return res.status(404).json({success:false, message:"Product not found"});
        return res.json({success:true, message:product.isFeatured ? "Product featured on storefront" : "Product removed from featured section"});
    } catch (error) {
        return res.status(500).json({success:false, message:error.message});
    }
};

export const deleteProduct = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({success:false, message:"Product not found"});
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({success:false, message:"Product not found"});
        return res.json({success:true, message:"Product deleted successfully"});
    } catch (error) {
        return res.status(500).json({success:false, message:error.message});
    }
};

// Keep the previous stock toggle endpoint compatible for existing callers.
export const changeStock = async (req, res) => {
    try {
        const {id, inStock} = req.body;
        if (!mongoose.isValidObjectId(id) || typeof inStock !== "boolean") {
            return res.status(400).json({success:false, message:"Invalid stock setting"});
        }
        const product = await Product.findById(id);
        if (!product) return res.status(404).json({success:false, message:"Product not found"});
        if (Number.isInteger(product.stockQuantity) && inStock && product.stockQuantity < 1) {
            return res.status(400).json({success:false, message:"Enter a stock quantity before marking this product in stock"});
        }
        const filter = {_id:id};
        if (Number.isInteger(product.stockQuantity)) {
            filter.stockQuantity = product.stockQuantity;
        } else {
            filter.stockQuantity = null;
            filter.$or = [{inStock:product.inStock}, {inStock:{$exists:false}}];
        }
        const update = {$set:{inStock}};
        if (Number.isInteger(product.stockQuantity) && !inStock) {
            update.$set.stockQuantity = 0;
            if (product.stockQuantity > 0) {
                update.$push = {stockAdjustments:{$each:[{
                    previousQuantity:product.stockQuantity,
                    newQuantity:0,
                    reason:"Manual Correction",
                    adjustedAt:new Date(),
                }], $slice:-50}};
            }
        }
        const updated = await Product.findOneAndUpdate(filter, update, {new:true, runValidators:true});
        if (!updated) return res.status(409).json({success:false, message:"Stock changed. Refresh and try again."});
        return res.json({success:true, message:"Stock updated successfully"});
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({success:false, message:error.message});
    }
};

export const adjustProductStock = async (req, res) => {
    try {
        const {newStockQuantity, expectedStockQuantity, reason} = req.body;
        const validReasons = ["New Stock", "Damaged Product", "Manual Correction"];
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({success:false, message:"Product not found"});
        }
        if (!Number.isSafeInteger(newStockQuantity) || newStockQuantity < 0) {
            return res.status(400).json({success:false, message:"Stock must be a whole number of zero or more"});
        }
        if (!validReasons.includes(reason)) {
            return res.status(400).json({success:false, message:"Choose a stock adjustment reason"});
        }
        if (expectedStockQuantity !== null && !Number.isSafeInteger(expectedStockQuantity)) {
            return res.status(400).json({success:false, message:"Refresh the inventory before updating stock"});
        }

        const currentProduct = await Product.findById(req.params.id).select("stockQuantity inStock").lean();
        if (!currentProduct) return res.status(404).json({success:false, message:"Product not found"});
        const currentQuantity = getAvailableStock(currentProduct);
        if (expectedStockQuantity !== currentQuantity) {
            return res.status(409).json({success:false, message:"Stock changed since this page loaded. Refresh and try again."});
        }

        const filter = {_id:req.params.id};
        if (Number.isInteger(currentProduct.stockQuantity)) {
            filter.stockQuantity = currentProduct.stockQuantity;
        } else {
            filter.stockQuantity = null;
            filter.$or = [
                {inStock:currentProduct.inStock},
                {inStock:{$exists:false}},
            ];
        }
        const adjustment = {
            newQuantity:newStockQuantity,
            reason,
            ...(currentQuantity === null ? {} : {previousQuantity:currentQuantity}),
            adjustedAt:new Date(),
        };
        const updatedProduct = await Product.findOneAndUpdate(filter, {
            $set:{stockQuantity:newStockQuantity, inStock:newStockQuantity > 0},
            $push:{stockAdjustments:{$each:[adjustment], $slice:-50}},
        }, {new:true, runValidators:true}).lean();
        if (!updatedProduct) {
            return res.status(409).json({success:false, message:"Stock changed since this page loaded. Refresh and try again."});
        }
        return res.json({success:true, message:"Stock updated successfully", stockQuantity:updatedProduct.stockQuantity});
    } catch (error) {
        console.error(error.message);
        const status = error.name === "ValidationError" ? 400 : 500;
        return res.status(status).json({success:false, message:error.message || "Unable to update stock"});
    }
};
