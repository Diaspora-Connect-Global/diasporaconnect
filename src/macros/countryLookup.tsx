import { COUNTRIES } from "@/data/CountryCodesWithFlags";

export const countryLookup = COUNTRIES.reduce((acc, country) => {
  acc[country.code] = country;
  return acc;
}, {} as Record<string, typeof COUNTRIES[0]>);