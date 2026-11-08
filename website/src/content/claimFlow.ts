// The claim flow's page copy, step for step as the RbWebClaim boards
// (SignIn, Choose, Code, Done, Review, Sent and the desktop Code board).
// Listing names, handles and the owner's first name are filled at runtime;
// the code itself, the check copy and the errors live in claimVerification.ts.
import {brand} from "./brand.ts";

export const claimFlowCopy = {
  kicker: "Claim your page",
  signIn: {
    title: "Is {name} yours?",
    body: "Claim it free. Edit it, add your links and reply to reviews. Takes about a minute.",
    sendCode: "Text me a code",
  },
  choose: {title: "Prove it’s yours"},
  instagramCode: {
    title: "Send us this code",
    body: "From @{handle} on Instagram. When it arrives, the page is yours. No review, no waiting.",
  },
  lumaCode: {
    title: "Add this code to Luma",
    body: "Paste it into your Luma calendar’s description. When we find it, the page is yours. No review, no waiting.",
  },
  done: {
    title: "It’s yours, {name}.",
    titleWithoutName: "It’s yours.",
    body: "{name} is now your page. Changes show up straight away.",
  },
  review: {
    title: "Ask for a review",
    body: "Send us a link that shows the page is yours. A person checks it, usually within a day.",
  },
  sent: {
    title: "Thanks, we’ve got it.",
    noticeTitle: "We’ll check it",
    notice: "{name}, we’ll check your links and text you when the page is yours. You can still prove it straight away with a code.",
    noticeWithoutName: "We’ll check your links and text you when the page is yours. You can still prove it straight away with a code.",
    useCode: "Use a code instead",
    backToPage: "Back to the page",
  },
  card: {
    unclaimed: "Not claimed yet",
    claimed: "Yours",
    change: "Change",
  },
  steps: [
    {title: "Sign in with your phone", subtitle: "So we know who to give the page to"},
    {title: "Prove it’s yours", subtitle: "With a code from its Instagram"},
  ],
  codeAside: "Can’t message from that account? Ask for a review instead.",
  next: {
    title: "What to do next",
    items: [
      {icon: "link", title: "Add your links", subtitle: "Put this page in your Instagram bio, with your WhatsApp group and Luma."},
      {icon: "web", title: "Use your own domain", subtitle: "Point your website at this page if you like."},
      {icon: "feedback", title: "Reply to reviews", subtitle: "Thank people and answer questions in public."},
    ],
    openPage: "Open your page",
    host: `Get ${brand.stores.hostAppName} to run your events`,
  },
  footerLabel: "Footer",
  reviewFootnote: "We already have your name and phone from signing in.",
} as const;
