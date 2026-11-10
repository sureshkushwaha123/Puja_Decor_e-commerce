import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiPackage, FiPlus, FiSearch, FiStar, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';
import AddProducts from './AddProducts';

const ProductList = () => {
    const {currency, axios, fetchProducts} = useAppContext();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [editingProduct, setEditingProduct] = useState(null);
    const [showForm, setShowForm] = useState(false);

    const loadProducts = useCallback(async () => {
        try {
            const {data} = await axios.get('/api/product/admin/list');
            if (data.success) setProducts(data.products || []);
            else toast.error(data.message || 'Unable to load products');
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Unable to load products');
        } finally {
            setLoading(false);
        }
    }, [axios]);

    useEffect(() => { loadProducts(); }, [loadProducts]);

    const categories = useMemo(() => [...new Set(products.map((product) => product.category).filter(Boolean))].sort(), [products]);

    const visibleProducts = useMemo(() => {
        const query = search.trim().toLowerCase();
        return products.filter((product) => {
            const matchesQuery = !query || product.name?.toLowerCase().includes(query) || product.productId?.toLowerCase().includes(query);
            const matchesStatus = statusFilter === 'All' || (product.status || 'Active') === statusFilter;
            const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
            return matchesQuery && matchesStatus && matchesCategory;
        });
    }, [products, search, statusFilter, categoryFilter]);

    const refreshAfterChange = useCallback(async () => {
        await Promise.all([loadProducts(), fetchProducts()]);
    }, [loadProducts, fetchProducts]);

    const changeStatus = async (product, status) => {
        try {
            const {data} = await axios.patch(`/api/product/${product._id}/status`, {status});
            if (!data.success) return toast.error(data.message || 'Unable to update product status');
            toast.success(data.message);
            await refreshAfterChange();
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    const toggleFeatured = async (product) => {
        try {
            const {data} = await axios.patch(`/api/product/${product._id}/featured`, {isFeatured:!product.isFeatured});
            if (!data.success) return toast.error(data.message || 'Unable to update featured product');
            toast.success(data.message);
            await refreshAfterChange();
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    const deleteProduct = async (product) => {
        if (!window.confirm(`Delete “${product.name}”? This product will be removed from your catalog.`)) return;
        try {
            const {data} = await axios.delete(`/api/product/${product._id}`);
            if (!data.success) return toast.error(data.message || 'Unable to delete product');
            toast.success(data.message);
            await refreshAfterChange();
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    const openAddForm = () => { setEditingProduct(null); setShowForm(true); };
    const openEditForm = (product) => { setEditingProduct(product); setShowForm(true); };

    return (
        <div className="space-y-6">
            <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Catalog</p>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Products</h1>
                    <p className="mt-1 text-sm text-slate-500">Manage your listings, inventory, and featured products.</p>
                </div>
                <button type="button" onClick={openAddForm} className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dull">
                    <FiPlus aria-hidden="true" /> Add product
                </button>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#eee5da] bg-white shadow-[0_4px_18px_rgba(73,48,20,0.035)]">
                <div className="flex flex-col gap-3 border-b border-[#f1ece5] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><FiPackage className="text-primary" aria-hidden="true" /> {products.length} product{products.length === 1 ? '' : 's'}</div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <label className="relative block">
                            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or product ID" aria-label="Search products by name or product ID" className="w-full rounded-xl border border-[#e8dfd4] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary sm:w-60" />
                        </label>
                        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter products by category" className="rounded-xl border border-[#e8dfd4] bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-primary">
                            <option value="All">All categories</option>
                            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                        </select>
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter products by status" className="rounded-xl border border-[#e8dfd4] bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-primary">
                            <option value="All">All statuses</option><option value="Active">Active</option><option value="Archived">Archived</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[930px] text-left text-sm">
                        <thead className="bg-[#fcfaf7] text-xs uppercase tracking-wide text-slate-400">
                            <tr>
                                <th className="px-5 py-3 font-semibold">Product</th>
                                <th className="px-4 py-3 font-semibold">Category</th>
                                <th className="px-4 py-3 font-semibold">Price</th>
                                <th className="px-4 py-3 font-semibold">Stock</th>
                                <th className="px-4 py-3 font-semibold">Store status</th>
                                <th className="px-4 py-3 text-center font-semibold">Featured</th>
                                <th className="px-5 py-3 text-right font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f1ece5]">
                            {loading && <tr><td colSpan="7" className="px-5 py-12 text-center text-slate-400">Loading products…</td></tr>}
                            {!loading && visibleProducts.map((product) => {
                                const isActive = (product.status || 'Active') === 'Active';
                                return (
                                    <tr key={product._id} className="transition hover:bg-[#fdfcfb]">
                                        <td className="px-5 py-3.5">
                                            <div className="flex min-w-64 items-center gap-3">
                                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#f1ece5] bg-[#faf8f5]">
                                                    {product.image?.[0] && <img src={product.image[0]} alt={product.name} className="h-full w-full object-cover" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold text-slate-800">{product.name}</p>
                                                    <p className="mt-0.5 text-xs text-slate-400">ID: {product.productId || 'Pending assignment'}</p>
                                                    {product.variant && <p className="mt-0.5 truncate text-xs text-slate-500">Variant: {product.variant}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-500">{product.category}</td>
                                        <td className="px-4 py-3.5"><p className="font-medium text-slate-800">{currency || '₹'}{Number(product.offerPrice || 0).toLocaleString('en-IN')}</p><p className="text-xs text-slate-400 line-through">{currency || '₹'}{Number(product.price || 0).toLocaleString('en-IN')}</p></td>
                                        <td className="px-4 py-3.5">
                                            {Number.isInteger(product.stockQuantity) ? <span className={`font-medium ${product.stockQuantity < 2 && isActive ? 'text-amber-700' : 'text-slate-700'}`}>{product.stockQuantity} units</span> : <span className="text-xs text-slate-400">Not tracked</span>}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <select value={product.status || 'Active'} onChange={(event) => changeStatus(product, event.target.value)} aria-label={`Set ${product.name} status`} className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold outline-none ${isActive ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>
                                                <option value="Active">Active</option><option value="Archived">Archived</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <button type="button" onClick={() => toggleFeatured(product)} aria-label={`${product.isFeatured ? 'Remove' : 'Feature'} ${product.name}`} aria-pressed={Boolean(product.isFeatured)} className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${product.isFeatured ? 'bg-[#fff2e3] text-primary' : 'text-slate-300 hover:bg-[#faf8f5] hover:text-primary'}`}>
                                                <FiStar className={product.isFeatured ? 'fill-current' : ''} aria-hidden="true" />
                                            </button>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex justify-end gap-1">
                                                <button type="button" onClick={() => openEditForm(product)} aria-label={`Edit ${product.name}`} className="rounded-lg p-2 text-slate-500 transition hover:bg-[#fff2e3] hover:text-primary"><FiEdit2 /></button>
                                                <button type="button" onClick={() => deleteProduct(product)} aria-label={`Delete ${product.name}`} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"><FiTrash2 /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {!loading && !visibleProducts.length && <tr><td colSpan="7" className="px-5 py-14 text-center"><p className="font-medium text-slate-700">No products found</p><p className="mt-1 text-sm text-slate-400">Try a different search or add your first product.</p></td></tr>}
                        </tbody>
                    </table>
                </div>
                <div className="flex flex-col gap-1 border-t border-[#f1ece5] bg-[#fdfcfb] px-5 py-3 text-xs text-slate-400 sm:flex-row sm:justify-between">
                    <span>{visibleProducts.length} shown</span>
                    <span>Featured active products appear on the storefront home page.</span>
                </div>
            </section>

            {showForm && <AddProducts product={editingProduct} onClose={() => setShowForm(false)} onSaved={refreshAfterChange} />}
        </div>
    );
};

export default ProductList;
