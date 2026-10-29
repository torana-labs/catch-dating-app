import {CatchGap, CatchText} from "@catch/web-ui";
import type {ReactNode} from "react";

/** A section's display heading, with a note or an action across from it on wide pages. */
export function organizerSectionHeading({action, id, note, title}: {
  action?: ReactNode;
  id: string;
  note?: string;
  title: string;
}) {
  return (
    <CatchGap crossAxisAlignment="baseline" direction="horizontal" mainAxisAlignment="spaceBetween" size="related" wrap>
      <CatchText as="h2" id={id} variant="displayM">{title}</CatchText>
      {note ? <CatchText color="ink2" variant="bodyM">{note}</CatchText> : null}
      {action ?? null}
    </CatchGap>
  );
}
