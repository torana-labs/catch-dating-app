import {
  CatchBand,
  CatchBandHeader,
  CatchButton,
  CatchCtaSection,
  CatchFaqSection,
  CatchFeatureTile,
  CatchFlowLayout,
  CatchFormStepList,
  CatchGrid,
  CatchHeroSection,
  CatchPageTabBar,
  CatchScreenPreview,
  CatchSplitSection,
  CatchStack,
  CatchText,
  type CatchBandAction,
  type CatchBandGround,
  type CatchScreenPreviewProps,
} from "@catch/web-ui";
import type {ComponentType, ReactNode} from "react";
import {playbookCopy} from "../../content/playbook/playbookCopy";
import {
  playbookGrounds,
  type PlaybookGround,
  type PlaybookMedia,
  type PlaybookPageDocument,
  type PlaybookSectionOf,
} from "../../content/playbook/playbookContract";
import {captureSlot, type CaptureSlots} from "../../shared/media/captureSlot";
import {useAppDownloadCtas} from "../marketing/useAppDownloadCtas";
import type {BoundPlaybookSectionType} from "./playbookBindings";
import type {PlaybookPageController} from "./usePlaybookPageController";

// The contract's grounds are exactly the kit's: a ground added to either
// side fails here until the other has it too.
type SameSet<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const groundParity: SameSet<PlaybookGround, CatchBandGround> = true;
void groundParity;
void playbookGrounds;

/** What every section binding gets besides its own section. */
export interface PlaybookSectionContext {
  readonly page: PlaybookPageDocument;
  readonly controller: PlaybookPageController;
  readonly captures: CaptureSlots;
}

type Binding<T extends BoundPlaybookSectionType> = ComponentType<{section: PlaybookSectionOf<T>; context: PlaybookSectionContext}>;

/** The kit's footnote mark on a proof line: its number, linking to the note under the page. */
function footnoteMark(page: PlaybookPageDocument, id: string | undefined) {
  if (!id) return undefined;
  const index = (page.footer.footnotes ?? []).findIndex((footnote) => footnote.id === id);
  return {label: String(index + 1), href: `#footnote-${id}`};
}

/**
 * One media item as the kit draws it: a capture in its device frame, a photo,
 * or an illustrative screen card captioned as illustrative.
 */
function PlaybookMediaView({media, captures, card = "card"}: {media: PlaybookMedia; captures: CaptureSlots; card?: "card" | "phonecard"}) {
  if (media.kind === "capture") {
    const capture = captureSlot(captures, media.slot);
    if (!capture) return null;
    const tablet = (capture.width ?? 0) > (capture.height ?? 0);
    return <CatchScreenPreview caption={typeof capture.caption === "string" ? capture.caption : undefined} image={capture.src} kind={tablet ? "tablet" : "phone"} semanticsLabel={capture.alt} />;
  }
  if (media.kind === "photo") {
    return <CatchScreenPreview image={media.asset} kind="photo" semanticsLabel={media.alt} tag={media.note} />;
  }
  const {card: screen} = media;
  const props: CatchScreenPreviewProps = {
    kind: card,
    semanticsLabel: screen.subtitle ? `${screen.title}. ${screen.subtitle}` : screen.title,
    caption: playbookCopy.illustrativeCaption,
    title: screen.title,
    subtitle: screen.subtitle,
    label: screen.label,
    stats: screen.stats,
    bars: screen.bars,
    rows: screen.rows?.map((row) => ({title: row.title, subtitle: row.detail, value: row.value, tag: row.tag})),
    fields: screen.fields,
    buttons: screen.actions?.map((label) => ({label})),
    tiles: screen.tiles,
    fine: screen.note,
  };
  return <CatchScreenPreview {...props} />;
}

function media(section: {media?: PlaybookMedia}, captures: CaptureSlots, card?: "card" | "phonecard"): ReactNode {
  return section.media ? <PlaybookMediaView captures={captures} card={card} media={section.media} /> : undefined;
}

/** The contract allows 2, 3 or 4 columns, the grid's own choices. */
function gridColumns(columns: number | undefined): 2 | 3 | 4 {
  return columns === 2 || columns === 4 ? columns : 3;
}

