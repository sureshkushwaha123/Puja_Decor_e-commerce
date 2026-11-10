import React, { useEffect, useState } from 'react';
import { FiImage, FiPlus, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { categories } from '../../assets/assets';
import { useAppContext } from '../../context/AppContext';

const inputClass = 'w-full rounded-xl border border-[#e8dfd4] bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10';
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700';

const filePreview = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

const AddProducts = ({product, onClose, onSaved}) => {
    const {axios, currency} = useAppContext();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [variant, setVariant] = useState('');
    const [price, setPrice] = useState('');
    const [offerPrice, setOfferPrice] = useState('');
    const [stockQuantity, setStockQuantity] = useState('');
    const [expectedStockQuantity, setExpectedStockQuantity] = useState(null);
    const [status, setStatus] = useState('Active');
    const [isFeatured, setIsFeatured] = useState(false);
    const [keepImages, setKeepImages] = useState([]);
    const [newImages, setNewImages] = useState([]);
    const [saving, setSaving] = useState(false);
    const editing = Boolean(product);

    useEffect(() => {
        setName(product?.name || '');
        setDescription(Array.isArray(product?.description) ? product.description.join('\n') : (product?.description || ''));
        setCategory(product?.category || '');
        setVariant(product?.variant || '');
        setPrice(product?.price ?? '');
        setOfferPrice(product?.offerPrice ?? '');
        setStockQuantity(product?.stockQuantity ?? '');
        setExpectedStockQuantity(Number.isInteger(product?.stockQuantity) ? product.stockQuantity : null);
        setStatus(product?.status || 'Active');
        setIsFeatured(Boolean(product?.isFeatured));
        setKeepImages(product?.image || []);
        setNewImages([]);
    }, [product]);

    const addFiles = async (event) => {
        const chosen = Array.from(event.target.files || []);
        event.target.value = '';
        if (!chosen.length) return;
        const availableSlots = 4 - keepImages.length - newImages.length;
        if (availableSlots <= 0) return toast.error('A product can have at most 4 images');
        if (chosen.length > availableSlots) toast.error(`You can add ${availableSlots} more image${availableSlots === 1 ? '' : 's'}`);
        try {
            const selected = chosen.slice(0, availableSlots);
            const previews = await Promise.all(selected.map(filePreview));
            setNewImages((current) => [...current, ...selected.map((file, index) => ({file, preview:previews[index]}))]);
        } catch {
            toast.error('Unable to preview the selected image');
        }
    };

    const removeImage = (index) => {
        if (index < keepImages.length) {
            setKeepImages((images) => images.filter((_, imageIndex) => imageIndex !== index));
            return;
        }
        const newImageIndex = index - keepImages.length;
        setNewImages((images) => images.filter((_, imageIndex) => imageIndex !== newImageIndex));
    };

    const onSubmitHandler = async (event) => {
        event.preventDefault();
        const totalImages = keepImages.length + newImages.length;
        if (totalImages < 1 || totalImages > 4) return toast.error('Add between 1 and 4 product images');
        if (Number(offerPrice) > Number(price)) return toast.error('Offer price cannot be higher than the product price');

        const productData = {
            name,
            description:description.split('\n').map((line) => line.trim()).filter(Boolean),
            category,
            variant,
            price:Number(price),
            offerPrice:Number(offerPrice),
            stockQuantity:Number(stockQuantity),
            status,
            isFeatured,
            ...(editing ? {keepImages, expectedStockQuantity} : {}),
        };
        const formData = new FormData();
        formData.append('productData', JSON.stringify(productData));
        newImages.forEach(({file}) => formData.append('images', file));

        setSaving(true);
        try {
            const {data} = editing
                ? await axios.put(`/api/product/${product._id}`, formData)
                : await axios.post('/api/product/add', formData);
            if (!data.success) return toast.error(data.message || 'Unable to save product');
            toast.success(data.message || 'Product saved successfully');
            onSaved?.();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Unable to save product');
        } finally {
            setSaving(false);
        }
    };

    const selectedImages = [
        ...keepImages.map((url) => ({url, existing:true})),
        ...newImages.map(({preview}) => ({url:preview, existing:false})),
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6" onMouseDown={(event) => {if (event.target === event.currentTarget) onClose();}}>
            <div role="dialog" aria-modal="true" aria-labelledby="product-form-title" className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-[#f1ece5] px-5 py-4 sm:px-7">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Product catalog</p>
                        <h2 id="product-form-title" className="mt-1 text-xl font-semibold text-slate-900">{editing ? 'Edit product' : 'Add product'}</h2>
                        <p className="mt-1 text-sm text-slate-500">Add the details customers will see in your store.</p>
                    </div>
                    <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-[#faf8f5] hover:text-slate-700"><FiX className="text-xl" /></button>
                </div>
                <form onSubmit={onSubmitHandler} className="min-h-0 flex-1 overflow-y-auto">
                    <div className="space-y-5 px-5 py-5 sm:px-7">
                        <div>
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <label className={labelClass}>Product images</label>
                                <span className="text-xs text-slate-400">{selectedImages.length} / 4 selected</span>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {selectedImages.map((image, index) => (
                                    <div key={`${image.url}-${index}`} className="relative h-20 w-20 overflow-hidden rounded-xl border border-[#e8dfd4] bg-[#faf8f5] sm:h-24 sm:w-24">
                                        <img src={image.url} alt={`Product image ${index + 1}`} className="h-full w-full object-cover" />
                                        <button type="button" aria-label={`Remove image ${index + 1}`} onClick={() => removeImage(index)} className="absolute right-1 top-1 rounded-full bg-white/95 p-1 text-slate-700 shadow hover:text-red-600"><FiX /></button>
                                    </div>
                                ))}
                                {selectedImages.length < 4 && (
                                    <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#d9c8b2] bg-[#fcfaf7] text-primary transition hover:bg-[#fff5e9] sm:h-24 sm:w-24">
                                        <FiPlus className="text-xl" />
                                        <span className="text-[11px] font-medium">Upload</span>
                                        <input className="sr-only" type="file" accept="image/*" multiple onChange={addFiles} />
                                    </label>
                                )}
                                {!selectedImages.length && <div className="flex h-20 items-center gap-2 text-xs text-slate-400"><FiImage /> Choose at least one image.</div>}
                            </div>
                            <p className="mt-2 text-xs text-slate-400">Use up to 4 images. PNG, JPG, and other image formats are supported.</p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className={labelClass} htmlFor="product-name">Product name</label>
                                <input id="product-name" className={inputClass} type="text" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="e.g. Handcrafted brass diya" required />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelClass} htmlFor="product-description">Description</label>
                                <textarea id="product-description" className={`${inputClass} resize-y`} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} placeholder="Share the details that make this product special" />
                                <p className="mt-1 text-xs text-slate-400">Use a new line for each product detail.</p>
                            </div>
                            <div>
                                <label className={labelClass} htmlFor="product-category">Category</label>
                                <select id="product-category" className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)} required>
                                    <option value="">Select category</option>
                                    {categories.map((item) => <option key={item.path} value={item.path}>{item.text}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass} htmlFor="product-variant">Product variant <span className="font-normal text-slate-400">(optional)</span></label>
                                <input id="product-variant" className={inputClass} type="text" value={variant} onChange={(event) => setVariant(event.target.value)} maxLength={120} placeholder="e.g. brass · 8 inch" />
                            </div>
                            <div>
                                <label className={labelClass} htmlFor="product-stock">Stock quantity</label>
                                <input id="product-stock" className={inputClass} type="number" min="0" step="1" inputMode="numeric" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} placeholder="0" required />
                            </div>
                            <div>
                                <label className={labelClass} htmlFor="product-price">Price ({currency || '₹'})</label>
                                <input id="product-price" className={inputClass} type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0.00" required />
                            </div>
                            <div>
                                <label className={labelClass} htmlFor="product-offer-price">Offer price ({currency || '₹'})</label>
                                <input id="product-offer-price" className={inputClass} type="number" min="0" step="0.01" value={offerPrice} onChange={(event) => setOfferPrice(event.target.value)} placeholder="0.00" required />
                            </div>
                            <div>
                                <label className={labelClass} htmlFor="product-status">Store status</label>
                                <select id="product-status" className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
                                    <option value="Active">Active</option>
                                    <option value="Archived">Archived</option>
                                </select>
                            </div>
                            <label className="flex items-center gap-3 self-end rounded-xl border border-[#e8dfd4] px-3.5 py-3 text-sm text-slate-700">
                                <input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} className="h-4 w-4 accent-[#d97706]" />
                                Show in featured products
                            </label>
                        </div>
                    </div>
                    <div className="flex flex-col-reverse gap-3 border-t border-[#f1ece5] bg-[#fdfcfb] px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                        <button type="button" onClick={onClose} className="rounded-xl border border-[#e8dfd4] px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-white">Cancel</button>
                        <button type="submit" disabled={saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dull disabled:cursor-wait disabled:opacity-60">{saving ? 'Saving…' : editing ? 'Save changes' : 'Add product'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProducts;
