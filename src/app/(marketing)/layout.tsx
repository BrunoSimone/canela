import { FloatingCart } from "@/components/cart/floating-cart";
import { Navbar } from "@/components/home/navbar";
import { Footer } from "@/components/home/footer";
import { isCheckoutReady } from "@/modules/checkout/infrastructure/server/checkout-availability";
import { StoreProvider } from "@/store/provider";
import { customizationEnabled } from "@/modules/customization/infrastructure/availability";
import { AdminPreviewNotice } from "@/components/maintenance/admin-preview-notice";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreProvider>
      {/* During maintenance the proxy only lets valid panel sessions reach these pages. */}
      {process.env.SITE_MAINTENANCE_MODE === "1" && <AdminPreviewNotice />}
      <Navbar customizationEnabled={customizationEnabled()} />
      <main id="contenido" tabIndex={-1} className="flex-1">{children}</main>
      <Footer customizationEnabled={customizationEnabled()} />
      <FloatingCart checkoutEnabled={isCheckoutReady()} />
    </StoreProvider>
  );
}
