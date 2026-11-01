// Copy for proving ownership of a listing straight away, by an Instagram
// message or a Luma calendar code (WebOrgV2 claim band). Handles and the
// calendar address come from the listing and our own account at runtime.

const at = (handle: string) => `@${handle}`;

export const claimVerificationCopy = {
  title: "Prove it’s yours in a minute",
  body: "Send us a code from the Instagram account on this page, or add one to its Luma calendar. When it checks out, the page is yours straight away, with no review.",
  unavailable: "Claiming isn’t switched on for this version of the site yet. Get listing help below and we’ll sort it out.",
  accountIntro: "First, sign in with your phone so we know who to give the page to.",
  loadingOptions: "Checking which ways work for this page…",
  methodsLabel: "How should we check it’s you?",
  instagramTitle: "Message us on Instagram",
  instagramSub: (listingHandle: string, catchHandle: string) =>
    `Send a code we show you from ${at(listingHandle)} to ${at(catchHandle)}`,
  lumaTitle: "Add a code to your Luma calendar",
  lumaSub: "Paste a code we show you into your calendar description",
  showCode: "Show my code",
  showingCode: "Getting your code…",
  pendingReview: "Your review request is in. You can skip the wait and prove it now.",
  reviewOffer: "Ask for a review instead",
  reviewIntro: "Send us a link that shows the page is yours, like your website or a post that names you. We’ll check it and tell you.",
  noMethods: "This page has no Instagram account or Luma calendar we can check yet. Send us a link that shows it’s yours, like your website or a post that names you, and we’ll check it.",
  proofLinks: "Links that show it’s yours",
  proofLinksHint: "One per line",
  note: "Anything we should know (optional)",
  requestReview: "Ask for a review",
  requestingReview: "Sending…",
  reviewNeedsLink: "Add at least one link that shows the page is yours.",
  requestedTitle: "We’ll check it.",
  requestedBody: "We’ll look at your links and tell you when the page is yours.",
  backToPage: "Back to the page",
  useCode: "Use a code instead",
  instagramHeading: (catchHandle: string) => `Send this code to ${at(catchHandle)} on Instagram`,
  instagramSteps: (listingHandle: string, catchHandle: string) => [
    `Open Instagram as ${at(listingHandle)}.`,
    `Send the code to ${at(catchHandle)} in a direct message.`,
    "Come back here. This page moves on by itself when your message arrives.",
  ],
  codeLabel: (code: string) => `Code ${code.split("").join(" ")}`,
  openInstagram: "Open Instagram",
  copyCode: "Copy code",
  copied: "Copied",
  waiting: (listingHandle: string) =>
    `Waiting for your message. The code works for 30 minutes, and only from ${at(listingHandle)}.`,
  wrongSender: (listingHandle: string) =>
    `That message came from a different Instagram account. Send the code from ${at(listingHandle)}.`,
  codeNotFound: "We couldn’t match the code you sent. Check it against the one above and send it again.",
  lumaHeading: "Add this code to your Luma calendar",
  lumaSteps: [
    "Open your calendar’s settings on Luma.",
    "Paste the code anywhere in the calendar description, then save.",
    "Come back and check. You can remove the code once your page is yours.",
  ],
  checkLuma: "Check my Luma page",
  checkingLuma: "Checking your Luma page…",
  lumaWaiting: (calendar: string) => `We read your public calendar at ${calendar.replace(/^https?:\/\//u, "")}. The code works for 30 minutes.`,
  lumaNotFound: "We couldn’t find the code on your Luma calendar yet. Save the description, wait a moment and check again.",
  expired: "This code has expired. Show a new one to try again.",
  newCode: "Show a new code",
  otherMethod: "Use another way",
  doneTitle: "It’s yours.",
  doneBody: "Add your links, connect your domain and reply to your reviews.",
  openPage: "Open your page",
  claimUnavailable: "This page can’t be claimed this way any more. Ask us to review it instead.",
  failed: "That didn’t work. Try again in a moment.",
} as const;
