import React from "react";

const CancellationPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-16 px-6">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-2xl p-10 border border-green-100">
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-primary mb-3 tracking-tight">
            Cancellation Policy
          </h1>
          <p className="text-gray-600 text-lg">
            Simple and transparent — here’s how order cancellations work.
          </p>
          <div className="w-24 h-1 bg-green-500 mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Section 1 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-primary-dull mb-3">
            1. Order Cancellation
          </h2>
          <p className="text-gray-700 leading-relaxed">
            You can cancel your order within <strong>12 hours</strong> of placing it.
            To request cancellation, please contact our support team with your order details.
          </p>
        </section>

        {/* Section 2 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-primary-dull mb-3">
            2. After Dispatch
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Once your order has been shipped, cancellation is no longer possible.
            However, you may refer to our Return & Refund Policy for further assistance.
          </p>
        </section>

        {/* Section 3 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-primary-dull mb-3">
            3. Refund for Cancelled Orders
          </h2>
          <p className="text-gray-700 leading-relaxed">
            If your cancellation request is approved within the allowed time,
            the refund will be processed to your original payment method within{" "}
            <strong>5–7 business days</strong>.
          </p>
        </section>

        {/* Section 4 */}
        <section>
          <h2 className="text-2xl font-semibold text-primary-dull mb-3">
            4. Contact Us
          </h2>
          <p className="text-gray-700 leading-relaxed">
            For cancellation requests or queries, reach out to us at{" "}
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

export default CancellationPolicy;