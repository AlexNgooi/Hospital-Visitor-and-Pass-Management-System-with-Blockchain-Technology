import { createContext, useContext } from "react";
export const CounterContext = createContext<string | null>(null);

/** Counter selection is a view preference, never an authorization claim. */
export function useCounterScope(): string | null {
  return useContext(CounterContext);
}
