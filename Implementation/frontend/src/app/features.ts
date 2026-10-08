import { createElement, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ClipboardCheck,
  QrCode,
  CreditCard,
  Users,
  Settings,
  FileClock,
} from "lucide-react";
import type { Role } from "../lib/contracts";
import { PendingFeature } from "./pending-feature";

/** Later owners replace an exact reserved slot through App.features, without changing the shell. */
export interface FeatureSlot {
  path: string;
  label: string;
  role: Role | "PUBLIC";
  icon?: LucideIcon;
  element: ReactNode;
}

export const reservedSlots: readonly FeatureSlot[] = [
  {
    path: "/staff/registrations",
    label: "Registration review",
    role: "COUNTER_STAFF",
    icon: ClipboardCheck,
    element: createElement(PendingFeature, { label: "Registration review" }),
  },
  {
    path: "/staff/registration-qr",
    label: "Registration QR",
    role: "COUNTER_STAFF",
    icon: QrCode,
    element: createElement(PendingFeature, { label: "Registration QR" }),
  },
  {
    path: "/staff/passes",
    label: "Pass lifecycle",
    role: "COUNTER_STAFF",
    icon: CreditCard,
    element: createElement(PendingFeature, { label: "Pass lifecycle" }),
  },
  {
    path: "/admin/users",
    label: "Staff accounts",
    role: "ADMIN",
    icon: Users,
    element: createElement(PendingFeature, { label: "Staff accounts" }),
  },
  {
    path: "/admin/settings",
    label: "Operational settings",
    role: "ADMIN",
    icon: Settings,
    element: createElement(PendingFeature, { label: "Operational settings" }),
  },
  {
    path: "/admin/audit",
    label: "Local audit",
    role: "ADMIN",
    icon: FileClock,
    element: createElement(PendingFeature, { label: "Local audit" }),
  },
];
export const homeIcon = LayoutDashboard;

/** Validate module registration; PUBLIC can only replace the visitor entry slot. */
export function mergeFeatureSlots(
  features: readonly FeatureSlot[],
): FeatureSlot[] {
  const slots = [...reservedSlots];
  const seen = new Set<string>();
  for (const feature of features) {
    const prefix =
      feature.role === "PUBLIC"
        ? "/register"
        : feature.role === "ADMIN"
          ? "/admin/"
          : "/staff/";
    if (
      (feature.role === "PUBLIC"
        ? feature.path !== prefix
        : !feature.path.startsWith(prefix)) ||
      seen.has(feature.path) ||
      !/^\/[a-z0-9/-]+$/.test(feature.path)
    )
      throw new Error("Invalid feature slot.");
    seen.add(feature.path);
    const existing = slots.findIndex((slot) => slot.path === feature.path);
    if (existing >= 0) slots[existing] = feature;
    else slots.push(feature);
  }
  return slots;
}
