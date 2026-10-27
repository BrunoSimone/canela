import type { TileColor } from "../domain/design";
import materials from "./murvi-palette.json";

// Server adapter: keep workshop references here, never in a public design DTO.
// IDs are explicit and stable, independent of sorting and future display names.
const identities: Record<string, [string, string]> = {
  "murvi-o-22": ["tono-01", "Celeste vivo"],
  "murvi-o-40": ["tono-02", "Verde hoja"],
  "murvi-n-10": ["tono-03", "Azul noche"],
  "murvi-o-44": ["tono-04", "Azul intenso"],
  "murvi-o-17": ["tono-05", "Verde manzana"],
  "murvi-o-48": ["tono-06", "Verde bosque"],
  "murvi-o-42": ["tono-07", "Azul eléctrico"],
  "murvi-o-30": ["tono-08", "Violeta"],
  "murvi-o-12": ["tono-09", "Cacao"],
  "murvi-o-04": ["tono-10", "Gris pizarra"],
  "murvi-m-16": ["tono-11", "Aguamarina"],
  "murvi-m-20": ["tono-12", "Verde pradera"],
  "murvi-l-46": ["tono-13", "Bordó"],
  "murvi-m-43": ["tono-14", "Azul cielo"],
  "murvi-c-14": ["tono-15", "Verde pistacho"],
  "murvi-m-49": ["tono-16", "Verde jade"],
  "murvi-m-24": ["tono-17", "Azul aciano"],
  "murvi-m-29": ["tono-18", "Lavanda"],
  "murvi-m-08": ["tono-19", "Caramelo"],
  "murvi-m-03": ["tono-20", "Gris salvia"],
  "murvi-c-15": ["tono-21", "Agua clara"],
  "murvi-c-18": ["tono-22", "Verde brote"],
  "murvi-r-26": ["tono-23", "Rosa suave"],
  "murvi-c-41": ["tono-24", "Celeste suave"],
  "murvi-b-34": ["tono-25", "Blanco nube"],
  "murvi-c-50": ["tono-26", "Verde menta"],
  "murvi-c-32": ["tono-27", "Azul pastel"],
  "murvi-c-28": ["tono-28", "Lila"],
  "murvi-c-06": ["tono-29", "Arena dorada"],
  "murvi-n-21": ["tono-30", "Verde musgo"],
  "murvi-n-07": ["tono-31", "Terracota"],
  "murvi-n-01": ["tono-32", "Azul carbón"],
  "murvi-n-19": ["tono-33", "Verde oliva"],
  "murvi-n-05": ["tono-34", "Negro tinta"],
  "murvi-n-09": ["tono-35", "Índigo"],
  "murvi-e-60": ["tono-36", "Amarillo sol"],
  "murvi-e-80": ["tono-37", "Naranja"],
  "murvi-e-100": ["tono-38", "Rojo vivo"],
  "murvi-v-3": ["tono-39", "Lino · transparente"],
  "murvi-v-11": ["tono-40", "Azul humo · transparente"],
  "murvi-v-12": ["tono-41", "Caoba · transparente"],
  "murvi-v-15": ["tono-42", "Azul bruma · transparente"],
  "murvi-v-16": ["tono-43", "Azul laguna · transparente"],
  "murvi-v-17": ["tono-44", "Verde lima · transparente"],
  "murvi-v-20": ["tono-45", "Azul océano · transparente"],
  "murvi-v-29": ["tono-46", "Malva · transparente"],
  "murvi-v-30": ["tono-47", "Ciruela · transparente"],
  "murvi-v-34": ["tono-48", "Gris perla · transparente"],
  "murvi-v-41": ["tono-49", "Azul cerúleo · transparente"],
  "murvi-v-44": ["tono-50", "Azul profundo · transparente"],
  "murvi-v-48": ["tono-51", "Verde botella · transparente"],
  "murvi-v-50": ["tono-52", "Verde agua · transparente"],
  "murvi-ve-60": ["tono-53", "Miel · transparente"],
  "murvi-ve-80": ["tono-54", "Ámbar · transparente"],
  "murvi-ve-100": ["tono-55", "Óxido · transparente"],
  "murvi-eco03": ["tono-56", "Tierra oliva"],
  "murvi-tg02": ["tono-57", "Piedra"],
  "murvi-di100": ["tono-58", "Salvia clara"],
  "murvi-di97": ["tono-59", "Oliva dorado"],
  "murvi-eco34": ["tono-60", "Gris liquen"],
  "murvi-di93": ["tono-61", "Tierra oscura"],
  "murvi-di99": ["tono-62", "Blanco niebla"],
};

export function storefrontColorId(materialId: string): string {
  const identity = identities[materialId];
  if (!identity) throw new Error("Falta una referencia pública para un color del taller.");
  return identity[0];
}

export const storefrontPalette: TileColor[] = materials.colors.map(material => ({
  id: storefrontColorId(material.id),
  name: identities[material.id][1],
  hex: material.hex,
}));
