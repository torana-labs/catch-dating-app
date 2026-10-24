import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {Check, ChevronRight, LoaderCircle, PanelRightClose, PanelRightOpen, Undo2, X} from "lucide-react";

import type {
  AdminIntakeChecklistRow,
  AdminIntakeEvidenceRow,
  AdminIntakeImpactRow,
  AdminIntakeInspectorSection,
  AdminIntakeQueueFilter,
  AdminIntakeQueueColumn,
  AdminIntakeQueueItem,
  AdminIntakeWorkbenchDetail,
  AdminIntakeWorkbenchTone,
} from "./intake";
import {CatchText} from "@catch/web-ui";

export type AdminIntakeWorkbenchState =
  | "ready"
  | "loading"
  | "error"
  | "unavailable";

export interface AdminIntakeBulkActionResult {
  appliedIds?: readonly string[];
  failures?: ReadonlyArray<{id: string; reason: string}>;
}

export interface AdminIntakeBulkAction {
  disabledReason?: string;
  eligibleIds: readonly string[];
  id: string;
  label: string;
  onApply: (
    ids: readonly string[]
  ) => AdminIntakeBulkActionResult | Promise<AdminIntakeBulkActionResult | void> | void;
  onUndo?: (ids: readonly string[]) => Promise<void> | void;
  tone?: "danger" | "neutral" | "success";
}

export function eligibleBulkSelection(
  selectedIds: ReadonlySet<string>,
  action: Pick<AdminIntakeBulkAction, "eligibleIds">
) {
  const eligible = new Set(action.eligibleIds);
  const appliedIds = [...selectedIds].filter((id) => eligible.has(id));
  return {
    appliedIds,
    skippedIds: [...selectedIds].filter((id) => !eligible.has(id)),
  };
}

export function nextSelectionAfterDisposition(
  items: readonly Pick<AdminIntakeQueueItem, "id">[],
  disposedIds: ReadonlySet<string>,
  currentId: string | null
) {
  if (items.length === 0) {
    return null;
  }
  const currentIndex = Math.max(0, items.findIndex((item) => item.id === currentId));
  for (let offset = 1; offset <= items.length; offset += 1) {
    const candidate = items[(currentIndex + offset) % items.length];
    if (!disposedIds.has(candidate.id)) {
      return candidate.id;
    }
  }
  return currentId ?? items[0].id;
}

export function mergeStableIntakeItems(
  stableItems: readonly AdminIntakeQueueItem[],
  incomingItems: readonly AdminIntakeQueueItem[]
) {
  const incomingById = new Map(incomingItems.map((item) => [item.id, item]));
  const retained = stableItems.map((item) => incomingById.get(item.id) ?? item);
  const knownIds = new Set(retained.map((item) => item.id));
  return [
    ...retained,
    ...incomingItems.filter((item) => !knownIds.has(item.id)),
  ];
}

export function toggleIntakeRangeSelection(
  current: ReadonlySet<string>,
  items: readonly Pick<AdminIntakeQueueItem, "id">[],
  index: number,
  anchorIndex: number | null,
  shiftKey: boolean
) {
  const next = new Set(current);
  if (shiftKey && anchorIndex !== null) {
    const start = Math.min(anchorIndex, index);
    const end = Math.max(anchorIndex, index);
    for (let cursor = start; cursor <= end; cursor += 1) {
      next.add(items[cursor].id);
    }
  } else if (next.has(items[index].id)) {
    next.delete(items[index].id);
  } else {
    next.add(items[index].id);
  }
  return next;
}

function textValue(value: ReactNode, fallback: string) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : fallback;
}

function toneClass(tone: AdminIntakeWorkbenchTone = "neutral") {
  return `intake-batch-status ${tone}`;
}

