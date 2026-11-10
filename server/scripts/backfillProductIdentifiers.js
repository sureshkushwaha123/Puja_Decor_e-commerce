import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import {createUniqueShortIdentifier, isShortIdentifier} from '../services/productIdentifiers.js';

const hasAnotherOwner = async (field, value, id) => Boolean(await Product.exists({
    [field]:value,
    _id:{$ne:id},
}));

const retainOrGenerate = async (product, field) => {
    if (isShortIdentifier(product[field]) && !await hasAnotherOwner(field, product[field], product._id)) {
        return product[field];
    }
    return createUniqueShortIdentifier(Product, field);
};

const backfillProductIdentifiers = async () => {
    const products = await Product.find({}).select('_id productId sku variant variantId').lean();
    let productsUpdated = 0;
    let variantsUpdated = 0;

    for (const product of products) {
        const set = {};
        const unset = {};
        const productId = await retainOrGenerate(product, 'productId');
        const sku = await retainOrGenerate(product, 'sku');
        if (product.productId !== productId) set.productId = productId;
        if (product.sku !== sku) set.sku = sku;

        if (product.variant?.trim()) {
            const variantId = await retainOrGenerate(product, 'variantId');
            if (product.variantId !== variantId) {
                set.variantId = variantId;
                variantsUpdated += 1;
            }
        } else if (product.variantId !== undefined) {
            unset.variantId = '';
        }

        if (Object.keys(set).length || Object.keys(unset).length) {
            await Product.collection.updateOne(
                {_id:product._id},
                {...(Object.keys(set).length ? {$set:set} : {}), ...(Object.keys(unset).length ? {$unset:unset} : {})},
            );
            productsUpdated += 1;
        }
    }

    await Product.collection.createIndex({productId:1}, {unique:true, sparse:true, name:'productId_1'});
    await Product.collection.createIndex({variantId:1}, {unique:true, sparse:true, name:'variantId_1'});
    await Product.collection.createIndex({sku:1}, {unique:true, sparse:true, name:'sku_1'});

    return {productsScanned:products.length, productsUpdated, variantsUpdated};
};

try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured');
    await mongoose.connect(`${process.env.MONGODB_URI}/greencart`, {autoIndex:false});
    console.log(JSON.stringify(await backfillProductIdentifiers()));
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
