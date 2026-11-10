import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowUpRight, FiBox, FiClock, FiDollarSign, FiPackage, FiShoppingBag, FiUsers, FiAlertTriangle, FiBarChart2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';

const amountLabel = (amount, currency) => `${currency || '₹'}${Number(amount || 0).toLocaleString('en-IN', {maximumFractionDigits:0})}`;
const dateLabel = (date) => date ? new Date(date).toLocaleDateString('en-IN', {day:'numeric', month:'short'}) : '—';

const Dashboard = () => {
    const {axios, currency} = useAppContext();
    const [dashboard, setDashboard] = useState(null);
    const [period, setPeriod] = useState('weekly');
    const [loading, setLoading] = useState(true);

    const fetchDashboard = useCallback(async () => {
        try {
            const {data} = await axios.get('/api/seller/dashboard');
            if (data.success) setDashboard(data);
            else toast.error(data.message || 'Unable to load the dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Unable to load the dashboard');
        } finally {
            setLoading(false);
        }
    }, [axios]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    const metrics = dashboard?.metrics;
    const chart = dashboard?.analytics?.[period] || [];
    const maxRevenue = useMemo(() => Math.max(1, ...chart.map((point) => point.revenue || 0)), [chart]);

    const cards = [
        {label:'Total revenue', value:amountLabel(metrics?.totalRevenue, currency), note:'From confirmed orders', icon:FiDollarSign, tone:'orange'},
        {label:'Orders this week', value:metrics?.weeklyOrders ?? 0, note:'Last 7 days', icon:FiShoppingBag, tone:'cream'},
        {label:'Orders this month', value:metrics?.monthlyOrders ?? 0, note:'Since the 1st of this month', icon:FiBarChart2, tone:'orange'},
        {label:'Products listed', value:metrics?.totalProducts ?? 0, note:'Active and archived', icon:FiPackage, tone:'cream'},
        {label:'Pending orders', value:metrics?.pendingOrders ?? 0, note:'Awaiting dispatch', icon:FiClock, tone:'orange'},
        {label:'Registered customers', value:metrics?.customers ?? 0, note:'Customer accounts', icon:FiUsers, tone:'cream'},
    ];

    return (
        <div className="space-y-7">
            <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Seller overview</p>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-500">A clear view of your store, orders, and sales.</p>
                </div>
                <Link to="/seller/product-list" className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dull">
                    <FiBox aria-hidden="true" /> Manage products <FiArrowUpRight aria-hidden="true" />
                </Link>
            </section>

            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map((card) => <div key={card.label} className="h-32 animate-pulse rounded-2xl border border-[#eee5da] bg-white" />)}</div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {cards.map(({label, value, note, icon:Icon, tone}) => (
                        <article key={label} className="rounded-2xl border border-[#eee5da] bg-white p-5 shadow-[0_4px_18px_rgba(73,48,20,0.035)]">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">{label}</p>
                                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
                                </div>
                                <span className={`grid h-11 w-11 place-items-center rounded-xl ${tone === 'orange' ? 'bg-[#fff2e3] text-primary' : 'bg-[#f8f3eb] text-[#9b6b33]'}`}>
                                    <Icon className="text-xl" aria-hidden="true" />
                                </span>
                            </div>
                            <p className="mt-3 text-xs text-slate-400">{note}</p>
                        </article>
                    ))}
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
                <section className="rounded-2xl border border-[#eee5da] bg-white p-5 shadow-[0_4px_18px_rgba(73,48,20,0.035)] sm:p-6">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">Sales analytics</h2>
                            <p className="mt-1 text-sm text-slate-500">Revenue and orders from your confirmed sales</p>
                        </div>
                        <div className="flex w-fit rounded-xl bg-[#f7f3ed] p-1" role="group" aria-label="Sales analytics period">
                            {[['weekly', 'Weekly'], ['monthly', 'Monthly']].map(([value, label]) => (
                                <button key={value} type="button" onClick={() => setPeriod(value)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${period === value ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
                            ))}
                        </div>
                    </div>
                    <div className="mt-7 flex items-end gap-2 sm:gap-4" style={{height:240}}>
                        {chart.map((point) => {
                            const height = point.revenue > 0 ? Math.max(8, (point.revenue / maxRevenue) * 180) : 3;
                            return (
                                <div key={point.date || point.month} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                                    <div className="relative flex h-[190px] w-full items-end justify-center">
                                        <div className="absolute bottom-0 h-full w-full max-w-12 rounded-t-lg bg-[#faf7f2]" />
                                        <div className="relative w-full max-w-12 rounded-t-lg bg-primary/80 transition hover:bg-primary" style={{height}} title={`${amountLabel(point.revenue, currency)} · ${point.orders} orders`} />
                                        {point.revenue > 0 && <span className="absolute -top-6 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block">{amountLabel(point.revenue, currency)}</span>}
                                    </div>
                                    <span className="truncate text-[11px] text-slate-400">{point.label}</span>
                                </div>
                            );
                        })}
                        {!chart.length && <p className="m-auto text-sm text-slate-400">Sales will appear here when orders come in.</p>}
                    </div>
                </section>

                <section className="rounded-2xl border border-[#eee5da] bg-white p-5 shadow-[0_4px_18px_rgba(73,48,20,0.035)] sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <FiAlertTriangle className="text-primary" aria-hidden="true" />
                                <h2 className="text-base font-semibold text-slate-900">Low stock</h2>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">Active products with fewer than 2 left</p>
                        </div>
                        <span className="rounded-full bg-[#fff2e3] px-2.5 py-1 text-xs font-semibold text-primary">{metrics?.lowStockCount ?? 0}</span>
                    </div>
                    <div className="mt-4 divide-y divide-[#f1ece5]">
                        {(dashboard?.lowStockProducts || []).map((product) => (
                            <div key={product._id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#f8f4ee]">
                                    {product.image?.[0] && <img src={product.image[0]} alt="" className="h-full w-full object-cover" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-800">{product.name}</p>
                                    <p className="truncate text-xs text-slate-400">{product.sku}</p>
                                </div>
                                <span className="shrink-0 text-sm font-semibold text-amber-700">{product.stockQuantity} left</span>
                            </div>
                        ))}
                        {!dashboard?.lowStockProducts?.length && <p className="py-7 text-center text-sm text-slate-400">Everything is stocked up.</p>}
                    </div>
                    <Link to="/seller/product-list" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dull">Review inventory <FiArrowUpRight aria-hidden="true" /></Link>
                </section>
            </div>

            <section className="overflow-hidden rounded-2xl border border-[#eee5da] bg-white shadow-[0_4px_18px_rgba(73,48,20,0.035)]">
                <div className="flex items-center justify-between gap-3 border-b border-[#f1ece5] px-5 py-4 sm:px-6">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">Recent orders</h2>
                        <p className="mt-1 text-sm text-slate-500">Your latest customer purchases</p>
                    </div>
                    <Link to="/seller/orders" className="whitespace-nowrap text-sm font-semibold text-primary hover:text-primary-dull">All orders <FiArrowUpRight className="inline" aria-hidden="true" /></Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[650px] text-left text-sm">
                        <thead className="bg-[#fcfaf7] text-xs uppercase tracking-wide text-slate-400">
                            <tr><th className="px-5 py-3 font-semibold sm:px-6">Order</th><th className="px-5 py-3 font-semibold">Customer</th><th className="px-5 py-3 font-semibold">Date</th><th className="px-5 py-3 font-semibold">Amount</th><th className="px-5 py-3 font-semibold">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-[#f1ece5]">
                            {(dashboard?.recentOrders || []).map((order) => (
                                <tr key={order._id} className="text-slate-600">
                                    <td className="px-5 py-4 font-medium text-slate-800 sm:px-6">#{String(order._id).slice(-8).toUpperCase()}</td>
                                    <td className="px-5 py-4">{order.userId?.name || [order.address?.firstName, order.address?.lastName].filter(Boolean).join(' ') || 'Customer'}</td>
                                    <td className="px-5 py-4">{dateLabel(order.createdAt)}</td>
                                    <td className="px-5 py-4 font-medium text-slate-800">{amountLabel(order.amount, currency)}</td>
                                    <td className="px-5 py-4"><span className="rounded-full bg-[#f7f3ed] px-2.5 py-1 text-xs font-medium text-slate-600">{order.status || 'Placed'}</span></td>
                                </tr>
                            ))}
                            {!dashboard?.recentOrders?.length && <tr><td colSpan="5" className="px-6 py-10 text-center text-sm text-slate-400">No confirmed orders yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
