import {
  CatchAccordion,
  CatchBadge,
  CatchBarIndicator,
  CatchButton,
  CatchCheckboxInput,
  CatchChip,
  CatchIcon,
  CatchIndexRow,
  CatchMeter,
  CatchMetricTile,
  CatchSection,
  CatchStack,
  CatchSurface,
  CatchTable,
  CatchText,
  type CatchBadgeProps,
  type CatchIconName,
  type CatchMarkerProps,
  type CatchTableColumn,
  type CatchTextTone,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {interpolateContent as fill} from "@content/interpolate";
import {weddingsApplyPath, weddingsCopy as copy} from "@content/weddings";
import type {WeddingsLandingController} from "../useWeddingsController";
import {badgeTone, replyBadge} from "../weddingsModel";
import {StepOneCard} from "./weddingsApplicationSections";

/** A band's opening: a coloured kicker, the headline and an optional lead. */
function Heading({id, kicker, title, body, tone = "secondary", size = "page"}: {
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
function WhoCard({label, night = false, children}: {label: string; night?: boolean; children: ReactNode}) {
  return (
    <CatchStack gap={8}>
      <CatchText tone="secondary" variant="label-kicker">{label}</CatchText>
      <CatchSurface block={night ? "spotlight" : "floating"} color={night ? "ink" : undefined} padding="md">{children}</CatchSurface>
    </CatchStack>
  );
}

/** Two or three excerpts side by side, stacking on a phone. */
function CardRow({children}: {children: ReactNode}) {
  return <CatchStack align="start" collapseBelow="expanded" direction="row" equal gap={16}>{children}</CatchStack>;
}

/** The short icon rows under a chapter's text. */
function Points({points}: {points: readonly {icon: CatchIconName; title: string; body: string}[]}) {
  return (
    <CatchSection dividers="none">
      {points.map((point) => <CatchIndexRow density="compact" icon={point.icon} key={point.title} subtitle={point.body} title={point.title} wrap />)}
    </CatchSection>
  );
}

/** One chapter of the wedding: its text and points beside what someone sees. */
function Chapter({id, kicker, title, body, points, children}: {
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
function Message({mine = false, author, children}: {mine?: boolean; author?: string; children: ReactNode}) {
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
function Attachment({name, kind}: {name: string; kind: string}) {
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

const follow = copy.follow;
const chapterKicker = ({number, kicker}: {number: string; kicker: string}) => fill(follow.chapterKicker, {number, kicker});

interface HouseholdRow {
  key: string;
  household: {title: string; subtitle: string};
  f0: CatchBadgeProps;
  f1: CatchBadgeProps;
  f2: CatchBadgeProps;
  f3: CatchBadgeProps;
  f4: CatchBadgeProps;
}

const functionKeys = ["f0", "f1", "f2", "f3", "f4"] as const;

function HouseholdTable() {
  const card = follow.setUp.card;
  const columns: CatchTableColumn<HouseholdRow>[] = [
    {key: "household", label: card.household, kind: "title"},
    ...functionKeys.map((key, index): CatchTableColumn<HouseholdRow> => ({key, label: card.functions[index], kind: "badge", align: "center", width: "64px"})),
  ];
  const rows: HouseholdRow[] = card.households.map((household) => {
    const badges = household.replies.map((reply) => replyBadge(reply, household.size));
    return {
      key: household.name,
      household: {title: household.name, subtitle: fill(card.householdSubtitle, {side: household.side, count: household.size})},
      f0: badges[0], f1: badges[1], f2: badges[2], f3: badges[3], f4: badges[4],
    };
  });
  return <CatchTable columns={columns} label={card.tableLabel} rows={rows} />;
}

function SetUp() {
  const chapter = follow.setUp;
  return (
    <Chapter body={chapter.body} id="weddings-set-up" kicker={chapterKicker(chapter)} points={chapter.points} title={chapter.title}>
      <WhoCard label={chapter.card.label}>
        <CatchText variant="title-row">{chapter.card.title}</CatchText>
        <HouseholdTable />
      </WhoCard>
    </Chapter>
  );
}

function Invite({landing}: {landing: WeddingsLandingController}) {
  const chapter = follow.invite;
  const people = chapter.phone.people;
  const check = (person: string) => (
    <CatchCheckboxInput key={person} label={person} onChanged={() => landing.toggleComing(person)} value={landing.coming.includes(person)} />
  );
  return (
    <Chapter body={chapter.body} id="weddings-invite" kicker={chapterKicker(chapter)} points={chapter.points} title={chapter.title}>
      <CardRow>
        <WhoCard label={chapter.phone.label}>
          <CatchText variant="title-row">{chapter.phone.title}</CatchText>
          <CatchText tone="secondary" variant="body-small">{chapter.phone.wear}</CatchText>
          <CatchStack direction="row" equal gap={8}>{people.slice(0, 2).map(check)}</CatchStack>
          <CatchStack direction="row" equal gap={8}>{people.slice(2).map(check)}</CatchStack>
          <CatchButton fill isInteractive={false} label={chapter.phone.send} size="md" />
        </WhoCard>
        <WhoCard label={chapter.whatsapp.label}>
          <Message author={chapter.whatsapp.author}>
            <CatchText variant="body">{chapter.whatsapp.message}</CatchText>
          </Message>
          <CatchButton fill isInteractive={false} label={chapter.whatsapp.reply} size="md" variant="secondary" />
        </WhoCard>
      </CardRow>
    </Chapter>
  );
}

function WriteIn() {
  const chapter = follow.writeIn;
  const {chat, ids} = chapter;
  return (
    <Chapter body={chapter.body} id="weddings-write-in" kicker={chapterKicker(chapter)} points={chapter.points} title={chapter.title}>
      <CardRow>
        <WhoCard label={chat.label}>
          <Message mine><Attachment kind={chat.ticket.kind} name={chat.ticket.name} /></Message>
          <Message author={chat.author}><CatchText variant="body">{chat.read}</CatchText></Message>
          <Message mine><CatchText lang="hi" variant="body">{chat.question}</CatchText></Message>
          <Message author={chat.author}><CatchText lang="hi" variant="body">{chat.answer}</CatchText></Message>
        </WhoCard>
        <WhoCard label={ids.label}>
          <CatchStack direction="row" equal gap={12}>
            {ids.stats.map((stat) => <CatchMetricTile key={stat.label} label={stat.label} layout="inline" value={stat.value} />)}
          </CatchStack>
          <CatchSection>
            {ids.rows.map((row) => (
              <CatchIndexRow density="compact" key={row.title} subtitle={row.subtitle} title={row.title}
                trailing={<CatchBadge label={row.badge.label} tone={badgeTone(row.badge.tone)} />} />
            ))}
          </CatchSection>
        </WhoCard>
      </CardRow>
    </Chapter>
  );
}

function Travel() {
  const chapter = follow.travel;
  const {arrivals, rooms} = chapter;
  return (
    <Chapter body={chapter.body} id="weddings-travel" kicker={chapterKicker(chapter)} points={chapter.points} title={chapter.title}>
      <CardRow>
        <WhoCard label={arrivals.label}>
          <CatchBarIndicator bars={arrivals.bars} height={110} label={arrivals.chartLabel} recipe="chart" />
          <CatchText tone="secondary" variant="body-small">{arrivals.note}</CatchText>
        </WhoCard>
        <WhoCard label={rooms.label}>
          <CatchText variant="title-row">{rooms.hotel}</CatchText>
          <CatchMeter kind="cap" label={rooms.meter} max={rooms.total} showLabel thickness={6} value={rooms.placed} />
          <CatchSection>
            {rooms.rows.map((row) => <CatchIndexRow density="compact" key={row.title} title={row.title} value={row.value} />)}
          </CatchSection>
        </WhoCard>
      </CardRow>
    </Chapter>
  );
}

function Weekend() {
  const chapter = follow.weekend;
  const {greeter, desk, door} = chapter;
  return (
    <CatchStack aria-labelledby="weddings-weekend" as="section" gap={24}>
      <CatchStack gap={12}>
        <CatchText tone="danger" variant="label-kicker">{chapterKicker(chapter)}</CatchText>
        <CatchText as="h3" id="weddings-weekend" variant="section-title">{chapter.title}</CatchText>
        <CatchText tone="secondary" variant="body">{chapter.body}</CatchText>
      </CatchStack>
      <CardRow>
        <WhoCard label={greeter.label} night>
          <CatchText tone="secondary" variant="label-kicker">{greeter.kicker}</CatchText>
          <CatchText variant="display-sm">{greeter.title}</CatchText>
          <CatchSection>
            {greeter.rows.map((row) => (
              <CatchIndexRow action={{label: row.action, variant: row.primary ? "primary" : "secondary"}} density="compact" key={row.title}
                subtitle={row.subtitle} title={row.title} />
            ))}
          </CatchSection>
        </WhoCard>
        <WhoCard label={desk.label} night>
          <CatchText tone="secondary" variant="label-kicker">{desk.kicker}</CatchText>
          <CatchText variant="display-sm">{desk.title}</CatchText>
          <CatchSection>
            <CatchIndexRow density="compact" status={desk.car.status} statusTone="success" subtitle={desk.car.subtitle} title={desk.car.title} wrap />
          </CatchSection>
        </WhoCard>
        <WhoCard label={door.label} night>
          <CatchText tone="secondary" variant="label-kicker">{door.kicker}</CatchText>
          <CatchText numeric variant="display-sm">{door.title}</CatchText>
          <CatchMeter label={door.meter} max={door.coming} thickness={6} value={door.checkedIn} />
          <CatchIndexRow density="compact" marker={{tone: "info"}} subtitle={door.late.subtitle} title={door.late.title} wrap />
        </WhoCard>
      </CardRow>
    </CatchStack>
  );
}

interface TripRow {
  key: string;
  vendor: {title: string; subtitle: string};
  billed: number;
  recorded: number;
  check: CatchBadgeProps;
}

function After() {
  const chapter = follow.after;
  const card = chapter.card;
  const columns: CatchTableColumn<TripRow>[] = [
    {key: "vendor", label: card.columns.vendor, kind: "title"},
    {key: "billed", label: card.columns.billed, kind: "number"},
    {key: "recorded", label: card.columns.recorded, kind: "number"},
    {key: "check", label: card.columns.check, kind: "badge", align: "center"},
  ];
  const rows: TripRow[] = card.rows.map((row) => ({
    key: row.key,
    vendor: {title: row.vendor, subtitle: row.fleet},
    billed: row.billed,
    recorded: row.recorded,
    check: {label: row.check.label, tone: badgeTone(row.check.tone)},
  }));
  return (
    <Chapter body={chapter.body} id="weddings-after" kicker={chapterKicker(chapter)} points={chapter.points} title={chapter.title}>
      <WhoCard label={card.label}>
        <CatchText variant="title-row">{card.title}</CatchText>
        <CatchTable columns={columns} label={card.title} rows={rows} />
      </WhoCard>
    </Chapter>
  );
}

/** Follow one wedding (#follow): Aditi and Kabir's weekend in six chapters, each with what someone sees. */
function Follow({landing}: {landing: WeddingsLandingController}) {
  return (
    <CatchSurface aria-labelledby="weddings-follow-title" as="section" block="band" id="follow">
      <Heading body={follow.lead} id="weddings-follow-title" kicker={follow.kicker} title={follow.title} tone="danger" />
      <SetUp />
      <Invite landing={landing} />
      <WriteIn />
      <Travel />
      <Weekend />
      <After />
    </CatchSurface>
  );
}

/** The hero: the pitch beside the wedding drawn as a running order. */
function Hero() {
  const hero = copy.hero;
  return (
    <CatchSurface aria-labelledby="weddings-title" as="section" block="band">
      <CatchStack align="center" collapseBelow="expanded" direction="row" equal gap={64}>
        <CatchStack gap={20}>
          <CatchText tone="danger" variant="label-kicker">{hero.kicker}</CatchText>
          <CatchText as="h1" id="weddings-title" variant="page-title">{hero.title}</CatchText>
          <CatchText tone="secondary" variant="body-lead">{hero.body}</CatchText>
          <CatchStack direction="row" gap={8} wrap>
            <CatchButton href="#apply" label={hero.apply} />
            <CatchButton href="#follow" label={hero.follow} variant="secondary" />
          </CatchStack>
          <CatchText tone="secondary" variant="label-kicker">{hero.note}</CatchText>
        </CatchStack>
        <CatchStack gap={12}>
          <CatchStack direction="row" gap={12} justify="between">
            <CatchText tone="secondary" variant="label-kicker">{hero.wedding}</CatchText>
            <CatchText tone="secondary" variant="label-kicker">{hero.countdown}</CatchText>
          </CatchStack>
          <CatchSection dividers="all">
            {hero.order.map((beat) => (
              <CatchIndexRow date={{day: beat.month, date: beat.day, format: "nightsOut"}} density="compact" key={beat.title} subtitle={beat.subtitle} title={beat.title}
                trailing={<CatchBadge label={beat.badge.label} tone={badgeTone(beat.badge.tone)} />} wrap />
            ))}
          </CatchSection>
          <CatchText tone="secondary" variant="body-meta">{hero.illustrative}</CatchText>
        </CatchStack>
      </CatchStack>
    </CatchSurface>
  );
}

/** Why planners switch: five pains, each with what changes. */
function Problem() {
  const problem = copy.problem;
  return (
    <CatchSurface aria-labelledby="weddings-problem-title" as="section" block="band" color="tile">
      <Heading id="weddings-problem-title" kicker={problem.kicker} title={problem.title} />
      <CatchStack align="start" collapseBelow="expanded" direction="row" equal gap={24}>
        {problem.pains.map((pain) => (
          <CatchStack gap={8} key={pain.number}>
            <CatchText tone="secondary" variant="label-code">{pain.number}</CatchText>
            <CatchText as="h3" variant="title-row">{pain.title}</CatchText>
            <CatchText tone="secondary" variant="body-small">{pain.before}</CatchText>
            <CatchText variant="body-small">{fill(problem.withCatch, {after: pain.after})}</CatchText>
          </CatchStack>
        ))}
      </CatchStack>
    </CatchSurface>
  );
}

/** Your team (#team, ink band): ten roles, each seeing only its own job. */
function Team() {
  const team = copy.team;
  return (
    <CatchSurface aria-labelledby="weddings-team-title" as="section" block="band" color="ink" id="team">
      <CatchStack align="end" collapseBelow="expanded" direction="row" equal gap={48}>
        <Heading id="weddings-team-title" kicker={team.kicker} title={team.title} tone="warning" />
        <CatchText tone="secondary" variant="body-lead">{team.body}</CatchText>
      </CatchStack>
      {[team.roles.slice(0, 5), team.roles.slice(5)].map((roles) => (
        <CatchStack align="stretch" collapseBelow="expanded" direction="row" equal gap={12} key={roles[0].title}>
          {roles.map((role) => (
            <CatchSurface block="tile" key={role.title}>
              <CatchIcon name={role.icon} size={24} />
              <CatchText as="h3" variant="title-row">{role.title}</CatchText>
              <CatchText tone="secondary" variant="body-small">{role.body}</CatchText>
              <CatchStack align="start"><CatchBadge label={role.access} tone="neutral" /></CatchStack>
            </CatchSurface>
          ))}
        </CatchStack>
      ))}
    </CatchSurface>
  );
}

const messageMarkers: Record<"sent" | "next" | "planned", CatchMarkerProps> = {
  sent: {tone: "ink", size: 12},
  next: {tone: "format", format: "nightsOut", size: 12, live: true},
  planned: {kind: "ring", size: 12},
};

const messageBadges: Record<"sent" | "next" | "planned", CatchBadgeProps["tone"]> = {sent: "success", next: "brand", planned: "neutral"};

/** Messages and The family, side by side. */
function MessagesAndFamily() {
  const {messages, family} = copy;
  return (
    <CatchSurface aria-labelledby="weddings-messages-title weddings-family-title" as="section" block="band">
      <CatchStack align="start" collapseBelow="expanded" direction="row" equal gap={48}>
        <CatchStack gap={24}>
          <Heading body={messages.body} id="weddings-messages-title" kicker={messages.kicker} size="section" title={messages.title} />
          <WhoCard label={messages.card}>
            <CatchSection timeline>
              {messages.rows.map((row) => (
                <CatchIndexRow density="compact" key={row.title} marker={messageMarkers[row.state]} subtitle={row.when} title={row.title}
                  trailing={<CatchBadge label={messages.states[row.state]} tone={messageBadges[row.state]} />} />
              ))}
            </CatchSection>
          </WhoCard>
        </CatchStack>
        <CatchStack gap={24}>
          <Heading body={family.body} id="weddings-family-title" kicker={family.kicker} size="section" title={family.title} />
          <WhoCard label={family.card}>
            <CatchStack direction="row" equal gap={12}>
              {family.stats.map((stat) => <CatchMetricTile key={stat.label} label={stat.label} layout="inline" value={stat.value} />)}
            </CatchStack>
            <CatchSection>
              {family.functions.map((item) => (
                <CatchIndexRow density="compact" key={item.name} progress={{value: item.coming, max: item.invited, label: fill(family.progressLabel, item)}} title={item.name}
                  value={String(item.coming)} />
              ))}
            </CatchSection>
            <CatchStack direction="row" gap={6} wrap>
              {family.diets.map((diet) => <CatchChip count={diet.count} key={diet.label} kind="tag" label={diet.label} size="sm" />)}
            </CatchStack>
          </WhoCard>
        </CatchStack>
      </CatchStack>
    </CatchSurface>
  );
}

/** Pricing (#pricing, games band): per wedding by headcount, four tiers. */
function Pricing() {
  const pricing = copy.pricing;
  return (
    <CatchSurface aria-labelledby="weddings-pricing-title" as="section" block="band" color="games" id="pricing">
      <CatchStack align="start" collapseBelow="expanded" direction="row" equal gap={48}>
        <Heading body={pricing.body} id="weddings-pricing-title" kicker={pricing.kicker} title={pricing.title} tone="primary" />
        <CatchSection dividers="none" title={pricing.includedTitle}>
          {pricing.included.map((item) => <CatchIndexRow density="compact" icon="check" key={item} title={item} wrap />)}
        </CatchSection>
      </CatchStack>
      <CatchStack align="stretch" collapseBelow="expanded" direction="row" equal gap={12}>
        {pricing.tiers.map((tier) => (
          <CatchSurface block="floating" key={tier.title}>
            {tier.popular ? <CatchStack direction="row"><CatchBadge label={pricing.popular} recipe="solid" /></CatchStack> : null}
            <CatchText as="h3" variant="display-sm">{tier.title}</CatchText>
            <CatchText tone="secondary" variant="body-small">{tier.body}</CatchText>
            <CatchText variant="label-action">{pricing.quote}</CatchText>
          </CatchSurface>
        ))}
      </CatchStack>
      <CatchText tone="secondary" variant="body-small">{pricing.atCost}</CatchText>
    </CatchSurface>
  );
}

/** The pilot (#apply, run band): six guided steps beside the step-1 card. */
function Pilot({landing}: {landing: WeddingsLandingController}) {
  const pilot = copy.pilot;
  return (
    <CatchSurface aria-labelledby="weddings-pilot-title" as="section" block="band" color="run" id="apply">
      <CatchStack align="start" collapseBelow="expanded" direction="row" equal gap={48}>
        <CatchStack gap={24}>
          <Heading body={pilot.body} id="weddings-pilot-title" kicker={pilot.kicker} title={pilot.title} tone="primary" />
          <CatchSection dividers="all">
            {pilot.steps.map((step, index) => <CatchIndexRow density="compact" key={step.title} rank={index + 1} subtitle={step.body} title={step.title} wrap />)}
          </CatchSection>
        </CatchStack>
        <StepOneCard continueHref={weddingsApplyPath} idPrefix="weddings-landing-apply" onContinue={landing.continueToApply} stepOne={landing.stepOne} />
      </CatchStack>
    </CatchSurface>
  );
}

/** Questions (#questions): the FAQ beside its heading. */
function Questions() {
  const faq = copy.faq;
  return (
    <CatchSurface aria-labelledby="weddings-faq-title" as="section" block="band" id="questions">
      <CatchStack align="start" collapseBelow="expanded" direction="row" equal gap={48}>
        <Heading id="weddings-faq-title" kicker={faq.kicker} title={faq.title} />
        <CatchAccordion items={faq.items} name="weddings-faq" size="lg" />
      </CatchStack>
    </CatchSurface>
  );
}

/**
 * The landing's bands in the RbWebWeddings board's order: the running-order
 * hero, why planners switch, one wedding in six chapters (#follow), the team
 * (#team), messages and the family, pricing (#pricing), the pilot with the
 * step-1 card (#apply) and questions (#questions).
 */
export function WeddingsBands({landing}: {landing: WeddingsLandingController}) {
  return (
    <>
      <Hero />
      <Problem />
      <Follow landing={landing} />
      <Team />
      <MessagesAndFamily />
      <Pricing />
      <Pilot landing={landing} />
      <Questions />
    </>
  );
}
