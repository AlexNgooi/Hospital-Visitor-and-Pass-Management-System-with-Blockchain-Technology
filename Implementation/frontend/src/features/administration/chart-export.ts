import type { Report } from "./contracts";
import { metric } from "./chart-data";
import { formatMyt } from "../../lib/time";

/** Temporary object URLs are revoked even on failure; generated images never leave this browser. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Capture SVG strings synchronously at click time so polling cannot mix chart versions during rasterization. */
export async function chartImage(report: Report, scope: string, sources: string[]) {
  if (sources.length !== 4) throw new Error("Charts unavailable");
  const canvas = document.createElement("canvas"); canvas.width = 1800; canvas.height = 1420;
  const context = canvas.getContext("2d"); if (!context) throw new Error("Image export unavailable");
  await document.fonts.ready;
  context.fillStyle = "#F7F8FA"; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#20232A"; context.font = "600 38px Geist, Arial"; context.fillText("HSAAS · Overview", 50, 65);
  context.font = "20px Geist, Arial"; context.fillText(`${report.from} to ${report.to} · MYT`, 50, 108);
  context.fillText(scope, 50, 143, 1700); context.fillText(`Snapshot: ${formatMyt(report.serverUpdatedAt)} MYT · ${report.origin}`, 50, 178, 1700);
  const cards = [["visits", "Registrations"], ["issued", "Passes issued"], ["returned", "Passes returned"], ["lost", "Closed lost"]];
  cards.forEach(([key, label], index) => { const x = 50 + index * 430; context.fillStyle = "white"; context.fillRect(x, 205, 410, 110); context.fillStyle = "#606773"; context.font = "20px Geist, Arial"; context.fillText(label, x + 20, 238); context.fillStyle = "#20232A"; context.font = "600 33px Geist, Arial"; context.fillText(metric(report, key)?.toLocaleString() ?? "Unavailable", x + 20, 286); });
  context.font = "20px Geist, Arial"; context.fillText(`Current: Unreturned ${metric(report, "inUse") ?? "Unavailable"} · Overdue ${metric(report, "overdue") ?? "Unavailable"} · No deadline ${metric(report, "noDeadline") ?? "Unavailable"}`, 50, 355);
  const titles = ["Daily registrations", "Registrations by visitor type", "Pass issues and actual returns", "Current inventory · All destinations"];
  for (let index = 0; index < sources.length; index++) {
    const x = 50 + index % 2 * 860, y = 390 + Math.floor(index / 2) * 450;
    context.fillStyle = "white"; context.fillRect(x, y, 840, 425); context.fillStyle = "#20232A"; context.font = "600 23px Geist, Arial"; context.fillText(titles[index], x + 20, y + 38);
    const url = URL.createObjectURL(new Blob([sources[index]], { type: "image/svg+xml;charset=utf-8" }));
    try { const image = new Image(); image.src = url; await image.decode(); context.drawImage(image, x + 10, y + 55, 820, 354); }
    finally { URL.revokeObjectURL(url); }
  }
  context.fillStyle = "#606773"; context.font = "18px Geist, Arial";
  context.fillText("Registrations and passes are counted separately. Current stock ignores historical dates and destination filters.", 50, 1332);
  context.fillText("Issue / return records describe staff handover, not detected hospital entry / exit. Synthetic demonstration data.", 50, 1368);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Image export failed")), "image/png"));
}
