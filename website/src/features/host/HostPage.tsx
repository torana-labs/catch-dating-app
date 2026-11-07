import {
  CatchAccordion,
  CatchRoot,
  CatchAvatar,
  CatchBadge,
  CatchButton,
  CatchChip,
  CatchField,
  CatchIcon,
  CatchIndexRow,
  CatchMeter,
  CatchMetricTile,
  CatchPageTabBar,
  CatchRangeInput,
  CatchSection,
  CatchStack,
  CatchSurface,
  CatchTable,
  CatchText,
  type CatchTableColumn,
  type CatchTextTone,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {hostLandingCopy as copy} from "@content/hostLanding";
import {interpolateContent as fill} from "@content/interpolate";
import {PublicSiteHeader, SiteFooterBand, WebsitePageMain} from "../../shared/site";
import {salesRange, useHostLandingController, type HostLandingController} from "./useHostLandingController";

type Host = HostLandingController;

/** A section opening: an optional coloured kicker over a display headline. */
function Heading({id, kicker, title, tone = "secondary", align}: {id: string; kicker?: string; title: string; tone?: CatchTextTone; align?: "center"}) {
  return (
    <CatchStack align={align} gap={12}>
      {kicker ? <CatchText tone={tone} variant="label-kicker">{kicker}</CatchText> : null}
      <CatchText align={align} as="h2" id={id} variant="display-xl">{title}</CatchText>
    </CatchStack>
  );
}

/** A headline across from its lead on a wide page. */
function HeadingRow({id, title, body, anchor}: {id: string; title: string; body: string; anchor?: string}) {
  return (
    <CatchStack align="end" collapseBelow="medium" direction="row" equal gap={48} id={anchor}>
      <CatchText as="h2" id={id} variant="display-xl">{title}</CatchText>
      <CatchText tone="secondary" variant="body">{body}</CatchText>
    </CatchStack>
  );
}

/** A phone-shaped ink spotlight, centred in its column. */
function PhoneMock({children}: {children: ReactNode}) {
  return (
    <CatchStack direction="row" justify="center">
      <CatchSurface aspect={0.52} block="spotlight" color="ink" padding="md">{children}</CatchSurface>
    </CatchStack>
  );
}

function Hero() {
  const mock = copy.hero.mock;
  return (
    <CatchSurface aria-labelledby="host-title" as="section" block="band" color="run">
      <CatchStack align="center" collapseBelow="medium" direction="row" equal gap={48}>
        <CatchStack gap={20}>
          <CatchText as="h1" id="host-title" variant="display-hero">{copy.hero.title}</CatchText>
          <CatchText variant="body-lead">{copy.hero.body}</CatchText>
          <CatchStack direction="row" gap={8} wrap>
            <CatchButton href="#apply" label={copy.hero.apply} />
            <CatchButton href="#night" label={copy.hero.seeNight} variant="ghost" />
          </CatchStack>
          <CatchText variant="body-small">{copy.hero.note}</CatchText>
        </CatchStack>
        <PhoneMock>
          <CatchText tone="secondary" variant="label-kicker">{mock.kicker}</CatchText>
          <CatchText variant="display-sm">{mock.round}</CatchText>
          <CatchText numeric variant="display-xl">{mock.clock}</CatchText>
          <CatchMeter label={mock.meter} thickness={6} value={40} />
        </PhoneMock>
      </CatchStack>
    </CatchSurface>
  );
}

function Kinds() {
  return (
    <CatchSurface aria-labelledby="host-kinds-title" as="section" block="band" id="features">
      <HeadingRow anchor="use-cases" body={copy.kinds.body} id="host-kinds-title" title={copy.kinds.title} />
      <CatchStack align="stretch" collapseBelow="medium" direction="row" equal gap={12}>
        {copy.kinds.items.map((item) => (
          <CatchSurface block="spotlight" color={item.format} key={item.format} padding="md">
            <CatchText as="h3" variant="display-sm">{item.title}</CatchText>
            <CatchText variant="body-small">{item.body}</CatchText>
            <CatchStack align="start"><CatchButton href="#night" label={copy.kinds.action} size="sm" variant="quiet" /></CatchStack>
          </CatchSurface>
        ))}
      </CatchStack>
    </CatchSurface>
  );
}

function Night({host}: {host: Host}) {
  const night = copy.night;
  return (
    <CatchSurface aria-labelledby="host-night-title" as="section" block="band" color="ink" id="night">
      <CatchStack gap={16} id="how-it-works">
        <Heading id="host-night-title" kicker={night.kicker} title={night.title} tone="warning" />
        <CatchText tone="secondary" variant="body-lead">{night.lead}</CatchText>
        <CatchStack align="center" direction="row" gap={8} wrap>
          <CatchText variant="body">{night.showMe}</CatchText>
          <CatchChip colourWhenSelected dot="games" kind="tag" label={night.kind} selected />
          <CatchText variant="body">{night.evening}</CatchText>
        </CatchStack>
      </CatchStack>
      <CatchStack align="start" collapseBelow="medium" direction="row" equal gap={64}>
        <CatchStack gap={16}>
          <CatchStack gap={2}>
            <CatchText as="h3" variant="title-bar">{night.event}</CatchText>
            <CatchText tone="secondary" variant="body-small">{night.place}</CatchText>
          </CatchStack>
          <CatchSection dividers="none" timeline>
            {night.chapters.map((item, index) => (
              <CatchIndexRow body={item.body} density="regular" key={item.title} onTap={() => host.chooseChapter(index)} selected={index === host.chapter} time={item.time}
                marker={index < host.chapter ? {tone: "muted", size: 12} : index === host.chapter ? {tone: "format", format: "games", live: true, size: 12} : {kind: "ring", size: 12}}
                title={item.title} wrap />
            ))}
          </CatchSection>
        </CatchStack>
        <PhoneMock>
          <CatchText aria-live="polite" tone="secondary" variant="label-kicker">{host.nowKicker}</CatchText>
          <CatchText variant="display-lg">{host.nowTitle}</CatchText>
          <CatchSection>
            {night.tasks.map((task) => <CatchIndexRow density="compact" key={task.title} marker={{tone: task.tone}} title={task.title} />)}
          </CatchSection>
        </PhoneMock>
      </CatchStack>
    </CatchSurface>
  );
}

function Ipad() {
  const ipad = copy.ipad;
  return (
    <CatchSurface aria-labelledby="host-ipad-title" as="section" block="band">
      <CatchStack align="center" gap={12}>
        <Heading align="center" id="host-ipad-title" kicker={ipad.kicker} title={ipad.title} tone="info" />
        <CatchText align="center" tone="secondary" variant="body-lead">{ipad.body}</CatchText>
      </CatchStack>
      <CatchSurface aspect={2.2} block="spotlight" color="ink">
        <CatchStack collapseBelow="medium" direction="row" equal gap={32}>
          <CatchStack gap={12}>
            <CatchText tone="secondary" variant="label-kicker">{ipad.runOfShow}</CatchText>
            {ipad.steps.map((step) => <CatchText key={step} variant="title-row">{step}</CatchText>)}
          </CatchStack>
          <CatchStack gap={12}>
            <CatchText tone="secondary" variant="label-kicker">{ipad.room}</CatchText>
            <CatchStack direction="row" equal gap={8}>
              {Array.from({length: ipad.tables}, (_, index) => (
                <CatchSurface aspect={1.4} key={index} padding="sm"><CatchText variant="label-action">{fill(ipad.table, {number: index + 1})}</CatchText></CatchSurface>
              ))}
            </CatchStack>
          </CatchStack>
        </CatchStack>
      </CatchSurface>
    </CatchSurface>
  );
}

function Pipeline({host}: {host: Host}) {
  const pipeline = copy.pipeline;
  return (
    <CatchSurface aria-labelledby="host-pipeline-title" as="section" block="band">
      <HeadingRow body={pipeline.body} id="host-pipeline-title" title={pipeline.title} />
      <CatchStack align="start" collapseBelow="medium" direction="row" equal gap={24}>
        {pipeline.stages.map((stage, index) => (
          <CatchSection count={host.columns[index].length} dividers="none" empty={pipeline.empty} key={stage} title={fill(pipeline.stageTitle, {number: index + 1, stage})}>
            {host.columns[index].map((name) => (
              <CatchSurface key={name} padding="sm">
                <CatchStack align="center" direction="row" gap={12}>
                  <CatchAvatar name={name} size={28} />
                  <CatchText variant="title-row">{name}</CatchText>
                </CatchStack>
              </CatchSurface>
            ))}
          </CatchSection>
        ))}
      </CatchStack>
      <CatchStack align="center" collapseBelow="medium" direction="row" gap={16} justify="between">
        <CatchText tone="secondary" variant="body-small">{pipeline.note}</CatchText>
        <CatchButton label={pipeline.replay} leadingIcon="restart" onPressed={host.replay} size="sm" variant="secondary" />
      </CatchStack>
    </CatchSurface>
  );
}

function Guests() {
  const guests = copy.guests;
  return (
    <CatchSurface aria-labelledby="host-guests-title" as="section" block="band" color="dinner">
      <CatchStack align="center" collapseBelow="medium" direction="row" equal gap={64}>
        <CatchStack gap={24}>
          <Heading id="host-guests-title" kicker={guests.kicker} title={guests.title} tone="primary" />
          <CatchSection>
            {guests.items.map((item) => <CatchIndexRow density="regular" icon={item.icon} key={item.title} subtitle={item.body} title={item.title} wrap />)}
          </CatchSection>
        </CatchStack>
        <PhoneMock>
          <CatchText tone="secondary" variant="label-kicker">{guests.mock.kicker}</CatchText>
          <CatchSurface block="spotlight" color="run" padding="md">
            <CatchText variant="label-kicker">{guests.mock.group}</CatchText>
            <CatchText variant="display-lg">{guests.mock.title}</CatchText>
            <CatchText variant="body">{guests.mock.body}</CatchText>
          </CatchSurface>
        </PhoneMock>
      </CatchStack>
    </CatchSurface>
  );
}

function Growth() {
  const growth = copy.growth;
  return (
    <CatchSurface aria-labelledby="host-growth-title" as="section" block="band">
      <CatchStack align="start" collapseBelow="medium" direction="row" equal gap={48}>
        <CatchStack gap={24}>
          <CatchText as="h2" id="host-growth-title" variant="display-xl">{growth.title}</CatchText>
          <CatchText tone="secondary" variant="body-lead">{growth.body}</CatchText>
          <CatchSection dividers="none" title={growth.pickLink}>
            {growth.links.map((link, index) => <CatchIndexRow density="regular" icon="link" key={link.title} selected={index === 0} subtitle={link.body} title={link.title} />)}
          </CatchSection>
          <CatchSection>
            {growth.steps.map((step, index) => <CatchIndexRow density="compact" key={step} rank={index + 1} title={step} wrap />)}
          </CatchSection>
        </CatchStack>
        <CatchSurface block="floating">
          <CatchText variant="label-code">{growth.link}</CatchText>
          <CatchMeter label={growth.visits.label} max={growth.visits.value} showLabel thickness={8} value={growth.visits.value} />
          <CatchMeter label={growth.bookings.label} max={growth.visits.value} showLabel thickness={8} value={growth.bookings.value} />
          <CatchStack direction="row" equal gap={16}>
            {growth.stats.map((stat) => <CatchMetricTile key={stat.label} label={stat.label} layout="inline" value={stat.value} />)}
          </CatchStack>
          <CatchText tone="secondary" variant="body-small">{growth.insight}</CatchText>
        </CatchSurface>
      </CatchStack>
      <CatchStack gap={6}>
        <CatchText as="h3" variant="display-sm">{growth.regularsTitle}</CatchText>
        <CatchText tone="secondary" variant="body">{growth.regularsBody}</CatchText>
        <CatchText tone="secondary" variant="body-meta">{growth.disclaimer}</CatchText>
      </CatchStack>
    </CatchSurface>
  );
}

interface LayerRow {
  key: string;
  job: {title: string; subtitle: string};
  catch: {label: string; tone: "success"; icon: ReactNode} | string;
  own: string;
}

function Layers({host}: {host: Host}) {
  const layers = copy.layers;
  const columns: CatchTableColumn<LayerRow>[] = [
    {key: "job", label: layers.columns.job, kind: "title"},
    {key: "catch", label: layers.columns.catch, kind: "badge", render: (row) => typeof row.catch === "string" ? row.catch : <CatchBadge {...row.catch} />},
    {key: "own", label: layers.columns.own},
  ];
  const rows: LayerRow[] = layers.rows.map((row) => ({
    key: row.job,
    job: {title: row.job, subtitle: row.from},
    catch: row.layer <= Number(host.layer) ? {label: layers.runs, tone: "success", icon: <CatchIcon name="check" size={16} />} : layers.none,
    own: row.own ?? layers.none,
  }));
  return (
    <CatchSurface aria-labelledby="host-layers-title" as="section" block="band" color="courts" id="layers">
      <HeadingRow anchor="existing-tools" body={layers.body} id="host-layers-title" title={layers.title} />
      <CatchPageTabBar label={layers.label} onChanged={host.setLayer} options={layers.options} selected={host.layer} />
      <CatchSurface block="floating">
        <CatchTable columns={columns} label={layers.tableLabel} rows={rows} />
      </CatchSurface>
      <CatchStack align="center" collapseBelow="medium" direction="row" gap={16} justify="between">
        <CatchText tone="secondary" variant="body">{layers.note}</CatchText>
        <CatchButton href="#pricing" label={layers.pricing} />
      </CatchStack>
    </CatchSurface>
  );
}

function Pricing({host}: {host: Host}) {
  const pricing = copy.pricing;
  return (
    <CatchSurface aria-labelledby="host-pricing-title" as="section" block="band" color="games" id="pricing">
      <CatchStack align="center" collapseBelow="medium" direction="row" equal gap={48}>
        <CatchStack gap={12}>
          <CatchText variant="label-kicker">{pricing.kicker}</CatchText>
          <CatchText as="h2" id="host-pricing-title" numeric variant="display-hero">{pricing.rate}</CatchText>
          <CatchText variant="display-sm">{pricing.title}</CatchText>
          <CatchText variant="body">{pricing.body}</CatchText>
        </CatchStack>
        <CatchSurface block="floating">
          <CatchText variant="label-action">{pricing.sales}</CatchText>
          <CatchText aria-live="polite" numeric variant="display-lg">{host.salesText}</CatchText>
          <CatchRangeInput label={pricing.sales} max={salesRange.max} min={salesRange.min} onChange={(value) => host.setSales(Array.isArray(value) ? value[1] : (value as number))}
            step={salesRange.step} value={host.sales} />
          <CatchStack direction="row" equal gap={12}>
            <CatchMetricTile label={pricing.fee} note={pricing.feeNote} value={host.feeText} />
            <CatchMetricTile label={pricing.effective} note={pricing.effectiveNote} value={host.rateText} />
          </CatchStack>
          <CatchText tone="secondary" variant="body-small">{host.capNote}</CatchText>
          <CatchText tone="secondary" variant="body-meta">{pricing.gateway}</CatchText>
        </CatchSurface>
      </CatchStack>
    </CatchSurface>
  );
}

function Faq() {
  return (
    <CatchSurface aria-labelledby="host-faq-title" as="section" block="band">
      <CatchStack align="start" collapseBelow="medium" direction="row" equal gap={48}>
        <Heading id="host-faq-title" kicker={copy.faq.kicker} title={copy.faq.title} />
        <CatchAccordion items={copy.faq.items} name="host-faq" size="lg" />
      </CatchStack>
    </CatchSurface>
  );
}

function Apply({host}: {host: Host}) {
  const apply = copy.apply;
  const card = apply.card;
  return (
    <CatchSurface aria-labelledby="host-apply-title" as="section" block="band" color="games" id="apply">
      <CatchStack align="start" collapseBelow="medium" direction="row" equal gap={48}>
        <CatchStack gap={20}>
          <CatchText as="h2" id="host-apply-title" variant="display-xl">{apply.title}</CatchText>
          <CatchText variant="body-lead">{apply.body}</CatchText>
          <CatchSection>
            {apply.steps.map((step, index) => <CatchIndexRow density="regular" key={step.title} rank={index + 1} subtitle={step.body} title={step.title} wrap />)}
          </CatchSection>
        </CatchStack>
        <CatchSurface block="floating">
          <CatchStack align="center" direction="row" justify="between">
            <CatchText as="h3" variant="display-sm">{card.title}</CatchText>
            <CatchText tone="secondary" variant="label-kicker">{card.step}</CatchText>
          </CatchStack>
          <CatchMeter kind="segments" label={card.step} max={3} thickness={4} value={1} />
          <CatchStack gap={12}>
            <CatchText id="host-apply-kind" variant="label-action">{card.kindQuestion}</CatchText>
            <CatchStack aria-labelledby="host-apply-kind" direction="row" gap={8} role="radiogroup" wrap>
                {card.kinds.map((item) => (
                  <CatchChip colourWhenSelected dot={item.value === "other" ? undefined : item.value} key={item.value} kind="choice" label={item.label}
                    onPressed={() => host.setKind(item.value)} selected={host.kind === item.value} />
                ))}
              </CatchStack>
          </CatchStack>
          <CatchField autoComplete="address-level2" inputHint={card.cityPlaceholder} recipe="input" title={card.city} />
          <CatchStack gap={12}>
            <CatchText id="host-apply-size" variant="label-action">{card.sizeQuestion}</CatchText>
            <CatchStack aria-labelledby="host-apply-size" direction="row" gap={8} role="radiogroup" wrap>
                {card.sizes.map((size, index) => <CatchChip key={size} kind="choice" label={size} onPressed={() => host.setGuests(index)} selected={host.guests === index} />)}
              </CatchStack>
          </CatchStack>
          <CatchButton fill href="/host/apply/" label={card.continue} />
        </CatchSurface>
      </CatchStack>
    </CatchSurface>
  );
}

/**
 * The host landing, band for band as the RbWebHostV2 board: the hero, the
 * kinds of night, a night on Catch, the iPad, the applicant board, guests,
 * growth links, the layers, pricing, the FAQ and the application card. The legacy route anchors
 * (#features, #use-cases, #how-it-works, #existing-tools) sit on the bands
 * that now carry that content, so the retired host routes still land there.
 */
function HostLandingBands({host}: {host: Host}) {
  return (
    <>
      <Hero />
      <Kinds />
      <Night host={host} />
      <Ipad />
      <Pipeline host={host} />
      <Guests />
      <Growth />
      <Layers host={host} />
      <Pricing host={host} />
      <Faq />
      <Apply host={host} />
    </>
  );
}

/**
 * The host landing (the RbWebHostV2 board) on the white ground: the site
 * header naming the product and its sections, the board's bands, and the
 * short footer.
 */
export function HostPage() {
  const host = useHostLandingController();
  return (
    <CatchRoot theme="day">
      <PublicSiteHeader actions={<CatchButton href="#apply" label={copy.header.apply} size="sm" />} links={copy.header.nav} title={copy.header.title} />
      <WebsitePageMain id="top">
        <HostLandingBands host={host} />
      </WebsitePageMain>
      <SiteFooterBand label={copy.header.title} tagline={copy.footer.tagline} wordmark={copy.footer.wordmark} />
    </CatchRoot>
  );
}
