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
