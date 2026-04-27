import { useMemo } from "react";
import { useLocale } from "next-intl";
import { useCurrencyStore, type DisplayCurrency } from "@/store/useCurrencyStore";
import { useUserStore } from "@/store/useUserStore";
import { resolveDisplayCurrency, getStoredDisplayCurrencyPreference } from "@/lib/displayCurrency";

export function useDisplayCurrency(): {
  currency: DisplayCurrency;
  setDisplayCurrency: (currency: DisplayCurrency) => void;
} {
  const stored = useCurrencyStore((s) => s.displayCurrency);
  const setDisplayCurrency = useCurrencyStore((s) => s.setDisplayCurrency);
  const residenceCountry = useUserStore((s) => s.user?.residenceCountry);
  const countryOfOrigin = useUserStore((s) => s.user?.countryOfOrigin);
  const locale = useLocale();

  const currency = useMemo(
    () =>
      resolveDisplayCurrency({
        // Zustand store wins; fall back to legacy localStorage keys for existing users
        preferredCurrency: stored ?? getStoredDisplayCurrencyPreference(),
        residenceCountry,
        countryOfOrigin,
        locale,
      }) as DisplayCurrency,
    [stored, residenceCountry, countryOfOrigin, locale]
  );

  return { currency, setDisplayCurrency };
}
