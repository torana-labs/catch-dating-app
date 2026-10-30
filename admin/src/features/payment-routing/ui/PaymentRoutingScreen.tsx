import {CatchBadge, type CatchBadgeTone, CatchField, CatchIcon, CatchText} from "@catch/web-ui";
import type {ReactNode} from "react";
import {
  AdminButton,
  AdminDiffList,
  AdminDiffRow,
  AdminFieldGrid,
  AdminForm,
  AdminTagRow,
  AdminToolbar,
  AdminWorkbenchStack,
  AlertRow,
  EmptyState,
  Panel,
  QualityList,
  selectOptions,
  StateRow,
} from "../../../shared/ui/AdminPrimitives";
import {
  describeSelection,
  followsLegacyConnections,
  legacyFormFeeLabel,
  livePurposes,
  modeOptions,
  routeOptions,
  routingPurposeLabels,
  routingPurposes,
  storedSelection,
  type RoutingChoice,
} from "../controllers/paymentRoutingForm";
import {
  type PaymentRoutingController,
  usePaymentRoutingController,
} from "../controllers/usePaymentRoutingController";

export function PaymentRoutingScreen({
  canManage,
  onError,
  onNotice,
  workspaceSwitch,
}: {
  canManage: boolean;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
  workspaceSwitch?: ReactNode;
}) {
  const controller = usePaymentRoutingController({canManage, onError, onNotice});
  return <PaymentRoutingWorkspace controller={controller} workspaceSwitch={workspaceSwitch} />;
}

export function PaymentRoutingWorkspace({
  controller,
  workspaceSwitch,
}: {
  controller: PaymentRoutingController;
  workspaceSwitch?: ReactNode;
}) {
  return (
    <AdminWorkbenchStack>
      {workspaceSwitch}
      {controller.loadState === "loading" ? (
        <EmptyState variant="workbench" icon={<CatchIcon icon="refresh" size="sm" />}>
          Loading payment routing.
        </EmptyState>
      ) : controller.loadState === "error" || !controller.policy ? (
        <AlertRow
          icon={<CatchIcon icon="warning" size="sm" />}
          title="Payment routing unavailable"
          tone="blocked"
        >
          {controller.loadError ?? "Payment routing could not be loaded."}
        </AlertRow>
      ) : (
        <>
          <RoutingSummary controller={controller} />
          {controller.editor ? <RoutingEditor controller={controller} /> : null}
        </>
      )}
    </AdminWorkbenchStack>
  );
}

function RoutingSummary({controller}: {controller: PaymentRoutingController}) {
  const policy = controller.policy!;
  return (
    <Panel
      span={2}
      icon={<CatchIcon icon="route" size="md" />}
      title="Payment routing for every organizer"
      action={policy.revision === 0 ? "No app policy saved" :
        `Revision ${policy.revision}${policy.updatedAtMillis ?
          ` · ${formatDateTime(policy.updatedAtMillis)}` : ""}`}
    >
      <CatchText as="p" variant="supporting">
        Who collects each kind of payment, and whether it is real money. An
        organizer override, where one exists, still takes precedence. A route
        here does not prove the Razorpay account behind it is ready.
      </CatchText>
      {policy.revision === 0 ? (
        <AlertRow
          icon={<CatchIcon icon="warning" size="sm" />}
          title="No app policy is saved yet"
          tone="warning"
        >
          Form fees follow each organizer's own Razorpay connection, and event
          tickets and memberships are off. Saving creates the policy for all
          three, so set Form fees to the route and mode your hosts use today.
        </AlertRow>
      ) : null}
      <QualityList>
        {routingPurposes.map((purpose) => {
          const stored = storedSelection(policy, purpose);
          const current = describeSelection(stored);
          const legacy = followsLegacyConnections(policy, purpose);
          return (
            <StateRow
              key={purpose}
              label={routingPurposeLabels[purpose]}
              value={
                <AdminTagRow>
                  <CatchText as="span" variant="supportingStrong">
                    {legacy ? legacyFormFeeLabel : current.route}
                  </CatchText>
                  <ModeBadge mode={legacy ? "connection" : current.mode} />
                </AdminTagRow>
              }
            />
          );
        })}
      </QualityList>
      {controller.editor ? null : (
        <AdminToolbar>
          <AdminButton variant="primary" onClick={controller.startEdit}>Change routing</AdminButton>
          <AdminButton
            icon={<CatchIcon icon="refresh" size="sm" />}
            onClick={controller.refresh}
          >
            Refresh
          </AdminButton>
        </AdminToolbar>
      )}
    </Panel>
  );
}

function ModeBadge({mode}: {mode: "test" | "live" | "connection" | null}) {
  if (mode === null) return null;
  const [label, tone]: [string, CatchBadgeTone] = mode === "live" ?
    ["Live: real money", "danger"] : mode === "test" ? ["Test mode", "neutral"] :
      ["Mode of each connection", "warning"];
  return <CatchBadge recipe="status" tone={tone} label={label} />;
}

