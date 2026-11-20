import {CatchButton, CatchQrCode, CatchStack, CatchText} from "@catch/web-ui";
import {appDownloadCopy} from "@content/appDownload";
import {whatsappChatHref} from "@content/site";

/**
 * How a wide page offers an app (CatchCtaSection's storesWide): a QR code
 * that opens the page's download band on the phone, where the store button
 * for that phone is, and a link to have the app's link sent on WhatsApp.
 * Phones get the store badges, not this. Every band that offers an app uses
 * it, so the action reads the same wherever it appears.
 */
export function AppDownloadQr({app, value}: {
  app: keyof typeof appDownloadCopy;
  /** What the code opens: the page's own download band, such as /host/#start. */
  value: string;
}) {
  const words = appDownloadCopy[app];
  return (
    <CatchStack align="center" direction="row" gap={16}>
      <CatchQrCode label={words.qrLabel} size="s" value={value} />
      <CatchStack gap={4}>
        <CatchText variant="label-action">{words.title}</CatchText>
        <CatchButton href={whatsappChatHref(words.whatsappMessage)} label={words.whatsappLink} newTab recipe="text" tone="neutral" />
      </CatchStack>
    </CatchStack>
  );
}
