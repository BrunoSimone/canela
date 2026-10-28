import { CreditCard, ImagePlus, Palette, PackageCheck, ShieldCheck, ShoppingBag, SquareCheck } from "lucide-react";

interface Step {
  n: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  text: string;
}

const STORE_STEPS: Step[] = [
  {
    n: 1,
    icon: <ShoppingBag className="size-[22px]" strokeWidth={1.9} />,
    iconBg: "rgba(184,132,42,.16)",
    iconColor: "#8a621d",
    title: "Armá tu carrito",
    text: "Recorré el catálogo y agregá las piezas disponibles que quieras comprar.",
  },
  {
    n: 2,
    icon: <PackageCheck className="size-[22px]" strokeWidth={1.9} />,
    iconBg: "rgba(94,140,78,.18)",
    iconColor: "#4c7340",
    title: "Revisá tu pedido",
    text: "Confirmá las piezas, el costo de envío y el total antes de continuar.",
  },
  {
    n: 3,
    icon: <CreditCard className="size-[22px]" strokeWidth={1.8} />,
    iconBg: "rgba(90,180,220,.2)",
    iconColor: "#2f7fa3",
    title: "Pagá con Mercado Pago",
    text: "El pago se completa en Mercado Pago. Después preparamos tu pedido.",
  },
];

export function ComoComprar({ variant = "store", purchaseDemoEnabled = false, productionPurchaseEnabled = false }: { variant?: "store" | "frames"; purchaseDemoEnabled?: boolean; productionPurchaseEnabled?: boolean }) {
  const frames = variant === "frames";
  const steps: Step[] = frames ? [
    { n: 1, icon: <ImagePlus size={22} />, iconBg: "#e5e7d4", iconColor: "#606839", title: "Elegí tu imagen", text: "Subí una foto que te guste o empezá con un diseño de la galería." },
    { n: 2, icon: <Palette size={22} />, iconBg: "#e5e7d4", iconColor: "#606839", title: "Dale tu toque", text: "Probá tamaños, ajustá el encuadre y cambiá las venecitas que quieras." },
    { n: 3, icon: <SquareCheck size={22} />, iconBg: "#e5e7d4", iconColor: "#606839", title: productionPurchaseEnabled ? "Encargá tu cuadro" : purchaseDemoEnabled ? "Probá la compra" : "Revisá tu cuadro", text: productionPurchaseEnabled ? "Confirmá tu diseño, calculá el envío y pagá con Mercado Pago. Con el pago confirmado empezamos a fabricarlo." : purchaseDemoEnabled ? "Revisá el diseño y el precio. Después podés probar el envío y el pago con datos de prueba." : "Mirá el diseño, el tamaño y el precio orientativo en el resumen. Podés volver a editarlo antes de decidir." },
  ] : STORE_STEPS;

  return (
    <section id="como-comprar" aria-labelledby="buying-guide-title" className="anchor-offset mx-auto max-w-[1180px] px-[22px] pb-11 pt-16">
      <div className="mb-10 text-center">
        <h2 id="buying-guide-title" className="my-2 font-heading text-[clamp(32px,4.5vw,48px)] font-normal text-[var(--canela-brown)]">
          {frames ? "Cómo comprar tu cuadro" : "Cómo comprar en la tienda"}
        </h2>
        <p className="mx-auto max-w-[520px] text-base leading-relaxed text-[#6E4E38]">
          {frames ? "Tu cuadro tiene su propia compra, separada del carrito de la tienda." : "El envío se calcula antes de pasar a Mercado Pago."}
        </p>
      </div>

      <ol className="grid list-none grid-cols-1 gap-5 md:grid-cols-3">
        {steps.map((s) => (
          <li
            key={s.n}
            className="flex flex-col gap-3 rounded-[18px] border border-[rgba(184,132,42,.18)] bg-[var(--canela-cream-card)] px-5 pb-6 pt-6"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex size-[42px] flex-none items-center justify-center rounded-xl"
                style={{ background: s.iconBg, color: s.iconColor }}
              >
                {s.icon}
              </div>
              <span className="font-heading text-[34px] leading-none text-[rgba(184,132,42,.35)]">
                {s.n}
              </span>
            </div>
            <h3 className="text-[17px] font-extrabold leading-tight text-[var(--canela-brown)]">
              {s.title}
            </h3>
            <p className="text-[14.5px] leading-relaxed text-[#6E4E38]">{s.text}</p>
          </li>
        ))}
      </ol>

      {frames ? (!productionPurchaseEnabled && <p className="mt-6 rounded-2xl border border-[#c7c9ae] bg-[#eeeedd] px-5 py-4 text-sm leading-relaxed text-[#4a3527]">
        {purchaseDemoEnabled ? "Estás probando el recorrido de compra. " : "Por ahora podés diseñar y revisar tu cuadro; la compra todavía no está habilitada. "}
        Medidas, colores y precios orientativos. No se cobra dinero.
      </p>) : <div className="mt-6 flex flex-wrap items-center justify-center gap-3.5 rounded-2xl border border-dashed border-[rgba(184,132,42,.4)] bg-[#EFE4CE] px-6 py-5">
        <div className="flex size-[78px] flex-none items-center justify-center rounded-xl border border-[rgba(184,132,42,.25)] bg-[var(--canela-cream-card)]">
          <ShieldCheck
            className="size-[42px] text-[var(--canela-brown)]"
            strokeWidth={1.6}
          />
        </div>
        <div className="min-w-0 flex-1 basis-[220px]">
          <div className="mb-1 text-base font-extrabold text-[var(--canela-brown)]">
            Pago con Mercado Pago
          </div>
          <p className="text-[14.5px] leading-relaxed text-[#6E4E38]">
            Al continuar, pagás en el sitio de Mercado Pago. Canela no recibe ni
            almacena los datos de tu tarjeta.
          </p>
        </div>
      </div>}
    </section>
  );
}
