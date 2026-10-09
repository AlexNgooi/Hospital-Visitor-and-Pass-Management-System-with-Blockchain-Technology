import { RegistrationQrDisplay } from "./display";
import { RegistrationEntry } from "./entry";
import type { FeatureSlot } from "../../app/features";
import { QrCode } from "lucide-react";

/** Explicit injection replaces only M02's reserved staff/public slots, leaving shared routing/auth intact. */
export const registrationQrFeatures: readonly FeatureSlot[] = [
  { path: "/staff/registration-qr", label: "Registration QR", role: "COUNTER_STAFF", icon: QrCode, element: <RegistrationQrDisplay /> },
  { path: "/register", label: "Visitor registration", role: "PUBLIC", element: <RegistrationEntry /> },
];
