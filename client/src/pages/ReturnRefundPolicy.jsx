import React from "react";

const ReturnRefundPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-16 px-6">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-2xl p-10 border border-green-100">
        {/* Header Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-green-700 mb-3 tracking-tight">
            Return & Refund Policy
          </h1>
          <p className="text-gray-600 text-lg">
            We care about your satisfaction — here’s everything you need to know about returns and refunds.
          </p>
          <div className="w-24 h-1 bg-green-500 mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Section 1 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-green-700 mb-3">1. Returns</h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            We offer a <strong>7-day return window</strong> from the date you receive your order.
            To be eligible for a return, your item must be unused and in the same condition that you received it,
            with original packaging and proof of purchase.
          </p>
          <p className="text-gray-700 mb-2 font-medium">How to Request a Return or Exchange:</p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 bg-green-50 p-4 rounded-lg border border-green-100">
            <li>
              Contact our support team at{" "}
              <a
                href="mailto:pujashri03@gmail.com"
                className="text-green-700 font-semibold hover:underline"
              >
                pujashri03@gmail.com
              </a>.
            </li>
            <li>Provide your order number and details about the item you wish to return.</li>
            <li>Our team will guide you through the process and arrange pickup if available.</li>
          </ol>
        </section>

        {/* Section 2 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-green-700 mb-3">2. Refunds</h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Once we receive your item, we will inspect it and notify you about your refund status. 
            If approved, your refund will be processed to your original payment method within{" "}
            <strong>5–7 business days</strong>.
          </p>
          <p className="text-gray-700">
            If pickup service isn’t available in your area, you’ll need to ship the item to our return address 
            (details will be provided by our support team).
          </p>
        </section>

        {/* Section 3 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-green-700 mb-3">3. Non-Returnable Items</h2>
          <ul className="list-disc list-inside text-gray-700 bg-green-50 p-4 rounded-lg border border-green-100">
            <li>Gift cards and digital downloads</li>
            <li>Customized or perishable items</li>
            <li>Products damaged after delivery due to customer handling</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section>
          <h2 className="text-2xl font-semibold text-green-700 mb-3">4. Contact Us</h2>
          <p className="text-gray-700 leading-relaxed">
            If you have any questions about our Return & Refund Policy, reach out to us anytime at{" "}
            <a
              href="mailto:pujashri03@gmail.com"
              className="text-green-700 font-semibold hover:underline"
            >
              pujashri03@gmail.com
            </a>
            . We’re always happy to help you.
          </p>
        </section>

        {/* Footer */}
        <div className="text-center mt-12 pt-6 border-t border-green-100">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} <span className="font-semibold text-green-700">PujaDecor</span> — All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReturnRefundPolicy;
