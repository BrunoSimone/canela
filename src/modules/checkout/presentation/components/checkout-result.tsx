"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  LoaderCircle,
  SearchX,
} from "lucide-react";

import { clearCart } from "@/modules/cart/presentation/state/cart-slice";
import {
  useGetPublicOrderStatusQuery,
  type PublicOrderStatusResponse,
} from "@/modules/checkout/presentation/client/checkout-api";
import {
  presentCheckoutResult,
  shouldClearCart,
} from "@/modules/checkout/presentation/client/checkout-flow";
import { useAppDispatch } from "@/store/hooks";

import { MosaicMark } from "./mosaic-mark";

export function CheckoutResult({ publicToken }: { publicToken: string }) {
  const dispatch = useAppDispatch();
  const query = useGetPublicOrderStatusQuery(publicToken, {
    refetchOnFocus: true,
  });

  useEffect(() => {
    if (query.data && shouldClearCart(query.data.status)) dispatch(clearCart());
  }, [query.data, dispatch]);

  if (query.data?.status === "verifying") {
    return <PollingCheckoutResult publicToken={publicToken} />;
  }

  return <CheckoutResultView {...query} />;
}

function PollingCheckoutResult({ publicToken }: { publicToken: string }) {
  const query = useGetPublicOrderStatusQuery(publicToken, {
    pollingInterval: 3_000,
    skipPollingIfUnfocused: true,
    refetchOnFocus: true,
  });

  return <CheckoutResultView {...query} />;
}

function CheckoutResultView({
  data,
  isLoading,
  isFetching,
  isError,
}: {
  data?: PublicOrderStatusResponse;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <ResultShell>
        <LoaderCircle className="canela-spin size-9 text-[var(--canela-ochre)]" />
        <h1 className="mt-6 font-heading text-5xl text-[var(--canela-brown)]">
          Buscando tu pedido
        </h1>
        <p className="mt-3 text-[#6E4E38]">Esto puede demorar unos segundos.</p>
      </ResultShell>
    );
  }

  if (isError || !data) {
    return (
      <ResultShell>
        <SearchX className="size-10 text-[#b06a52]" />
        <h1 className="mt-6 font-heading text-5xl text-[var(--canela-brown)]">
          No encontramos el pedido
        </h1>
        <p className="mt-3 max-w-lg leading-relaxed text-[#6E4E38]">
          El enlace puede estar incompleto. Volvé a la tienda o escribinos por
          WhatsApp si ya realizaste un pago.
        </p>
        <ReturnToStore />
      </ResultShell>
    );
  }

  const presentation = presentCheckoutResult(data.status);
  const icon =
    presentation.tone === "success" ? (
      <Check className="size-9" strokeWidth={2.5} />
    ) : presentation.tone === "pending" ? (
      <LoaderCircle className="canela-spin size-8" />
    ) : (
      <AlertTriangle className="size-8" />
    );
  const toneClass = {
    success: "bg-[var(--canela-green)] text-white",
    pending: "bg-[var(--canela-ochre)] text-white",
    warning: "bg-[#b06a52] text-white",
  }[presentation.tone];

  return (
    <ResultShell>
      <MosaicMark compact />
      <div
        className={`mt-8 flex size-16 items-center justify-center rounded-full ${toneClass}`}
      >
        {icon}
      </div>
      <p className="mt-6 text-xs font-extrabold uppercase tracking-[.18em] text-[#8A9256]">
        {presentation.label}
      </p>
      <h1 className="mt-3 font-heading text-5xl leading-none text-[var(--canela-brown)] sm:text-6xl">
        {presentation.title}
      </h1>
      <p className="mt-5 max-w-xl text-base leading-relaxed text-[#6E4E38]">
        {presentation.description}
      </p>
      {data.status === "verifying" && (
        <p
          className="mt-4 text-sm font-bold text-[var(--canela-ochre-dark)]"
          aria-live="polite"
        >
          {isFetching
            ? "Consultando a Canela…"
            : "Volveremos a consultar automáticamente."}
        </p>
      )}
      {presentation.allowNewAttempt ? (
        <Link
          href="/checkout"
          className="mt-8 inline-flex items-center gap-2 bg-[var(--canela-ochre)] px-6 py-3 font-extrabold text-white hover:bg-[var(--canela-ochre-dark)]"
        >
          Intentar el pago nuevamente
        </Link>
      ) : (
        <ReturnToStore />
      )}
    </ResultShell>
  );
}

function ResultShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[72vh] px-5 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto flex max-w-3xl flex-col items-center border-y border-[rgba(184,132,42,.24)] bg-[rgba(251,247,238,.52)] px-6 py-14 text-center sm:px-12 sm:py-20">
        {children}
      </div>
    </div>
  );
}

function ReturnToStore() {
  return (
    <Link
      href="/#catalogo"
      className="mt-8 inline-flex items-center gap-2 border-b border-[var(--canela-ochre)] pb-1 font-bold text-[var(--canela-ochre-dark)]"
    >
      <ArrowLeft className="size-4" />
      Volver a la tienda
    </Link>
  );
}
