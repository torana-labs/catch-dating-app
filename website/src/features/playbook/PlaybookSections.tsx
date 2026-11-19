import {
  CatchArticleBody,
  CatchBand,
  CatchBandHeader,
  CatchButton,
  CatchCardGrid,
  CatchComparisonTable,
  CatchCtaSection,
  CatchFaqSection,
  CatchFeatureTile,
  CatchFlowLayout,
  CatchFormStepList,
  CatchGrid,
  CatchHeroSection,
  CatchPageTabBar,
  CatchPricingSection,
  CatchScreenPreview,
  CatchSplitSection,
  CatchStack,
  CatchStorySection,
  CatchTabSection,
  CatchText,
  type CatchBandAction,
  type CatchBandGround,
  type CatchCardGridCity,
  type CatchScreenPreviewProps,
} from "@catch/web-ui";
import type {ComponentType, ReactNode} from "react";
import {playbookCopy} from "../../content/playbook/playbookCopy";
import {
  playbookGrounds,
  type PlaybookAction,
  type PlaybookGround,
  type PlaybookMedia,
  type PlaybookPageDocument,
  type PlaybookSectionOf,
} from "../../content/playbook/playbookContract";
import {captureSlot, type CaptureSlots} from "../../shared/media/captureSlot";
import {useAppDownloadCtas} from "../marketing/useAppDownloadCtas";
import type {BoundPlaybookSectionType} from "./playbookBindings";
import {playbookCustomSections, type PlaybookCustomSectionProps} from "./custom/customSections";
import {brand} from "../../content/brand";
import {citiesPageCopy} from "../../content/citiesPage";
import {websiteCities} from "../../content/markets";
import {publishedHostStories} from "../../content/stories/hostStories";
import {hostStoryCards} from "../marketing/hostStoryCards";
import {playbookHref} from "./playbookHrefs";
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
  return {label: String(index + 1)};
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
    return (
      <CatchScreenPreview caption={typeof capture.caption === "string" ? capture.caption : undefined} image={capture.src}
        kind={tablet ? "tablet" : "phone"} semanticsLabel={media.alt ?? capture.alt} />
    );
  }
  if (media.kind === "qr") {
    const href = playbookHref(media.to);
    const url = href.startsWith("/") ? `${brand.web.origin}${href}` : href;
    return <CatchScreenPreview flat kind="card" qr={url} semanticsLabel={media.label} title={media.label} />;
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
    cover: screen.cover,
  };
  return <CatchScreenPreview {...props} />;
}

function media(section: {media?: PlaybookMedia}, captures: CaptureSlots, card?: "card" | "phonecard"): ReactNode {
  return section.media ? <PlaybookMediaView captures={captures} card={card} media={section.media} /> : undefined;
}

/**
 * Tiles in 2, 3 or 4 grid columns, or six across (a row of equal tiles that
 * stacks below the expanded width), as the How it works step grid is.
 */
function TileGrid({columns, children}: {columns: number | undefined; children: ReactNode}) {
  if (columns === 6) return <CatchStack collapseBelow="expanded" direction="row" equal gap={16}>{children}</CatchStack>;
  return <CatchGrid columns={columns === 2 || columns === 4 ? columns : 3}>{children}</CatchGrid>;
}

/** True when any of the actions opens a WhatsApp chat: the reply line goes beside it. */
function opensWhatsApp(items: readonly (PlaybookAction | undefined)[] | undefined): boolean {
  return Boolean(items?.some((item) => item && "kind" in item.to));
}

/** "We reply on WhatsApp, usually within an hour." beside WhatsApp actions; the line is the renderer's, never page copy. */
function WhatsAppReply() {
  return <CatchText tone="secondary" variant="body-meta">{playbookCopy.whatsappReply}</CatchText>;
}

function withWhatsAppReply(line: string | undefined, items: readonly (PlaybookAction | undefined)[] | undefined): string | undefined {
  if (!opensWhatsApp(items)) return line;
  return line ? `${line} ${playbookCopy.whatsappReply}` : playbookCopy.whatsappReply;
}

function ActionRow({actions, whatsapp = false}: {actions: readonly CatchBandAction[] | undefined; whatsapp?: boolean}) {
  if (!actions?.length) return null;
  return (
    <CatchStack gap={8}>
      <CatchStack direction="row" gap={12} wrap>
        {actions.map((action, index) => (
          <CatchButton href={action.href} key={`${action.label}-${index}`} label={action.label} newTab={action.newTab} onPressed={action.onPressed}
            variant={action.variant ?? (index === 0 ? "primary" : "secondary")} />
        ))}
      </CatchStack>
      {whatsapp ? <WhatsAppReply /> : null}
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
      note={withWhatsAppReply(section.note, [...section.actions, section.aside])}
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
        <TileGrid columns={section.columns}>
          {section.items.map((item) => (
            <CatchFeatureTile body={item.body} figure={item.figure} figureNote={item.figureNote} fix={item.fix} ground={item.ground}
              key={item.title} level={section.pageTitle ? 2 : 3} link={item.link ? context.controller.link(item.link) : undefined}
              list={item.list} then={item.then} title={item.title} />
          ))}
        </TileGrid>
        <ActionRow actions={context.controller.actions(section.actions, section.id)} whatsapp={opensWhatsApp(section.actions)} />
        {section.foot ? <CatchText tone="secondary" variant="body-meta">{section.foot}</CatchText> : null}
      </CatchStack>
    </CatchBand>
  );
};

