import ConditionalFooter from "@/components/layout/ConditionalFooter";
import SiteFooter from "@/components/layout/SiteFooter";
import { BrowseProvider } from "@/components/browse/BrowseModals";
import NavigationGate from "@/components/layout/NavigationGate";
import SiteChrome from "@/components/layout/SiteChrome";
import { getShopCategories } from "@/lib/services/categories.service";
import { getBrands } from "@/lib/services/brands.service";
import { getSiteSettings } from "@/lib/services/site.service";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/locale";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return { description: t("description") };
}

// Shared server cache: pages are cached and refreshed on demand via /api/revalidate (and periodically every hour).
export const revalidate = 3600;

export default async function HomeLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [categories, settings, allBrands] = await Promise.all([getShopCategories(locale as Locale), getSiteSettings(), getBrands()]);
  const brands = allBrands.filter((b) => b.productCount > 0);

  return (
    <BrowseProvider categories={categories} brands={brands}>
      <div className="min-h-screen flex flex-col bg-background">
        <SiteChrome categories={categories} />
        <main className="flex-1">
            <NavigationGate>{children}</NavigationGate>
          </main>
        <ConditionalFooter>
          <SiteFooter settings={settings} categories={categories} />
        </ConditionalFooter>
      </div>
    </BrowseProvider>
  );
}