function RoutingEditor({controller}: {controller: PaymentRoutingController}) {
  const editor = controller.editor!;
  if (editor.preview) return <RoutingPreview controller={controller} />;
  const live = livePurposes(editor.draft);
  return (
    <Panel span={2} icon={<CatchIcon icon="route" size="md" />} title="Change routing" action="Draft">
      <AdminForm
        onSubmit={(event) => {
          event.preventDefault();
          controller.review();
        }}
      >
        {routingPurposes.map((purpose) => {
          const draft = editor.draft[purpose];
          const stored = describeSelection(storedSelection(editor.base, purpose));
          const choices = draft.route === "unsupported" ?
            [{value: "unsupported", label: `Keep ${stored.route}`}, ...routeOptions] : routeOptions;
          return (
            <QualityList key={purpose}>
              <CatchText as="p" variant="supportingStrong">{routingPurposeLabels[purpose]}</CatchText>
              <AdminFieldGrid>
                <CatchField
                  recipe="select"
                  title="Who collects"
                  onChanged={(value) => controller.setPurpose(purpose, {
                    route: (value ?? "off") as RoutingChoice,
                  })}
                  value={draft.route}
                  {...selectOptions(choices)}
                />
                {draft.route === "razorpayOAuth" || draft.route === "razorpayRoute" ? (
                  <CatchField
                    recipe="select"
                    title="Mode"
                    onChanged={(value) => controller.setPurpose(purpose, {
                      mode: value === "live" ? "live" : "test",
                    })}
                    value={draft.mode}
                    {...selectOptions(modeOptions)}
                  />
                ) : null}
              </AdminFieldGrid>
            </QualityList>
          );
        })}
        {live.length > 0 ? (
          <AlertRow icon={<CatchIcon icon="warning" size="sm" />} title="Live mode moves real money" tone="warning">
            {live.map((purpose) => routingPurposeLabels[purpose]).join(", ")}
            {live.length === 1 ? " is" : " are"} set to live.
          </AlertRow>
        ) : null}
        {editor.error ? (
          <AlertRow icon={<CatchIcon icon="warning" size="sm" />} tone="warning">{editor.error}</AlertRow>
        ) : null}
        <AdminToolbar>
          <AdminButton type="submit" variant="primary">Review the change</AdminButton>
          <AdminButton onClick={controller.cancelEdit}>Cancel</AdminButton>
        </AdminToolbar>
      </AdminForm>
    </Panel>
  );
}

function RoutingPreview({controller}: {controller: PaymentRoutingController}) {
  const editor = controller.editor!;
  const changed = (editor.preview ?? []).filter((row) => row.changed);
  return (
    <Panel
      span={2}
      icon={<CatchIcon icon="protected" size="md" />}
      title="Review the routing change"
      action={editor.base.revision === 0 ? "Creates revision 1" :
        `Replaces revision ${editor.base.revision}`}
    >
      <AdminDiffList>
        <AdminDiffRow field="Payment" before="Now" after="After saving" />
        {changed.map((row) => (
          <AdminDiffRow key={row.purpose} field={row.field} before={row.before} after={row.after} />
        ))}
      </AdminDiffList>
      {editor.confirmations.length > 0 ? (
        <QualityList>
          {editor.confirmations.map((confirmation) => (
            <CatchField
              key={confirmation.id}
              recipe="input"
              title={`Type "${confirmation.phrase}" to confirm`}
              helperText={confirmation.reason}
              value={editor.typed[confirmation.id] ?? ""}
              onChanged={(text) => controller.setTyped(confirmation.id, text)}
            />
          ))}
        </QualityList>
      ) : null}
      {editor.error ? (
        <AlertRow icon={<CatchIcon icon="warning" size="sm" />} tone="warning">{editor.error}</AlertRow>
      ) : null}
      <AdminToolbar>
        <AdminButton
          disabled={controller.isSaving || !controller.confirmed}
          loading={controller.isSaving}
          loadingLabel="Saving"
          onClick={() => void controller.save()}
          variant="primary"
        >
          {editor.unconfirmed ? "Retry the same save" : "Save routing"}
        </AdminButton>
        <AdminButton disabled={controller.isSaving || Boolean(editor.unconfirmed)} onClick={controller.backToEdit}>
          Back to editing
        </AdminButton>
        <AdminButton disabled={controller.isSaving} onClick={controller.cancelEdit}>Discard</AdminButton>
      </AdminToolbar>
    </Panel>
  );
}

function formatDateTime(millis: number): string {
  return new Intl.DateTimeFormat("en-IN", {dateStyle: "medium", timeStyle: "short"})
    .format(new Date(millis));
}
