import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { assets, dummyAddress } from "../assets/assets";
import toast from "react-hot-toast";

const Cart = () => {
  const {
    products,
    currency,
    cartItems,
    removeFromCart,
    updateCartItem,
    navigate,
    getCartCount,
    getCartAmount,
    axios,
    user,
    setCartItems,
  } = useAppContext();

  const [cartArray, setCartArray] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [showAddress, setShowAddress] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentOptions, setPaymentOptions] = useState("COD");

  const getCart = () => {
    const tempArray = [];
    for (const key in cartItems) {
      const product = products.find((item) => item._id === key);
      if (product) {
        product.quantity = cartItems[key];
        tempArray.push(product);
      }
    }
    setCartArray(tempArray);
  };

  const getUserAddress = async () => {
    try {
      const { data } = await axios.get("/api/address/get");
      if (data.success) {
        setAddresses(data.addresses);
        if (data.addresses.length > 0) {
          setSelectedAddress(data.addresses[0]);
        }
      }else{
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  }

  const placeOrder = async () => {
    // Integrate with backend checkout API later
    try {
      if (!selectedAddress) {
        return toast.error("Please select a delivery address");
      }
      //place order with cod
      if (paymentOptions === "COD") {
        const { data } = await axios.post("/api/order/cod", {
          // userId: user._id,
          items: cartArray.map(item => ({
            product: item._id,
            quantity: item.quantity
          })),
          address: selectedAddress._id,
        })
        if (data.success) {
          toast.success(data.message);
          setCartItems({});
          navigate("/my-orders");
        }else{
          toast.error(data.message); 
        }
      }else{
        //place order with online payment (stripe)
        const { data } = await axios.post("/api/order/stripe", {
          // userId: user._id,
          items: cartArray.map(item => ({
            product: item._id,
            quantity: item.quantity
          })),
          address: selectedAddress._id,
        })
        if (data.success) {
         window.location.replace(data.url); //redirect to stripe checkout page
        }else{
          toast.error(data.message); 
        }
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (products.length > 0 && cartItems) getCart();
  }, [cartItems, products]);

  useEffect(()=>{
    if(user){
      getUserAddress();
    }
  },[user]);

  // Empty Cart View
  if (!products.length || !getCartCount()) {
    return (
      <div className="mt-32 flex flex-col items-center text-gray-600 px-4">
        {/* <img src={assets.empty_cart} alt="empty cart" className="w-40 mb-4" /> */}
        <p className="text-xl font-medium mb-3">Your cart is empty</p>
        <button
          onClick={() => {
            navigate("/products");
            scrollTo(0, 0);
          }}
          className="bg-primary text-white px-6 py-2 rounded-full hover:bg-primary-dull transition cursor-pointer"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen mt-24 px-3 sm:px-6 lg:px-12 flex flex-col lg:flex-row gap-8">
      {/* LEFT — Cart Items */}
      <div className="flex-1 bg-white shadow-sm rounded-lg p-4 sm:p-6">
        <h1 className="text-2xl font-semibold mb-5">
          Shopping Cart{" "}
          <span className="text-sm text-primary font-medium">
            {getCartCount()} Items
          </span>
        </h1>

        <div className="divide-y divide-gray-200">
          {cartArray.map((product) => (
            <div
              key={product._id}
              className="flex flex-col sm:flex-row sm:items-center justify-between py-4"
            >
              {/* Product Section */}
              <div className="flex items-center gap-3 sm:gap-5">
                <div
                  onClick={() => {
                    navigate(
                      `/products/${product.category.toLowerCase()}/${product._id}`
                    );
                    scrollTo(0, 0);
                  }}
                  className="w-20 h-20 border border-gray-200 rounded-lg overflow-hidden cursor-pointer flex items-center justify-center"
                >
                  <img
                    src={product.image[0]}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <p className="font-medium text-gray-800">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.category}</p>

                  {/* Mobile Layout for Controls */}
                  <div className="flex items-center gap-2 mt-1 sm:hidden">
                    <button
                      onClick={() => removeFromCart(product._id)}
                      className="w-8 h-8 border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm font-medium">
                      {cartItems[product._id]}
                    </span>
                    <button
                      onClick={() =>
                        updateCartItem(
                          product._id,
                          cartItems[product._id] + 1
                        )
                      }
                      className="w-8 h-8 border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromCart(product._id)}
                      className="text-xs text-gray-400 hover:text-red-500 ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              {/* Desktop Controls */}
              <div className="hidden sm:flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => removeFromCart(product._id)}
                    className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-medium">
                    {cartItems[product._id]}
                  </span>
                  <button
                    onClick={() =>
                      updateCartItem(product._id, cartItems[product._id] + 1)
                    }
                    className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>

                <p className="font-medium text-gray-800 w-16 text-right">
                  {currency}
                  {product.offerPrice * product.quantity}
                </p>
              </div>

              {/* Mobile Price Below Controls */}
              <p className="text-right text-gray-800 font-medium sm:hidden mt-2">
                {currency}
                {product.offerPrice * product.quantity}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            navigate("/products");
            scrollTo(0, 0);
          }}
          className="group flex items-center gap-2 mt-8 text-primary font-medium hover:underline cursor-pointer "
        >
          <img
            className="w-5 rotate-180 group-hover:-translate-x-1 transition "
            src={assets.arrow_right_icon_colored}
            alt="back"
          />
          Continue Shopping
        </button>
      </div>

      {/* RIGHT — Order Summary */}
      <div className="bg-white shadow-sm rounded-lg p-5 sm:p-6 h-max lg:sticky lg:top-24 border border-gray-100">
        <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

        {/* Address Section */}
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase text-gray-600">
            Delivery Address
          </p>
          <div className="relative mt-2 text-sm text-gray-500">
            <p>
              {selectedAddress
                ? `${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state}, ${selectedAddress.country}`
                : "No address found"}
            </p>
            <button
              onClick={() => setShowAddress(!showAddress)}
              className="text-primary hover:underline text-sm font-medium mt-1 cursor-pointer"
            >
              Change
            </button>
          </div>

          {showAddress && (
            <div className="mt-3 border border-gray-200 rounded-lg bg-white shadow-sm text-sm">
              {addresses.map((address, index) => (
                <p
                  key={index}
                  onClick={() => {
                    setSelectedAddress(address);
                    setShowAddress(false);
                  }}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                >
                  {address.street}, {address.city}, {address.state},{" "}
                  {address.country}
                </p>
              ))}
              <p
                onClick={() => navigate("/add-address")}
                className="p-2 text-primary text-center hover:bg-primary/10 cursor-pointer"
              >
                + Add New Address
              </p>
            </div>
          )}
        </div>

        {/* Payment Section */}
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase text-gray-600">
            Payment Method
          </p>
          <select
            onChange={(e) => setPaymentOptions(e.target.value)}
            value={paymentOptions}
            className="w-full border border-gray-300 bg-white px-3 py-2 mt-2 rounded-md outline-none"
          >
            <option value="COD">Cash On Delivery</option>
            <option value="Online">Online Payment</option>
          </select>
        </div>

        {/* Order Summary */}
        <hr className="border-gray-200 my-4" />
        <div className="text-gray-600 text-sm space-y-2">
          <p className="flex justify-between">
            <span>Price</span>
            <span>
              {currency}
              {getCartAmount()}
            </span>
          </p>
          <p className="flex justify-between">
            <span>Shipping Fee</span>
            <span className="text-green-600 font-medium">Free</span>
          </p>
          <p className="flex justify-between">
            <span>Tax (2%)</span>
            <span>
              {currency}
              {(getCartAmount() * 2) / 100}
            </span>
          </p>
          <p className="flex justify-between text-base font-semibold mt-3">
            <span>Total:</span>
            <span>
              {currency}
              {(getCartAmount() * 1.02).toFixed(2)}
            </span>
          </p>
        </div>

        <button
          onClick={placeOrder}
          className="w-full mt-6 py-3 bg-primary text-white rounded-md font-medium hover:bg-primary-dull transition cursor-pointer"
        >
          {paymentOptions === "COD" ? "Place Order" : "Proceed to Pay"}
        </button>
      </div>
    </div>
  );
};

export default Cart;
