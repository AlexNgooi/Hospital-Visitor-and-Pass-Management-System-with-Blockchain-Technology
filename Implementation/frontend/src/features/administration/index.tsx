import { FileBarChart, FileClock, Settings, Users } from "lucide-react";
import type { FeatureSlot } from "../../app/features";
import { AccountPage } from "./users";
import { SettingsPage } from "./settings";
import { ReportsPage } from "./reports";
import { AuditPage } from "./audit";
import "./administration.css";

/** Coordinator composes these ADMIN-only slots; no administrator is granted a counter workflow by this module. */
export const administrationFeatures: readonly FeatureSlot[] = [
  { path: "/admin/users", label: "Staff accounts", role: "ADMIN", icon: Users, element: <AccountPage /> },
  { path: "/admin/settings", label: "Operational settings", role: "ADMIN", icon: Settings, element: <SettingsPage /> },
  { path: "/admin/reports", label: "Reports & overview", role: "ADMIN", icon: FileBarChart, element: <ReportsPage /> },
  { path: "/admin/audit", label: "Local audit", role: "ADMIN", icon: FileClock, element: <AuditPage /> },
];
