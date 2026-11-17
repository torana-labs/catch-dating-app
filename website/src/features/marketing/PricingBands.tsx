import {
  CatchBand,
  CatchBandHeader,
  CatchButton,
  CatchChip,
  CatchFeeCapChart,
  CatchFeeExamples,
  CatchFeeSection,
  CatchSplitSection,
  CatchStack,
  CatchText,
  type CatchBandAction,
  type CatchFeeSectionExample,
  type CatchFeeSectionFoot,
  type CatchBandGround,
} from "@catch/web-ui";
import {
  hostFeeCapChartCopy,
  hostFeeCapReachedAt,
  hostFeeCycleExample,
  hostFeeExample,
  hostFeeSalesRange,
  hostPricingFacts,
  hostPricingLines,
  pricingPageCycleExamples,
  pricingPageFeeExamples,
} from "@content/pricing";
import {PricingFeeCalculator} from "./PricingFeeCalculator";

export interface PricingFeeBandProps {
  id: string;
  kicker: string;
  actions: readonly CatchBandAction[];
  /** The page headline over the rate, when the band opens its page (/pricing/). */
  title?: string;
  /** The rate's headline; defaults to the rate and its cap per billing cycle. */
  rateTitle?: string;
  labels?: readonly string[];
  examples?: readonly CatchFeeSectionExample[];
  foot?: CatchFeeSectionFoot;
}

/**
 * The fee band on the ink ground (PlaybookHosts #pricing, and PlaybookPricing's
 * opening panel when it has a page title): the rate, its headline and how the
 * fee works from the shared fee model (content/pricing.ts), beside the fee
 * calculator. /host/ adds what the plan includes, three worked examples and
 * the organisations line; /pricing/ opens on it with its page headline.
 */
export function PricingFeeBand({id, kicker, actions, title, rateTitle = hostPricingLines.rateTitle, labels, examples, foot}: PricingFeeBandProps) {
  return (
    <CatchFeeSection
      actions={actions}
      calculator={<PricingFeeCalculator />}
      examples={examples}
      foot={foot}
      id={id}
      kicker={kicker}
      labels={labels}
      lead={hostPricingLines.body}
      level={title ? 1 : 2}
      rate={hostPricingFacts.rate}
      rateTitle={rateTitle}
      title={title}
    />
  );
}

export interface PricingCopyBandProps {
  id: string;
  ground?: CatchBandGround;
  kicker?: string;
  title: string;
  lead?: string;
}

/**
 * The cap (PlaybookPricing's tint panel): the words beside the cap chart,
 * whose stretches and two billing cycles either side of the cap are worked out
 * by the shared fee model.
 */
export function PricingCapBand({id, ground = "paper", kicker, title, lead}: PricingCopyBandProps) {
  return (
    <CatchSplitSection
      ground={ground}
      id={id}
      kicker={kicker}
      kickerAccent="mint"
      lead={lead}
      media={(
        <CatchFeeCapChart
          examples={pricingPageCycleExamples.map(hostFeeCycleExample)}
          parts={[
            {label: hostFeeCapChartCopy.charged, share: hostFeeCapReachedAt},
            {label: hostFeeCapChartCopy.free, share: hostFeeSalesRange.max - hostFeeCapReachedAt},
          ]}
        />
      )}
      title={title}
    />
  );
}

/** What one plan includes (PlaybookPricing's "Included"): the words beside every feature as a tag. */
export function PricingIncludedBand({id, ground, kicker, title, lead, items, label}: PricingCopyBandProps & {items: readonly string[]; label: string}) {
  return (
    <CatchSplitSection
      align="start"
      ground={ground}
      id={id}
      kicker={kicker}
      kickerAccent="indigo"
      lead={lead}
      media={(
        <CatchStack aria-label={label} direction="row" gap={8} role="group" wrap>
          {items.map((item) => <CatchChip key={item} kind="tag" label={item} />)}
        </CatchStack>
      )}
      title={title}
    />
  );
}

/**
 * What hosts like you pay (PlaybookPricing's worked examples, .ex): the
 * header, the fee on six kinds of night as white ring cards, three across,
 * worked out by the shared fee model, and the gateway line under them.
 */
export function PricingExamplesBand({id, ground, kicker, title, foot}: PricingCopyBandProps & {foot?: string}) {
  const titleId = `${id}-title`;
  return (
    <CatchBand aria-labelledby={titleId} as="section" ground={ground} id={id}>
      <CatchStack gap={40}>
        <CatchBandHeader ground={ground} kicker={kicker} kickerAccent="coral" size="section" title={title} titleId={titleId} />
        <CatchStack gap={16}>
          <CatchFeeExamples examples={pricingPageFeeExamples.map(hostFeeExample)} />
          {foot ? <CatchText as="p" tone="secondary" variant="body">{foot}</CatchText> : null}
        </CatchStack>
      </CatchStack>
    </CatchBand>
  );
}

/** Venues, companies and programmes (PlaybookPricing): the words beside the walkthrough and weddings buttons, stacked at the start. */
export function PricingOrganisationsBand({id, ground, kicker, title, lead, actions}: PricingCopyBandProps & {actions: readonly CatchBandAction[]}) {
  return (
    <CatchSplitSection
      ground={ground}
      id={id}
      kicker={kicker}
      kickerAccent="pink"
      lead={lead}
      media={(
        <CatchStack align="start" gap={12}>
          {actions.map((action, index) => (
            <CatchButton href={action.href} key={action.label} label={action.label} newTab={action.newTab} onPressed={action.onPressed}
              variant={action.variant ?? (index === 0 ? "primary" : "secondary")} />
          ))}
        </CatchStack>
      )}
      title={title}
    />
  );
}