function EvidenceRows({rows}: {rows: AdminIntakeEvidenceRow[]}) {
  return (
    <div className="intake-inspector-list">
      {rows.map((row) => (
        <div className="intake-inspector-row" key={row.id}>
          <div>
            {row.href ? (
              <a href={row.href} rel="noreferrer" target="_blank">{row.title}</a>
            ) : (
              <strong>{row.title}</strong>
            )}
            <span>{row.meta}</span>
          </div>
          <span className={toneClass(row.statusTone)}>{row.status}</span>
        </div>
      ))}
    </div>
  );
}

function ChecklistRows({rows}: {rows: AdminIntakeChecklistRow[]}) {
  return (
    <div className="intake-inspector-list">
      {rows.map((row) => (
        <div className="intake-inspector-row" key={row.id}>
          <span aria-hidden="true" className={row.passed ? "success" : "warning"}>
            {row.passed ? <Check size={14} /> : "!"}
          </span>
          <div>
            <strong>{row.label}</strong>
            <span>{row.meta}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ImpactRows({rows}: {rows: AdminIntakeImpactRow[]}) {
  return (
    <dl className="intake-inspector-impact">
      {rows.map((row) => (
        <div key={row.id}>
          <dt>{row.label}</dt>
          <dd className={row.tone ?? "neutral"}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function InspectorSection({section}: {section: AdminIntakeInspectorSection}) {
  if (section.kind === "diagnostics") {
    return (
      <details className="intake-inspector-section diagnostics">
        <summary>{section.title}</summary>
        <div>{section.content}</div>
      </details>
    );
  }
  return (
    <section className="intake-inspector-section">
      <CatchText as="h4" variant="titleS">{section.title}</CatchText>
      {section.kind === "evidence" ? <EvidenceRows rows={section.rows} /> : null}
      {section.kind === "checklist" ? <ChecklistRows rows={section.rows} /> : null}
      {section.kind === "impact" ? <ImpactRows rows={section.rows} /> : null}
      {section.kind === "content" ? <div>{section.content}</div> : null}
    </section>
  );
}

function LoadingRows() {
  return (
    <div aria-label="Loading intake candidates" className="intake-batch-skeleton" role="status">
      {Array.from({length: 8}, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

export function AdminIntakeReviewWorkbench({
  bulkActions = [],
  className = "",
  columns,
  controls,
  detail,
  emptyDetail,
  emptyKind = "stage",
  emptyQueue,
  filters = [],
  headerContext,
  items,
  loadError,
  onFilterChange,
  onRetry,
  onSelect,
  queueMeta,
  queueScopeKey = "default",
  queueTitle,
  readOnly = false,
  selectedId,
  stageControl,
  state = "ready",
  titleColumnLabel = "Name",
}: {
  bulkActions?: AdminIntakeBulkAction[];
  className?: string;
  columns?: AdminIntakeQueueColumn[];
  controls?: ReactNode;
  detail?: AdminIntakeWorkbenchDetail | null;
  emptyDetail?: ReactNode;
  emptyKind?: "filter" | "stage" | "unavailable";
  emptyQueue?: ReactNode;
  filters?: AdminIntakeQueueFilter[];
  headerContext?: ReactNode;
  items: AdminIntakeQueueItem[];
  loadError?: ReactNode;
  onFilterChange?: (filterId: string) => void;
  onRetry?: () => void;
  onSelect: (id: string) => void;
  queueMeta: ReactNode;
  queueScopeKey?: string;
  queueTitle: ReactNode;
  readOnly?: boolean;
  selectedId: string | null;
  stageControl?: ReactNode;
  state?: AdminIntakeWorkbenchState;
  titleColumnLabel?: ReactNode;
}) {
  const [stableItems, setStableItems] = useState(items);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [resolved, setResolved] = useState<Map<string, string>>(new Map());
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [groupByBlocker, setGroupByBlocker] = useState(false);
  const [workingIds, setWorkingIds] = useState<Set<string>>(new Set());
  const [bulkMessage, setBulkMessage] = useState<ReactNode>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [undo, setUndo] = useState<{
    action: AdminIntakeBulkAction;
    ids: string[];
    label: string;
  } | null>(null);
  const anchorIndex = useRef<number | null>(null);
  const previousScope = useRef(queueScopeKey);
  const detailById = useRef(new Map<string, AdminIntakeWorkbenchDetail>());

  useEffect(() => {
    if (previousScope.current !== queueScopeKey) {
      previousScope.current = queueScopeKey;
      setStableItems(items);
      setSelection(new Set());
      setResolved(new Map());
      anchorIndex.current = null;
      return;
    }
    setStableItems((current) => mergeStableIntakeItems(current, items));
  }, [items, queueScopeKey]);

  useEffect(() => {
    if (selectedId && detail) {
      detailById.current.set(selectedId, detail);
    }
  }, [detail, selectedId]);

  useEffect(() => {
    if (!undo) {
      return undefined;
    }
    const timer = window.setTimeout(() => setUndo(null), 10_000);
    return () => window.clearTimeout(timer);
  }, [undo]);

  const orderedItems = useMemo(() => {
    if (!groupByBlocker) {
      return stableItems;
    }
    return [...stableItems].sort((left, right) => (
      (left.blockerKey ?? "").localeCompare(right.blockerKey ?? "")
    ));
  }, [groupByBlocker, stableItems]);

  const selectedDetail = detail ?? (
    selectedId ? detailById.current.get(selectedId) : undefined
  );
  const allSelected = orderedItems.length > 0
    && orderedItems.every((item) => selection.has(item.id));
  const selectedForActions = selection.size > 0
    ? selection
    : new Set(selectedId ? [selectedId] : []);
  const queueColumns = columns ?? [
    {id: "kind", label: "Kind"},
    {id: "market", label: "Market"},
    {id: "source", label: "Source"},
    {id: "blocker", label: "Top blocker"},
    {id: "age", label: "Age"},
    {id: "status", label: "Status"},
  ];
  const needsNow = orderedItems.filter((item) => (
    !resolved.has(item.id)
    && (
      item.statusTone === "danger"
      || (
        Boolean(item.blockerKey)
        && item.statusTone !== "warning"
      )
    )
  )).length;
  const waiting = orderedItems.filter((item) => (
    item.statusTone === "warning" && !resolved.has(item.id)
  )).length;
  const oldest = Math.max(
    0,
    ...orderedItems.map((item) => item.ageDays ?? 0)
  );

  function selectRow(itemId: string, openInspector = false) {
    onSelect(itemId);
    if (openInspector) {
      setInspectorOpen(true);
    }
  }

  function toggleSelection(index: number, shiftKey: boolean) {
    setSelection((current) => toggleIntakeRangeSelection(
      current,
      orderedItems,
      index,
      anchorIndex.current,
      shiftKey
    ));
    anchorIndex.current = index;
  }

  async function applyBulkAction(action: AdminIntakeBulkAction) {
    const {appliedIds, skippedIds} = eligibleBulkSelection(selectedForActions, action);
    if (appliedIds.length === 0) {
      setBulkMessage(`Nothing selected is eligible for ${action.label.toLowerCase()}.`);
      return;
    }
    setWorkingIds(new Set(appliedIds));
    setBulkMessage(
      skippedIds.length > 0
        ? `${appliedIds.length} eligible · ${skippedIds.length} skipped because they are not eligible`
        : `Applying ${action.label.toLowerCase()} to ${appliedIds.length} item${appliedIds.length === 1 ? "" : "s"}…`
    );
    try {
      const result = await action.onApply(appliedIds);
      const successfulIds = result?.appliedIds
        ? [...result.appliedIds]
        : appliedIds.filter((id) => !result?.failures?.some((failure) => failure.id === id));
      setResolved((current) => {
        const next = new Map(current);
        successfulIds.forEach((id) => next.set(id, action.label));
        return next;
      });
      const failureText = result?.failures?.length
        ? ` · ${result.failures.length} failed: ${result.failures[0].reason}`
        : "";
      setBulkMessage(
        `${successfulIds.length} ${action.label.toLowerCase()}${failureText}`
        + (skippedIds.length ? ` · ${skippedIds.length} skipped` : "")
      );
      const disposed = new Set([...resolved.keys(), ...successfulIds]);
      const nextId = nextSelectionAfterDisposition(orderedItems, disposed, selectedId);
      if (nextId) {
        onSelect(nextId);
      }
      setSelection(new Set());
      if (action.onUndo && successfulIds.length > 0) {
        setUndo({action, ids: successfulIds, label: action.label});
      }
    } catch (error) {
      setBulkMessage(
        error instanceof Error
          ? `${action.label} failed: ${error.message}`
          : `${action.label} failed. Try again.`
      );
    } finally {
      setWorkingIds(new Set());
    }
  }

  async function undoLastAction() {
    if (!undo?.action.onUndo) {
      return;
    }
    setWorkingIds(new Set(undo.ids));
    try {
      await undo.action.onUndo(undo.ids);
      setResolved((current) => {
        const next = new Map(current);
        undo.ids.forEach((id) => next.delete(id));
        return next;
      });
      setBulkMessage(`${undo.label} undone for ${undo.ids.length} item${undo.ids.length === 1 ? "" : "s"}.`);
      setUndo(null);
    } finally {
      setWorkingIds(new Set());
    }
  }

  function handleKeyboard(event: ReactKeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (
      target.isContentEditable
      || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)
    ) {
      return;
    }
    const activeIndex = Math.max(0, orderedItems.findIndex((item) => item.id === selectedId));
    if ((event.key === "j" || event.key === "k") && orderedItems.length > 0) {
      event.preventDefault();
      const direction = event.key === "j" ? 1 : -1;
      const nextIndex = (activeIndex + direction + orderedItems.length) % orderedItems.length;
      selectRow(orderedItems[nextIndex].id);
      return;
    }
    if (event.key === "x" && orderedItems[activeIndex]) {
      event.preventDefault();
      toggleSelection(activeIndex, false);
      return;
    }
    if (event.key === "Enter" && selectedId) {
      event.preventDefault();
      setInspectorOpen(true);
      return;
    }
    if (event.key === "Escape") {
      setInspectorOpen(false);
      setHelpOpen(false);
      return;
    }
    if (event.key === "/") {
      event.preventDefault();
      document.querySelector<HTMLInputElement>(
        "[data-intake-search], .intake-task-toolbar input, input[type='search']"
      )?.focus();
      return;
    }
    if (event.key === "?") {
      event.preventDefault();
      setHelpOpen((current) => !current);
      return;
    }
    const shortcut = {a: "approve", h: "hold", s: "suppress"}[event.key];
    const action = bulkActions.find((candidate) => candidate.id === shortcut);
    if (action) {
      event.preventDefault();
      void applyBulkAction(action);
    }
  }

  return (
    <section
      aria-label={textValue(queueTitle, "Intake workbench")}
      className={`intake-review-workbench intake-batch-workbench ${className}`.trim()}
      onKeyDown={handleKeyboard}
    >
      <header className="intake-batch-command">
        <div className="intake-batch-command-row">
          <div className="intake-batch-title">
            <CatchText as="h3" variant="sectionTitle">{queueTitle}</CatchText>
            <span>{queueMeta}</span>
          </div>
          {stageControl ? (
            <div className="intake-batch-stage-control">{stageControl}</div>
          ) : null}
          {headerContext ? <div className="intake-batch-context">{headerContext}</div> : null}
          <div aria-label="Intake queue metrics" className="intake-batch-metrics" role="group" tabIndex={0}>
            <span><strong>{needsNow}</strong> Need now</span>
            <span><strong>{waiting}</strong> Waiting external</span>
            <span><strong>{resolved.size}</strong> Cleared</span>
            <span><strong>{oldest ? `${oldest}d` : "—"}</strong> Oldest</span>
          </div>
          <div className="intake-batch-review-control">
            <button
              aria-expanded={inspectorOpen}
              aria-label={inspectorOpen ? "Close candidate review" : "Review selected candidate"}
              className="intake-inspector-toggle"
              disabled={!selectedId}
              onClick={() => setInspectorOpen((current) => !current)}
              type="button"
            >
              {inspectorOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
              {inspectorOpen ? "Close review" : "Review"}
            </button>
          </div>
        </div>

        <div
          aria-label={selection.size > 0 ? "Selection actions" : "Intake controls"}
          className={`intake-batch-toolbar ${selection.size > 0 ? "selection" : "filters"}`}
        >
          {selection.size > 0 && !readOnly ? (
            <>
              <label className="intake-select-all">
                <input
                  aria-label="Select all matching"
                  checked={allSelected}
                  onChange={() => setSelection(
                    allSelected ? new Set() : new Set(orderedItems.map((item) => item.id))
                  )}
                  type="checkbox"
                />
                <strong>{selection.size} selected</strong>
              </label>
              {bulkActions.map((action) => {
                const {appliedIds, skippedIds} = eligibleBulkSelection(selection, action);
                const gateId = `bulk-${action.id}-gate`;
                const gateText = appliedIds.length === 0
                  ? action.disabledReason ??
                    `${skippedIds.length} selected item(s) do not pass this action's gate.`
                  : skippedIds.length > 0
                    ? `${appliedIds.length} eligible; ${skippedIds.length} will be skipped.`
                    : `All ${appliedIds.length} selected item(s) are eligible.`;
                return (
                  <span className="intake-bulk-action-group" key={action.id}>
                    <button
                      aria-describedby={gateId}
                      className={`intake-bulk-action ${action.tone ?? "neutral"}`}
                      disabled={appliedIds.length === 0 || workingIds.size > 0}
                      onClick={() => void applyBulkAction(action)}
                      type="button"
                    >
                      {workingIds.size > 0 ? <LoaderCircle className="spin" size={14} /> : null}
                      {action.label}
                      {skippedIds.length > 0 ? ` ${appliedIds.length}/${selection.size}` : ""}
                    </button>
                    <span className="intake-bulk-gate" id={gateId}>{gateText}</span>
                  </span>
                );
              })}
              <button
                className="intake-clear-selection"
                onClick={() => setSelection(new Set())}
                type="button"
              >
                Clear
              </button>
            </>
          ) : (
            <>
              {controls}
              <label className="intake-select-all">
                <input
                  aria-label="Select all matching"
                  checked={allSelected}
                  onChange={() => setSelection(
                    allSelected ? new Set() : new Set(orderedItems.map((item) => item.id))
                  )}
                  type="checkbox"
                />
                Select all matching
              </label>
              <label className="intake-group-control">
                Group
                <select
                  aria-label="Group intake candidates"
                  onChange={(event) => setGroupByBlocker(event.target.value === "blocker")}
                  value={groupByBlocker ? "blocker" : "none"}
                >
                  <option value="none">None</option>
                  <option value="blocker">Top blocker</option>
                </select>
              </label>
              {filters.length > 0 ? (
                <div aria-label="Queue filters" className="intake-batch-filters">
                  {filters.map((filter) => (
                    <button
                      aria-pressed={filter.selected}
                      key={filter.id}
                      onClick={() => onFilterChange?.(filter.id)}
                      type="button"
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {readOnly ? <span className="intake-read-only-label">Read-only projection</span> : null}
            </>
          )}
          <button
            aria-expanded={helpOpen}
            aria-label="Show intake keyboard shortcuts"
            className="intake-shortcuts-button"
            onClick={() => setHelpOpen((current) => !current)}
            type="button"
          >
            Shortcuts
          </button>
        </div>
        {bulkMessage ? <div aria-live="polite" className="intake-bulk-message">{bulkMessage}</div> : null}
        {helpOpen ? (
          <div className="intake-shortcuts" role="dialog" aria-label="Intake keyboard shortcuts">
            <button aria-label="Close shortcuts" onClick={() => setHelpOpen(false)} type="button">
              <X size={14} />
            </button>
            <span><kbd>j</kbd>/<kbd>k</kbd> move</span>
            <span><kbd>x</kbd> select</span>
            <span><kbd>Enter</kbd> review</span>
            <span><kbd>Esc</kbd> close</span>
            <span><kbd>a</kbd>/<kbd>h</kbd>/<kbd>s</kbd> decide</span>
            <span><kbd>/</kbd> search</span>
            <span><kbd>?</kbd> shortcuts</span>
          </div>
        ) : null}
      </header>

      <div className="intake-batch-body">
        <div className="intake-batch-table-region">
          {state === "loading" ? <LoadingRows /> : null}
          {(loadError || (state === "error" && orderedItems.length > 0)) ? (
            <div className="intake-inline-error" role="alert">
              <span>{loadError ?? "Candidate data could not be refreshed. The current table is preserved."}</span>
              {onRetry ? <button onClick={onRetry} type="button">Try again</button> : null}
            </div>
          ) : null}
          {state === "error" && orderedItems.length === 0 ? (
            <div className="intake-batch-state error" role="alert">
              <strong>Candidate data could not be loaded.</strong>
              <span>{loadError ?? "Your current filters and decisions were preserved."}</span>
              {onRetry ? <button onClick={onRetry} type="button">Try again</button> : null}
            </div>
          ) : null}
          {state === "unavailable" ? (
            <div className="intake-batch-state unavailable">
              <strong>This projection is not available yet.</strong>
              <span>
                {emptyQueue
                  ?? "Run or refresh the governed intake workflow, then try again."}
              </span>
              {onRetry ? <button onClick={onRetry} type="button">Refresh</button> : null}
            </div>
          ) : null}
          {state === "ready" && orderedItems.length === 0 ? (
            <div className={`intake-batch-state empty ${emptyKind}`}>
              <strong>{emptyKind === "filter" ? "No candidates match these filters." : "This stage is clear."}</strong>
              <span>{emptyQueue ?? (
                emptyKind === "filter"
                  ? "Change or clear a filter to see more candidates."
                  : "There are no candidates waiting in this stage."
              )}</span>
            </div>
          ) : null}
          {(state === "ready" || state === "error") && orderedItems.length > 0 ? (
            <table className="intake-batch-table">
              <thead>
                <tr>
                  <th scope="col"><span className="sr-only">Select</span></th>
                  <th>{titleColumnLabel}</th>
                  {queueColumns.map((column) => (
                    <th key={column.id} style={{width: column.width}}>
                      {column.label}
                    </th>
                  ))}
                  <th scope="col"><span className="sr-only">Review</span></th>
                </tr>
              </thead>
              <tbody>
                {orderedItems.map((item, index) => {
                  const isSelected = selectedId === item.id;
                  const isPending = item.pending || workingIds.has(item.id);
                  const resolvedLabel = resolved.get(item.id);
                  return (
                    <tr
                      aria-current={isSelected ? "true" : undefined}
                      className={isSelected ? "selected" : undefined}
                      data-resolved={resolvedLabel ? "true" : undefined}
                      key={item.id}
                    >
                      <td>
                        <input
                          aria-label={`Select ${textValue(item.title, item.id)}`}
                          checked={selection.has(item.id)}
                          disabled={isPending}
                          onChange={(event) => toggleSelection(
                            index,
                            Boolean((event.nativeEvent as MouseEvent).shiftKey)
                          )}
                          type="checkbox"
                        />
                      </td>
                      <th scope="row">
                        <button
                          aria-pressed={isSelected}
                          onClick={() => selectRow(item.id, true)}
                          type="button"
                        >
                          <span aria-hidden="true" className="intake-batch-avatar">{item.initials}</span>
                          <span>
                            <strong>{item.title}</strong>
                            <small>{item.description}</small>
                          </span>
                        </button>
                      </th>
                      {queueColumns.map((column) => (
                        <td key={column.id}>
                          {column.id === "status" ? (
                            isPending ? (
                              <span className="intake-batch-pending"><LoaderCircle className="spin" size={14} /> Updating</span>
                            ) : resolvedLabel ? (
                              <span className="intake-batch-resolved"><Check size={14} /> {resolvedLabel}</span>
                            ) : (
                              <span className={toneClass(item.statusTone)}>{item.status}</span>
                            )
                          ) : queueItemValue(item, column.id)}
                        </td>
                      ))}
                      <td>
                        <button
                          aria-label={`Review ${textValue(item.title, item.id)}`}
                          onClick={() => selectRow(item.id, true)}
                          type="button"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </div>

        <aside
          aria-label="Candidate review inspector"
          className={`intake-batch-inspector ${inspectorOpen ? "open" : ""}`}
          hidden={!inspectorOpen}
        >
          {selectedDetail ? (
            <>
              <header>
                <button aria-label="Close candidate review" onClick={() => setInspectorOpen(false)} type="button">
                  <X size={16} />
                </button>
                <span aria-hidden="true" className="intake-batch-avatar">{selectedDetail.initials}</span>
                <div>
                  <CatchText as="h3" variant="sectionTitle">{selectedDetail.title}</CatchText>
                  <CatchText as="p" variant="supporting">{selectedDetail.subtitle}</CatchText>
                </div>
                <span className={toneClass(selectedDetail.statusTone)}>{selectedDetail.status}</span>
                {selectedDetail.action}
              </header>

              <section className="intake-inspector-blockers">
                <div>
                  <CatchText as="h4" variant="titleS">Resolution</CatchText>
                  <span>
                    {selectedDetail.readiness.complete} of {selectedDetail.readiness.total} checks complete
                  </span>
                </div>
                {selectedDetail.blockers?.length ? (
                  selectedDetail.blockers.map((blocker) => (
                    <div className={blocker.tone ?? "warning"} key={blocker.id}>
                      <strong>{blocker.label}</strong>
                      <span>{blocker.action}</span>
                    </div>
                  ))
                ) : (
                  <div className="success">
                    <strong>Ready for a decision</strong>
                    <span>No unresolved evidence blockers remain.</span>
                  </div>
                )}
              </section>

              <div className="intake-inspector-scroll">
                {selectedDetail.sections.map((section) => (
                  <InspectorSection key={section.id} section={section} />
                ))}
                {emptyDetail}
              </div>

              <footer className="intake-inspector-actions">
                <CatchText as="p" variant="supporting">{selectedDetail.actionGate}</CatchText>
                <div>{selectedDetail.actions}</div>
              </footer>
            </>
          ) : (
            <div className="intake-batch-state empty">
              <strong>Select a candidate to review.</strong>
              <span>{emptyDetail}</span>
            </div>
          )}
        </aside>
      </div>

      {undo ? (
        <div aria-live="polite" className="intake-undo-toast">
          <span>{undo.label} applied to {undo.ids.length} item{undo.ids.length === 1 ? "" : "s"}.</span>
          <button onClick={() => void undoLastAction()} type="button">
            <Undo2 size={14} /> Undo
          </button>
        </div>
      ) : null}
    </section>
  );
}

function queueItemValue(item: AdminIntakeQueueItem, columnId: string): ReactNode {
  if (item.values && columnId in item.values) {
    return item.values[columnId] ?? "—";
  }
  if (columnId === "kind") return item.kind ?? "—";
  if (columnId === "market") return item.market ?? "—";
  if (columnId === "source") return item.source ?? item.meta;
  if (columnId === "blocker") return item.blocker ?? "—";
  if (columnId === "age") {
    return item.age ?? (
      item.ageDays === null || item.ageDays === undefined
        ? "—"
        : `${item.ageDays}d`
    );
  }
  return "—";
}