const SplitBinding: Binding<"split"> = ({section, context}) => (
  <CatchSplitSection
    actions={context.controller.actions(section.actions, section.id)}
    body={withWhatsAppReply(section.body, section.actions)}
    ground={section.ground}
    groups={section.groups?.map((group) => ({
      title: group.title,
      marker: group.label,
      list: group.list,
      // One link per group until CatchSplitSectionGroup takes more (playbookBindings: splitGroupLinks).
      link: group.links?.[0] ? context.controller.link(group.links[0]) : undefined,
    }))}
    id={section.id}
    kicker={section.kicker}
    lead={section.lead}
    level={section.pageTitle ? 1 : 2}
    media={section.leadForm ? context.controller.leadForm(section.leadForm, section.id) ?? undefined : media(section, context.captures)}
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
    footer={section.action ? <ActionRow actions={[context.controller.action(section.action, section.id)]} whatsapp={opensWhatsApp([section.action])} /> : undefined}
    ground={section.ground}
    id={section.id}
    items={section.items.map((item, index) => ({id: `${section.id}-${index + 1}`, question: item.question, answer: item.answer}))}
    kicker={section.kicker}
    title={section.title}
  />
);

/** The closing band's store badges: the guest app's or Catch Host's, as the page names. */
function useStoreBadges(placement: string, app: "guest" | "host" | undefined) {
  const stores = useAppDownloadCtas({placement, app: app ?? "guest"});
  return app ? stores.map((store) => ({
    badgeSrc: store.badgeSrc,
    comingSoon: store.comingSoon,
    href: store.href || undefined,
    label: store.accessibleLabel,
    onClick: store.onClick,
    store: store.store,
  })) : undefined;
}

/** The closing band's capture: the lead form while its slot is filled, and the WhatsApp reply line beside a WhatsApp action. */
function CtaCapture({form, whatsapp}: {form: ReactNode; whatsapp: boolean}) {
  if (!form && !whatsapp) return null;
  return <CatchStack gap={8}>{form}{whatsapp ? <WhatsAppReply /> : null}</CatchStack>;
}

