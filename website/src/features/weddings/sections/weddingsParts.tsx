import {
  CatchIcon,
  CatchIndexRow,
  CatchSection,
  CatchStack,
  CatchSurface,
  CatchText,
  type CatchIconName,
  type CatchTextTone,
} from "@catch/web-ui";
import type {ReactNode} from "react";

/** A band's opening: a coloured kicker, the headline and an optional lead. */
export function Heading({id, kicker, title, body, tone = "secondary", size = "page"}: {
  id: string;
  kicker: string;
  title: string;
  body?: string;
  tone?: CatchTextTone;
  /** page: the board's display-xl (display-title on a phone); section: display-section (display-sm). */
  size?: "page" | "section";
}) {
  return (
    <CatchStack gap={12}>
      <CatchText tone={tone} variant="label-kicker">{kicker}</CatchText>
      <CatchText as="h2" id={id} variant={size === "page" ? "page-title" : "section-title"}>{title}</CatchText>
      {body ? <CatchText tone="secondary" variant="body-lead">{body}</CatchText> : null}
    </CatchStack>
  );
}

/** Every interface excerpt says who is looking, and on what, above the excerpt itself. */
export function WhoCard({label, night = false, children}: {label: string; night?: boolean; children: ReactNode}) {
  return (
    <CatchStack gap={8}>
      <CatchText tone="secondary" variant="label-kicker">{label}</CatchText>
      <CatchSurface block={night ? "spotlight" : "floating"} color={night ? "ink" : undefined} padding="md">{children}</CatchSurface>
    </CatchStack>
  );
}

/** Two or three excerpts side by side, stacking on a phone. */
export function CardRow({children}: {children: ReactNode}) {
  return <CatchStack align="start" collapseBelow="expanded" direction="row" equal gap={16}>{children}</CatchStack>;
}

/** The short icon rows under a chapter's text. */
export function Points({points}: {points: readonly {icon: CatchIconName; title: string; body: string}[]}) {
  return (
    <CatchSection dividers="none">
      {points.map((point) => <CatchIndexRow density="compact" icon={point.icon} key={point.title} subtitle={point.body} title={point.title} wrap />)}
    </CatchSection>
  );
}

/** One chapter of the wedding: its text and points beside what someone sees. */
export function Chapter({id, kicker, title, body, points, children}: {
  id: string;
  kicker: string;
  title: string;
  body: string;
  points: readonly {icon: CatchIconName; title: string; body: string}[];
  children: ReactNode;
}) {
  return (
    <CatchStack align="start" aria-labelledby={id} as="section" collapseBelow="expanded" direction="row" equal gap={48}>
      <CatchStack gap={12}>
        <CatchText tone="danger" variant="label-kicker">{kicker}</CatchText>
        <CatchText as="h3" id={id} variant="section-title">{title}</CatchText>
        <CatchText tone="secondary" variant="body">{body}</CatchText>
        <Points points={points} />
      </CatchStack>
      {children}
    </CatchStack>
  );
}

/** A WhatsApp message: the guest's own on the right, the wedding's on the left with its name. */
export function Message({mine = false, author, children}: {mine?: boolean; author?: string; children: ReactNode}) {
  return (
    <CatchStack direction="row" justify={mine ? "end" : "start"}>
      <CatchSurface block="tile" padding="sm">
        <CatchStack gap={4}>
          {author ? <CatchText tone="secondary" variant="label-kicker">{author}</CatchText> : null}
          {children}
        </CatchStack>
      </CatchSurface>
    </CatchStack>
  );
}

/** A file sent in a message: its icon, name and kind. */
export function Attachment({name, kind}: {name: string; kind: string}) {
  return (
    <CatchStack align="center" direction="row" gap={12}>
      <CatchIcon name="document" size={20} />
      <CatchStack gap={2}>
        <CatchText variant="label-action">{name}</CatchText>
        <CatchText tone="secondary" variant="body-meta">{kind}</CatchText>
      </CatchStack>
    </CatchStack>
  );
}
