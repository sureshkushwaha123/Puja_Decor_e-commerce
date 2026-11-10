import mongoose from 'mongoose';
import {createUniqueShortIdentifier} from '../services/productIdentifiers.js';

const productSchema = new mongoose.Schema({
    // Display identifier; MongoDB _id remains the relationship key.
    productId: {type:String, required:true, unique:true, sparse:true, match:/^[0-9A-HJKMNP-TV-Z]{8}$/},
    name: {type:String, required:true},
    description: {type:Array, required:true},
    price: {type:Number, required:true},
    offerPrice: {type:Number, required:true},
    category: {type:String, required:true},
    variant: {type:String, trim:true, maxlength:120, default:""},
    variantId: {type:String, unique:true, sparse:true, match:/^[0-9A-HJKMNP-TV-Z]{8}$/},
    image: {type:Array, required:true},
    inStock: {type:Boolean, default: true},
    // Canonical stock count; inventory totals/availability are derived from this
    // field rather than stored as competing quantities.
    // Keep legacy unknown counts distinguishable so we do not invent stock.
    stockQuantity: {type:Number, min:0, validate:{validator:Number.isInteger, message:'Stock quantity must be a whole number'}},
    // The single SKU identifies this purchasable product; when `variant` is
    // set, that same SKU identifies the described variant.
    sku: {type:String, required:true, unique:true, sparse:true, match:/^[0-9A-HJKMNP-TV-Z]{8}$/},
    status: {type:String, enum:['Active', 'Archived'], default:'Active'},
    isFeatured: {type:Boolean, default:false},
    stockAdjustments: [{
        previousQuantity: {type:Number, min:0},
        newQuantity: {type:Number, required:true, min:0},
        reason: {type:String, enum:['New Stock', 'Damaged Product', 'Manual Correction'], required:true},
        adjustedAt: {type:Date, default:Date.now},
    }],

}, {timestamps:true})

productSchema.pre('validate', async function () {
    if (!this.productId) this.productId = await createUniqueShortIdentifier(this.constructor, 'productId');
    if (!this.sku) this.sku = await createUniqueShortIdentifier(this.constructor, 'sku');
    if (this.variant?.trim() && !this.variantId) {
        this.variantId = await createUniqueShortIdentifier(this.constructor, 'variantId');
    }
    if (!this.variant?.trim()) this.variantId = undefined;
});

const Product= mongoose.models.product || mongoose.model('product', productSchema);

export default Product;