const CtaBinding: Binding<"cta"> = ({section, context}) => {
  const stores = useStoreBadges(`playbook_${context.page.id}_${section.id}`, section.storeBadges);
  return (
    <CatchCtaSection
      actions={context.controller.actions(section.actions, section.id)}
      capture={<CtaCapture form={context.controller.leadForm(section.leadForm, section.id)} whatsapp={opensWhatsApp(section.actions)} />}
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

const PricingBinding: Binding<"pricing"> = ({section, context}) => (
  <CatchPricingSection
    actions={context.controller.actions(section.actions, section.id)}
    calculator={section.calculator ? <CustomSlot component={section.calculator} context={context} section={section} /> : undefined}
    cap={section.cap}
    examples={section.examples}
    ground={section.ground}
    id={section.id}
    kicker={section.kicker}
    rate={section.price}
    title={section.title}
    trial={section.trial}
  />
);

const StoryBinding: Binding<"story"> = ({section, context}) => (
  <CatchStorySection
    avatar={{initials: section.initials, ground: section.avatarGround}}
    ground={section.ground}
    id={section.id}
    kicker={section.kicker}
    link={section.link ? context.controller.link(section.link) : undefined}
    media={section.media ? <PlaybookMediaView captures={context.captures} media={section.media} /> : undefined}
    meta={section.meta}
    metrics={section.metrics?.map((metric) => ({
      label: metric.label,
      value: metric.value,
      source: metric.source,
      footnote: footnoteMark(context.page, metric.footnote),
    }))}
    quote={section.quote}
    title={section.name}
  />
);

const TabsBinding: Binding<"tabs"> = ({section, context}) => (
  <CatchTabSection
    align={section.align}
    ground={section.ground}
    id={section.id}
    items={section.items.map((item, index) => ({
      id: `${section.id}-${index + 1}`,
      label: item.label,
      accent: item.accent,
      time: item.time,
      title: item.title,
      subtitle: item.subtitle,
      body: item.body,
      list: item.list,
      tips: item.tips,
      media: item.media ? <PlaybookMediaView captures={context.captures} media={item.media} /> : undefined,
    }))}
    kicker={section.kicker}
    layout={section.layout}
    lead={section.lead}
    defaultSelected={section.defaultItem === undefined ? undefined : `${section.id}-${section.defaultItem + 1}`}
    tabsLabel={playbookCopy.tabsLabel}
    title={section.title}
  />
);

const TableBinding: Binding<"table"> = ({section}) => (
  <CatchComparisonTable
    checked={section.checked}
    columns={section.columns}
    ground={section.ground}
    highlightColumn={section.highlightColumn}
    id={section.id}
    kicker={section.kicker}
    lead={section.lead}
    rowHeader={section.rowHeader}
    rows={section.rows.map((row) => ({
      label: row.label,
      cells: row.cells.map((cell) => cell.status ? {text: cell.text ?? "", status: cell.status} : cell.text ?? ""),
    }))}
    source={section.source}
    title={section.title}
  />
);

const ArticleBinding: Binding<"article"> = ({section, context}) => (
  <CatchBand as="div" ground={section.ground}>
    <CatchArticleBody
      aside={section.aside ? (
        <CatchFeatureTile body={section.aside.body} ground={section.aside.ground}
          link={section.aside.action ? context.controller.link(section.aside.action) : undefined} title={section.aside.title} />
      ) : undefined}
      id={section.id}
      kicker={section.kicker}
      lead={section.lead}
      level={section.pageTitle ? 1 : 2}
      meta={section.meta}
      sections={section.sections.map((part, index) => ({
        id: `${section.id}-${index + 1}`,
        title: part.heading,
        paragraphs: part.paragraphs,
        list: part.list,
        tip: part.tip ? {text: part.tip} : undefined,
      }))}
      title={section.title}
      tocLabel={playbookCopy.articleTocLabel}
    />
  </CatchBand>
);

/**
 * The market's cities as the cities page draws them, in catalog order: an
 * open city links its page, a city not open yet the homepage's launch
 * notice. A paused city is left out, as it is from the city picker.
 */
function playbookCityCards(): CatchCardGridCity[] {
  return websiteCities.filter((city) => city.status !== "paused").map((city) => {
    const live = city.status === "live";
    return {
      id: city.slug,
      title: city.label,
      live,
      status: live ? citiesPageCopy.open : citiesPageCopy.soon,
      action: live ?
        {href: `/${encodeURIComponent(city.slug)}/`, label: citiesPageCopy.seeWhatsOn} :
        {href: `/?${new URLSearchParams({city: city.slug})}#whats-on`, label: citiesPageCopy.getNotified},
    };
  });
}

/**
 * A cards band through CatchCardGrid. Its bound sources are the market's
 * cities and the published host stories; a page naming any other source, or
 * a stories band with no story published, is held back (./playbookBindings).
 */
const CardsBinding: Binding<"cards"> = ({section, context}) => (
  <CatchCardGrid
    actions={context.controller.actions(section.actions, section.id)}
    columns={section.columns === 4 ? 4 : 3}
    empty={section.empty ? {title: section.empty.title, message: section.empty.body} : undefined}
    ground={section.ground}
    id={section.id}
    kicker={section.kicker}
    lead={section.lead}
    level={section.pageTitle ? 1 : 2}
    title={section.title}
    {...(section.source.kind === "stories" ?
      {kind: "story" as const, items: hostStoryCards(publishedHostStories, playbookCopy.storyFigure)} :
      {kind: "city" as const, items: playbookCityCards()})}
  />
);

/** One component from the closed custom registry; the page is checked for a missing component before it renders. */
function CustomSlot({component, section, context}: {component: string; section: PlaybookCustomSectionProps["section"]; context: PlaybookSectionContext}) {
  const Component = (playbookCustomSections as Partial<Record<string, ComponentType<PlaybookCustomSectionProps>>>)[component];
  if (!Component) throw new Error(`Playbook custom section ${component} has no component yet.`);
  const labels = Object.fromEntries((section.type === "custom" ? section.labels ?? [] : []).map((label) => [label.key, label.text]));
  return <Component captures={context.captures} controller={context.controller} labels={labels} section={section} />;
}

/** A custom section through the closed registry. */
const CustomBinding: Binding<"custom"> = ({section, context}) => <CustomSlot component={section.component} context={context} section={section} />;

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
  pricing: PricingBinding,
  story: StoryBinding,
  tabs: TabsBinding,
  table: TableBinding,
  article: ArticleBinding,
  custom: CustomBinding,
  cards: CardsBinding,
};

/** One section through its binding. The page is checked for pending bindings before it renders. */
export function playbookSectionNode(section: PlaybookPageDocument["sections"][number], context: PlaybookSectionContext): ReactNode {
  const Binding = (playbookSectionBindings as Partial<Record<string, Binding<BoundPlaybookSectionType>>>)[section.type];
  if (!Binding) throw new Error(`Playbook section type ${section.type} has no component yet.`);
  return <Binding context={context} key={section.id} section={section as never} />;
}
