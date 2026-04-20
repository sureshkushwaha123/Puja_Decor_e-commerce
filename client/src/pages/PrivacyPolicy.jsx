import React from "react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-16 px-6">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-2xl p-10 border border-green-100">
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-primary mb-3 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-gray-600 text-lg">
            Your privacy matters to us — here’s how we collect, use, and protect your information.
          </p>
          <div className="w-24 h-1 bg-green-500 mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Section 1 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-primary-dull mb-3">
            1. Information We Collect
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            When you use our website, we may collect personal information such as your name,
            email address, phone number, shipping address, and payment details when you place
            an order or contact us.
          </p>
          <ul className="list-disc list-inside text-gray-700 bg-green-50 p-4 rounded-lg border border-green-100">
            <li>Personal details (name, email, phone number)</li>
            <li>Shipping and billing address</li>
            <li>Payment information (processed securely via payment gateways)</li>
            <li>Browsing behavior and cookies</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-primary-dull mb-3">
            2. How We Use Your Information
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            We use the collected information to provide a better shopping experience and to
            improve our services.
          </p>
          <ul className="list-disc list-inside text-gray-700 bg-green-50 p-4 rounded-lg border border-green-100">
            <li>To process and deliver your orders</li>
            <li>To communicate order updates and support</li>
            <li>To improve our website and customer experience</li>
            <li>To send promotional offers (only if you opt in)</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-primary-dull mb-3">
            3. Sharing Your Information
          </h2>
          <p className="text-gray-700 leading-relaxed">
            We do not sell or rent your personal information. However, we may share your data
            with trusted third parties such as payment gateways and delivery partners to fulfill
            your orders efficiently.
          </p>
        </section>

        {/* Section 6 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-primary-dull mb-3">
            4. Your Rights
          </h2>
          <p className="text-gray-700 leading-relaxed">
            You have the right to access, update, or delete your personal information. If you wish
            to make any changes or have concerns regarding your data, feel free to contact us.
          </p>
        </section>

        {/* Section 7 */}
        <section>
          <h2 className="text-2xl font-semibold text-primary-dull mb-3">
            5. Contact Us
          </h2>
          <p className="text-gray-700 leading-relaxed">
            If you have any questions about our Privacy Policy, you can reach us at{" "}
            <a
              href="mailto:pujadecor2025@gmail.com"
              className="text-green-700 font-semibold hover:underline"
            >
              pujadecor2025@gmail.com
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

export default PrivacyPolicy;