import React, { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiEye, FiSearch, FiShoppingBag, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';

const fieldClass = 'rounded-xl border border-[#e8dfd4] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-primary';
const orderNumber = (id) => `#${String(id || '').toUpperCase()}`;
const formatMoney = (value, currency) => `${currency || '₹'}${Number(value || 0).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
const formatDate = (value, withTime = false) => value ? new Date(value).toLocaleString('en-IN', withTime ? {dateStyle:'medium', timeStyle:'short'} : {day:'numeric', month:'short', year:'numeric'}) : '—';
const customerName = (order) => order.userId?.name || [order.address?.firstName, order.address?.lastName].filter(Boolean).join(' ') || 'Customer';
const itemPrice = (item) => item.unitPrice ?? item.product?.offerPrice ?? 0;

const OrderDetails = ({order, onClose, currency}) => {
    const address = order.address || {};
    const items = order.items || [];
    const subtotal = order.subtotal ?? items.reduce((sum, item) => sum + itemPrice(item) * item.quantity, 0);
    const addressLines = [
        [address.flatHouseNo, address.street].filter(Boolean).join(', '),
        address.landmark,
        [address.city, address.state, address.zipCode ?? address.zipcode].filter(Boolean).join(', '),
        address.country,
    ].filter(Boolean);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6" onMouseDown={(event) => {if (event.target === event.currentTarget) onClose();}}>
            <div role="dialog" aria-modal="true" aria-labelledby="order-details-title" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-[#f1ece5] px-5 py-4 sm:px-7">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Order details</p>
                        <h2 id="order-details-title" className="mt-1 text-xl font-semibold text-slate-900">{orderNumber(order._id)}</h2>
                        <p className="mt-1 text-sm text-slate-500">Placed {formatDate(order.createdAt, true)}</p>
                    </div>
                    <button type="button" aria-label="Close order details" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-[#faf8f5] hover:text-slate-700"><FiX className="text-xl" /></button>
                </div>
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <section className="rounded-xl border border-[#eee5da] bg-[#fdfcfb] p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p>
                            <p className="mt-2 font-semibold text-slate-800">{customerName(order)}</p>
                            <p className="mt-1 break-all text-sm text-slate-500">{order.userId?.email || address.email || 'Email not available'}</p>
                            <p className="mt-1 text-sm text-slate-500">{address.phone || 'Phone not available'}</p>
                        </section>
                        <section className="rounded-xl border border-[#eee5da] bg-[#fdfcfb] p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Shipping address</p>
                            <p className="mt-2 font-semibold text-slate-800">{[address.firstName, address.lastName].filter(Boolean).join(' ') || customerName(order)}</p>
                            {address.addressType && <p className="mt-0.5 text-sm text-slate-500">{address.addressType} address</p>}
                            {addressLines.map((line) => <p key={line} className="mt-0.5 text-sm text-slate-500">{line}</p>)}
                            {!addressLines.length && <p className="mt-1 text-sm text-slate-500">Address details not available</p>}
                        </section>
                    </div>

                    <section>
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-800">Ordered products</h3>
                            <span className="text-xs text-slate-400">{items.length} item{items.length === 1 ? '' : 's'}</span>
                        </div>
                        <div className="divide-y divide-[#f1ece5] rounded-xl border border-[#eee5da] px-4">
                            {items.map((item, index) => (
                                <div key={item._id || `${item.product?._id}-${index}`} className="flex items-center gap-3 py-3">
                                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#f8f4ee]">
                                        {(item.productImage || item.product?.image?.[0]) && <img src={item.productImage || item.product.image[0]} alt="" className="h-full w-full object-cover" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-slate-800">{item.productName || item.product?.name || 'Product unavailable'}</p>
                                        <p className="mt-0.5 text-xs text-slate-400">{formatMoney(itemPrice(item), currency)} × {item.quantity}</p>
                                    </div>
                                    <p className="shrink-0 text-sm font-semibold text-slate-800">{formatMoney(itemPrice(item) * item.quantity, currency)}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <section className="rounded-xl border border-[#eee5da] p-4">
                            <h3 className="text-sm font-semibold text-slate-800">Payment</h3>
                            <div className="mt-2 space-y-1.5 text-sm text-slate-500">
                                <p>Method: <span className="font-medium text-slate-700">{order.paymentType || 'Not recorded'}</span></p>
                                <p>Payment status: <span className="font-medium text-slate-700">{order.isPaid ? 'Paid' : 'Pending'}</span></p>
                                <p>Order status: <span className="font-medium capitalize text-slate-700">{order.status || 'Placed'}</span></p>
                            </div>
                        </section>
                        <section className="rounded-xl border border-[#eee5da] p-4">
                            <h3 className="text-sm font-semibold text-slate-800">Order total</h3>
                            <div className="mt-2 space-y-1.5 text-sm">
                                <div className="flex justify-between gap-4 text-slate-500"><span>Subtotal</span><span>{formatMoney(subtotal, currency)}</span></div>
                                <div className="flex justify-between gap-4 text-slate-500"><span>Discount</span><span>{order.discount != null ? formatMoney(order.discount, currency) : '—'}</span></div>
                                <div className="flex justify-between gap-4 text-slate-500"><span>Shipping</span><span>{order.shippingCharge != null ? formatMoney(order.shippingCharge, currency) : '—'}</span></div>
                                {order.taxAmount != null && <div className="flex justify-between gap-4 text-slate-500"><span>Tax / charges</span><span>{formatMoney(order.taxAmount, currency)}</span></div>}
                                <div className="mt-2 flex justify-between gap-4 border-t border-[#f1ece5] pt-2 font-semibold text-slate-900"><span>Final amount</span><span>{formatMoney(order.amount, currency)}</span></div>
                            </div>
                        </section>
                    </div>
                </div>
                <div className="flex justify-end border-t border-[#f1ece5] bg-[#fdfcfb] px-5 py-4 sm:px-7">
                    <button type="button" onClick={onClose} className="rounded-xl border border-[#e8dfd4] px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-white">Close</button>
                </div>
            </div>
        </div>
    );
};

const Orders = () => {
    const {currency, axios} = useAppContext();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const {data} = await axios.get('/api/order/seller');
                if (data.success) setOrders(data.orders || []);
                else toast.error(data.message || 'Unable to load orders');
            } catch (error) {
                toast.error(error.response?.data?.message || error.message || 'Unable to load orders');
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [axios]);

    const visibleOrders = useMemo(() => {
        const query = search.trim().toLowerCase();
        return orders.filter((order) => {
            const id = String(order._id || '').toLowerCase();
            const name = customerName(order).toLowerCase();
            const created = order.createdAt ? new Date(order.createdAt) : null;
            const date = created ? `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}` : '';
            return (!query || id.includes(query.replace(/^#/, '')) || name.includes(query)) && (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
        });
    }, [orders, search, dateFrom, dateTo]);

    return (
        <div className="space-y-6">
            <section>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Fulfilment</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Orders</h1>
                <p className="mt-1 text-sm text-slate-500">Review customer purchases and their payment details.</p>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#eee5da] bg-white shadow-[0_4px_18px_rgba(73,48,20,0.035)]">
                <div className="flex flex-col gap-3 border-b border-[#f1ece5] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><FiShoppingBag className="text-primary" aria-hidden="true" /> {visibleOrders.length} order{visibleOrders.length === 1 ? '' : 's'}</div>
                    <div className="grid gap-2 sm:grid-cols-3">
                        <label className="relative sm:col-span-1">
                            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order ID or customer" aria-label="Search order ID or customer" className="w-full rounded-xl border border-[#e8dfd4] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary sm:w-56" />
                        </label>
                        <label className="relative">
                            <FiCalendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <input type="date" aria-label="Orders from date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} className={`${fieldClass} w-full pl-9`} />
                        </label>
                        <label className="relative">
                            <FiCalendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <input type="date" aria-label="Orders to date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} className={`${fieldClass} w-full pl-9`} />
                        </label>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[840px] text-left text-sm">
                        <thead className="bg-[#fcfaf7] text-xs uppercase tracking-wide text-slate-400">
                            <tr><th className="px-5 py-3 font-semibold">Order ID</th><th className="px-4 py-3 font-semibold">Customer</th><th className="px-4 py-3 font-semibold">Order date</th><th className="px-4 py-3 font-semibold">Total</th><th className="px-4 py-3 font-semibold">Payment</th><th className="px-4 py-3 font-semibold">Order status</th><th className="px-5 py-3 text-right font-semibold">Details</th></tr>
                        </thead>
                        <tbody className="divide-y divide-[#f1ece5]">
                            {loading && <tr><td colSpan="7" className="px-5 py-12 text-center text-slate-400">Loading orders…</td></tr>}
                            {!loading && visibleOrders.map((order) => (
                                <tr key={order._id} className="transition hover:bg-[#fdfcfb]">
                                    <td className="px-5 py-4 font-semibold text-slate-800">{orderNumber(order._id)}</td>
                                    <td className="px-4 py-4"><p className="font-medium text-slate-800">{customerName(order)}</p><p className="mt-0.5 max-w-48 truncate text-xs text-slate-400">{order.userId?.email || order.address?.phone || 'Contact unavailable'}</p></td>
                                    <td className="whitespace-nowrap px-4 py-4 text-slate-500">{formatDate(order.createdAt)}</td>
                                    <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-800">{formatMoney(order.amount, currency)}</td>
                                    <td className="px-4 py-4"><p className="font-medium text-slate-700">{order.isPaid ? 'Paid' : 'Pending'}</p><p className="mt-0.5 text-xs text-slate-400">{order.paymentType || 'Method unavailable'}</p></td>
                                    <td className="px-4 py-4"><span className="rounded-full bg-[#f7f3ed] px-2.5 py-1 text-xs font-medium capitalize text-slate-600">{order.status || 'Placed'}</span></td>
                                    <td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelectedOrder(order)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-primary transition hover:bg-[#fff4e7]"><FiEye aria-hidden="true" /> View details</button></td>
                                </tr>
                            ))}
                            {!loading && !visibleOrders.length && <tr><td colSpan="7" className="px-5 py-14 text-center"><p className="font-medium text-slate-700">No orders found</p><p className="mt-1 text-sm text-slate-400">Try changing the search or date filters.</p></td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
            {selectedOrder && <OrderDetails order={selectedOrder} currency={currency} onClose={() => setSelectedOrder(null)} />}
        </div>
    );
};

export default Orders;
