import {
  CatchBand,
  CatchBandHeader,
  CatchField,
  CatchGrid,
  CatchGroundCard,
  CatchMetricTile,
  CatchSplit,
  CatchStack,
  CatchText,
  type CatchBandGround,
} from "@catch/web-ui";
import {hostFeeCalculatorCopy, hostPricingFacts} from "@content/pricing";
import {
  formatLastEventCount as count,
  formatLastEventMoney as money,
  formatShowUpRate as percent,
  lastEventInputLimits,
  type LastEventField,
  type LastEventFieldProblem,
} from "./lastEventReportModel";
import {useLastEventReport} from "./useLastEventReport";

/**
 * Every word the report shows, by its key in the page's custom section
 * `labels` (content/playbook/pages/product/reports.json), so the copy stays
 * in the page. `{name}` marks where a figure goes. The fee's own words (its
 * name, "after your trial", the cap, the trial and the gateway line) are the
 * fee calculator's, from content/pricing.ts.
 */
export const lastEventReportLabelKeys = [
  "inputsTitle", "sold", "soldHint", "price", "priceHint", "priceHelp", "came", "cameHint",
  "feeTitle", "feePercent", "feePercentHelp", "feePerTicket", "feePerTicketHelp", "privacyNote",
  "errorNotNumber", "errorNotWhole", "errorTooLarge", "errorCameMoreThanSold",
  "resultsTitle", "emptyResults", "fixResults", "summary",
  "sales", "salesNote", "showUp", "showUpNote", "showUpNone",
  "feesTitle", "freeNote", "currentFee", "currentFeeNote", "currentFeeMissing",
  "difference", "differenceLess", "differenceMore", "differenceSame", "differenceMissing",
  "singleEventNote",
] as const;
export type LastEventReportLabelKey = (typeof lastEventReportLabelKeys)[number];

/** Fills the `{name}` marks a label uses; a label without marks is returned as it is. */
function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/gu, (match, token: string) => values[token] ?? match);
}

const problemLabels: Record<LastEventFieldProblem, LastEventReportLabelKey> = {
  notNumber: "errorNotNumber",
  notWhole: "errorNotWhole",
  tooLarge: "errorTooLarge",
  cameMoreThanSold: "errorCameMoreThanSold",
};

/** The most each field takes, as the error line states it. */
const fieldMaxima: Record<LastEventField, string> = {
  sold: count(lastEventInputLimits.sold),
  price: money(lastEventInputLimits.price),
  came: count(lastEventInputLimits.sold),
  feePercent: `${lastEventInputLimits.feePercent}%`,
  feePerTicket: money(lastEventInputLimits.feePerTicket),
};

export interface LastEventReportProps {
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
 * The numbers-only path of the Reports try-it tool: the host's last event
 * (tickets sold, ticket price, how many came) and their current tool's fee
 * on the left; on the right the event's ticket sales and show-up rate, then
 * {brand}'s fee on it (hostFeeQuote, with the fee calculator's trial, cap and
 * gateway lines) next to the fee the host entered, and the difference.
 * Every figure comes from what the host typed or from content/pricing.ts.
 * No sign-in, no request, nothing stored. The export upload is the page's
 * hidden `try` band, until its command ships.
 */
