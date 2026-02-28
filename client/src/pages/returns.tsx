import { Link } from "wouter";
import { ShieldCheck, Mail, Phone, ChevronRight } from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { usePageTitle } from "@/components/SEO";

export default function ReturnsPage() {
  usePageTitle("Returns & Warranty Policy");
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <NavBar />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link href="/" className="hover:text-primary" data-testid="link-home">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white">Returns & Warranty</span>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wider" data-testid="text-returns-title">RETURNS & WARRANTY</h1>
        </div>

        <p className="text-gray-400 text-sm mb-8">Last Updated: February 2026</p>

        <div className="space-y-10 text-gray-300 leading-relaxed">
          <p>This Returns & Warranty Policy applies to all purchases made through Thorn Tech Solutions Ltd ("we", "us", "our") via our website. This policy complies with the UK Consumer Rights Act 2015 and the Consumer Contracts Regulations 2013.</p>

          <div>
            <h2 className="font-display font-bold text-xl text-white mb-4">1. Your Legal Rights (UK Customers)</h2>
            <p className="mb-3">Under the Consumer Rights Act 2015, products must be:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-400">
              <li>Of satisfactory quality</li>
              <li>Fit for purpose</li>
              <li>As described</li>
            </ul>
            <p className="mt-3">If your item is faulty, misdescribed, or unfit for purpose, you are legally entitled to a repair, replacement, or refund.</p>
            <p className="mt-3">Under the Consumer Contracts Regulations 2013, you have the right to cancel most online purchases within 14 days of receiving the goods.</p>
            <p className="mt-3">These rights are in addition to our goodwill returns policy below.</p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-white mb-4">2. 14-Day Cooling-Off Period (Distance Selling)</h2>
            <p className="mb-3">If you purchase goods online, you have the right to cancel your order within 14 days of receiving your item, without giving a reason.</p>
            <p className="font-medium text-white mb-2">To exercise your right to cancel:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-400 mb-4">
              <li>You must inform us in writing (email is acceptable) within 14 days of delivery.</li>
            </ul>
            <p className="font-medium text-white mb-2">After cancellation:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-400">
              <li>You must return the item within 14 days of notifying us.</li>
              <li>Items must be unused and in their original packaging.</li>
              <li>You are responsible for return postage unless the item is faulty.</li>
              <li>We will issue a refund within 14 days of receiving the returned goods (or proof of return).</li>
              <li>Refunds will be made using the original payment method.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-white mb-4">3. Faulty or Damaged Goods</h2>
            <p className="mb-3">If your item is faulty, damaged, or not as described:</p>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3 mb-3">
              <div>
                <p className="font-medium text-primary">Within 30 Days</p>
                <p className="text-gray-400">You are entitled to a full refund.</p>
              </div>
              <div>
                <p className="font-medium text-primary">After 30 Days (Up to 6 Months)</p>
                <p className="text-gray-400">We are entitled to offer a repair or replacement first. If this is unsuccessful, you may be entitled to a refund.</p>
              </div>
              <div>
                <p className="font-medium text-primary">After 6 Months</p>
                <p className="text-gray-400">You may need to prove the fault was present at the time of delivery.</p>
              </div>
            </div>
            <p>We will cover return postage costs for faulty goods.</p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-white mb-4">4. Standard Returns Policy (Goodwill)</h2>
            <p className="mb-3">In addition to your statutory rights, we offer a 30-day return policy for unwanted items.</p>
            <p className="font-medium text-white mb-2">To qualify:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-400">
              <li>Items must be unused</li>
              <li>In original condition</li>
              <li>With original packaging</li>
              <li>With proof of purchase</li>
            </ul>
            <p className="mt-3">We reserve the right to reduce refunds if items show signs of use beyond what is necessary to inspect them.</p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-white mb-4">5. Non-Returnable Items</h2>
            <p className="mb-3">The following items cannot be returned unless faulty:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-400">
              <li>Perishable goods</li>
              <li>Personalised or custom-made items</li>
              <li>Sealed goods that are not suitable for return once opened (e.g., hygiene products)</li>
              <li>Digital downloads once accessed</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-white mb-4">6. Warranty Information</h2>
            <p className="mb-3">Unless otherwise stated, our products include a <span className="text-primary font-medium">12-month limited warranty</span> from the date of purchase.</p>
            <p className="font-medium text-white mb-2">This warranty covers:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-400 mb-4">
              <li>Manufacturing defects</li>
              <li>Faulty materials</li>
              <li>Workmanship issues under normal use</li>
            </ul>
            <p className="font-medium text-white mb-2">This warranty does not cover:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-400 mb-4">
              <li>Accidental damage</li>
              <li>Misuse or neglect</li>
              <li>Normal wear and tear</li>
              <li>Unauthorised repairs or modifications</li>
            </ul>
            <p className="mb-3">If a valid warranty claim is made, we will repair, replace, or offer a refund if repair/replacement is not possible.</p>
            <p>Proof of purchase is required for all warranty claims. This warranty is provided in addition to your statutory rights under UK law.</p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-white mb-4">7. How to Return an Item</h2>
            <p className="mb-3">To initiate a return, please contact:</p>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <p className="font-medium text-white">Thorn Tech Solutions Ltd</p>
              <p className="flex items-center gap-2 text-gray-400"><Mail className="w-4 h-4 text-primary" /> thorntech@hotmail.com</p>
              <p className="flex items-center gap-2 text-gray-400"><Phone className="w-4 h-4 text-primary" /> 07868 552028</p>
            </div>
            <p className="mt-3 font-medium text-white mb-2">Please include:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-400">
              <li>Your order number</li>
              <li>Description of the issue</li>
              <li>Photographs (if the item is damaged)</li>
            </ul>
            <p className="mt-3 text-yellow-400 text-sm">Do not send items back without contacting us first.</p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-white mb-4">8. Refund Processing</h2>
            <ul className="list-disc pl-6 space-y-1 text-gray-400">
              <li>Refunds are processed within 14 days of receiving returned goods.</li>
              <li>Shipping costs are non-refundable unless the item is faulty.</li>
              <li>Refunds will be issued to the original payment method.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-white mb-4">9. Business Customers</h2>
            <p>Different return terms may apply to business-to-business transactions. Please contact us for further details.</p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-white mb-4">10. Contact Information</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-2">
              <p className="font-medium text-white text-lg">Thorn Tech Solutions Ltd</p>
              <p className="flex items-center gap-2 text-gray-400"><Mail className="w-4 h-4 text-primary" /> thorntech@hotmail.com</p>
              <p className="flex items-center gap-2 text-gray-400"><Phone className="w-4 h-4 text-primary" /> 07868 552028</p>
              <p className="text-xs text-gray-500 mt-2">Company Reg: 17058756 (England & Wales)</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
