import { FloatingCart } from "@/components/cart/floating-cart";
import { Navbar } from "@/components/home/navbar";
import { Footer } from "@/components/home/footer";
import { isCheckoutReady } from "@/modules/checkout/infrastructure/server/checkout-availability";
import { StoreProvider } from "@/store/provider";
import { customizationEnabled } from "@/modules/customization/infrastructure/availability";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreProvider>
      <Navbar customizationEnabled={customizationEnabled()} />
      <main id="contenido" tabIndex={-1} className="flex-1">{children}</main>
      <Footer />
      <FloatingCart checkoutEnabled={isCheckoutReady()} />
    </StoreProvider>
  );
}
