import { api } from "./client";
import type { FeaturedProductItem } from "./products";

export interface HomeSectionData {
  id: string;
  slug: string;
  title: string;
  titleBn: string | null;
  subtitle: string | null;
  subtitleBn: string | null;
  categorySlug: string | null;
  displayOrder: number;
  maxProducts: number;
  isActive: boolean;
  products: FeaturedProductItem[];
}

export const homeSectionsApi = {
  list: () => api.get<HomeSectionData[]>("/admin/home-sections").then((r) => r.data),
  get: (id: string) => api.get<HomeSectionData>(`/admin/home-sections/${id}`).then((r) => r.data),
  update: (id: string, body: Partial<HomeSectionData>) =>
    api.patch<HomeSectionData>(`/admin/home-sections/${id}`, body).then((r) => r.data),
  updateProducts: (id: string, productIds: string[]) =>
    api.put<HomeSectionData>(`/admin/home-sections/${id}/products`, { productIds }).then((r) => r.data),
};
