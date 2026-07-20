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
    description: "Reciclado y vitrofusión — luz y color que se reinventan.",
    subs: ["Todos", "Reciclado", "Vitrofusión"],
  },
  {
    key: "ceramica",
    id: "ceramica",
    title: "Cerámica",
    description: "Para la casa y el jardín — barro, esmaltes y paciencia.",
    subs: ["Todos", "Casa", "Jardín"],
  },
  {
    key: "espejos",
    id: "espejos",
    title: "Espejos y Cuadros",
    description: "Piezas de pared que enmarcan la luz y la textura.",
    subs: ["Todos", "Espejos", "Cuadros"],
  },
];

export const NAV_LINKS = [
  { label: "Vidrio", href: "#vidrio" },
  { label: "Cerámica", href: "#ceramica" },
  { label: "Espejos y Cuadros", href: "#espejos" },
  { label: "Nosotros", href: "#nosotros" },
  { label: "Cómo comprar", href: "#como-comprar" },
] as const;
