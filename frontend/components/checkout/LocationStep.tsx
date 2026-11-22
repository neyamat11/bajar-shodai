"use client";

import LocationPicker from "@/components/location/LocationPicker";
import { shareLocation } from "@/lib/services/delivery.service";
import type { DeliveryQuote, PickedLocation } from "@/lib/types";
import type { Locale } from "@/lib/locale";
import { ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface Props {
  location: PickedLocation | null;
  onLocation: (l: PickedLocation | null) => void;
  quote: DeliveryQuote | null;
  quoting: boolean;
  onQuote: (q: DeliveryQuote | null, loading: boolean) => void;
  subtotal: number;
  slot?: string;
  onSlot?: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
  skipLocation?: boolean;
  onSkipLocationChange?: (skip: boolean) => void;
  isAbroadOrder?: boolean;
  onIsAbroadOrderChange?: (abroad: boolean) => void;
  senderCountry?: string;
  onSenderCountryChange?: (country: string) => void;
  senderContactMethod?: "WHATSAPP" | "IMO" | "PHONE";
  onSenderContactMethodChange?: (method: "WHATSAPP" | "IMO" | "PHONE") => void;
  senderContactNumber?: string;
  onSenderContactNumberChange?: (num: string) => void;
}

/** Step 2 — where on the map. The charge shows as soon as the pin is placed; Continue waits for a place we can deliver to. */
export default function LocationStep({
  location,
  onLocation,
  quote,
  quoting,
  onQuote,
  subtotal,
  onBack,
  onContinue,
  skipLocation = false,
  onSkipLocationChange,
  isAbroadOrder = false,
  onIsAbroadOrderChange,
  senderCountry = "",
  onSenderCountryChange,
  senderContactMethod = "WHATSAPP",
  onSenderContactMethodChange,
  senderContactNumber = "",
  onSenderContactNumberChange,
}: Props) {
  const t = useTranslations("Checkout");
  const locale = useLocale() as Locale;

  const isAbroadValid = !isAbroadOrder || Boolean(senderContactNumber?.trim());
  const ready = (skipLocation && isAbroadValid && !quoting) || (!!location && !!quote?.available && !quoting);

  function next() {
    if (!ready) return;
    if (skipLocation) {
      onContinue();
      return;
    }
    if (!location) return;
    // the final pin is saved as the customer's place (it was chosen on purpose: that is the consent)
    if (location.source !== "GPS") void shareLocation(location, subtotal, locale).catch(() => undefined);
    onContinue();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-outfit text-xl font-black text-foreground">{t("locationTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("locationLead")}</p>
      </div>

      <LocationPicker
        value={location}
        onChange={onLocation}
        subtotal={subtotal}
        onQuote={onQuote}
        skipLocation={skipLocation}
        onSkipLocationChange={onSkipLocationChange}
        isAbroadOrder={isAbroadOrder}
        onIsAbroadOrderChange={onIsAbroadOrderChange}
        senderCountry={senderCountry}
        onSenderCountryChange={onSenderCountryChange}
        senderContactMethod={senderContactMethod}
        onSenderContactMethodChange={onSenderContactMethodChange}
        senderContactNumber={senderContactNumber}
        onSenderContactNumberChange={onSenderContactNumberChange}
      />

      {!ready && (
        <p className="text-xs font-medium text-muted-foreground">
          {skipLocation && !isAbroadValid
            ? (locale === "bn" ? "অনুগ্রহ করে আপনার বর্তমান দেশ এবং সঠিক নম্বর দিন।" : "Please provide your country name and contact number.")
            : t("locationNeeded")}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onBack} className="flex-1 rounded border border-border py-3.5 text-sm font-semibold text-foreground/80 hover:border-input hover:text-foreground">
          <ArrowLeft className="mr-1 inline h-4 w-4" aria-hidden="true" />
          {t("back")}
        </button>
        <button type="button" onClick={next} disabled={!ready} className="flex-[2] rounded bg-brand-fresh py-3.5 text-sm font-black text-foreground shadow-[0_8px_24px_rgba(69,162,44,0.3)] transition-all hover:bg-brand-fresh/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50">
          {t("continuePayment")}
        </button>
      </div>
    </div>
  );
}
