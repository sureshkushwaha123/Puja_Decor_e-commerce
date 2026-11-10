import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { FiArchive, FiGrid, FiLogOut, FiMenu, FiPackage, FiShoppingBag, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { assets } from '../../assets/assets';
import { useAppContext } from '../../context/AppContext';

const links = [
    {name:'Dashboard', path:'/seller', icon:FiGrid, end:true},
    {name:'Products', path:'/seller/product-list', icon:FiPackage},
    {name:'Inventory', path:'/seller/inventory', icon:FiArchive},
    {name:'Orders', path:'/seller/orders', icon:FiShoppingBag},
];

const SellerLayout = () => {
    const {axios, navigate, setIsSeller} = useAppContext();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1280);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    useEffect(() => {
        const syncSidebarToViewport = () => setSidebarCollapsed(window.innerWidth < 1280);
        window.addEventListener('resize', syncSidebarToViewport);
        return () => window.removeEventListener('resize', syncSidebarToViewport);
    }, []);

    const logout = async () => {
        try {
            const {data} = await axios.get('/api/seller/logout');
            if (data.success) {
                setIsSeller(false);
                toast.success(data.message);
                navigate('/');
            } else toast.error(data.message);
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    const closeMobileNav = () => setMobileNavOpen(false);

    const renderNavigation = (mobile = false) => (
        <>
            <div className={`mb-3 flex items-center ${sidebarCollapsed && !mobile ? 'justify-center' : 'justify-between'} px-2`}>
                {(!sidebarCollapsed || mobile) && <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</p>}
                {mobile ? (
                    <button type="button" onClick={closeMobileNav} aria-label="Close seller navigation" className="rounded-lg p-2 text-slate-500 hover:bg-[#faf8f5] md:hidden">
                        <FiX aria-hidden="true" />
                    </button>
                ) : (
                    <button type="button" onClick={() => setSidebarCollapsed((collapsed) => !collapsed)} aria-label={sidebarCollapsed ? 'Expand seller navigation' : 'Collapse seller navigation'} aria-expanded={!sidebarCollapsed} className="hidden rounded-lg p-2 text-slate-500 transition hover:bg-[#faf8f5] hover:text-primary md:inline-flex xl:hidden">
                        {sidebarCollapsed ? <FiMenu aria-hidden="true" /> : <FiX aria-hidden="true" />}
                    </button>
                )}
            </div>
            <nav className="flex flex-col gap-2" aria-label="Seller navigation">
                {links.map(({name, path, icon:Icon, end}) => (
                    <NavLink key={name} to={path} end={end} onClick={mobile ? closeMobileNav : undefined} title={sidebarCollapsed && !mobile ? name : undefined} className={({isActive}) => `flex items-center rounded-xl py-2.5 text-sm font-medium transition ${sidebarCollapsed && !mobile ? 'justify-center px-2' : 'gap-3 px-3'} ${isActive ? 'bg-[#fff4e7] text-primary shadow-sm' : 'text-slate-600 hover:bg-[#faf8f5] hover:text-slate-900'}`}>
                        <Icon className="shrink-0 text-lg" aria-hidden="true" />
                        {(!sidebarCollapsed || mobile) && <span>{name}</span>}
                        {sidebarCollapsed && !mobile && <span className="sr-only">{name}</span>}
                    </NavLink>
                ))}
            </nav>
            {(!sidebarCollapsed || mobile) && <div className="mt-8 rounded-2xl bg-[#fbf6ef] p-4">
                <p className="text-sm font-semibold text-slate-800">Puja Decor</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Manage products and keep an eye on your latest sales.</p>
            </div>}
        </>
    );

    return (
        <div className="min-h-screen w-full min-w-0 bg-[#faf8f5] text-slate-800">
            <header className="sticky top-0 z-50 flex h-[72px] items-center justify-between border-b border-[#eee5da] bg-white px-4 sm:px-6 lg:px-9">
                <div className="flex min-w-0 items-center gap-3">
                    <button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open seller navigation" aria-expanded={mobileNavOpen} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#eadfd1] text-slate-600 transition hover:border-primary hover:text-primary md:hidden">
                        <FiMenu aria-hidden="true" />
                    </button>
                    <Link to="/" aria-label="Puja Decor home">
                        <img className="w-32 md:w-36" src={assets.logo} alt="Puja Decor" />
                    </Link>
                </div>
                <div className="flex items-center gap-3 sm:gap-5">
                    <div className="hidden text-right sm:block">
                        <p className="text-sm font-semibold text-slate-800">Hi! Admin</p>
                        <p className="text-xs text-slate-500">Seller workspace</p>
                    </div>
                    <button onClick={logout} className="inline-flex items-center gap-2 rounded-lg border border-[#eadfd1] px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-primary hover:text-primary" type="button">
                        <FiLogOut aria-hidden="true" />
                        <span>Logout</span>
                    </button>
                </div>
            </header>

            {mobileNavOpen && <>
                <button type="button" aria-label="Close seller navigation" onClick={closeMobileNav} className="fixed inset-x-0 bottom-0 top-[72px] z-40 bg-slate-950/35 md:hidden" />
                <aside className="fixed bottom-0 left-0 top-[72px] z-40 w-72 overflow-y-auto border-r border-[#eee5da] bg-white p-4 shadow-xl md:hidden">
                    {renderNavigation(true)}
                </aside>
            </>}

            <div className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-[1600px] min-w-0">
                <aside className={`sticky top-[72px] hidden h-[calc(100vh-72px)] shrink-0 self-start overflow-y-auto border-r border-[#eee5da] bg-white p-3 md:block md:p-3 xl:p-5 ${sidebarCollapsed ? 'md:w-16 xl:w-60' : 'md:w-60'}`}>
                    {renderNavigation(false)}
                </aside>
                <main className="min-w-0 flex-1 p-4 sm:p-5 xl:p-9">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default SellerLayout;
