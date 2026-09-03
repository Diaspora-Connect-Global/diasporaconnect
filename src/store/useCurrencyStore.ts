import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type DisplayCurrency = "GHS" | "USD" | "EUR" | "GBP";

interface CurrencyState {
  displayCurrency: DisplayCurrency | null;
  setDisplayCurrency: (currency: DisplayCurrency) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      displayCurrency: null,
      setDisplayCurrency: (currency) => set({ displayCurrency: currency }),
    }),
    {
      name: "currency-preference",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
