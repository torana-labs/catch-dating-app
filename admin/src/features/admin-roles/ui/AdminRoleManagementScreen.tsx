import {CatchBadge, CatchField} from "@catch/web-ui";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import type {
  AdminRoleClaim,
  AdminUserRoleRecord,
} from "../../../shared/types/adminTypes";
import {
  AdminButton,
  AdminFieldGrid,
  AdminRowTitle,
  AdminSecondaryDisclosure,
  AdminTableRow,
  AdminTagRow,
  AdminToolbar,
  AdminWorkbenchStack,
  AlertRow,
  CheckboxField,
  DataTable,
  EmptyState,
  Panel,
  QualityList,
  SearchField,
  selectOptions,
  StateRow,
  TableActionButton,
} from "../../../shared/ui/AdminPrimitives";
import {
  type AdminRoleAssignmentStatusFilter,
  type AdminRoleManagementController,
  type AdminRoleScopeContract,
  useAdminRoleManagementController,
} from "../controllers/useAdminRoleManagementController";

const assignmentStatusOptions: Array<{
  label: string;
  value: AdminRoleAssignmentStatusFilter;
}> = [
  {label: "Active", value: "active"},
  {label: "Revoked", value: "revoked"},
  {label: "All", value: "all"},
];

export function AdminRoleManagementScreen({
  currentUserUid,
  onBackToRegister,
  onError,
  onNotice,
  onSelectTargetUid,
  selectedTargetUid = null,
}: {
  currentUserUid: string | null;
  onBackToRegister?: () => void;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
  onSelectTargetUid?: (targetUid: string) => void;
  selectedTargetUid?: string | null;
}) {
  const controller = useAdminRoleManagementController({
    currentUserUid,
    onError,
    onNotice,
    onSelectTargetUid,
    selectedTargetUid,
  });
  return (
    <AdminRoleManagementWorkspace
      controller={controller}
      currentUserUid={currentUserUid}
      onBackToRegister={onBackToRegister}
    />
  );
}

export function AdminRoleManagementWorkspace({
  controller,
  currentUserUid = null,
  onBackToRegister,
}: {
  controller: AdminRoleManagementController;
  currentUserUid?: string | null;
  onBackToRegister?: () => void;
}) {
  if (controller.selectedTargetUid) {
    return (
      <RoleDetailWorkspace
        controller={controller}
        currentUserUid={currentUserUid}
        onBackToRegister={onBackToRegister}
      />
    );
  }
  return (
    <AdminWorkbenchStack>
      <AssignmentRegisterPanel controller={controller} />
      <ExactUidLookupPanel controller={controller} />
      <RoleBoundaryDisclosure contract={controller.scopeContract} />
    </AdminWorkbenchStack>
  );
}

function RoleDetailWorkspace({
  controller,
  currentUserUid,
  onBackToRegister,
}: {
  controller: AdminRoleManagementController;
  currentUserUid: string | null;
  onBackToRegister?: () => void;
}) {
  return (
    <AdminWorkbenchStack>
      <AdminToolbar>
        <AdminButton
          icon={<ArrowLeft size={15} strokeWidth={1.9} />}
          onClick={onBackToRegister}
        >
          Back to access register
        </AdminButton>
      </AdminToolbar>
      {controller.selectedUser ? (
        <>
          <RoleIdentityPanel selectedUser={controller.selectedUser} />
          <RoleEditorPanel
            controller={controller}
            currentUserUid={currentUserUid}
          />
          <SaveReceiptPanel controller={controller} />
        </>
      ) : controller.selectedUnavailable ? (
        <Panel
          span={2}
          icon={<AlertTriangle size={18} strokeWidth={1.9} />}
          title="Role target unavailable"
          action="Exact uid only"
        >
          <AlertRow
            icon={<AlertTriangle size={16} strokeWidth={1.9} />}
            title="No role record was returned for this uid"
            tone="warning"
          >
            Return to the register or load another exact Firebase Auth uid. No
            user directory search or substitute assignment is used.
          </AlertRow>
        </Panel>
      ) : (
        <EmptyState variant="workbench" icon={<Clock3 size={16} strokeWidth={1.9} />}>
          Loading exact role assignment.
        </EmptyState>
      )}
      <RoleBoundaryDisclosure contract={controller.scopeContract} />
    </AdminWorkbenchStack>
  );
}

