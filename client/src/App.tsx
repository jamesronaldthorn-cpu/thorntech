import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ProductPage from "@/pages/product";
import CategoryPage from "@/pages/category";
import CheckoutPage from "@/pages/checkout";
import OrderConfirmationPage from "@/pages/order-confirmation";
import AdminPage from "@/pages/admin";
import AccountPage, { LoginPage, RegisterPage } from "@/pages/account";
import ReturnsPage from "@/pages/returns";
import ContactPage from "@/pages/contact";
import OrderStatusPage from "@/pages/order-status";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/product/:slug" component={ProductPage} />
      <Route path="/category/:slug" component={CategoryPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/order-confirmation" component={OrderConfirmationPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/returns" component={ReturnsPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/order-status" component={OrderStatusPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
