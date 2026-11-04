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
import type {
    CartItem,
    ShippingAddress,
} from '../app/[locale]/(protected)/(main)/marketplace/_components/types';

/** What one cart line costs: unit price x quantity, nothing else. */
export const lineAmountMinor = (item: CartItem): number => toMinorUnits(item.price) * item.quantity;

export const cartTotalMinor = (cart: CartItem[]): number =>
    cart.reduce((sum, item) => sum + lineAmountMinor(item), 0);

/** Service orders take no shipping address, so a cart of only services needs none. */
export const cartNeedsShipping = (cart: CartItem[]): boolean => cart.some((item) => !item.isService);

/** Mirrors what marketplace-service's ShippingAddress refuses, plus the phone the form asks for. */
export function isShippingComplete(address: ShippingAddress): boolean {
    return (
        address.name.trim().length >= 2 &&
        address.address.trim().length >= 5 &&
        address.city.trim().length >= 2 &&
        address.country.trim().length > 0 &&
        address.phoneNumber.trim().length > 0
    );
}

export const formatShippingAddress = (a: ShippingAddress): string =>
    `${a.name}, ${a.address}, ${a.city}, ${a.country}, ${a.phoneNumber}`;