export function LastEventReport({id, ground, labels, kicker, title, lead, pageTitle}: LastEventReportProps) {
  const tool = useLastEventReport();
  const {inputs, report} = tool;
  const {figures, problems} = report;
  const text = (key: LastEventReportLabelKey, values: Readonly<Record<string, string>> = {}) => fill(labels[key] ?? "", values);
  const error = (field: LastEventField) => {
    const problem = problems[field];
    return problem ? text(problemLabels[problem], {max: fieldMaxima[field]}) : null;
  };
  const values: Readonly<Record<string, string>> = figures ? {
    sold: count(figures.sold),
    came: count(figures.came),
    price: money(figures.price),
    sales: money(figures.sales),
    fee: money(figures.catchQuote.fee),
    amount: money(Math.abs(figures.difference ?? 0)),
    cap: hostPricingFacts.cap,
  } : {cap: hostPricingFacts.cap};
  const inputCard = (
    <CatchGroundCard ground={ground === "paper" ? "white" : "paper"} padding="spacious">
      <CatchStack gap={20}>
        <CatchText as="h3" variant="title-row">{text("inputsTitle")}</CatchText>
        <CatchField errorText={error("sold")} inputHint={text("soldHint")} keyboardType="number" maxLength={9}
          onChanged={tool.setSold} recipe="input" title={text("sold")} value={inputs.sold} />
        <CatchField errorText={error("price")} helperText={text("priceHelp")} inputHint={text("priceHint")} keyboardType="number" maxLength={11}
          onChanged={tool.setPrice} prefixText="₹" recipe="input" title={text("price")} value={inputs.price} />
        <CatchField errorText={error("came")} inputHint={text("cameHint")} keyboardType="number" maxLength={9}
          onChanged={tool.setCame} recipe="input" title={text("came")} value={inputs.came} />
        <CatchText as="h3" variant="title-row">{text("feeTitle")}</CatchText>
        <CatchField errorText={error("feePercent")} helperText={text("feePercentHelp")} keyboardType="decimal" maxLength={6}
          onChanged={tool.setFeePercent} recipe="input" suffixText="%" title={text("feePercent")} value={inputs.feePercent} />
        <CatchField errorText={error("feePerTicket")} helperText={text("feePerTicketHelp")} keyboardType="decimal" maxLength={9}
          onChanged={tool.setFeePerTicket} prefixText="₹" recipe="input" title={text("feePerTicket")} value={inputs.feePerTicket} />
        <CatchText tone="secondary" variant="body-meta">{text("privacyNote")}</CatchText>
      </CatchStack>
    </CatchGroundCard>
  );
  const status = figures ? text("summary", values) : text(Object.keys(problems).length > 0 ? "fixResults" : "emptyResults");
  const catchFeeNote = figures?.free ? text("freeNote") : figures?.catchQuote.capped ? hostFeeCalculatorCopy.capped : hostFeeCalculatorCopy.feeNote;
  const differenceNote = figures?.difference == null ? text("differenceMissing") :
    figures.difference > 0 ? text("differenceLess", values) : figures.difference < 0 ? text("differenceMore", values) : text("differenceSame");
  const resultCard = (
    <CatchGroundCard ground="ink" padding="spacious">
      <CatchStack gap={20}>
        <CatchText as="h3" variant="title-row">{text("resultsTitle")}</CatchText>
        <CatchText aria-live="polite" as="p" role="status" variant="body">{status}</CatchText>
        {figures ? (
          <>
            <CatchGrid columns={2} compactColumns={1} gap="related">
              <CatchMetricTile label={text("sales")} note={text("salesNote", values)} value={money(figures.sales)} />
              <CatchMetricTile label={text("showUp")} note={figures.showUpRate === null ? text("showUpNone") : text("showUpNote", values)}
                value={figures.showUpRate === null ? "–" : percent(figures.showUpRate)} />
            </CatchGrid>
            <CatchText as="h3" variant="title-row">{text("feesTitle")}</CatchText>
            <CatchGrid columns={2} compactColumns={1} gap="related">
              <CatchMetricTile label={hostFeeCalculatorCopy.fee} note={catchFeeNote} value={money(figures.catchQuote.fee)} />
              <CatchMetricTile label={text("currentFee")} note={figures.currentFee === null ? text("currentFeeMissing") : text("currentFeeNote")}
                value={figures.currentFee === null ? "–" : money(figures.currentFee)} />
            </CatchGrid>
            <CatchMetricTile label={text("difference")} note={differenceNote} value={figures.difference === null ? "–" : money(Math.abs(figures.difference))} />
            <CatchText tone="secondary" variant="body-meta">{text("singleEventNote", values)}</CatchText>
            <CatchText tone="secondary" variant="body-meta">{hostFeeCalculatorCopy.trial}</CatchText>
            <CatchText tone="secondary" variant="body-meta">{hostFeeCalculatorCopy.gateway}</CatchText>
          </>
        ) : null}
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