function ActionRow({actions}: {actions: readonly CatchBandAction[] | undefined}) {
  if (!actions?.length) return null;
  return (
    <CatchStack direction="row" gap={12} wrap>
      {actions.map((action, index) => (
        <CatchButton href={action.href} key={`${action.label}-${index}`} label={action.label} onPressed={action.onPressed}
          variant={action.variant ?? (index === 0 ? "primary" : "secondary")} />
      ))}
    </CatchStack>
  );
}

const HeroBinding: Binding<"hero"> = ({section, context}) => {
  const {controller, captures, page} = context;
  const photo = section.media?.kind === "photo" ? section.media : undefined;
  return (
    <CatchHeroSection
      actions={controller.actions(section.actions, section.id)}
      aside={section.chip}
      ground={section.ground}
      id={section.id}
      kicker={section.kicker}
      labels={section.tags}
      layout={photo ? "photo" : "split"}
      lead={section.lead}
      link={section.aside ? controller.link(section.aside) : undefined}
      media={photo ? undefined : media(section, captures, "phonecard")}
      proof={section.proof?.map((line) => ({text: line.text, footnote: footnoteMark(page, line.footnote)}))}
      title={section.title}
      {...(photo ? {image: photo.asset, imageAlt: photo.alt} : {})}
    />
  );
};

const TilesBinding: Binding<"tiles"> = ({section, context}) => {
  const titleId = `${section.id}-title`;
  return (
    <CatchBand aria-labelledby={titleId} as="section" ground={section.ground} id={section.id}>
      <CatchStack gap={24}>
        <CatchBandHeader align={section.align} ground={section.ground} kicker={section.kicker} lead={section.lead}
          level={section.pageTitle ? 1 : 2} title={section.title} titleId={titleId} />
        <CatchGrid columns={gridColumns(section.columns)}>
          {section.items.map((item) => (
            <CatchFeatureTile body={item.body} figure={item.figure} figureNote={item.figureNote} fix={item.fix} ground={item.ground}
              key={item.title} level={section.pageTitle ? 2 : 3} link={item.link ? context.controller.link(item.link) : undefined}
              list={item.list} then={item.then} title={item.title} />
          ))}
        </CatchGrid>
        <ActionRow actions={context.controller.actions(section.actions, section.id)} />
        {section.foot ? <CatchText tone="secondary" variant="body-meta">{section.foot}</CatchText> : null}
      </CatchStack>
    </CatchBand>
  );
};

const SplitBinding: Binding<"split"> = ({section, context}) => (
  <CatchSplitSection
    actions={context.controller.actions(section.actions, section.id)}
    body={section.body}
    ground={section.ground}
    groups={section.groups?.map((group) => ({
      title: group.title,
      marker: group.label,
      list: group.list,
      link: group.link ? context.controller.link(group.link) : undefined,
    }))}
    id={section.id}
    kicker={section.kicker}
    lead={section.lead}
    level={section.pageTitle ? 1 : 2}
    media={media(section, context.captures)}
    metric={section.callout ? {value: section.callout.figure, label: section.callout.text} : undefined}
    steps={section.steps?.map((step) => ({marker: step.label, title: step.title, body: step.body}))}
    ticks={section.ticks}
    title={section.title}
  />
);

const TimelineBinding: Binding<"timeline"> = ({section, context}) => (
  <CatchSplitSection
    ground={section.ground}
    id={section.id}
    kicker={section.kicker}
    lead={section.lead}
    media={media(section, context.captures)}
    steps={section.steps.map((step) => ({marker: step.time, title: step.title, body: step.body}))}
    title={section.title}
  />
);

const ChecklistBinding: Binding<"checklist"> = ({section, context}) => (
  <CatchSplitSection
    actions={context.controller.actions(section.actions, section.id)}
    checks={section.items}
    ground={section.ground}
    id={section.id}
    kicker={section.kicker}
    lead={section.lead}
    title={section.title}
  />
);

const FaqBinding: Binding<"faq"> = ({section, context}) => (
  <CatchFaqSection
    footer={section.action ? <ActionRow actions={[context.controller.action(section.action, section.id)]} /> : undefined}
    ground={section.ground}
    id={section.id}
    items={section.items.map((item, index) => ({id: `${section.id}-${index + 1}`, question: item.question, answer: item.answer}))}
    kicker={section.kicker}
    title={section.title}
  />
);

