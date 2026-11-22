"use client";

import { usePathname } from "@/i18n/navigation";
import AnimatedNumber from "@/components/cart/AnimatedNumber";
import { gsap } from "@/components/motion/gsap";
import { formatMoney, formatNumber } from "@/lib/format";
import { useCart } from "@/lib/hooks/use-cart";
import type { Locale } from "@/lib/locale";
import { ShoppingBasket } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

// pages that have their own cart / checkout screen: the floating cart would only be in the way
const HIDDEN_ON = ["/cart", "/checkout", "/order-confirmation"];

/**
 * The cart that follows you: a small card on the right edge of the screen (a bar along the bottom on phones)
 * with the number of items and the total, which counts up or down whenever the cart changes.
 * Tapping it opens the cart drawer.
 */
export default function FloatingCart() {
  const t = useTranslations("Cart");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const { cartCount, cartTotal, isOpen, openCart, loading } = useCart();
  const card = useRef<HTMLButtonElement>(null);
  const bar = useRef<HTMLButtonElement>(null);
  const last = useRef({ count: cartCount, total: cartTotal });

  const visible = !loading && cartCount > 0 && !isOpen && !HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // a small bump each time something is added
  useEffect(() => {
    const prev = last.current;
    last.current = { count: cartCount, total: cartTotal };
    if (!visible) return;
    if (cartTotal <= prev.total && cartCount <= prev.count) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = [card.current, bar.current].filter(Boolean);
    gsap.fromTo(targets, { scale: 1 }, { scale: 1.08, duration: 0.14, yoyo: true, repeat: 1, ease: "power2.out", overwrite: true });
  }, [cartCount, cartTotal, visible]);

  // the "scroll to top" and live chat buttons move up out of the phone bar's way
  useEffect(() => {
    document.documentElement.toggleAttribute("data-cart-bar", visible);
    const updateOffset = () => {
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty(
          "--cart-bar-offset",
          "0px"
        );
      }
    };
    updateOffset();
    window.addEventListener("resize", updateOffset);
    return () => {
      document.documentElement.removeAttribute("data-cart-bar");
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty("--cart-bar-offset", "0px");
      }
      window.removeEventListener("resize", updateOffset);
    };
  }, [visible]);

  if (!visible) return null;

  const items = t("floatItems", { count: formatNumber(cartCount, locale, 0) });
  const money = (n: number) => formatMoney(Math.round(n), locale);
  const label = t("floatAria", { items, total: formatMoney(cartTotal, locale) });

  return (
    <>
      {/* desktop and tablets: a card on the right, in the middle of the screen */}
      <button
        ref={card}
        type="button"
        onClick={openCart}
        aria-label={label}
        className="fixed right-0 top-1/2 z-[1400] hidden w-[92px] -translate-y-1/2 flex-col overflow-hidden rounded-l-xl border border-r-0 border-primary/30 bg-card text-center shadow-[0_14px_36px_-10px_rgba(11,98,52,0.5)] transition-transform hover:-translate-x-1 md:flex"
      >
        <span className="flex flex-col items-center gap-1 px-2 pb-2 pt-3">
          <ShoppingBasket className="h-7 w-7 text-primary dark:text-brand-fresh" aria-hidden="true" />
          <span className="text-[11px] font-bold leading-tight text-foreground">{items}</span>
        </span>
        <AnimatedNumber value={cartTotal} format={money} className="bg-brand-deep px-1 py-2 font-outfit text-[13px] font-extrabold tabular-nums text-white" />
      </button>

      {/* phones: compact floating cart on the bottom-left with price */}
      <button
        ref={bar}
        type="button"
        onClick={openCart}
        aria-label={label}
        style={{
          bottom: "calc(var(--sticky-bar-offset, 0px) + 0.75rem)",
        }}
        className="fixed left-3 z-[1400] flex items-center gap-2 rounded-full bg-primary/95 pl-2 pr-3 py-1.5 text-primary-foreground shadow-[0_10px_28px_-6px_rgba(11,98,52,0.75)] border border-white/20 backdrop-blur active:scale-95 transition-all duration-300 ease-out md:hidden"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white">
          <ShoppingBasket className="h-4 w-4" aria-hidden="true" />
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-fresh px-1 text-[10px] font-black text-on-fresh">
            {formatNumber(cartCount, locale, 0)}
          </span>
        </span>
        <AnimatedNumber
          value={cartTotal}
          format={money}
          className="rounded-full bg-brand-fresh px-2.5 py-1 font-outfit text-xs font-black tabular-nums text-on-fresh shadow-sm"
        />
      </button>
    </>
  );
}
