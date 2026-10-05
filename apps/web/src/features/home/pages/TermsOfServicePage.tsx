import React from 'react';
import { Navbar } from '../../../components/layout/Navbar';
import { Footer } from '../../../components/layout/Footer';

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800">
      <Navbar />

      <main className="flex-grow max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">
          Last updated: October 5, 2026
        </p>

        <div className="space-y-6 bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing or using our platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not access or use the services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. User Accounts & Content Guidelines</h2>
            <p className="text-gray-600 leading-relaxed">
              You are responsible for maintaining the security of your account and for all activities that occur under your credentials. Content uploaded must not violate copyright law, contain malware, or contain prohibited content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Intellectual Property Rights</h2>
            <p className="text-gray-600 leading-relaxed">
              You retain ownership of all intellectual property rights in the video content you upload. By uploading content, you grant us a worldwide, non-exclusive license solely for hosting, processing, and streaming your content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Termination</h2>
            <p className="text-gray-600 leading-relaxed">
              We reserve the right to suspend or terminate your account or access to the platform at any time if you breach these terms or engage in activity that harms the service or other users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              The service is provided "as is" without warranties of any kind. In no event shall we be liable for any indirect, incidental, or consequential damages resulting from your use of the platform.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};