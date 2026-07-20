"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { siteConfig, whatsappLink, WA_GENERAL_MESSAGE } from "@/lib/config";
import { formatPrice } from "@/lib/product-status";

export interface ConsultaItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface ConsultaContextValue {
  items: ConsultaItem[];
  count: number;
  panelOpen: boolean;
  add: (item: { id: string; name: string; price: number }) => void;
  inc: (id: string) => void;
  dec: (id: string) => void;
  remove: (id: string) => void;
  qtyOf: (id: string) => number;
  togglePanel: () => void;
  closePanel: () => void;
  consultaWaLink: string;
  generalWaLink: string;
}

const ConsultaContext = createContext<ConsultaContextValue | null>(null);

export function useConsulta(): ConsultaContextValue {
  const ctx = useContext(ConsultaContext);
  if (!ctx) throw new Error("useConsulta debe usarse dentro de <ConsultaProvider>");
  return ctx;
}

function buildMessage(items: ConsultaItem[]): string {
  if (items.length === 0) return WA_GENERAL_MESSAGE;
  const lines = items
    .map((i) => `• ${i.name} x${i.qty} (${formatPrice(i.price)})`)
    .join("\n");
  return `¡Hola Canela! Me interesan estas piezas:\n${lines}\n¿Me confirmás disponibilidad y total? 🙂`;
}

export function ConsultaProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ConsultaItem[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);

  const add = useCallback((item: { id: string; name: string; price: number }) => {
    setItems((prev) => {
      const found = prev.find((i) => i.id === item.id);
      if (found) {
        return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...item, qty: 1 }];
    });
    setPanelOpen(true);
  }, []);

  const inc = useCallback((id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)));
  }, []);

  const dec = useCallback((id: string) => {
    setItems((prev) =>
      prev.flatMap((i) =>
        i.id === id ? (i.qty > 1 ? [{ ...i, qty: i.qty - 1 }] : []) : [i],
      ),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const qtyOf = useCallback(
    (id: string) => items.find((i) => i.id === id)?.qty ?? 0,
    [items],
  );

  const togglePanel = useCallback(() => setPanelOpen((v) => !v), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);
  const consultaWaLink = useMemo(() => whatsappLink(buildMessage(items)), [items]);
  const generalWaLink = useMemo(() => whatsappLink(WA_GENERAL_MESSAGE), []);

  const value: ConsultaContextValue = {
    items,
    count,
    panelOpen,
    add,
    inc,
    dec,
    remove,
    qtyOf,
    togglePanel,
    closePanel,
    consultaWaLink,
    generalWaLink,
  };

  void siteConfig;

  return <ConsultaContext.Provider value={value}>{children}</ConsultaContext.Provider>;
}
