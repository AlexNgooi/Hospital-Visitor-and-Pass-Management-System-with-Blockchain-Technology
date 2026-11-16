import { FileBarChart, FileClock, Settings, Users } from "lucide-react";
import type { FeatureSlot } from "../../app/features";
import { Navigate } from "react-router-dom";
import { AccountPage } from "./users";
import { SettingsPage } from "./settings";
import { AuditPage } from "./audit";
import "./administration.css";
import "./redesign.css";

/** Coordinator composes these ADMIN-only slots; no administrator is granted a counter workflow by this module. */
export const administrationFeatures: readonly FeatureSlot[] = [
  { path: "/admin/users", label: "Staff management", role: "ADMIN", icon: Users, element: <AccountPage /> },
  { path: "/admin/settings", label: "Operational settings", role: "ADMIN", icon: Settings, element: <SettingsPage /> },
  // Retain bookmarked report links while presenting one canonical Overview task.
  { path: "/admin/reports", label: "Overview", role: "ADMIN", icon: FileBarChart, element: <Navigate to="/admin" replace /> },
  { path: "/admin/audit", label: "System audit", role: "ADMIN", icon: FileClock, element: <AuditPage /> },
];
