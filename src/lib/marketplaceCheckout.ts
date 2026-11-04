/**
 * Marketplace checkout: what a cart costs. No React and no Apollo here, so every
 * rule below can be tested without a browser.
 *
 * Money: `CartItem.price` is major units (the API's integer minor units, divided
 * by 100 once when the listing was mapped). `toMinorUnits` here is the single
 * multiplication at the send boundary. Everything in this file that ends in
 * `Minor` is an integer.
 */
import { toMinorUnits } from '../types/money';
import type { CartItem } from '../app/[locale]/(protected)/(main)/marketplace/_components/types';

/** What one cart line costs: unit price x quantity, nothing else. */
export const lineAmountMinor = (item: CartItem): number => toMinorUnits(item.price) * item.quantity;

export const cartTotalMinor = (cart: CartItem[]): number =>
    cart.reduce((sum, item) => sum + lineAmountMinor(item), 0);
