import { ConsultaProvider } from "@/components/consulta/consulta-provider";
import { FloatingActions } from "@/components/consulta/floating-actions";
import { Navbar } from "@/components/home/navbar";
import { Footer } from "@/components/home/footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConsultaProvider>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingActions />
    </ConsultaProvider>
  );
}
