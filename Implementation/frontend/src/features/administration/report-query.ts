/** Report links carry only bounded MYT dates and reference IDs, never staff or visitor fields. */
export function reportQuery(input: URLSearchParams): string | null {
  const allowed = ["from", "to", "categoryId", "destinationId"];
  if (Array.from(input.keys()).some(key => !allowed.includes(key) || input.getAll(key).length !== 1)) return null;
  const from = input.get("from"), to = input.get("to");
  const validDate = (value: string | null): value is string => Boolean(value && /^20[0-9]{2}-[0-9]{2}-[0-9]{2}$|^2100-[0-9]{2}-[0-9]{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value);
  if (!validDate(from) || !validDate(to)) return null;
  const days = (Date.parse(to) - Date.parse(from)) / 86400000;
  if (days < 0 || days > 365) return null;
  const query = new URLSearchParams({ from, to });
  for (const name of ["categoryId", "destinationId"]) {
    const value = input.get(name);
    if (value !== null) { if (!/^[1-9][0-9]{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) return null; query.set(name, value); }
  }
  return query.toString();
}
