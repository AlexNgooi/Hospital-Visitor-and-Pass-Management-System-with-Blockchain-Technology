import { useId } from "react";
import type { Report } from "./contracts";

import { colors, categoryLabels, metric, series } from "./chart-data";

/** SVGs have explicit paint/fonts so the exact visible chart can also be rasterized without external resources. */
export function TrendChart({ report, movement = false }: { report: Report; movement?: boolean }) {
  const title = useId(), first = series(report, movement ? "dayIssued" : "day"), second = movement ? series(report, "dayReturned") : [];
  const ceiling = Math.max(5, Math.ceil(Math.max(...first.map(item => item.amount), ...second.map(item => item.amount), 0) / 5) * 5);
  const x = (index: number) => 54 + (first.length <= 1 ? 280 : index * 560 / (first.length - 1));
  const y = (amount: number) => 216 - amount * 170 / ceiling;
  const points = (items: typeof first) => items.map((item, index) => `${x(index)},${y(item.amount)}`).join(" ");
  return <svg data-report-chart="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 650 280" role="img" aria-labelledby={title} fontFamily="Arial, sans-serif" fontSize="14" fill="#606773">
    <title id={title}>{movement ? "Passes issued and actually returned" : "Daily registrations"}, {report.from} to {report.to}, MYT. Exact values are available in the data table.</title>
    {[0, 1, 2, 3, 4, 5].map(step => <g key={step}><line x1="54" x2="614" y1={y(ceiling * step / 5)} y2={y(ceiling * step / 5)} stroke="#E5E7EB" /><text x="44" y={y(ceiling * step / 5) + 4} textAnchor="end">{ceiling * step / 5}</text></g>)}
    <text x="54" y="23">{movement ? "Pass count" : "Registration count"}</text>
    <polyline points={points(first)} fill="none" stroke="#CA0026" strokeWidth="3" strokeLinejoin="round" />
    {first.length <= 31 && first.map((item, index) => <circle key={item.label} cx={x(index)} cy={y(item.amount)} r="3" fill="white" stroke="#CA0026"><title>{item.label}: {item.amount}</title></circle>)}
    {movement && <polyline points={points(second)} fill="none" stroke="#087F82" strokeWidth="3" strokeDasharray="7 4" />}
    {first.filter((_, index) => first.length <= 6 || index % Math.ceil((first.length - 1) / 5) === 0 || index === first.length - 1).map(item => <text key={item.label} x={x(first.indexOf(item))} y="239" textAnchor="middle">{item.label.slice(5)}</text>)}
    <text x="54" y="268" fill="#CA0026">━━ {movement ? "Issued" : "Registrations"}</text>{movement && <text x="205" y="268" fill="#087F82">┄┄ Actually returned</text>}
  </svg>;
}

export function CategoryChart({ report }: { report: Report }) {
  const title = useId();
  const values = Object.entries(categoryLabels).map(([code, label]) => ({ code, label, amount: report.metrics.find(item => item.metric === "category" && item.label === code)?.amount ?? 0 })).sort((a, b) => b.amount - a.amount);
  const max = Math.max(...values.map(item => item.amount), 1);
  return <svg data-report-chart="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 650 280" role="img" aria-labelledby={title} fontFamily="Arial, sans-serif" fontSize="15" fill="#20232A">
    <title id={title}>Registrations by visitor type. {values.map(item => `${item.label}: ${item.amount}`).join(", ")}</title>
    {values.map((item, index) => <g key={item.code}><text x="12" y={53 + index * 52}>{item.label}</text><rect x="125" y={32 + index * 52} width={item.amount * 420 / max} height="30" rx="3" fill={colors[Object.keys(categoryLabels).indexOf(item.code)]} /><text x={137 + item.amount * 420 / max} y={53 + index * 52}>{item.amount.toLocaleString()}</text></g>)}
    <text x="12" y="268" fontSize="14" fill="#606773">Total registrations: {metric(report, "visits")?.toLocaleString() ?? "Unavailable"}</text>
  </svg>;
}

export function InventoryChart({ report }: { report: Report }) {
  const title = useId();
  const items = [["available", "Available"], ["issuedCards", "Issued / overdue"], ["lostCards", "Lost"], ["disabledCards", "Disabled"]].map(([key, label]) => ({ label, amount: metric(report, key) }));
  if (items.some(item => item.amount === undefined)) return <p>Inventory breakdown unavailable. Refresh the report.</p>;
  const total = items.reduce((sum, item) => sum + item.amount!, 0); let offset = 20;
  return <svg data-report-chart="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 650 280" role="img" aria-labelledby={title} fontFamily="Arial, sans-serif" fontSize="15" fill="#20232A">
    <title id={title}>Current inventory: {items.map(item => `${item.label}: ${item.amount}`).join(", ")}</title><text x="20" y="36" fontWeight="bold">Total passes: {total.toLocaleString()}</text>
    <rect x="20" y="65" width="610" height="42" rx="4" fill="#F1F3F5" />
    {items.map((item, index) => { const x = offset, width = total ? item.amount! * 610 / total : 0; offset += width; return <g key={item.label}><rect x={x} y="65" width={width} height="42" fill={colors[index]} />{width > 45 && <text x={x + width / 2} y="92" textAnchor="middle" fill="white">{item.amount}</text>}<rect x={20 + index % 2 * 315} y={145 + Math.floor(index / 2) * 44} width="12" height="12" rx="2" fill={colors[index]} /><text x={42 + index % 2 * 315} y={157 + Math.floor(index / 2) * 44}>{item.label}: {item.amount?.toLocaleString()}</text></g>; })}
    {!total && <text x="325" y="92" textAnchor="middle">No enrolled passes</text>}<text x="20" y="252" fontSize="13" fill="#606773">Category filter only · All destinations · Current snapshot</text>
  </svg>;
}
