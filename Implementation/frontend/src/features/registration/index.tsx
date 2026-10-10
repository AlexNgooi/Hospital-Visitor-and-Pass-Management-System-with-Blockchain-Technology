import type { FeatureSlot } from "../../app/features";
import { registrationQrFeatures } from "../registration-qr";
import { RegistrationPage } from "./registration";
/** Composition retains the reviewed M02 staff display and replaces only its reserved PUBLIC slot. */
export const registrationFeatures: readonly FeatureSlot[] = [
  ...registrationQrFeatures.filter(feature => feature.role !== "PUBLIC"),
  { path:"/register",label:"Visitor registration",role:"PUBLIC",element:<RegistrationPage /> },
];
