import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertTriangle, FiArchive, FiBox, FiCheckCircle, FiPackage, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';

const adjustmentReasons = ['New Stock', 'Damaged Product', 'Manual Correction'];

const displayQuantity = (quantity) => Number.isInteger(quantity)
    ? `${quantity.toLocaleString('en-IN')} units`
    : 'Not tracked';

const Inventory = () => {
    const {axios, currency, fetchProducts} = useAppContext();
    const [products, setProducts] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const refreshingRef = useRef(false);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [stockFilter, setStockFilter] = useState('All');
    const [productFilter, setProductFilter] = useState('All');
    const [editingProduct, setEditingProduct] = useState(null);

    const loadInventory = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const {data} = await axios.get('/api/product/admin/list');
            if (!data.success) throw new Error(data.message || 'Unable to load inventory');
            setProducts(data.products || []);
            setSummary(data.inventorySummary || null);
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Unable to load inventory');
            return false;
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [axios]);

    useEffect(() => { loadInventory(); }, [loadInventory]);

    const categories = useMemo(() => [...new Set(products.map((product) => product.category).filter(Boolean))].sort(), [products]);

    const visibleProducts = useMemo(() => {
        const query = search.trim().toLowerCase();
        return products.filter((product) => {
            const productId = String(product.productId || '').toLowerCase();
            const variantId = String(product.variantId || '').toLowerCase();
            const matchesQuery = !query || product.name?.toLowerCase().includes(query) || product.sku?.toLowerCase().includes(query) || product.variant?.toLowerCase().includes(query) || productId.includes(query) || variantId.includes(query);
            const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
            const status = product.stockStatus || 'Not tracked';
            const matchesStock = stockFilter === 'All' || status === stockFilter;
            const matchesProduct = productFilter === 'All' || (product.status || 'Active') === productFilter;
            return matchesQuery && matchesCategory && matchesStock && matchesProduct;
        });
    }, [products, search, categoryFilter, stockFilter, productFilter]);

    const refreshInventory = useCallback(async ({notify = true} = {}) => {
        if (refreshingRef.current) return;
        refreshingRef.current = true;
        setRefreshing(true);
        const minimumFeedbackTime = new Promise((resolve) => window.setTimeout(resolve, 1000));
        try {
            const [inventoryLoaded] = await Promise.all([
                loadInventory(false),
                fetchProducts(),
                minimumFeedbackTime,
            ]);
            if (inventoryLoaded && notify) toast.success('Inventory refreshed');
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Unable to refresh inventory');
        } finally {
            refreshingRef.current = false;
            setRefreshing(false);
        }
    }, [fetchProducts, loadInventory]);

    const cards = [
        {label:'Total products', value:summary?.totalProducts ?? products.length, note:'Active and archived listings', icon:FiPackage, tone:'orange'},
        {label:'Total stock units', value:Number(summary?.totalStockUnits || 0).toLocaleString('en-IN'), note:'Recorded product quantities', icon:FiBox, tone:'cream'},
        {label:'Low stock', value:summary?.lowStockProducts ?? 0, note:'Active products with fewer than 2 units', icon:FiAlertTriangle, tone:'orange'},
        {label:'Out of stock', value:summary?.outOfStockProducts ?? 0, note:'Active products with none available', icon:FiArchive, tone:'cream'},
    ];

    return (
        <div className="space-y-7">
            <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Store operations</p>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Inventory</h1>
                    <p className="mt-1 text-sm text-slate-500">Track available stock and adjust quantities as your catalog changes.</p>
                </div>
                <button type="button" onClick={() => refreshInventory()} disabled={refreshing} aria-busy={refreshing} className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#e8dfd4] bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary disabled:cursor-wait disabled:opacity-70">
                    <FiRefreshCw className={refreshing ? 'animate-spin' : ''} aria-hidden="true" /> {refreshing ? 'Refreshing…' : 'Refresh inventory'}
                </button>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Inventory summary">
                {cards.map(({label, value, note, icon:Icon, tone}) => (
                    <article key={label} className="rounded-2xl border border-[#eee5da] bg-white p-5 shadow-[0_4px_18px_rgba(73,48,20,0.035)]">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-slate-500">{label}</p>
                                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{loading ? '—' : value}</p>
                            </div>
                            <span className={`grid h-11 w-11 place-items-center rounded-xl ${tone === 'orange' ? 'bg-[#fff2e3] text-primary' : 'bg-[#f8f3eb] text-[#9b6b33]'}`}>
                                <Icon className="text-xl" aria-hidden="true" />
                            </span>
                        </div>
                        <p className="mt-3 text-xs text-slate-400">{note}</p>
                    </article>
                ))}
            </section>

            {Boolean(summary?.untrackedProducts) && (
                <div className="flex items-start gap-3 rounded-xl border border-[#f0dfc9] bg-[#fff9f1] px-4 py-3 text-sm text-[#795321]">
                    <FiAlertTriangle className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                    <p><span className="font-semibold">{summary.untrackedProducts} product{summary.untrackedProducts === 1 ? '' : 's'} need an initial stock count.</span> Existing listings without a recorded quantity are left untracked; update their stock here to start inventory tracking.</p>
                </div>
            )}

            <section className="overflow-hidden rounded-2xl border border-[#eee5da] bg-white shadow-[0_4px_18px_rgba(73,48,20,0.035)]">
                <div className="flex flex-col gap-3 border-b border-[#f1ece5] p-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="font-semibold text-slate-800">Product inventory</h2>
                        <p className="mt-1 text-xs text-slate-400">The existing product quantity powers both stock columns and is shared with checkout.</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:flex">
                        <label className="relative block sm:col-span-2 lg:col-span-1">
                            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, SKU or ID" aria-label="Search inventory" className="w-full rounded-xl border border-[#e8dfd4] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary lg:w-56" />
                        </label>
                        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by category" className="rounded-xl border border-[#e8dfd4] bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-primary">
                            <option value="All">All categories</option>
                            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                        </select>
                        <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} aria-label="Filter by stock status" className="rounded-xl border border-[#e8dfd4] bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-primary">
                            <option value="All">All stock statuses</option>
                            <option value="In Stock">In Stock</option>
                            <option value="Low Stock">Low Stock</option>
                            <option value="Out of Stock">Out of Stock</option>
                            <option value="Not tracked">Not tracked</option>
                        </select>
                        <select value={productFilter} onChange={(event) => setProductFilter(event.target.value)} aria-label="Filter by product status" className="rounded-xl border border-[#e8dfd4] bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-primary">
                            <option value="All">Active and archived</option>
                            <option value="Active">Active only</option>
                            <option value="Archived">Archived only</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] table-fixed text-left text-xs lg:min-w-0 lg:text-sm">
                        <thead className="bg-[#fcfaf7] text-xs uppercase tracking-wide text-slate-400">
                            <tr>
                                <th className="w-[22%] px-3 py-3 font-semibold xl:px-4">Product</th>
                                <th className="w-[9%] px-2 py-3 font-semibold">SKU</th>
                                <th className="w-[12%] px-2 py-3 font-semibold">Category</th>
                                <th className="w-[10%] px-2 py-3 font-semibold">Price</th>
                                <th className="w-[9%] px-2 py-3 font-semibold">Total stock</th>
                                <th className="w-[10%] px-2 py-3 font-semibold">Available stock</th>
                                <th className="w-[14%] px-2 py-3 font-semibold">Stock status</th>
                                <th className="w-[14%] px-3 py-3 text-right font-semibold xl:px-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f1ece5]">
                            {loading && <tr><td colSpan="8" className="px-5 py-12 text-center text-slate-400">Loading inventory…</td></tr>}
                            {!loading && visibleProducts.map((product) => {
                                const status = product.stockStatus || 'Not tracked';
                                const statusClass = status === 'In Stock' ? 'bg-emerald-50 text-emerald-700' : status === 'Low Stock' ? 'bg-amber-50 text-amber-700' : status === 'Out of Stock' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500';
                                return (
                                    <tr key={product._id} className="transition hover:bg-[#fdfcfb]">
                                        <td className="overflow-hidden px-3 py-3 xl:px-4">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#f1ece5] bg-[#faf8f5]">
                                                    {product.image?.[0] && <img src={product.image[0]} alt={product.name} className="h-full w-full object-cover" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold text-slate-800">{product.name}</p>
                                                    <p className="mt-1 truncate font-mono text-[10px] text-slate-400">ID: {product.productId || 'Pending assignment'}</p>
                                                    {product.variant && <p className="mt-0.5 truncate text-xs text-slate-500">Variant: {product.variant}</p>}
                                                    {product.variant && <p className="mt-0.5 font-mono text-[10px] text-slate-400">Variant ID: {product.variantId || 'Pending assignment'}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="break-all px-2 py-3.5 font-mono text-[10px] text-slate-600 lg:text-xs">{product.sku || 'Pending assignment'}</td>
                                        <td className="break-words px-2 py-3.5 text-slate-500">{product.category || '—'}</td>
                                        <td className="whitespace-nowrap px-2 py-3.5"><span className="font-medium text-slate-800">{currency || '₹'}{Number(product.offerPrice ?? product.price ?? 0).toLocaleString('en-IN')}</span></td>
                                        <td className="whitespace-nowrap px-2 py-3.5 text-slate-700">{displayQuantity(product.totalStock)}</td>
                                        <td className="whitespace-nowrap px-2 py-3.5 font-medium text-slate-700">{displayQuantity(product.availableStock)}</td>
                                        <td className="px-2 py-3.5"><div className="flex min-w-0 flex-col items-start gap-1">
                                            <span className={`inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold lg:text-xs ${statusClass}`}>
                                            {status === 'In Stock' ? <FiCheckCircle aria-hidden="true" /> : status === 'Not tracked' ? null : <FiAlertTriangle aria-hidden="true" />}{status}
                                            </span>
                                            <span className={`text-[10px] ${product.status === 'Archived' ? 'text-slate-400' : 'text-emerald-600'}`}>{product.status || 'Active'}</span>
                                        </div></td>
                                        <td className="px-2 py-3.5 text-right xl:px-3"><button type="button" onClick={() => setEditingProduct(product)} className="whitespace-nowrap rounded-lg border border-[#eadfd1] px-2 py-2 text-[10px] font-semibold text-slate-600 transition hover:border-primary hover:text-primary sm:px-2.5 lg:text-xs">Update stock</button></td>
                                    </tr>
                                );
                            })}
                            {!loading && !visibleProducts.length && <tr><td colSpan="8" className="px-5 py-14 text-center"><p className="font-medium text-slate-700">No products match these filters</p><p className="mt-1 text-sm text-slate-400">Change your search or filters to see inventory.</p></td></tr>}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-between border-t border-[#f1ece5] bg-[#fdfcfb] px-5 py-3 text-xs text-slate-400">
                    <span>{visibleProducts.length} product{visibleProducts.length === 1 ? '' : 's'} shown</span>
                    <span>{summary?.untrackedProducts || 0} untracked</span>
                </div>
            </section>

            {editingProduct && <StockAdjustmentModal product={editingProduct} axios={axios} onClose={() => setEditingProduct(null)} onSaved={() => refreshInventory({notify:false})} />}
        </div>
    );
};

const StockAdjustmentModal = ({product, axios, onClose, onSaved}) => {
    const [newQuantity, setNewQuantity] = useState(Number.isInteger(product.stockQuantity) ? String(product.stockQuantity) : '');
    const [reason, setReason] = useState('New Stock');
    const [saving, setSaving] = useState(false);
    const currentQuantity = Number.isInteger(product.stockQuantity) ? product.stockQuantity : null;

    const saveStock = async (event) => {
        event.preventDefault();
        const parsedQuantity = Number(newQuantity);
        if (!Number.isSafeInteger(parsedQuantity) || parsedQuantity < 0) return toast.error('Enter a whole stock quantity of zero or more');
        setSaving(true);
        try {
            const {data} = await axios.patch(`/api/product/${product._id}/stock`, {
                newStockQuantity:parsedQuantity,
                expectedStockQuantity:currentQuantity,
                reason,
            });
            if (!data.success) return toast.error(data.message || 'Unable to update stock');
            toast.success(data.message || 'Stock updated successfully');
            await onSaved();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Unable to update stock');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6" onMouseDown={(event) => {if (event.target === event.currentTarget) onClose();}}>
            <form role="dialog" aria-modal="true" aria-labelledby="stock-modal-title" onSubmit={saveStock} className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-[#f1ece5] px-5 py-4 sm:px-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Inventory adjustment</p>
                        <h2 id="stock-modal-title" className="mt-1 text-xl font-semibold text-slate-900">Update stock</h2>
                    </div>
                    <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-[#faf8f5] hover:text-slate-700"><FiX /></button>
                </div>
                <div className="space-y-5 px-5 py-5 sm:px-6">
                    <div>
                        <p className="font-semibold text-slate-800">{product.name}</p>
                        <p className="mt-1 text-xs text-slate-400">SKU: {product.sku || 'Pending assignment'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-[#faf8f5] p-3">
                            <p className="text-xs text-slate-400">Current stock</p>
                            <p className="mt-1 font-semibold text-slate-800">{displayQuantity(product.availableStock)}</p>
                        </div>
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-500">New quantity</span>
                            <input autoFocus type="number" min="0" step="1" inputMode="numeric" required value={newQuantity} onChange={(event) => setNewQuantity(event.target.value)} className="w-full rounded-xl border border-[#e8dfd4] px-3 py-2.5 text-sm outline-none focus:border-primary" aria-label="New stock quantity" />
                        </label>
                    </div>
                    {currentQuantity === null && <p className="-mt-2 text-xs leading-5 text-amber-700">This product has no recorded quantity. Enter its verified stock count to begin tracking.</p>}
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">Adjustment reason</span>
                        <select value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded-xl border border-[#e8dfd4] bg-white px-3 py-2.5 text-sm outline-none focus:border-primary" aria-label="Stock adjustment reason">
                            {adjustmentReasons.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </label>
                    <p className="text-xs text-slate-400">Stock cannot be negative. The quantity is shared with checkout, product listings, and dashboard alerts.</p>
                </div>
                <div className="flex flex-col-reverse gap-3 border-t border-[#f1ece5] bg-[#fdfcfb] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                    <button type="button" onClick={onClose} className="rounded-xl border border-[#e8dfd4] px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-white">Cancel</button>
                    <button type="submit" disabled={saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dull disabled:cursor-wait disabled:opacity-60">{saving ? 'Saving…' : 'Save stock'}</button>
                </div>
            </form>
        </div>
    );
};

export default Inventory;
