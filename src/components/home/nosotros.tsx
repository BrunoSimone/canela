import Image from "next/image";

import aboutUsImage from "@/assets/about-us.jpeg";

export function Nosotros() {
  return (
    <section id="nosotros" className="anchor-offset mt-8 bg-[#EFE4CE]">
      <div className="mx-auto grid max-w-[1000px] gap-11 px-[22px] py-16 md:grid-cols-[0.85fr_1.15fr] md:items-start">
        <div className="overflow-hidden rounded-[20px] border border-[rgba(184,132,42,.25)]">
          <Image
            src={aboutUsImage}
            alt="Mariela en su taller"
            sizes="(max-width: 768px) 100vw, 420px"
            placeholder="blur"
            className="h-auto w-full"
          />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--canela-ochre)]">
            Sobre nosotros
          </span>
          <h2 className="my-2.5 mb-4 font-heading text-[clamp(32px,4.5vw,46px)] font-normal text-[var(--canela-brown)]">
            Detalles que cuentan historias
          </h2>
          <p className="text-base leading-relaxed text-[#5a4130]">
            Soy{" "}
            <a
              href="https://www.instagram.com/marieladeloso/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--canela-ochre-dark)] underline decoration-[rgba(184,132,42,.45)] underline-offset-2 transition-colors hover:text-[var(--canela-brown)]"
            >
              @Marieladeloso
            </a>{" "}
            artista y tallerista de Mar del Plata. Canela es una nueva forma de
            acercarme a la comunidad con los brazos abiertos, por medio de lo que
            sé hacer y me encanta. Me siento muy afortunada de poder acompañarte
            en tu día a día llenando los espacios de tu hogar con objetos con
            buena energía.
            <br />
            <br />
            ¡Gracias por tu confianza!
          </p>
        </div>
      </div>
    </section>
  );
}
