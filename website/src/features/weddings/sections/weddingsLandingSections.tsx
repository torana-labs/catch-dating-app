import {
  CatchAccordion,
  CatchBadge,
  CatchButton,
  CatchChip,
  CatchIcon,
  CatchIndexRow,
  CatchMetricTile,
  CatchSection,
  CatchStack,
  CatchSurface,
  CatchText,
  type CatchBadgeProps,
  type CatchMarkerProps,
} from "@catch/web-ui";
import {interpolateContent as fill} from "@content/interpolate";
import {weddingsApplyPath, weddingsCopy as copy} from "@content/weddings";
import type {WeddingsLandingController} from "../useWeddingsController";
import {badgeTone} from "../weddingsModel";
import {StepOneCard} from "./weddingsApplicationSections";
import {Heading, WhoCard} from "./weddingsParts";

/** The hero: the pitch beside the wedding drawn as a running order. */
export function Hero() {
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
export function Problem() {
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
export function Team() {
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
export function MessagesAndFamily() {
  const {messages, family} = copy;
  return (
    <CatchSurface aria-label={`${messages.kicker} · ${family.kicker}`} as="section" block="band">
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
export function Pricing() {
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
export function Pilot({landing}: {landing: WeddingsLandingController}) {
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
export function Questions() {
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

/** The foot band (ink): the product name across from what it is. */
export function Foot() {
  return (
    <CatchStack as="footer" gap={0}>
      <CatchSurface block="band" color="ink">
        <CatchStack align="end" direction="row" gap={24} justify="between" wrap>
          <CatchText variant="display-section">{copy.foot.title}</CatchText>
          <CatchText tone="secondary" variant="body-small">{copy.foot.body}</CatchText>
        </CatchStack>
      </CatchSurface>
    </CatchStack>
  );
}
