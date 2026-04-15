import React from "react";

const ShippingPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-16 px-6">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-2xl p-10 border border-green-100">
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-primary mb-3 tracking-tight">
            Shipping Policy
          </h1>
          <p className="text-gray-600 text-lg">
            Fast, reliable delivery — here’s everything you need to know about our shipping process.
          </p>
          <div className="w-24 h-1 bg-green-500 mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Section 1 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-primary-dull mb-3">
            1. Order Processing
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Orders are processed within <strong>1–3 business days</strong> after confirmation.
            You will receive a notification once your order is shipped.
          </p>
        </section>

        {/* Section 2 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-primary-dull mb-3">
            2. Delivery Time
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Delivery usually takes <strong>3–7 business days</strong>, depending on your location.
            Remote areas may take slightly longer.
          </p>
        </section>

        {/* Section 3 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-primary-dull mb-3">
            3. Shipping Charges
          </h2>
          <ul className="list-disc list-inside text-gray-700 bg-green-50 p-4 rounded-lg border border-green-100">
            <li>Free shipping on orders above ₹999</li>
            <li>Standard shipping charges may apply to smaller orders</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-primary-dull mb-3">
            4. Order Tracking
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Once your order is shipped, a tracking ID will be shared via email or SMS so you can monitor your delivery.
          </p>
        </section>

        {/* Section 5 */}
        <section>
          <h2 className="text-2xl font-semibold text-primary-dull mb-3">
            5. Contact Us
          </h2>
          <p className="text-gray-700 leading-relaxed">
            For any shipping-related queries, feel free to contact us at{" "}
            <a
              href="mailto:pujashri03@gmail.com"
              className="text-green-700 font-semibold hover:underline"
            >
              pujashri03@gmail.com
            </a>
            .
          </p>
        </section>

        {/* Footer */}
        <div className="text-center mt-12 pt-6 border-t border-green-100">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold text-green-700">PujaDecor</span> — All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShippingPolicy;