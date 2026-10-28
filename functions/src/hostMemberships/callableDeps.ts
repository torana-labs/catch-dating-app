import {checkRateLimit} from "../shared/rateLimit";
import {requireOrganizerManager} from "../shared/organizerManagerAuthority";
import {
  defaultHostMembershipRuntime,
  type HostMembershipRuntime,
} from "./runtime";

export interface HostMembershipCallableDeps extends HostMembershipRuntime {
  checkRateLimit: typeof checkRateLimit;
  requireManager: typeof requireOrganizerManager;
}

export const defaultHostMembershipCallableDeps: HostMembershipCallableDeps = {
  ...defaultHostMembershipRuntime,
  checkRateLimit,
  requireManager: requireOrganizerManager,
};
