import { ShoppingBag, QrCode } from "lucide-react";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.24 1.02l-2.2 2.2z" />
    </svg>
  );
}

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
    title: "Agregá a mi consulta",
    text: "Recorré el catálogo y tocá “Agregar a mi consulta” en las piezas que te gusten. Se guardan en tu lista.",
  },
  {
    n: 2,
    icon: <WhatsAppIcon className="size-[22px]" />,
    iconBg: "rgba(94,140,78,.18)",
    iconColor: "#4c7340",
    title: "Enviá tu consulta por WhatsApp",
    text: "Con un toque enviás tu lista completa a nuestro WhatsApp. Te confirmamos disponibilidad y total.",
  },
  {
    n: 3,
    icon: <QrCode className="size-[22px]" strokeWidth={1.7} />,
    iconBg: "rgba(90,180,220,.2)",
    iconColor: "#2f7fa3",
    title: "Pagá con Mercado Pago",
    text: "Te pasamos un QR o link de Mercado Pago. Escaneás, pagás y coordinamos envío o retiro. ¡Listo!",
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
          Armás tu consulta, la enviás por WhatsApp y coordinamos el pago con
          Mercado Pago. Sin vueltas.
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
          <QrCode className="size-[42px] text-[var(--canela-brown)]" strokeWidth={1.6} />
        </div>
        <div className="min-w-[220px] flex-1">
          <div className="mb-1 text-base font-extrabold text-[var(--canela-brown)]">
            Pago seguro con Mercado Pago
          </div>
          <p className="text-[14.5px] leading-relaxed text-[#6E4E38]">
            Te enviamos un QR o link de pago por WhatsApp. Escaneás, pagás con
            tarjeta, dinero en cuenta o transferencia, y coordinamos el envío o
            retiro.
          </p>
        </div>
      </div>
    </section>
  );
}
