import { ClipboardCheck } from "lucide-react";
import type { FeatureSlot } from "../../../app/features";
import { RegistrationReview } from "./page";

/** Coordinator/M01 can register the reviewed slot without allowing M04 to edit shared routing or bootstrap. */
export const counterReviewFeatures: readonly FeatureSlot[] = [
  { path: "/staff/registrations", label: "Registration review", role: "COUNTER_STAFF", icon: ClipboardCheck, element: <RegistrationReview /> },
];
