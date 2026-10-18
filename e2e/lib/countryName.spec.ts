/** Pure unit checks for the shared country-name helper (no browser). */
import { test, expect } from '@playwright/test';
import { countryName, locationWithCountryNames } from '../../src/lib/countryName';

test('alpha-3, alpha-2, any case and padding all resolve to the name', () => {
    expect(countryName('GHA', 'en')).toBe('Ghana');
    expect(countryName('gh', 'en')).toBe('Ghana');
    expect(countryName('  deu ', 'en')).toBe('Germany');
    expect(countryName('SWE', 'en')).toBe('Sweden');
});

test('the name follows the viewer locale', () => {
    expect(countryName('DEU', 'de')).toBe('Deutschland');
    expect(countryName('GHA', 'fr')).toBe('Ghana');
    expect(countryName('NLD', 'nl')).toBe('Nederland');
});

test('a value that is already a name, empty input and unknown codes are left alone', () => {
    expect(countryName('Germany', 'en')).toBe('Germany');
    expect(countryName('', 'en')).toBe('');
    expect(countryName(null, 'en')).toBe('');
    expect(countryName(undefined, 'en')).toBe('');
    expect(countryName('XYZ', 'en')).toBe('XYZ');
    expect(countryName('ZZ', 'en')).toBe('ZZ');
});

test('a "City, CODE" location shows the country name; typed place names are left alone', () => {
    expect(locationWithCountryNames('Accra, GHA', 'en')).toBe('Accra, Ghana');
    expect(locationWithCountryNames('Berlin, DE', 'de')).toBe('Berlin, Deutschland');
    expect(locationWithCountryNames('GHA', 'en')).toBe('Ghana');
    expect(locationWithCountryNames('Berlin', 'en')).toBe('Berlin');
    // Not all capitals: a city, never a country code (Bo is a city in Sierra Leone, BO is Bolivia).
    expect(locationWithCountryNames('Bo, SLE', 'en')).toBe('Bo, Sierra Leone');
    expect(locationWithCountryNames('Kumasi, Ghana', 'en')).toBe('Kumasi, Ghana');
    expect(locationWithCountryNames('  ', 'en')).toBe('');
    expect(locationWithCountryNames(null, 'en')).toBe('');
});
