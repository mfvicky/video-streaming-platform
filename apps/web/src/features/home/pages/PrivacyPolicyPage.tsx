import React from 'react';
import { Navbar } from '../../../components/layout/Navbar';
import { Footer } from '../../../components/layout/Footer';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800">
      <Navbar />

      <main className="flex-grow max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">
          Last updated: October 5, 2026
        </p>

        <div className="space-y-6 bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
            <p className="text-gray-600 leading-relaxed">
              We collect information you provide directly to us when creating an account, uploading video content, or communicating with us. This includes account credentials, profile details, and video metadata.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed">
              We use your information to operate, maintain, and improve our video streaming services, process transactions, provide customer support, and personalize your experience.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Video Content and Storage</h2>
            <p className="text-gray-600 leading-relaxed">
              Uploaded media is stored securely and processed into standard streaming formats (e.g., HLS). Metadata and video files remain under your account controls and can be removed upon request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We implement industry-standard administrative, technical, and physical security measures designed to protect your personal information against unauthorized access, loss, or misuse.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions or concerns about this Privacy Policy, please reach out to our privacy support team at <a href="mailto:privacy@videostream.com" className="text-blue-600 underline">privacy@videostream.com</a>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};