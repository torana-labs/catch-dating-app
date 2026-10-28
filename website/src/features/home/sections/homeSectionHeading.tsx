import {CatchGap, CatchSplit, CatchText, type CatchTextAccent} from "@catch/web-ui";
import type {ReactNode} from "react";

/**
 * A homepage section opening: a coloured eyebrow, a display headline and a
 * lead, with the lead or an action across from the headline on a wide page.
 */
export function HomeSectionHeading({aside, eyebrow, eyebrowAccent, id, lead, title, titleVariant = "displayXl"}: {
  aside?: ReactNode;
  eyebrow: string;
  eyebrowAccent?: CatchTextAccent;
  id: string;
  lead?: string;
  title: string;
  titleVariant?: "displayXl" | "displayXxl";
}) {
  const opening = (
    <CatchGap size="related">
      <CatchText as="p" color={eyebrowAccent} variant="supportingStrong">{eyebrow}</CatchText>
      <CatchText as="h2" id={id} variant={titleVariant}>{title}</CatchText>
    </CatchGap>
  );
  const side = aside ?? (lead ? <CatchText as="p" color="ink2" variant="bodyLead">{lead}</CatchText> : null);
  return side ? <CatchSplit align="end" end={side} ratio="sevenFive" start={opening} /> : opening;
}
