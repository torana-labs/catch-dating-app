import {brand} from "./brand.ts";

export const claimGuidance = {
  title: "How claiming works",
  steps: [
    {title: "Find your page", subtitle: "Search by its name, activity or city"},
    {title: "Sign in with your phone", subtitle: "So we know who to give the page to"},
    {title: "Prove it’s yours", subtitle: "With a code from its Instagram or its Luma calendar"},
  ],
  questionsTitle: "Questions",
  items: [
    {question: `Does a page mean the organiser is on ${brand.name}?`, answer: `No. Pages are made from public events, formats, reviews and their sources. A page doesn’t mean the organiser has claimed it or uses ${brand.stores.hostAppName}.`},
    {question: "How does claiming work?", answer: "Sign in with your phone, then send a code from the page’s Instagram account or add one to its Luma calendar. When the code checks out, the page is yours straight away. If neither works, send a link that shows the page is yours and a person reviews it. A review request alone does not attach Host tools or change the public page."},
    {question: "What could managing a listing include?", answer: "Review responses, event publishing, listing analytics and attached guest-list, check-in and messaging tools are the intended direction. Presence-management availability is confirmed separately; these are not automatic benefits of submitting a claim."},
    {question: "Pending, already claimed or unavailable?", answer: "A pending request waits for review, and you can still prove it straight away with a code. If another person has claimed the page, contact support for a reviewed dispute. Some listings cannot accept a claim yet. Follow the state shown for your actual listing; do not submit against a sample organiser."},
    {question: "Incorrect information or no listing?", answer: `Use Help to request a correction or raise an ownership dispute; corrections require review before publication. You can start a free ${brand.stores.hostAppName} trial whether or not you are listed.`},
  ],
  help: "Get listing help",
} as const;
