import {
  CatchBand,
  CatchBandHeader,
  CatchBarIndicator,
  CatchField,
  CatchGrid,
  CatchGroundCard,
  CatchMetricTile,
  CatchRangeInput,
  CatchSplit,
  CatchStack,
  CatchText,
  type CatchBandGround,
} from "@catch/web-ui";
import {hostPricingLines} from "@content/pricing";
import {formatNoShowCount as count, formatNoShowMoney as money, formatNoShowRate as percent, noShowInputLimits} from "./noShowCalculatorModel";
import {useNoShowCalculator} from "./useNoShowCalculator";

/**
 * Every word the calculator shows, by its key in the page's custom section
 * `labels` (content/playbook/pages/resources/tools-no-show-calculator.json),
 * so the copy stays in the page. `{name}` marks where a figure goes.
 */
export const noShowCalculatorLabelKeys = [
  "inputsTitle", "places", "events", "price", "priceHelp", "costPerHead", "costPerHeadHelp",
  "rate", "target", "startingNote",
  "resultsTitle", "emptyPerEvent", "emptyPerEventNote", "emptyPerMonth", "emptyPerMonthNote",
  "costPerEvent", "costPerMonth", "costNoteTicket", "costNoteFree", "costPerHeadMissing",
  "whatIfTitle", "whatIfCost", "whatIfSaved", "whatIfFewer", "chartLabel", "today", "whatIf",
  "summary", "paidNote", "freeNote", "estimate",
] as const;
export type NoShowCalculatorLabelKey = (typeof noShowCalculatorLabelKeys)[number];

/** Fills the `{name}` marks a label uses; a label without marks is returned as it is. */
function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/gu, (match, token: string) => values[token] ?? match);
}

export interface NoShowCalculatorProps {
  readonly id: string;
  readonly ground: CatchBandGround;
  readonly labels: Readonly<Record<string, string>>;
  readonly kicker?: string;
  readonly title?: string;
  readonly lead?: string;
  /** The title is the page's h1. */
  readonly pageTitle?: boolean;
}

/**
 * The no-show calculator (the PlaybookNoShow board's calculator): the host's
 * own numbers on the left, places or tickets, events a month, the ticket
 * price (or on a free event what a held place costs) and their no-show rate;
 * on the right, what no-shows cost per event and per month, then the same
 * sums at a rate the host slides to ("if your no-show rate fell to"). Every
 * figure comes from what the host entered; the page claims no rate of its
 * own. The fee line is the shared fee model's (content/pricing.ts).
 */
