// The playbook renderer's own words: the labels it adds around a page's
// content. Page copy lives in each page's JSON under ./pages.
import {brand} from "../brand.ts";

export const playbookCopy = {
  /** The breadcrumb row's accessible name. */
  breadcrumbLabel: "Breadcrumb",
  /** Under every illustrative screen: sample data, not a real organiser. */
  illustrativeCaption: "Illustrative screen",
  /** The footnotes band's accessible name. */
  footnotesLabel: "Notes",
  /** Beside every WhatsApp action: a person answers, without a promised hour. */
  whatsappReply: "We reply on WhatsApp, usually within an hour.",
  /** A tab band's tab list and an article's contents: their accessible names. */
  tabsLabel: "Choose one",
  articleTocLabel: "On this page",
  /** Under a host story's figure: what it counts and where it comes from (content/stories). */
  storyFigure: {
    line: "{label} · {source}",
    sources: {catchRecords: `From ${brand.name} records`, selfReported: "Self-reported"},
  },
  /** A flow's progress rail and tabs: their accessible names, and each step's status. */
  flowStepsLabel: "Steps",
  flowTabsLabel: "Sections",
  flowStepStatus: {complete: "Done", needsInformation: "To do", optional: "Optional"},
  /**
   * A lead form's words around the page's own (its field labels, button and
   * note): the consent line under the button, the retry, the line under a
   * field left empty, and the thanks for each kind of request.
   */
  leadForm: {
    /** {action} is the form's button, as the page words it. */
    consent: "Tapping {action} means we’ll message you on WhatsApp about this request.",
    /** Names this wording on every stored consent; change it whenever the wording changes. */
    consentVersion: "playbook-lead-whatsapp-v1",
    privacy: "Privacy policy",
    retry: "Try again",
    /** Under a field left empty when the button is tapped. */
    required: {
      name: "Enter your name.",
      whatYouHost: "Say what you host.",
      orgName: "Enter the name.",
      area: "Enter the area and city.",
      capacity: "Say how many people fit.",
      nights: "Say which nights you’d like to fill.",
      preferredTime: "Say when suits you.",
      hostName: "Enter the host’s name.",
      hostLink: "Add their Instagram or website.",
      relationship: "Say how you know them.",
    },
    /** In the form's place once it is sent. */
    sent: {
      guide: "Done. We’ll send you the guide on WhatsApp.",
      venue: "Thanks. We’ll message you on WhatsApp about your space.",
      demo: "Thanks. We’ll message you on WhatsApp when your demo is ready.",
      walkthrough: "Thanks. We’ll confirm your time on WhatsApp.",
      referral: "Thanks. We’ll get in touch with them and keep you posted on WhatsApp.",
    },
  },
} as const;
