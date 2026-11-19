import ProductCard from "@/components/product/ProductCard";
import type { Product } from "@/lib/types";
import RevealGroup from "@/components/motion/RevealGroup";
import SectionHeader from "./SectionHeader";
import SectionMore from "./SectionMore";
import { useTranslations } from "next-intl";

export interface HomeCuratedSectionProps {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  categorySlug?: string | null;
  products: Product[];
}

export default function HomeCuratedSection({
  slug,
  title,
  subtitle,
  categorySlug,
  products,
}: HomeCuratedSectionProps) {
  const t = useTranslations("Home");
  const href = categorySlug ? `/category/${categorySlug}` : `/products`;
  const viewAllLabel = t("viewAllProducts");

  if (!products || products.length === 0) return null;

  return (
    <section
      className="overflow-x-clip bg-background pb-12 pt-8 sm:pt-10 md:pb-16 md:pt-12"
      aria-labelledby={`section-heading-${slug}`}
    >
      <RevealGroup className="relative mx-auto max-w-[1440px] px-4 md:px-8">
        <SectionHeader
          title={<span id={`section-heading-${slug}`}>{title}</span>}
          description={subtitle || undefined}
          href={href}
          hrefLabel={viewAllLabel}
        />

        <div className="grid grid-cols-2 gap-3 [perspective:1100px] sm:grid-cols-3 md:gap-4 lg:grid-cols-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} entrance={false} />
          ))}
        </div>

        <SectionMore href={href} label={viewAllLabel} />
      </RevealGroup>
    </section>
  );
}