export function NoShowCalculator({id, ground, labels, kicker, title, lead, pageTitle}: NoShowCalculatorProps) {
  const calculator = useNoShowCalculator();
  const {inputs, figures} = calculator;
  const text = (key: NoShowCalculatorLabelKey, values: Readonly<Record<string, string>> = {}) => fill(labels[key] ?? "", values);
  const costNote = figures.free ? (figures.costPerHead > 0 ? text("costNoteFree") : text("costPerHeadMissing")) : text("costNoteTicket");
  const values = {
    rate: percent(figures.rate),
    target: percent(figures.target),
    places: count(figures.places),
    held: count(figures.heldPerMonth),
    count: count(figures.fewerEmptyPerMonth),
    cost: money(figures.costPerMonth),
  };
  const inputCard = (
    <CatchGroundCard ground={ground === "paper" ? "white" : "paper"} padding="spacious">
      <CatchStack gap={20}>
        <CatchText as="h3" variant="title-row">{text("inputsTitle")}</CatchText>
        <CatchField keyboardType="number" maxLength={6} onChanged={calculator.setPlaces} recipe="input" title={text("places")} value={inputs.places} />
        <CatchField keyboardType="number" maxLength={3} onChanged={calculator.setEvents} recipe="input" title={text("events")} value={inputs.events} />
        <CatchField helperText={text("priceHelp")} keyboardType="number" maxLength={String(noShowInputLimits.price).length} onChanged={calculator.setPrice}
          prefixText="₹" recipe="input" title={text("price")} value={inputs.price} />
        {figures.free ? (
          <CatchField helperText={text("costPerHeadHelp")} keyboardType="number" maxLength={String(noShowInputLimits.costPerHead).length}
            onChanged={calculator.setCostPerHead} prefixText="₹" recipe="input" title={text("costPerHead")} value={inputs.costPerHead} />
        ) : null}
        <CatchStack gap={8}>
          <CatchStack direction="row" gap={8} railWidth="fit">
            <CatchText as="span" variant="label-action">{text("rate")}</CatchText>
            <CatchText as="span" numeric variant="display-xs">{values.rate}</CatchText>
          </CatchStack>
          <CatchRangeInput label={text("rate")} max={100} min={0} onChange={calculator.setRate} step={1} value={figures.rate} />
        </CatchStack>
        <CatchStack gap={8}>
          <CatchStack direction="row" gap={8} railWidth="fit">
            <CatchText as="span" variant="label-action">{text("target")}</CatchText>
            <CatchText as="span" numeric variant="display-xs">{values.target}</CatchText>
          </CatchStack>
          <CatchRangeInput label={text("target")} max={figures.rate} min={0} onChange={calculator.setTarget} step={1} value={figures.target} />
        </CatchStack>
        <CatchText tone="secondary" variant="body-meta">{text("startingNote")}</CatchText>
      </CatchStack>
    </CatchGroundCard>
  );
  const resultCard = (
    <CatchGroundCard ground="ink" padding="spacious">
      <CatchStack gap={20}>
        <CatchText as="h3" variant="title-row">{text("resultsTitle")}</CatchText>
        <CatchGrid columns={2} compactColumns={1} gap="related">
          <CatchMetricTile label={text("emptyPerEvent")} note={text("emptyPerEventNote", values)} value={count(figures.emptyPerEvent)} />
          <CatchMetricTile label={text("emptyPerMonth")} note={text("emptyPerMonthNote", values)} value={count(figures.emptyPerMonth)} />
          <CatchMetricTile label={text("costPerEvent")} note={costNote} value={money(figures.costPerEvent)} />
          <CatchMetricTile label={text("costPerMonth")} note={costNote} value={money(figures.costPerMonth)} />
        </CatchGrid>
        <CatchText aria-live="polite" as="p" role="status" variant="body">{text("summary", values)}</CatchText>
        <CatchText as="h3" variant="title-row">{text("whatIfTitle", values)}</CatchText>
        <CatchGrid columns={2} compactColumns={1} gap="related">
          <CatchMetricTile label={text("whatIfCost")} note={costNote} value={money(figures.targetCostPerMonth)} />
          <CatchMetricTile label={text("whatIfSaved")} note={text("whatIfFewer", values)} value={money(figures.savedPerMonth)} />
        </CatchGrid>
        <CatchBarIndicator
          bars={[
            {label: text("today", values), value: figures.emptyPerMonth},
            {label: text("whatIf", values), value: figures.targetEmptyPerMonth},
          ]}
          label={text("chartLabel")}
          recipe="chart"
        />
        <CatchText variant="body-small">{figures.free ? text("freeNote") : text("paidNote")}</CatchText>
        <CatchText tone="secondary" variant="body-meta">{text("estimate")}</CatchText>
        <CatchText tone="secondary" variant="body-meta">{hostPricingLines.body}</CatchText>
      </CatchStack>
    </CatchGroundCard>
  );
  return (
    <CatchBand ground={ground} id={id}>
      <CatchStack gap={32}>
        {title ? <CatchBandHeader ground={ground} kicker={kicker} lead={lead} level={pageTitle ? 1 : 2} title={title} /> : null}
        <CatchSplit align="start" end={resultCard} gap="wide" ratio="even" start={inputCard} />
      </CatchStack>
    </CatchBand>
  );
}
