import {
  CatchBadge,
  CatchBarIndicator,
  CatchButton,
  CatchCheckboxInput,
  CatchIndexRow,
  CatchMeter,
  CatchMetricTile,
  CatchSection,
  CatchStack,
  CatchSurface,
  CatchTable,
  CatchText,
  type CatchBadgeProps,
  type CatchTableColumn,
} from "@catch/web-ui";
import {interpolateContent as fill} from "@content/interpolate";
import {weddingsCopy} from "@content/weddings";
import type {WeddingsLandingController} from "../useWeddingsController";
import {badgeTone, replyBadge} from "../weddingsModel";
import {Attachment, CardRow, Chapter, Heading, Message, WhoCard} from "./weddingsParts";

const follow = weddingsCopy.follow;
const chapterKicker = (chapter: {number: string; kicker: string}) => fill(follow.chapterKicker, chapter);

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
export function Follow({landing}: {landing: WeddingsLandingController}) {
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
