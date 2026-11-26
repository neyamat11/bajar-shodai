"use client";

import { usePathname } from "@/i18n/navigation";

interface ConditionalFooterProps {
  children: React.ReactNode;
}

/**
 * Hides the footer on catalog listing pages (/products), category listing pages (/category/*),
 * and location-sharing pages (/l/*, /share-location), while preserving it on single product
 * detail pages (/products/[slug]) and other pages.
 */
export default function ConditionalFooter({ children }: ConditionalFooterProps) {
  const pathname = usePathname();
  const cleanPath = pathname?.replace(/\/$/, "") || "";

  const isAllProducts = cleanPath === "/products";
  const isCategoryListing = cleanPath.startsWith("/category");
  const isLocationShare = cleanPath.startsWith("/l/") || cleanPath === "/l" || cleanPath.startsWith("/share-location");

  if (isAllProducts || isCategoryListing || isLocationShare) {
    return null;
  }

  return <>{children}</>;
}
