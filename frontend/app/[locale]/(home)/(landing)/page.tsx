import BestSellingProducts from "@/components/home/BestSellingProducts";
import CategoryGrid from "@/components/home/CategoryGrid";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import HomeCuratedSection from "@/components/home/HomeCuratedSection";
import HeroSection from "@/components/home/HeroSection";
import { getShopCategories } from "@/lib/services/categories.service";
import { getHomeData } from "@/lib/services/products.service";
import { getBanners, getSiteSettings } from "@/lib/services/site.service";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/locale";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale as Locale;
  const [categories, home, heroMain, heroSide, siteSettings] = await Promise.all([
    getShopCategories(locale),
    getHomeData(locale).catch(() => ({ featured: [], newArrivals: [], bestSellers: [], onSale: [], sections: [] })),
    getBanners("HERO_MAIN"),
    getBanners("HERO_SIDE"),
    getSiteSettings(),
  ]);

  return (
    <>
      <HeroSection
        main={heroMain}
        side={heroSide}
        spotlight={home.featured}
        categories={categories}
        heroConfig={siteSettings.site?.hero}
      />
      <CategoryGrid categories={categories} />
      {home.featured.length > 0 && <FeaturedProducts products={home.featured.slice(0, 18)} />}
      {home.sections?.map((sec) => (
        <HomeCuratedSection
          key={sec.id}
          id={sec.id}
          slug={sec.slug}
          title={sec.title}
          subtitle={sec.subtitle}
          categorySlug={sec.categorySlug}
          products={sec.products}
        />
      ))}
      {home.bestSellers.length > 0 && <BestSellingProducts products={home.bestSellers.slice(0, 8)} />}
    </>
  );
}
