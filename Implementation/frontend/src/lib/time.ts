/** Business display uses MYT; it never decides expiry from a client clock. */
export function formatMyt(utc: string, locale = "en-MY"): string {
  if (!utc.endsWith("Z") || !Number.isFinite(Date.parse(utc))) return "—";
  return new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Kuala_Lumpur",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(utc));
}
