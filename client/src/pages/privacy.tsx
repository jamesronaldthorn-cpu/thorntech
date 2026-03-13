import { Link } from "wouter";
import { Shield, ChevronRight, Mail, Phone, Lock, Eye, Cookie } from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { usePageTitle } from "@/components/SEO";

export default function PrivacyPage() {
  usePageTitle("Privacy Policy", "Thorn Tech Solutions Ltd privacy policy. Learn how we handle your personal data, cookies, and payment information in compliance with GDPR and UK data protection law.");
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <NavBar />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link href="/" className="hover:text-primary" data-testid="link-home">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white">Privacy Policy</span>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wider" data-testid="text-privacy-title">PRIVACY POLICY</h1>
        </div>

        <p className="text-gray-400 text-sm mb-8">Last Updated: February 2025</p>

        <div className="space-y-10 text-gray-300 leading-relaxed">
          <p>At Thorn Tech Solutions Ltd ("we", "us", "our"), we are committed to protecting and respecting your privacy. This policy explains how we collect, use, and protect your personal data in compliance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.</p>

          <div>
            <h2 className="font-display font-bold text-xl text-white mb-4">1. Data Controller</h2>
            <p>Thorn Tech Solutions Ltd is the data controller responsible for your personal data. If you have any questions about this privacy policy or our data protection practices, please contact us at:</p>
            <div className="mt-4 bg-white/5 border border-white/10 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-medium text-white">Thorn Tech Solutions Ltd</p>
              <p className="flex items-center gap-2 text-gray-400"><Mail className="w-4 h-4 text-primary" /> thorntech@hotmail.com</p>
              <p className="flex items-center gap-2 text-gray-400"><Phone className="w-4 h-4 text-primary" /> 07868 552028</p>
              <p className="text-xs text-gray-500">Company Reg: 17058756 (England & Wales)</p>
            </div>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-white mb-4">2. The Data We Collect</h2>
            <p className="mb-3">We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-400">
              <li><strong>Identity Data:</strong> Includes first name, last name, username or similar identifier.</li>
              <li><strong>Contact Data:</strong> Includes billing address, delivery address, email address and telephone numbers.</li>
              <li><strong>Financial Data:</strong> Includes payment card details (processed securely by our payment providers, Stripe and PayPal).</li>
              <li><strong>Transaction Data:</strong> Includes details about payments to and from you and other details of products and services you have purchased from us.</li>
              <li><strong>Technical Data:</strong> Includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this website.</li>
              <li><strong>Profile Data:</strong> Includes your username and password, purchases or orders made by you, your interests, preferences, feedback and survey responses.</li>
              <li><strong>Usage Data:</strong> Includes information about how you use our website, products and services.</li>
              <li><strong>Marketing and Communications Data:</strong> Includes your preferences in receiving marketing from us and our third parties and your communication preferences.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-white mb-4">3. How We Use Your Data</h2>
            <p className="mb-3">We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-400">
              <li>To perform the contract we are about to enter into or have entered into with you (e.g. processing and delivering your order).</li>
              <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
              <li>Where we need to comply with a legal or regulatory obligation.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-white mb-4 flex items-center gap-2">
              <Cookie className="w-5 h-5 text-primary" /> 4. Cookies
            </h2>
            <p>Our website uses cookies to distinguish you from other users of our website. This helps us to provide you with a good experience when you browse our website and also allows us to improve our site. For detailed information on the cookies we use and the purposes for which we use them, please see our Cookie Consent banner.</p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-white mb-4">5. Data Sharing</h2>
            <p className="mb-3">We may share your personal data with the parties set out below for the purposes mentioned above:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-400">
              <li>Service providers acting as processors who provide IT and system administration services.</li>
              <li>Professional advisers including lawyers, bankers, auditors and insurers.</li>
              <li>HM Revenue & Customs, regulators and other authorities.</li>
              <li>Payment gateways (Stripe, PayPal) to process your transactions.</li>
              <li>Courier services for delivery of your products.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-white mb-4">6. Data Security</h2>
            <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.</p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-white mb-4">7. Your Legal Rights</h2>
            <p className="mb-3">Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-400">
              <li>Request access to your personal data.</li>
              <li>Request correction of your personal data.</li>
              <li>Request erasure of your personal data.</li>
              <li>Object to processing of your personal data.</li>
              <li>Request restriction of processing your personal data.</li>
              <li>Request transfer of your personal data.</li>
              <li>Right to withdraw consent.</li>
            </ul>
            <p className="mt-4">If you wish to exercise any of the rights set out above, please contact us.</p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-white mb-4">8. Complaints</h2>
            <p>You have the right to make a complaint at any time to the Information Commissioner's Office (ICO), the UK supervisory authority for data protection issues (www.ico.org.uk). We would, however, appreciate the chance to deal with your concerns before you approach the ICO so please contact us in the first instance.</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
