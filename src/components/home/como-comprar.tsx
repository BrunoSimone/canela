import { CreditCard, PackageCheck, ShieldCheck, ShoppingBag } from "lucide-react";

interface Step {
  n: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  text: string;
}

const STEPS: Step[] = [
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
    text: "Te llevamos a Mercado Pago para completar el pago de forma segura. Después preparamos tu pedido.",
  },
];

export function ComoComprar() {
  return (
    <section id="como-comprar" className="anchor-offset mx-auto max-w-[1180px] px-[22px] pb-11 pt-16">
      <div className="mb-10 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--canela-ochre)]">
          Cómo comprar
        </span>
        <h2 className="my-2 font-heading text-[clamp(32px,4.5vw,48px)] font-normal text-[var(--canela-brown)]">
          Comprar es simple
        </h2>
        <p className="mx-auto max-w-[520px] text-base leading-relaxed text-[#6E4E38]">
          Elegís tus piezas, revisás el total y pagás online con Mercado Pago.
          Sin vueltas.
        </p>
      </div>

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
        {STEPS.map((s) => (
          <div
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
            <div className="text-[17px] font-extrabold leading-tight text-[var(--canela-brown)]">
              {s.title}
            </div>
            <p className="text-[14.5px] leading-relaxed text-[#6E4E38]">{s.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3.5 rounded-2xl border border-dashed border-[rgba(184,132,42,.4)] bg-[#EFE4CE] px-6 py-5">
        <div className="flex size-[78px] flex-none items-center justify-center rounded-xl border border-[rgba(184,132,42,.25)] bg-[var(--canela-cream-card)]">
          <ShieldCheck
            className="size-[42px] text-[var(--canela-brown)]"
            strokeWidth={1.6}
          />
        </div>
        <div className="min-w-[220px] flex-1">
          <div className="mb-1 text-base font-extrabold text-[var(--canela-brown)]">
            Pago seguro con Mercado Pago
          </div>
          <p className="text-[14.5px] leading-relaxed text-[#6E4E38]">
            Al continuar, pagás en el sitio de Mercado Pago. Canela no recibe ni
            almacena los datos de tu tarjeta. Para piezas por encargo o cualquier
            duda, también podés escribirnos por WhatsApp.
          </p>
        </div>
      </div>
    </section>
  );
}
