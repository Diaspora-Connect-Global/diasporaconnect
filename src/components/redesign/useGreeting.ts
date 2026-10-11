import { useMemo } from 'react';

export type GreetingKey = 'morning' | 'afternoon' | 'evening';

/** Time-of-day greeting from the viewer's own clock (05–11 morning, 12–17 afternoon, else evening). */
export function greetingForHour(hour: number): GreetingKey {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

export function useGreeting(): GreetingKey {
  return useMemo(() => greetingForHour(new Date().getHours()), []);
}
