import {brand} from "./brand.ts";

// The host application page's copy. The landing's own copy is hostLanding.ts.
export const hostProductCopy = {
  application: {
    title: `Apply for a ${brand.stores.hostAppName} pilot`,
    body: "Tell us who hosts, your next real event, your current booking or RSVP setup and guest-list size, and the capabilities you would use. Review the details before sending. We review applications and follow up if the event is a fit; submission does not book a call or grant access.",
    back: `Explore ${brand.stores.hostAppName}`, action: "Apply for a pilot",
    note: "No platform switch is required to enquire. A public organiser listing is not required to apply.",
  },
} as const;
