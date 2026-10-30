/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Commercial terms as the Admin console reviews them. platform and organizer are the stored records (null when never saved); effectiveTerms merges them for the requested organizer, or is the platform terms for the platform scope (null while the platform is unconfigured). history holds the newest revisions of the requested scope. Lists are bounded and say when they are incomplete.
 */
export interface AdminListCommercialTermsCallableResponse {
  termsId: string;
  organizerId: string | null;
  organizerName: string | null;
  platform: {
    revision: number;
    terms: {
      currency: "INR";
      commission: {
        rateBasisPoints: number;
        /**
         * Cap per cycle in minor units; null means uncapped.
         */
        capMinor: number | null;
        cycleDays: number;
        cycleAnchor: "trialEnd";
        base: "netOfRefunds" | "gross";
        /**
         * exclusive: amounts are before GST, which is added on top.
         */
        taxTreatment: "exclusive" | "inclusive";
      };
      trial: {
        days: number;
        anchor: "firstEvent";
      };
      toolsOnly: {
        /**
         * Flat tools-only fee per commission cycle, in minor units, on the same tax treatment as the commission.
         */
        feeMinor: number;
      };
      gatewayFeeBearer: "host" | "platform";
      purposes: {
        eventAdmission: {
          countsTowardCommission: boolean;
          /**
           * Fee deducted from each payment before the organizer's transfer. Applies only when the purpose's money flow is platformSplit.
           */
          atSourceFeeBasisPoints: number;
        };
        formFee: {
          countsTowardCommission: boolean;
          /**
           * Fee deducted from each payment before the organizer's transfer. Applies only when the purpose's money flow is platformSplit.
           */
          atSourceFeeBasisPoints: number;
        };
        hostMembership: {
          countsTowardCommission: boolean;
          /**
           * Fee deducted from each payment before the organizer's transfer. Applies only when the purpose's money flow is platformSplit.
           */
          atSourceFeeBasisPoints: number;
        };
      };
    };
    reason: string;
    updatedByUid: string;
    updatedAtMillis: number;
  } | null;
  organizer: {
    revision: number;
    /**
     * Sparse organizer override. Every key is optional and an absent key inherits the platform default; commission.capMinor may be set to null to remove the cap.
     */
    terms: {
      commission?: {
        rateBasisPoints?: number;
        capMinor?: number | null;
        cycleDays?: number;
        cycleAnchor?: "trialEnd";
        base?: "netOfRefunds" | "gross";
        taxTreatment?: "exclusive" | "inclusive";
      };
      trial?: {
        days?: number;
        anchor?: "firstEvent";
      };
      toolsOnly?: {
        feeMinor?: number;
      };
      gatewayFeeBearer?: "host" | "platform";
      purposes?: {
        eventAdmission?: {
          countsTowardCommission?: boolean;
          atSourceFeeBasisPoints?: number;
        };
        formFee?: {
          countsTowardCommission?: boolean;
          atSourceFeeBasisPoints?: number;
        };
        hostMembership?: {
          countsTowardCommission?: boolean;
          atSourceFeeBasisPoints?: number;
        };
      };
    };
    reason: string;
    updatedByUid: string;
    updatedAtMillis: number;
  } | null;
  effectiveTerms: {
    currency: "INR";
    commission: {
      rateBasisPoints: number;
      /**
       * Cap per cycle in minor units; null means uncapped.
       */
      capMinor: number | null;
      cycleDays: number;
      cycleAnchor: "trialEnd";
      base: "netOfRefunds" | "gross";
      /**
       * exclusive: amounts are before GST, which is added on top.
       */
      taxTreatment: "exclusive" | "inclusive";
    };
    trial: {
      days: number;
      anchor: "firstEvent";
    };
    toolsOnly: {
      /**
       * Flat tools-only fee per commission cycle, in minor units, on the same tax treatment as the commission.
       */
      feeMinor: number;
    };
    gatewayFeeBearer: "host" | "platform";
    purposes: {
      eventAdmission: {
        countsTowardCommission: boolean;
        /**
         * Fee deducted from each payment before the organizer's transfer. Applies only when the purpose's money flow is platformSplit.
         */
        atSourceFeeBasisPoints: number;
      };
      formFee: {
        countsTowardCommission: boolean;
        /**
         * Fee deducted from each payment before the organizer's transfer. Applies only when the purpose's money flow is platformSplit.
         */
        atSourceFeeBasisPoints: number;
      };
      hostMembership: {
        countsTowardCommission: boolean;
        /**
         * Fee deducted from each payment before the organizer's transfer. Applies only when the purpose's money flow is platformSplit.
         */
        atSourceFeeBasisPoints: number;
      };
    };
  } | null;
  /**
   * @maxItems 20
   */
  history: {
    revision: number;
    terms:
      | {
          currency: "INR";
          commission: {
            rateBasisPoints: number;
            /**
             * Cap per cycle in minor units; null means uncapped.
             */
            capMinor: number | null;
            cycleDays: number;
            cycleAnchor: "trialEnd";
            base: "netOfRefunds" | "gross";
            /**
             * exclusive: amounts are before GST, which is added on top.
             */
            taxTreatment: "exclusive" | "inclusive";
          };
          trial: {
            days: number;
            anchor: "firstEvent";
          };
          toolsOnly: {
            /**
             * Flat tools-only fee per commission cycle, in minor units, on the same tax treatment as the commission.
             */
            feeMinor: number;
          };
          gatewayFeeBearer: "host" | "platform";
          purposes: {
            eventAdmission: {
              countsTowardCommission: boolean;
              /**
               * Fee deducted from each payment before the organizer's transfer. Applies only when the purpose's money flow is platformSplit.
               */
              atSourceFeeBasisPoints: number;
            };
            formFee: {
              countsTowardCommission: boolean;
              /**
               * Fee deducted from each payment before the organizer's transfer. Applies only when the purpose's money flow is platformSplit.
               */
              atSourceFeeBasisPoints: number;
            };
            hostMembership: {
              countsTowardCommission: boolean;
              /**
               * Fee deducted from each payment before the organizer's transfer. Applies only when the purpose's money flow is platformSplit.
               */
              atSourceFeeBasisPoints: number;
            };
          };
        }
      | {
          commission?: {
            rateBasisPoints?: number;
            capMinor?: number | null;
            cycleDays?: number;
            cycleAnchor?: "trialEnd";
            base?: "netOfRefunds" | "gross";
            taxTreatment?: "exclusive" | "inclusive";
          };
          trial?: {
            days?: number;
            anchor?: "firstEvent";
          };
          toolsOnly?: {
            feeMinor?: number;
          };
          gatewayFeeBearer?: "host" | "platform";
          purposes?: {
            eventAdmission?: {
              countsTowardCommission?: boolean;
              atSourceFeeBasisPoints?: number;
            };
            formFee?: {
              countsTowardCommission?: boolean;
              atSourceFeeBasisPoints?: number;
            };
            hostMembership?: {
              countsTowardCommission?: boolean;
              atSourceFeeBasisPoints?: number;
            };
          };
        };
    reason: string;
    actorUid: string;
    createdAtMillis: number;
  }[];
  historyComplete: boolean;
  /**
   * @maxItems 100
   */
  overrides: {
    organizerId: string;
    organizerName: string | null;
    revision: number;
    /**
     * Sparse organizer override. Every key is optional and an absent key inherits the platform default; commission.capMinor may be set to null to remove the cap.
     */
    terms: {
      commission?: {
        rateBasisPoints?: number;
        capMinor?: number | null;
        cycleDays?: number;
        cycleAnchor?: "trialEnd";
        base?: "netOfRefunds" | "gross";
        taxTreatment?: "exclusive" | "inclusive";
      };
      trial?: {
        days?: number;
        anchor?: "firstEvent";
      };
      toolsOnly?: {
        feeMinor?: number;
      };
      gatewayFeeBearer?: "host" | "platform";
      purposes?: {
        eventAdmission?: {
          countsTowardCommission?: boolean;
          atSourceFeeBasisPoints?: number;
        };
        formFee?: {
          countsTowardCommission?: boolean;
          atSourceFeeBasisPoints?: number;
        };
        hostMembership?: {
          countsTowardCommission?: boolean;
          atSourceFeeBasisPoints?: number;
        };
      };
    };
    reason: string;
    updatedAtMillis: number;
  }[];
  overridesComplete: boolean;
  /**
   * @maxItems 10
   */
  organizerMatches: {
    organizerId: string;
    organizerName: string | null;
    cityName: string | null;
  }[];
}
