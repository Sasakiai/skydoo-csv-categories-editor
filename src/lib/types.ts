export type ProductRecord = {
  Identyfikator: number;
  Rodzaj: string;
  SKU: string | number;
  Nazwa: string;
  Kategorie: string;
  "URL produktu": string;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  parent: number;
};

export type Assignments = Record<string, number[]>;

export type CategoryNode = {
  category: Category;
  children: CategoryNode[];
};

export type BootstrapPayload = {
  products: ProductRecord[];
  categories: Category[];
  assignments: Assignments;
};
