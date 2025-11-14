import React from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Login from './components/Login'
import { Toaster } from 'react-hot-toast'
import { useAppContext } from './context/AppContext'
import { FaWhatsapp } from 'react-icons/fa'

// Pages
import Home from './pages/Home'
import AllProducts from './pages/AllProducts'
import ProductCategory from './pages/ProductCategory'
import ProductDetails from './pages/ProductDetails'
import Cart from './pages/Cart'
import AddAddress from './pages/AddAddress'
import MyOrders from './pages/MyOrders'
import SellerLogin from './components/seller/sellerLogin'
import SellerLayout from './pages/seller/SellerLayout'
import AddProducts from './pages/seller/AddProducts'
import ProductList from './pages/seller/ProductList'
import Orders from './pages/seller/Orders'
import Loading from './components/Loading'
import ReturnRefundPolicy from './pages/ReturnRefundPolicy'

const App = () => {
  const location = useLocation();
  const isSellerPath = location.pathname.includes('/seller');
  const { showUserLogin, isSeller } = useAppContext();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Navbar */}
      {!isSellerPath && <Navbar />}

      {/* Login Modal */}
      {showUserLogin && <Login />}

      {/* Toast Notifications */}
      <Toaster position="top-center" />

      {/* Main content */}
      <main className={`flex-grow ${isSellerPath ? '' : 'px-6 md:px-16 lg:px-24 xl:px-32 py-8'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<AllProducts />} />
          <Route path="/products/:category" element={<ProductCategory />} />
          <Route path="/products/:category/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/add-address" element={<AddAddress />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/loader" element={<Loading />} />
          <Route path="/return-refund-policy" element={<ReturnRefundPolicy />} />
          <Route path='/seller' element={isSeller ? <SellerLayout /> : <SellerLogin />} >
            <Route index element={isSeller ? <AddProducts /> : null } />
            <Route path='product-list' element={<ProductList />} />
            <Route path='orders' element={<Orders />} />
          </Route>
        </Routes>
      </main>

      {/* WhatsApp Floating Button (Only on user side) */}
      {!isSellerPath && (
        <a
          href="https://wa.me/919810978807" // 🔁 Replace with your WhatsApp number (e.g., 91 + mobile)
          className="whatsapp_float"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaWhatsapp className="whatsapp-icon" />
        </a>
      )}

      {/* Footer */}
      {!isSellerPath && <Footer />}
    </div>
  )
}

export default App
