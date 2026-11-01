import {
  CatchButton,
  CatchGap,
  CatchIndexRow,
  CatchPaneLayout,
  CatchText,
  CatchWorkspaceHeader,
} from "@catch/web-ui";
import type {
  NowDestination,
  NowItem,
  NowModel,
  NowTone,
} from "../controllers/useNowController";

const toneColor: Record<NowTone, "danger" | "attentionText" | "ink2"> = {
  danger: "danger",
  warning: "attentionText",
  neutral: "ink2",
};

const sourceColor = {success: "positiveText", warning: "attentionText", danger: "danger"} as const;

function Waiting({item}: {item: NowItem}) {
  return item.waiting ? (
    <CatchText as="span" color={toneColor[item.tone]} variant="supportingStrong">{item.waiting}</CatchText>
  ) : null;
}

// A plain number strip; PR 3's CatchStat replaces it.
function Stat({label, value}: {label: string; value: number}) {
  return (
    <CatchGap size="headerTitleToSubtitle">
      <CatchText as="span" color="ink2" variant="supporting">{label}</CatchText>
      <CatchText as="span" variant="metric">{value.toLocaleString("en-IN")}</CatchText>
    </CatchGap>
  );
}

/**
 * Needs you: every item waiting on a person in one list, oldest first, beside counts by kind and
 * what ran while the person was away. Rows open in the area that owns them.
 */
export function NowScreen({
  canOpen,
  dateLabel,
  error,
  isLoading,
  model,
  onOpenItem,
  onOpenKind,
  onRefresh,
}: {
  canOpen: (destination: NowDestination) => boolean;
  dateLabel: string;
  error: string | null;
  isLoading: boolean;
  model: NowModel | null;
  onOpenItem: (item: NowItem) => void;
  onOpenKind: (destination: NowDestination) => void;
  onRefresh: () => void;
}) {
  const header = (
    <CatchWorkspaceHeader
      actions={<CatchButton label={isLoading ? "Refreshing" : "Refresh"} onPressed={isLoading ? null : onRefresh} size="sm" variant="secondary" />}
      count={model?.waiting}
      note={dateLabel}
      title="Needs you"
    />
  );
  if (!model) {
    return (
      <>
        {header}
        <CatchPaneLayout
          main={<CatchText as="p" color={error ? "danger" : "ink2"} variant="bodyM">{error ?? "Loading what needs you"}</CatchText>}
          pattern="feed"
        />
      </>
    );
  }
  const oldest = (
    <CatchGap size="section">
      {error ? <CatchText as="p" color="danger" variant="bodyS">{error} The list below is from the last load.</CatchText> : null}
      <CatchGap direction="horizontal" size="section" wrap>
        <Stat label="Waiting on you" value={model.waiting} />
        <Stat label="Over 2 days" value={model.overTwoDays} />
        {model.completedPayments !== null ? <Stat label="Completed payments" value={model.completedPayments} /> : null}
        {model.activeHosts !== null ? <Stat label="Active host claims" value={model.activeHosts} /> : null}
      </CatchGap>
      <CatchGap size="related">
        <CatchText as="h2" variant="sectionTitle">Oldest first</CatchText>
        {model.items.length === 0 ? (
          <CatchText as="p" color="ink2" variant="bodyM">Nothing is waiting on you.</CatchText>
        ) : model.items.map((item) => (
          <CatchIndexRow
            key={item.id}
            onTap={canOpen(item.destination) ? () => onOpenItem(item) : null}
            subtitle={item.subtitle}
            title={item.title}
            trailing={<Waiting item={item} />}
          />
        ))}
      </CatchGap>
    </CatchGap>
  );
  const aside = (
    <CatchGap size="section">
      <CatchGap size="related">
        <CatchText as="h2" variant="sectionTitle">By kind</CatchText>
        {model.kinds.map((kind) => (
          <CatchIndexRow
            key={kind.destination}
            onTap={canOpen(kind.destination) ? () => onOpenKind(kind.destination) : null}
            subtitle={kind.summary}
            title={kind.title}
            trailing={<CatchText as="span" variant="supportingStrong">{String(kind.count)}</CatchText>}
          />
        ))}
      </CatchGap>
      {model.sources.length > 0 ? (
        <CatchGap size="related">
          <CatchText as="h2" variant="sectionTitle">Data sources</CatchText>
          {model.sources.map((source) => (
            <CatchIndexRow
              key={source.id}
              subtitle={source.detail}
              title={source.title}
              trailing={<CatchText as="span" color={sourceColor[source.tone]} variant="supportingStrong">
                {source.tone === "success" ? "Fresh" : source.tone === "warning" ? "Check" : "Blocked"}
              </CatchText>}
            />
          ))}
        </CatchGap>
      ) : null}
    </CatchGap>
  );
  return (
    <>
      {header}
      <CatchPaneLayout aside={aside} main={oldest} pattern="feed" />
    </>
  );
}