function AssignmentRegisterPanel({controller}: {controller: AdminRoleManagementController}) {
  return (
    <Panel
      span={2}
      icon={<Lock size={18} strokeWidth={1.9} />}
      title="Access register"
      action={controller.isAssignmentListLoading ? "Loading" : `${controller.assignmentVisibleRows.length} shown`}
    >
      <AdminToolbar>
        <SearchField
          ariaLabel="Search returned admin assignments"
          icon={<Search size={16} strokeWidth={1.8} />}
          onChange={controller.setAssignmentQuery}
          placeholder="Search these returned assignments"
          value={controller.assignmentQuery}
        />
        <CatchField
          recipe="select"
          title="Status"
          onChanged={(value) => controller.setAssignmentFilter((value ?? "") as AdminRoleAssignmentStatusFilter)}
          {...selectOptions(assignmentStatusOptions)}
          value={controller.assignmentFilter}
        />
        <AdminButton
          disabled={controller.isAssignmentListLoading}
          icon={<RefreshCw size={15} strokeWidth={1.9} />}
          onClick={() => void controller.refreshAssignments()}
        >
          Refresh register
        </AdminButton>
      </AdminToolbar>
      <AlertRow
        icon={<ShieldCheck size={16} strokeWidth={1.9} />}
        title={controller.assignmentCapped ?
          "Showing the 50 most recently updated assignments" :
          `${controller.assignmentRows.length} returned assignments`}
        tone="neutral"
      >
        Local search only filters this bounded result. Source generated {formatDateTime(controller.assignmentGeneratedAt)}.
      </AlertRow>
      {controller.assignmentVisibleRows.length === 0 ? (
        <EmptyState variant="workbench" icon={<Clock3 size={16} strokeWidth={1.9} />}>
          No returned assignments match this local search and status filter.
        </EmptyState>
      ) : (
        <DataTable ariaLabel="Admin role assignments" compact variant="workbench">
          <thead>
            <tr>
              <th>User</th>
              <th>Roles</th>
              <th>Status</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {controller.assignmentVisibleRows.map((row) => (
              <AdminTableRow key={row.targetUid}>
                <td>
                  <AdminRowTitle compact>
                    <strong>{row.email ?? row.targetUid}</strong>
                    <span>{row.displayName ?? row.targetUid} · {formatDateTime(row.updatedAt)}</span>
                  </AdminRowTitle>
                </td>
                <td>{roleList(row.roles)}</td>
                <td><CatchBadge label={row.status} /></td>
                <td><TableActionButton onClick={() => controller.selectAssignment(row)}>Review</TableActionButton></td>
              </AdminTableRow>
            ))}
          </tbody>
        </DataTable>
      )}
    </Panel>
  );
}

function ExactUidLookupPanel({controller}: {controller: AdminRoleManagementController}) {
  return (
    <Panel
      span={2}
      icon={<UserCheck size={18} strokeWidth={1.9} />}
      title="Exact uid lookup"
      action="Fallback"
    >
      <AdminToolbar>
        <CatchField
          recipe="input"
          title="Firebase Auth uid"
          onChanged={controller.setTargetUid}
          inputHint="Enter an exact uid"
          value={controller.targetUid}
        />
        <AdminButton
          disabled={controller.isLoading}
          icon={<UserCheck size={15} strokeWidth={1.9} />}
          onClick={() => void controller.load()}
          variant="primary"
        >
          Review uid
        </AdminButton>
      </AdminToolbar>
      <StateRow label="Boundary" value="No email, display-name, phone, or unbounded Firebase Auth search" />
    </Panel>
  );
}

function RoleIdentityPanel({selectedUser}: {selectedUser: AdminUserRoleRecord}) {
  return (
    <Panel
      span={2}
      icon={<UserCheck size={18} strokeWidth={1.9} />}
      title={selectedUser.displayName ?? selectedUser.email ?? selectedUser.targetUid}
      action={selectedUser.disabled ? "Auth disabled" : "Auth active"}
    >
      <QualityList>
        <StateRow label="UID" value={selectedUser.targetUid} />
        <StateRow label="Email" value={selectedUser.email ?? "Unavailable"} />
        <StateRow label="Assignment path" value={selectedUser.assignmentPath} />
        <StateRow
          label="Current roles"
          value={selectedUser.roles.length ? (
            <AdminTagRow as="span">
              {selectedUser.roles.map((role) => <CatchBadge key={role} label={role} />)}
            </AdminTagRow>
          ) : "None"}
        />
      </QualityList>
    </Panel>
  );
}

