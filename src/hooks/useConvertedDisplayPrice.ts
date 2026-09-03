"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useApolloClient } from "@apollo/client/react";
import { CONVERT_CURRENCY } from "@/services/gql/marketplace";
import { formatAmountWithCurrency } from "@/lib/displayCurrency";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";

type ConvertCurrencyData = {
  convertCurrency: {
    success: boolean;
    converted_amount: number;
    to_currency: string;
  };
};

/**
 * Display-side currency conversion for marketplace listings.
 *
 * The platform SETTLES in the listing currency (no FX); this hook only affects
 * what the viewer SEES. It returns a formatted string in the viewer's display
 * currency, or `null` when conversion is unnecessary (display === listing) or
 * unavailable (no rate / network error). Callers should fall back to
 * listing-currency formatting when this returns `null` — conversion is
 * strictly non-blocking.
 *
 * @param majorAmount Amount in MAJOR units of the listing currency (e.g. 19.99).
 * @param listingCurrency ISO 4217 code the listing is priced/charged in.
 */
export function useConvertedDisplayPrice(
  majorAmount: number,
  listingCurrency?: string | null,
): string | null {
  const apolloClient = useApolloClient();
  const locale = useLocale();
  const { currency: displayCurrency } = useDisplayCurrency();
  const [label, setLabel] = useState<string | null>(null);

  const fromCurrency = (listingCurrency ?? "GHS").toUpperCase();

  useEffect(() => {
    let cancelled = false;

    const convert = async () => {
      if (
        displayCurrency === fromCurrency ||
        !Number.isFinite(majorAmount) ||
        majorAmount <= 0
      ) {
        if (!cancelled) setLabel(null);
        return;
      }
      try {
        const { data } = await apolloClient.query<ConvertCurrencyData>({
          query: CONVERT_CURRENCY,
          variables: {
            // convertCurrency speaks integer minor units in AND out.
            amount: Math.round(majorAmount * 100),
            from_currency: fromCurrency,
            to_currency: displayCurrency,
          },
          fetchPolicy: "no-cache",
        });
        const result = data?.convertCurrency;
        if (!result?.success || typeof result.converted_amount !== "number") {
          if (!cancelled) setLabel(null);
          return;
        }
        if (!cancelled) {
          setLabel(
            formatAmountWithCurrency(
              result.converted_amount / 100,
              displayCurrency,
              locale,
            ),
          );
        }
      } catch {
        if (!cancelled) setLabel(null);
      }
    };

    void convert();
    return () => {
      cancelled = true;
    };
  }, [apolloClient, displayCurrency, fromCurrency, majorAmount, locale]);

  return label;
}
