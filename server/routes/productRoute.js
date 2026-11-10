import express from 'express';
import { upload } from '../configs/multer.js';
import authSeller from '../middlewares/authSeller.js';
import { addProduct, adjustProductStock, changeStock, deleteProduct, productById, productList, sellerProductList, updateProduct, updateProductFeatured, updateProductStatus } from '../controllers/productController.js';

const productRouter = express.Router();


productRouter.get('/admin/list', authSeller, sellerProductList);
productRouter.get('/list', productList);
productRouter.post('/add', authSeller, upload.array('images', 4), addProduct);
productRouter.post('/stock', authSeller, changeStock);
productRouter.patch('/:id/stock', authSeller, adjustProductStock);
productRouter.patch('/:id/status', authSeller, updateProductStatus);
productRouter.patch('/:id/featured', authSeller, updateProductFeatured);
productRouter.put('/:id', authSeller, upload.array('images', 4), updateProduct);
productRouter.delete('/:id', authSeller, deleteProduct);
productRouter.get('/:id', productById);

export default productRouter;
