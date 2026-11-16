// The playbook renderer's own words: the labels it adds around a page's
// content. Page copy lives in each page's JSON under ./pages.

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
  /** A flow's progress rail and tabs: their accessible names, and each step's status. */
  flowStepsLabel: "Steps",
  flowTabsLabel: "Sections",
  flowStepStatus: {complete: "Done", needsInformation: "To do", optional: "Optional"},
} as const;
