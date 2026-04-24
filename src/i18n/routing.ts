import {defineRouting} from 'next-intl/routing';
 
export const routing = defineRouting({
  locales: ['en', 'fr', 'it', 'de', 'nl'],
  defaultLocale: 'en'
});