export type CatalogProduct = {
  id: string;
  name: string;
  priceArs: number;
  sellable: boolean;
  maxQuantity?: number;
};

export interface ProductCatalog {
  findByIds(productIds: string[]): Promise<CatalogProduct[]>;
}