function RoleEditorPanel({
  controller,
  currentUserUid,
}: {
  controller: AdminRoleManagementController;
  currentUserUid: string | null;
}) {
  const isSelf = Boolean(controller.selectedUser && currentUserUid === controller.selectedUser.targetUid);
  return (
    <Panel
      span={2}
      icon={<Lock size={18} strokeWidth={1.9} />}
      title="Role change"
      action={controller.hasHighRiskChange ? "High risk" : "Governed"}
    >
      <AdminFieldGrid columns={2}>
        {controller.rolePolicies.map((policy) => {
          const selfOwnerLock = isSelf && policy.role === "adminOwner";
          return (
            <CheckboxField
              checked={controller.selectedRoles.includes(policy.role)}
              disabled={selfOwnerLock}
              key={policy.role}
              label={
                <span>
                  <strong>{policy.label}</strong> · {policy.role}<br />
                  <small>{policy.capability} Risk: {policy.risk}.{selfOwnerLock ? " Cannot remove your own owner role." : ""}</small>
                </span>
              }
              onChange={(checked) => controller.toggleRole(policy.role, checked)}
            />
          );
        })}
      </AdminFieldGrid>
      <RoleDiffPanel controller={controller} />
      <CatchField
        recipe="input"
        title="Review note"
        onChanged={controller.setNote}
        inputHint="Who requested this change, why, and what was verified?"
        maxLines={4}
        value={controller.note}
      />
      {controller.hasHighRiskChange ? (
        <CheckboxField
          checked={controller.highRiskConfirmed}
          label="I confirm this high-risk role change and reviewed the before/after access difference."
          onChange={controller.setHighRiskConfirmed}
        />
      ) : null}
      <StateRow label="Save check" value={controller.validationIssue ?? "Ready to save"} />
      <AdminButton
        disabled={Boolean(controller.validationIssue) || controller.isSaving}
        icon={<CheckCircle2 size={15} strokeWidth={1.9} />}
        onClick={() => void controller.save()}
        variant="primary"
      >
        {controller.isSaving ? "Saving roles" : "Save role change"}
      </AdminButton>
    </Panel>
  );
}

function RoleDiffPanel({controller}: {controller: AdminRoleManagementController}) {
  return (
    <QualityList>
      <StateRow label="Before" value={roleList(controller.selectedUser?.roles ?? [])} />
      <StateRow label="After" value={roleList(controller.selectedRoles)} />
      <StateRow label="Added" value={roleList(controller.roleDiff.added)} />
      <StateRow label="Removed" value={roleList(controller.roleDiff.removed)} />
    </QualityList>
  );
}

function SaveReceiptPanel({controller}: {controller: AdminRoleManagementController}) {
  if (!controller.saveReceipt) return null;
  return (
    <Panel
      span={2}
      icon={<CheckCircle2 size={18} strokeWidth={1.9} />}
      title="Save receipt"
      action="Callable confirmed"
    >
      <QualityList>
        <StateRow label="Target uid" value={controller.saveReceipt.targetUid} />
        <StateRow label="Assignment path" value={controller.saveReceipt.assignmentPath} />
        <StateRow label="Before" value={roleList(controller.saveReceipt.beforeRoles)} />
        <StateRow label="After" value={roleList(controller.saveReceipt.afterRoles)} />
      </QualityList>
      <AlertRow
        icon={<RefreshCw size={16} strokeWidth={1.9} />}
        title="The target needs a new Firebase ID token"
        tone="neutral"
      >
        Ask the target user to refresh claims or sign out and back in before
        testing the updated access.
      </AlertRow>
    </Panel>
  );
}

function RoleBoundaryDisclosure({contract}: {contract: AdminRoleScopeContract}) {
  return (
    <AdminSecondaryDisclosure summary="Role authority and lookup boundary">
      <AlertRow
        icon={<ShieldCheck size={16} strokeWidth={1.9} />}
        title={contract.statusLabel}
        tone={contract.canLoad ? "neutral" : "warning"}
      >
        {contract.statusDetail}
      </AlertRow>
      <QualityList>
        <StateRow label="Sources" value={contract.sourceOfTruth.join(", ")} />
        <StateRow label="Assignment path" value={contract.assignmentPath ?? "Enter an exact uid"} />
        <StateRow label="Blocked lookup" value={contract.blockedInputs.join(", ")} />
        <StateRow label="Blocked actions" value={contract.blockedActions.join(", ")} />
      </QualityList>
    </AdminSecondaryDisclosure>
  );
}

function roleList(roles: AdminRoleClaim[]): string {
  return roles.length ? roles.join(", ") : "None";
}

function formatDateTime(value: string | null): string {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Malformed timestamp";
  return new Intl.DateTimeFormat("en-IN", {dateStyle: "medium", timeStyle: "short"}).format(date);
}
