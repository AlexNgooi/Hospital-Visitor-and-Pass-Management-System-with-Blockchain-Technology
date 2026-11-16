import type { Report } from "./contracts";

export const categoryLabels: Record<string, string> = { PENJAGA: "Penjaga", EXECUTIVE: "Executive", VENDOR: "Vendor", CONTRACTOR: "Contractor" };
export const colors = ["#087F82", "#557CA6", "#CA0026", "#B46B0A"];
export function metric(report: Report, key: string) { return report.metrics.find(item => item.metric === key)?.amount; }

/** Missing calendar groups from a successful query are zero-filled, including MYT boundary days. */
export function series(report: Report, key: string) {
  const values = new Map(report.metrics.filter(item => item.metric === key).map(item => [item.label, item.amount]));
  const points: { label: string; amount: number }[] = [];
  for (let day = Date.parse(`${report.from}T00:00:00Z`); day <= Date.parse(`${report.to}T00:00:00Z`) && points.length < 366; day += 86400000) {
    const label = new Date(day).toISOString().slice(0, 10); points.push({ label, amount: values.get(label) ?? 0 });
  }
  return points;
}

