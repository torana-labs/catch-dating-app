import {CatchComparisonTable} from "@catch/web-ui";
import {hostCompareCopy as copy} from "@content/hostCompare";
import type {PlaybookCustomSectionProps} from "./customSections";

/**
 * /pricing/'s comparison (hostCompare): how Catch compares with what hosts
 * use today, as a ledger of Catch beside one tool the reader picks. Its words
 * and every cell live in content/hostCompare.ts, so the table has one source;
 * the host page links here instead of repeating it.
 */
export function HostCompareSection({section}: PlaybookCustomSectionProps) {
  if (section.type !== "custom") return null;
  return (
    <CatchComparisonTable
      checked={copy.checked}
      columns={copy.columns}
      compareLabel={copy.compareWith}
      ground={section.ground}
      highlightColumn={0}
      id={section.id}
      kicker={section.kicker ?? copy.kicker}
      lead={section.lead ?? copy.body}
      rowHeader={copy.rowHeader}
      rows={copy.rows}
      source={copy.source}
      title={section.title ?? copy.title}
    />
  );
}
