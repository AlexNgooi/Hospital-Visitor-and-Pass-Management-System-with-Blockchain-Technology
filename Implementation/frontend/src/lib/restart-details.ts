import { z } from "zod";
import {
  formContextSchema,
  registrationScopeSchema,
  type RegistrationScope,
} from "./contracts";

/** Frozen C10 details are decoded before M02 adapts authorised IDs into safe display labels. */
export const restartDetailsSchema = z.object({
  currentFormContext: formContextSchema,
  currentScope: registrationScopeSchema,
  requestedScope: registrationScopeSchema,
});
export type RestartDetails = {
  currentFormContext: z.infer<typeof formContextSchema>;
  currentScope: RegistrationScope;
  requestedScope: RegistrationScope;
};
