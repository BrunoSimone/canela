import { FloatingCart } from "@/components/cart/floating-cart";
import { Navbar } from "@/components/home/navbar";
import { Footer } from "@/components/home/footer";
import { isCheckoutReady } from "@/modules/checkout/infrastructure/server/checkout-availability";
import { StoreProvider } from "@/store/provider";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreProvider>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingCart checkoutEnabled={isCheckoutReady()} />
    </StoreProvider>
  );
}
