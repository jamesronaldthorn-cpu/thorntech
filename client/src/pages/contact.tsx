import { useState } from "react";
import { Link } from "wouter";
import { Mail, Phone, ChevronRight, Send, Clock, MapPin, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoLink = `mailto:thorntech@hotmail.com?subject=${encodeURIComponent(form.subject || "Website Enquiry")}&body=${encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`)}`;
    window.location.href = mailtoLink;
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <NavBar />
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link href="/" className="hover:text-primary" data-testid="link-home">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white">Contact Us</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wider mb-4" data-testid="text-contact-title">CONTACT US</h1>
        <p className="text-gray-400 mb-10 max-w-2xl">Got a question about an order, need help choosing components, or want to discuss a return? We're here to help.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-5">
              <h2 className="font-display font-bold text-lg text-white">Get In Touch</h2>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Email</p>
                  <a href="mailto:thorntech@hotmail.com" className="text-sm text-primary hover:underline" data-testid="link-email">thorntech@hotmail.com</a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Phone</p>
                  <a href="tel:07868552028" className="text-sm text-primary hover:underline" data-testid="link-phone">07868 552028</a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Phone Hours</p>
                  <p className="text-sm text-gray-400">Monday to Friday, 6:30 PM – 8:00 PM</p>
                  <p className="text-xs text-gray-500 mt-1">Emails responded to within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Thorn Tech Solutions Ltd</p>
                  <p className="text-xs text-gray-500">Company Reg: 17058756 (England & Wales)</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="font-display font-bold text-sm text-white mb-3">Common Enquiries</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/returns" className="hover:text-primary transition-colors">Returns & Warranty Claims</Link>
                </li>
                <li>Order status updates</li>
                <li>Product compatibility questions</li>
                <li>Bulk / trade enquiries</li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-2">
            {sent ? (
              <div className="bg-white/5 border border-white/10 rounded-lg p-10 text-center">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h2 className="font-display font-bold text-xl text-white mb-2">Message Ready</h2>
                <p className="text-gray-400 mb-6">Your email client should have opened with your message. If it didn't, you can email us directly at <a href="mailto:thorntech@hotmail.com" className="text-primary hover:underline">thorntech@hotmail.com</a></p>
                <Button onClick={() => setSent(false)} className="bg-primary hover:bg-primary/80 font-display tracking-widest" data-testid="button-send-another">SEND ANOTHER</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-5">
                <h2 className="font-display font-bold text-lg text-white mb-2">Send Us a Message</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-400">Your Name *</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="bg-white/5 border-white/10 text-white" placeholder="John Smith" data-testid="input-contact-name" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Your Email *</Label>
                    <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required className="bg-white/5 border-white/10 text-white" placeholder="your@email.com" data-testid="input-contact-email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400">Subject</Label>
                  <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="bg-white/5 border-white/10 text-white" placeholder="e.g. Order enquiry, Return request, Product question" data-testid="input-contact-subject" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400">Message *</Label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    required
                    rows={6}
                    className="w-full rounded-md bg-white/5 border border-white/10 text-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Please include your order number if this is about an existing order..."
                    data-testid="input-contact-message"
                  />
                </div>
                <Button type="submit" className="bg-primary hover:bg-primary/80 font-display tracking-widest px-8" data-testid="button-send-message">
                  <Send className="w-4 h-4 mr-2" /> SEND MESSAGE
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
