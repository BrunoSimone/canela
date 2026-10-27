import type { Category } from "@/lib/types";

export interface CategoryMeta {
  key: Category;
  id: string;
  title: string;
  description: string;
  subs: string[];
}

export const CATEGORIES: CategoryMeta[] = [
  {
    key: "vidrio",
    id: "vidrio",
    title: "Vidrio",
    description: "Objetos de vidrio reciclado y piezas en vitrofusión.",
    subs: ["Todos", "Reciclado", "Vitrofusión"],
  },
  {
    key: "ceramica",
    id: "ceramica",
    title: "Cerámica",
    description: "Piezas de cerámica para la casa y el jardín.",
    subs: ["Todos", "Casa", "Jardín"],
  },
  {
    key: "espejos",
    id: "espejos",
    title: "Espejos y Cuadros",
    description: "Espejos y cuadros realizados en mosaico y vitromosaico.",
    subs: ["Todos", "Espejos", "Cuadros"],
  },
];

export const STORE_LINKS = [
  { label: "Vidrio", href: "/tienda#vidrio" },
  { label: "Cerámica", href: "/tienda#ceramica" },
  { label: "Espejos y Cuadros", href: "/tienda#espejos" },
  { label: "Cómo comprar en la tienda", href: "/tienda#como-comprar" },
] as const;
