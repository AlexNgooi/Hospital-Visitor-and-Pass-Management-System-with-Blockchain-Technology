/** The fixed category prefix mirrors the server rule; only the positive numeric suffix is editable. */
export const passPrefixes: Readonly<Record<string, string>> = {
  EXECUTIVE: "exec-", PENJAGA: "penj-", VENDOR: "vend-", CONTRACTOR: "cont-",
};

/** Leading zeros normalize to the same code, preventing aliases such as exec-001 and exec-1. */
export function namedPass(category: string, number: string): string | null {
  const prefix = passPrefixes[category];
  if (!prefix || !/^[0-9]{1,4}$/.test(number) || Number(number) < 1) return null;
  return `${prefix}${Number(number)}`;
}
