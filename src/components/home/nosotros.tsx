export function Nosotros() {
  return (
    <section id="nosotros" className="anchor-offset mt-8 bg-[#EFE4CE]">
      <div className="mx-auto grid max-w-[1000px] items-center gap-11 px-[22px] py-16 md:grid-cols-[0.85fr_1.15fr]">
        <div
          className="relative flex aspect-square items-end overflow-hidden rounded-[20px] border border-[rgba(184,132,42,.25)] p-5"
          style={{ background: "repeating-linear-gradient(135deg,#E4D6BB 0 15px,#D9C7A5 15px 30px)" }}
        >
          <span className="rounded-lg bg-[rgba(251,247,238,.75)] px-2.5 py-1.5 font-mono text-[12.5px] text-[#8a7147]">
            {"// taller / manos trabajando"}
          </span>
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--canela-ochre)]">
            Sobre nosotros
          </span>
          <h2 className="my-2.5 mb-4 font-heading text-[clamp(32px,4.5vw,46px)] font-normal text-[var(--canela-brown)]">
            Hecho a mano, hecho con tiempo
          </h2>
          <p className="mb-3.5 text-base leading-relaxed text-[#5a4130]">
            En Canela trabajamos el vidrio y la cerámica pieza por pieza. Cada
            objeto es único: pequeñas variaciones que cuentan que detrás hubo
            manos, no una máquina.
          </p>
          <p className="text-base leading-relaxed text-[#5a4130]">
            Diseño artesanal, prolijo y hecho con oficio. Piezas pensadas para
            durar y para acompañar tus espacios.
          </p>
        </div>
      </div>
    </section>
  );
}
