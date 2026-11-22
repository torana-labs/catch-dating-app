import {setGlobalOptions} from "firebase-functions";
import * as admin from "firebase-admin";

setGlobalOptions({
  region: "asia-south1",
  maxInstances: 50,
  memory: "512MiB",
});

admin.initializeApp();

// Each area lists the Functions it deploys in src/<area>/functions.ts;
// functions/scripts/functionExports.cjs reads this list.
export * from "./catchMessaging/functions";
export * from "./payments/functions";
export * from "./commercialTerms/functions";
export * from "./organizerEventOfferRecipients/functions";
export * from "./events/functions";
export * from "./eventSuccess/functions";
export * from "./eventRehearsal/functions";
export * from "./places/functions";
export * from "./organizers/functions";
export * from "./publicPages/functions";
export * from "./cityPlans/functions";
export * from "./memberships/functions";
export * from "./hostMemberships/functions";
export * from "./customDomains/functions";
export * from "./matching/functions";
export * from "./marketplace/functions";
export * from "./reviews/functions";
export * from "./profiles/functions";
export * from "./crossPaths/functions";
export * from "./media/functions";
export * from "./waitlist/functions";
export * from "./safety/functions";
export * from "./supportInbox/functions";
export * from "./takedownRequests/functions";
export * from "./discovery/functions";
export * from "./moderation/functions";
export * from "./demoOps/functions";
export * from "./search/functions";
export * from "./admin/functions";
export * from "./entitlements/functions";
export * from "./analytics/functions";
export * from "./messaging/functions";
export * from "./chats/functions";
export * from "./programs/functions";
export * from "./hostWork/functions";
export * from "./moments/functions";
export * from "./programRsvp/functions";
export * from "./transport/functions";
export * from "./doorJournal/functions";
export * from "./organizerResponseQuery/functions";
export * from "./organizerEventOffers/functions";
export * from "./organizerFormAdmission/functions";
export * from "./operations/functions";
export * from "./instantDrafts/functions";
export * from "./commands/functions";
export * from "./salesDemo/functions";
export * from "./salesAssistant/functions";
export * from "./organizerInsights/functions";
export * from "./partners/functions";
export * from "./hostReadModels/functions";
export * from "./chatSignals/functions";
export * from "./guestEvents/functions";
export * from "./acquisition/functions";
export * from "./growth/functions";
export * from "./money/functions";
export * from "./hostAlerts/functions";
export * from "./foundingHosts/functions";
export * from "./cityInterest/functions";
export * from "./walkthroughs/functions";
