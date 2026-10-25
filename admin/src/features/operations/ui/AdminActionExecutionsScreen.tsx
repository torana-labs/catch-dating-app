import {CatchBadge, type CatchBadgeTone, CatchField} from "@catch/web-ui";
import {
  Bot,
  Clock3,
  ListPlus,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

import {adminActionCatalog} from "../../../generated/adminActionCatalog";
import type {
  AdminActionExecutionRecord,
} from "../../../shared/types/adminTypes";
import {
  AdminButton,
  AdminRowTitle,
  AdminTableRow,
  AdminToolbar,
  AdminWorkbenchStack,
  AlertRow,
  DataTable,
  EmptyState,
  Panel,
  SearchField,
  selectOptions,
} from "../../../shared/ui/AdminPrimitives";
import {
  type AdminActionExecutionsController,
  type AdminActionExecutionStatusFilter,
  useAdminActionExecutionsController,
} from "../controllers/useAdminActionExecutionsController";

const actions = adminActionCatalog.actions.filter((action) =>
  !action.controlPlane
);
const actionById = new Map<string, (typeof actions)[number]>(
  actions.map((action) => [action.actionId, action])
);
const actionOptions = [
  {label: "All actions", value: "all"},
  ...actions.map((action) => ({
    label: action.actionId,
    value: action.actionId,
  })),
];
const statusOptions = [
  {label: "All statuses", value: "all"},
  {label: "Running", value: "started"},
  {label: "Succeeded", value: "succeeded"},
  {label: "Failed", value: "failed"},
  {label: "Needs reconciliation", value: "indeterminate"},
];

export function AdminActionExecutionsScreen({
  onError,
}: {
  onError: (message: string | null) => void;
}) {
  const controller = useAdminActionExecutionsController({onError});
  return <AdminActionExecutionsWorkspace controller={controller} />;
}

export function AdminActionExecutionsWorkspace({
  controller,
}: {
  controller: AdminActionExecutionsController;
}) {
  return (
    <AdminWorkbenchStack>
      <Panel
        action={`${controller.visibleRows.length} shown`}
        icon={<Bot size={18} strokeWidth={1.9} />}
        span={2}
        title="Agent action activity"
      >
        <AlertRow
          icon={<ShieldCheck size={16} strokeWidth={1.9} />}
          title="Receipts contain bounded execution evidence"
          tone="neutral"
        >
          Request and response bodies are never stored here. The monitor shows
          action identity, actor, target, timestamps, status, and SHA-256 hashes.
          Employees continue to perform actions in their owning admin workspace.
        </AlertRow>
        <AdminToolbar>
          <SearchField
            ariaLabel="Search agent action activity"
            icon={<Search size={16} strokeWidth={1.8} />}
            onChange={controller.setQuery}
            placeholder="Search action, actor, target, error..."
            value={controller.query}
          />
          <CatchField
            recipe="select"
            title="Action"
            onChanged={(value) => controller.setActionFilter(value ?? "")}
            {...selectOptions(actionOptions)}
            value={controller.actionFilter}
          />
          <CatchField
            recipe="select"
            title="Status"
            onChanged={(value) => controller.setStatusFilter(
              (value ?? "") as AdminActionExecutionStatusFilter
            )}
            {...selectOptions(statusOptions)}
            value={controller.statusFilter}
          />
          <AdminButton
            icon={<RefreshCw size={15} strokeWidth={1.9} />}
            loading={controller.isLoading}
            loadingLabel="Refreshing"
            onClick={() => void controller.refresh()}
            variant="primary"
          >
            Refresh
          </AdminButton>
          {controller.hasMore ? (
            <AdminButton
              icon={<ListPlus size={15} strokeWidth={1.9} />}
              loading={controller.isLoadingMore}
              loadingLabel="Loading more"
              onClick={() => void controller.loadMore()}
            >
              Load 50 more
            </AdminButton>
          ) : null}
        </AdminToolbar>
        <AlertRow
          icon={<Clock3 size={16} strokeWidth={1.9} />}
          title={`${controller.rows.length} recent execution receipts loaded`}
          tone="neutral"
        >
          Source generated {formatDateTime(controller.generatedAt)}. Filters are
          applied locally to this bounded result.
        </AlertRow>
        {controller.visibleRows.length === 0 ? (
          <EmptyState
            icon={<Clock3 size={16} strokeWidth={1.9} />}
            variant="workbench"
          >
            {controller.isLoading ?
              "Loading agent activity..." :
              "No loaded action receipts match these filters."}
          </EmptyState>
        ) : (
          <ActionExecutionTable rows={controller.visibleRows} />
        )}
      </Panel>
    </AdminWorkbenchStack>
  );
}

function ActionExecutionTable({
  rows,
}: {
  rows: AdminActionExecutionRecord[];
}) {
  return (
    <DataTable ariaLabel="Agent action execution receipts" compact variant="workbench">
      <thead>
        <tr>
          <th>Action</th>
          <th>Actor and target</th>
          <th>Status</th>
          <th>Evidence</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const action = actionById.get(row.actionId);
          return (
            <AdminTableRow key={row.executionId}>
              <td>
                <AdminRowTitle compact>
                  <strong>{row.actionId}</strong>
                  <span>{action?.summary ?? row.callable}</span>
                </AdminRowTitle>
              </td>
              <td>
                <AdminRowTitle compact>
                  <strong>{row.actorUid}</strong>
                  <span>{row.target ?? "No target"} · {row.actorRoles.join(", ")}</span>
                </AdminRowTitle>
              </td>
              <td>
                <CatchBadge recipe="status" tone={statusTone(row.status)} label={statusLabel(row.status)} />
                <AdminRowTitle compact>
                  <span>{durationLabel(row)}</span>
                  {row.errorMessage ? (
                    <span>{row.errorCode ?? "error"}: {row.errorMessage}</span>
                  ) : null}
                </AdminRowTitle>
              </td>
              <td>
                <AdminRowTitle compact>
                  <strong>{formatDateTime(row.startedAt)}</strong>
                  <span>request {shortHash(row.requestHash)}</span>
                  <span>execution {row.executionId.slice(0, 8)}</span>
                </AdminRowTitle>
              </td>
            </AdminTableRow>
          );
        })}
      </tbody>
    </DataTable>
  );
}

function statusTone(status: AdminActionExecutionRecord["status"]): CatchBadgeTone {
  if (status === "succeeded") return "success";
  if (status === "failed") return "danger";
  return "warning";
}

function statusLabel(status: AdminActionExecutionRecord["status"]): string {
  if (status === "started") return "running";
  if (status === "indeterminate") return "needs reconciliation";
  return status;
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 12)}…`;
}

function durationLabel(row: AdminActionExecutionRecord): string {
  if (!row.finishedAt) return "In progress";
  const duration = Date.parse(row.finishedAt) - Date.parse(row.startedAt);
  if (!Number.isFinite(duration) || duration < 0) return "Duration unavailable";
  if (duration < 1000) return `${duration} ms`;
  return `${(duration / 1000).toFixed(1)} s`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "Unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}
