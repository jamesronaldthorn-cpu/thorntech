import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import logoImg from "@/assets/images/logo.png";
import type { Category } from "@shared/schema";

export default function Footer() {
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: () => fetch("/api/categories").then(r => r.json()),
  });

  return (
    <footer className="bg-black py-12 mt-auto border-t border-white/10">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img src={logoImg} alt="Thorn Tech Solutions" className="w-8 h-8 object-contain" />
            <h3 className="font-display font-bold tracking-wider">THORN TECH</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">The UK's ultimate destination for premium PC components and bespoke enthusiast builds.</p>
          <p className="text-xs text-muted-foreground/60">Company Reg: 17058756 (England & Wales)</p>
        </div>
        <div>
          <h4 className="font-display font-bold mb-4">Shop</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {categories.slice(0, 4).map(c => (
              <li key={c.id}><Link href={`/category/${c.slug}`} className="hover:text-primary transition-colors">{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-display font-bold mb-4">Support</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/order-status" className="hover:text-primary transition-colors">Order Status</Link></li>
            <li><Link href="/returns" className="hover:text-primary transition-colors">Returns & Warranty</Link></li>
            <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
          </ul>
          <div className="mt-4 pt-4 border-t border-white/5 text-xs text-muted-foreground/60 space-y-1">
            <p className="flex items-center gap-2"><span>thorntech@hotmail.com</span></p>
            <p className="flex items-center gap-2"><span>07868 552028</span></p>
          </div>
        </div>
        <div>
          <h4 className="font-display font-bold mb-4">Newsletter</h4>
          <p className="text-sm text-muted-foreground mb-4">Subscribe for hardware drops and exclusive UK deals.</p>
          <div className="flex gap-2">
            <Input placeholder="Enter your email" className="bg-white/5 border-white/10" data-testid="input-newsletter" />
            <Button className="bg-primary hover:bg-primary/80" data-testid="button-subscribe">Subscribe</Button>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/10 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Thorn Tech Solutions Ltd. All rights reserved.
      </div>
    </footer>
  );
}
