import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";
import { Link } from "wouter";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setIsVisible(false);
  };

  const declineCookies = () => {
    localStorage.setItem("cookie-consent", "declined");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6 bg-black/95 backdrop-blur-lg border-t border-white/10 shadow-2xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-10">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex gap-4">
            <div className="bg-primary/20 p-3 rounded-full flex-shrink-0">
              <Cookie className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white mb-1">COOKIE CONSENT</h3>
              <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
                We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies. Read our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for more details.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Button 
              variant="outline" 
              onClick={declineCookies}
              className="flex-1 md:flex-none border-white/20 hover:bg-white/5 text-xs tracking-widest font-display"
              data-testid="button-cookie-decline"
            >
              DECLINE
            </Button>
            <Button 
              onClick={acceptCookies}
              className="flex-1 md:flex-none bg-primary hover:bg-primary/80 text-black font-display font-bold text-xs tracking-widest"
              data-testid="button-cookie-accept"
            >
              ACCEPT ALL
            </Button>
            <button 
              onClick={() => setIsVisible(false)}
              className="hidden md:block text-gray-500 hover:text-white transition-colors p-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
