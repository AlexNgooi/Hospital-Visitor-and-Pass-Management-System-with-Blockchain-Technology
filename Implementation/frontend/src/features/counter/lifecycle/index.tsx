import { CreditCard, Library } from "lucide-react";
import type { FeatureSlot } from "../../../app/features";
import { StaffLifecycle } from "./staff";
import { AdminInventory } from "./admin";

/** Coordinator composes these independent role slots in main.tsx; this module does not edit the shared shell. */
export const counterLifecycleFeatures: readonly FeatureSlot[] = [
  { path: "/staff/passes", label: "Pass lifecycle", role: "COUNTER_STAFF", icon: CreditCard, element: <StaffLifecycle /> },
];
export const adminInventoryFeatures: readonly FeatureSlot[] = [
  { path: "/admin/cards", label: "Card inventory", role: "ADMIN", icon: Library, element: <AdminInventory /> },
];
