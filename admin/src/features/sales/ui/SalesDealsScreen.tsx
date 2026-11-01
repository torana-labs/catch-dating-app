import {CatchIndexRow, CatchPaneLayout, CatchRail, CatchSection, CatchWorkspaceHeader} from "@catch/web-ui";
import type {ReactNode} from "react";
import {dueLabel, stageLabel} from "../controllers/salesLabels";
import type {SalesDealsController} from "../controllers/useSalesDealsController";

export type SalesDealsModel = Pick<SalesDealsController,
  "scope" | "setScope" | "search" | "setSearch" | "columns" | "counts" | "truncated">;

/**
 * The Deals board: pipeline and pilots together, one column per stage. A
 * board is a rail of sections of rows (no hand-made grid); a row opens its host.
 */
export function SalesDealsScreen({model, onOpenHost, tabs}: {
  model: SalesDealsModel;
  onOpenHost: (organizerId: string) => void;
  /** The owner's Today, Hosts and Deals tabs. */
  tabs?: ReactNode;
}) {
  return (
    <CatchPaneLayout pattern="wide-table" main={<>
      <CatchWorkspaceHeader title="Deals" count={model.scope === "mine" ? model.counts.mine : model.counts.team} actions={tabs}
        note={model.truncated ? "showing the first 200 · search to find the rest" : null}
        views={{items: [{value: "team", label: "Team", count: model.counts.team}, {value: "mine", label: "Mine", count: model.counts.mine}],
          value: model.scope, label: "Whose deals", onChanged: (value) => model.setScope(value as "team" | "mine")}}
        filters={{search: {placeholder: "Search hosts", value: model.search, onChanged: model.setSearch}}} />
      <CatchRail label="Stages" itemWidth={232} wrap="never">
        {model.columns.map((column) => (
          <CatchSection key={column.value} title={column.label} count={column.cards.length} dividers="none">
            {column.cards.map(({deal, name}) => (
              <CatchIndexRow key={deal.opportunityId} title={name} titleVariant="bodyM" onTap={() => onOpenHost(deal.organizerId)}
                subtitle={[deal.nextStep ?? stageLabel(deal.stage), deal.nextStepAt ? dueLabel(deal.nextStepAt).text : null]
                  .filter(Boolean).join(" · ")} />
            ))}
          </CatchSection>
        ))}
      </CatchRail>
    </>} />
  );
}