/** The kit's store badges are Catch Host's: the closing band of a host page downloads the host app. */
function useHostStoreBadges(placement: string, show: boolean) {
  const stores = useAppDownloadCtas({placement, app: "host"});
  return show ? stores.map((store) => ({
    badgeSrc: store.badgeSrc,
    comingSoon: store.comingSoon,
    href: store.href || undefined,
    label: store.accessibleLabel,
    onClick: store.onClick,
    store: store.store,
  })) : undefined;
}

const CtaBinding: Binding<"cta"> = ({section, context}) => {
  const stores = useHostStoreBadges(`playbook_${context.page.id}_${section.id}`, section.storeBadges === true);
  return (
    <CatchCtaSection
      actions={context.controller.actions(section.actions, section.id)}
      capture={context.controller.leadForm(section.leadForm, section.id) ?? undefined}
      ground={section.ground}
      id={section.id}
      kicker={section.kicker}
      lead={section.lead}
      media={media(section, context.captures)}
      stores={stores}
      title={section.title}
    />
  );
};

const ScreenBinding: Binding<"screen"> = ({section, context}) => {
  const titleId = `${section.id}-title`;
  return (
    <CatchBand aria-labelledby={section.title ? titleId : undefined} as="section" ground={section.ground} id={section.id}>
      <CatchStack gap={24}>
        {section.title ? (
          <CatchBandHeader ground={section.ground} kicker={section.kicker} lead={section.lead} title={section.title} titleId={titleId} />
        ) : null}
        <PlaybookMediaView captures={context.captures} media={section.media} />
        {section.caption ? <CatchText tone="secondary" variant="body-meta">{section.caption}</CatchText> : null}
      </CatchStack>
    </CatchBand>
  );
};

/** One step of a one-job flow: its progress rail or its tabs, then its screens, actions and fine print. */
const FlowBinding: Binding<"flow"> = ({section, context}) => {
  const current = section.currentStep ?? 0;
  const navigation = section.steps ? (
    <CatchFormStepList
      current={current}
      direction="row"
      items={section.steps.map((title, index) => ({index, title, status: index < current ? "complete" : "needsInformation"}))}
      label={playbookCopy.flowStepsLabel}
      statusLabelBuilder={(status) => playbookCopy.flowStepStatus[status]}
    />
  ) : section.tabs ? (
    <CatchPageTabBar
      label={playbookCopy.flowTabsLabel}
      options={section.tabs.map((label, index) => ({value: String(index), label}))}
      selected={String(section.currentTab ?? 0)}
    />
  ) : undefined;
  return (
    <CatchBand as="div" ground={section.ground} id={section.id}>
      <CatchFlowLayout
        footer={section.note ? <CatchText tone="secondary" variant="body-meta">{section.note}</CatchText> : undefined}
        kicker={section.kicker}
        lead={section.lead}
        level={2}
        navigation={navigation}
        title={section.title}
      >
        {section.blocks.map((block, index) => (
          <PlaybookMediaView captures={context.captures} key={`${block.title}-${index}`} media={{kind: "excerpt", card: block}} />
        ))}
        <ActionRow actions={context.controller.actions(section.actions, section.id)} />
      </CatchFlowLayout>
    </CatchBand>
  );
};

/**
 * Section type → the @catch/web-ui component that draws it. Types listed in
 * pendingPlaybookSectionTypes (./playbookBindings) have no component yet;
 * this map must bind every other type, and only those.
 */
export const playbookSectionBindings: {readonly [T in BoundPlaybookSectionType]: Binding<T>} = {
  hero: HeroBinding,
  tiles: TilesBinding,
  split: SplitBinding,
  timeline: TimelineBinding,
  checklist: ChecklistBinding,
  faq: FaqBinding,
  cta: CtaBinding,
  screen: ScreenBinding,
  flow: FlowBinding,
};

/** One section through its binding. The page is checked for pending bindings before it renders. */
export function playbookSectionNode(section: PlaybookPageDocument["sections"][number], context: PlaybookSectionContext): ReactNode {
  const Binding = (playbookSectionBindings as Partial<Record<string, Binding<BoundPlaybookSectionType>>>)[section.type];
  if (!Binding) throw new Error(`Playbook section type ${section.type} has no component yet.`);
  return <Binding context={context} key={section.id} section={section as never} />;
}
