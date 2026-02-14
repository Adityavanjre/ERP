import { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Shield, FileText, RefreshCcw, CreditCard, ChevronRight } from 'lucide-react';

const Legal = () => {
  const [activeTab, setActiveTab] = useState('terms');

  const tabs = [
    { id: 'terms', label: 'Terms of Service', icon: FileText },
    { id: 'privacy', label: 'Privacy Policy', icon: Shield },
    { id: 'refund', label: 'Refund & Cancellation', icon: RefreshCcw },
    { id: 'payment', label: 'Payment Policy', icon: CreditCard },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'terms':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">Terms of Service</h2>
            <div className="prose prose-invert max-w-none text-gray-300">
              <p>Last updated: {new Date().toLocaleDateString()}</p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">1. Acceptance of Terms</h3>
              <p>
                By accessing and using the Klypso website and services, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our services.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">2. Services</h3>
              <p>
                Klypso provides digital services including but not limited to Web Development, App Development, Digital Marketing, SEO & Content Strategy, and Professional Photography. We reserve the right to modify, suspend, or discontinue any aspect of our services at any time.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">3. User Accounts</h3>
              <p>
                When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">4. Intellectual Property</h3>
              <p>
                <strong>Client Ownership:</strong> Upon full payment, the client is granted rights to the final deliverables as specified in the project agreement.
                <br />
                <strong>Klypso Ownership:</strong> We retain the right to showcase completed projects in our portfolio unless a Non-Disclosure Agreement (NDA) is signed. Underlying reusable code libraries and tools remain the property of Klypso.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">5. Client Obligations</h3>
              <p>
                You agree to provide all necessary assets, content, and feedback in a timely manner. Delays in providing these materials may result in project timeline extensions.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">6. Limitation of Liability</h3>
              <p>
                In no event shall Klypso, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">7. Governing Law</h3>
              <p>
                These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">8. Contact Us</h3>
              <p>
                If you have any questions about these Terms, please contact us at <a href="mailto:legal@klypso.agency" className="text-indigo-400 hover:text-indigo-300">legal@klypso.agency</a>.
              </p>
            </div>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">Privacy Policy</h2>
            <div className="prose prose-invert max-w-none text-gray-300">
              <p>Your privacy is important to us. This policy explains how we handle your data.</p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">1. Information We Collect</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Personal Information:</strong> Name, email address, phone number, and company details provided via forms.</li>
                <li><strong>Project Data:</strong> Requirements, specifications, and files shared for project execution.</li>
                <li><strong>Usage Data:</strong> Anonymous analytics data (such as IP address, browser type, pages visited) to improve website performance.</li>
                <li><strong>Cookies:</strong> We use cookies to store session information and user preferences.</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">2. How We Use Your Data</h3>
              <p>
                We use your data solely for:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Communicating regarding your project enquiries.</li>
                <li>Processing payments and invoicing.</li>
                <li>Delivering agreed-upon services.</li>
                <li>Improving our service offerings and customer experience.</li>
              </ul>
              <p className="mt-4">We <strong>never</strong> sell your personal data to third parties.</p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">3. Data Security</h3>
              <p>
                We implement industry-standard security measures to protect your information, including encryption and secure servers. However, no method of transmission over the internet is 100% secure.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">4. Data Retention</h3>
              <p>
                We retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use your information to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our policies.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">5. Your Rights</h3>
              <p>
                You have the right to access, update, or delete the information we have on you. Whenever made possible, you can access, update or request deletion of your Personal Data directly within your account settings section. If you are unable to perform these actions yourself, please contact us to assist you.
              </p>
            </div>
          </div>
        );
      case 'refund':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">Refund & Cancellation Policy</h2>
            <div className="prose prose-invert max-w-none text-gray-300">
              <h3 className="text-xl font-semibold text-white mt-8 mb-4">1. Advance Payments</h3>
              <p>
                Advance payments (booking fees) are generally <strong>non-refundable</strong> as they reserve time and resources for your project.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">2. Cancellation by Client</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>If you cancel within 24 hours of booking and <strong>before</strong> work has commenced, a 80% refund may be considered (deducting processing fees).</li>
                <li>Once the project has started (design, research, or development phase), no refunds will be issued for the paid amount.</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">3. Project Termination</h3>
              <p>
                If Klypso is unable to complete the project due to unforeseen circumstances on our end, a full refund of the unutilized amount will be processed.
              </p>
            </div>
          </div>
        );
      case 'payment':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">Payment Policy</h2>
            <div className="prose prose-invert max-w-none text-gray-300">
              <h3 className="text-xl font-semibold text-white mt-8 mb-4">1. Payment Structure</h3>
              <p>Standard projects typically follow this payment schedule:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Advance / Booking:</strong> 30-50% upfront to start the project.</li>
                <li><strong>Milestone 1:</strong> 30% upon approval of design/prototype.</li>
                <li><strong>Final:</strong> Remaining balance before final deployment and handover.</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">2. Accepted Methods</h3>
              <p>
                We accept payments via UPI (Google Pay, PhonePe, Paytm), Bank Transfer (NEFT/IMPS), and major Credit/Debit Cards (via payment gateway if applicable).
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">3. Late Payments</h3>
              <p>
                Invoices not paid within 7 days of the due date may incur a late fee of 5%. Work may be paused until outstanding dues are cleared.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section className="min-h-screen bg-black text-white pt-24 pb-12 px-4">
      <Helmet>
        <title>Legal Center | Klypso</title>
        <meta name="description" content="Terms of Service, Privacy Policy, Refund Policy, and Payment Information for Klypso." />
      </Helmet>

      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 font-heading">Legal & Privacy</h1>
          <p className="text-gray-400 font-medium">Everything you need to know about our policies and agreements.</p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="md:col-span-1 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between p-7 rounded-2xl transition-all duration-500 border ${activeTab === tab.id
                    ? 'bg-[#C5A059] text-black border-[#C5A059] shadow-[0_0_30px_rgba(197,160,89,0.1)]'
                    : 'bg-[#121214] border-white/5 text-zinc-500 hover:border-[#C5A059]/30 hover:text-white'
                    }`}
                >
                  <div className="flex items-center gap-5">
                    <Icon size={18} className={activeTab === tab.id ? 'text-black' : 'group-hover:text-[#C5A059]'} />
                    <span className="font-bold text-[10px] uppercase tracking-[0.2em]">{tab.label}</span>
                  </div>
                  {activeTab === tab.id && <ChevronRight size={14} />}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="md:col-span-3 bg-[#121214] border border-white/5 rounded-[3rem] p-12 md:p-20 min-h-[700px] shadow-3xl">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="prose prose-invert prose-gold max-w-none"
            >
              <div className="flex items-center gap-4 mb-12">
                <div className="h-[1px] w-8 bg-[#C5A059]/40" />
                <span className="text-[10px] font-black tracking-[0.4em] text-[#C5A059] uppercase">
                  Legal Policies
                </span>
              </div>
              {renderContent()}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Legal;
