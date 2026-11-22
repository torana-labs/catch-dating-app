import {brand} from "./brand.ts";

/**
 * How a wide page offers an app, wherever it does (AppDownloadQr in
 * CatchCtaSection's storesWide): the QR code opens the band on the phone,
 * where the store button is, or the reader asks for the link on WhatsApp.
 * Phones get the store badges instead.
 */
export const appDownloadCopy = {
  host: {
    title: `On a laptop? Scan to get ${brand.stores.hostAppName}`,
    qrLabel: `QR code that opens ${brand.name} for hosts on your phone`,
    whatsappLink: "Get the link on WhatsApp",
    whatsappMessage: `Hi ${brand.name}, please send me the ${brand.stores.hostAppName} link.`,
  },
  guest: {
    title: `On a laptop? Scan to get the ${brand.name} app`,
    qrLabel: `QR code that opens the ${brand.name} app on your phone`,
    whatsappLink: "Get the link on WhatsApp",
    whatsappMessage: `Hi ${brand.name}, please send me the ${brand.name} app link.`,
  },
} as const;

/**
 * "Text me the link" beside the host app's store badges (AppLinkCapture): the
 * number field and button, the one short line under them with the privacy
 * policy linked, and the thanks that points at the badges and QR code right
 * below it. Staff send the link on WhatsApp from the lead alert, so the
 * thanks promises no instant message. `consentVersion` names the line's
 * wording on every stored consent; change it whenever the line changes.
 * Every page that shows the capture (the host landing's start band, the
 * playbook bands whose form is an app link request) uses these words.
 */
export const appLinkCopy = {
  formId: "host_app_link",
  label: "Your WhatsApp number",
  submit: "Text me the link",
  consent: `On WhatsApp, from ${brand.name}.`,
  consentVersion: "app-link-whatsapp-v1",
  privacy: "Privacy policy",
  retry: "Try again",
  sent: "Here’s the link. We’ll also send it to you on WhatsApp.",
} as const;
