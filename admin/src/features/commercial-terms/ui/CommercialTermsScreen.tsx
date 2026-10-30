import {CatchBadge, CatchField, CatchIcon, CatchText} from "@catch/web-ui";
import type {ReactNode} from "react";
import {
  AdminButton,
  AdminDiffList,
  AdminDiffRow,
  AdminFieldGrid,
  AdminForm,
  AdminRowTitle,
  AdminTableRow,
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
  parseTermsField,
  revisionChanges,
  termsFields,
  termsSummaryRows,
  type TermsField,
} from "../controllers/commercialTermsForm";
import {
  type CommercialTermsController,
  useCommercialTermsController,
} from "../controllers/useCommercialTermsController";

export function CommercialTermsScreen({
  canManage,
  onError,
  onNotice,
  onOpenOrganizer,
  onOpenPlatform,
  organizerId,
  workspaceSwitch,
}: {
  canManage: boolean;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
  onOpenOrganizer: (organizerId: string) => void;
  onOpenPlatform: () => void;
  organizerId: string | null;
  workspaceSwitch?: ReactNode;
}) {
  const controller = useCommercialTermsController({
    canManage,
    onError,
    onNotice,
    organizerId,
  });
  return (
    <CommercialTermsWorkspace
      controller={controller}
      onOpenOrganizer={onOpenOrganizer}
      onOpenPlatform={onOpenPlatform}
      workspaceSwitch={workspaceSwitch}
    />
  );
}

export function CommercialTermsWorkspace({
  controller,
  onOpenOrganizer,
  onOpenPlatform,
  workspaceSwitch,
}: {
  controller: CommercialTermsController;
  onOpenOrganizer: (organizerId: string) => void;
  onOpenPlatform: () => void;
  workspaceSwitch?: ReactNode;
}) {
  const {listing} = controller;
  return (
    <AdminWorkbenchStack>
      {workspaceSwitch}
      {controller.scope === "organizer" ? (
        <AdminToolbar>
          <AdminButton
            icon={<CatchIcon icon="back" size="sm" />}
            onClick={onOpenPlatform}
          >
            Back to platform terms
          </AdminButton>
          <RefreshButton controller={controller} />
        </AdminToolbar>
      ) : null}
      {controller.loadState === "loading" ? (
        <EmptyState variant="workbench" icon={<CatchIcon icon="refresh" size="sm" />}>
          Loading commercial terms.
        </EmptyState>
      ) : controller.loadState === "error" || !listing ? (
        <AlertRow
          icon={<CatchIcon icon="warning" size="sm" />}
          title="Commercial terms unavailable"
          tone="blocked"
        >
          {controller.loadError ?? "Commercial terms could not be loaded."}
        </AlertRow>
      ) : (
        <>
          <PlatformStatus controller={controller} />
          <TermsPanel controller={controller} />
          <HistoryPanel controller={controller} />
          {controller.scope === "platform" ? (
            <OverridesPanel controller={controller} onOpenOrganizer={onOpenOrganizer} />
          ) : null}
        </>
      )}
    </AdminWorkbenchStack>
  );
}

function RefreshButton({controller}: {controller: CommercialTermsController}) {
  return (
    <AdminButton
      disabled={controller.loadState === "loading" || controller.isSaving}
      icon={<CatchIcon icon="refresh" size="sm" />}
      onClick={controller.refresh}
    >
      Refresh
    </AdminButton>
  );
}

function PlatformStatus({controller}: {controller: CommercialTermsController}) {
  const listing = controller.listing!;
  if (listing.platform) return null;
  if (controller.scope === "organizer") {
    return (
      <AlertRow
        icon={<CatchIcon icon="warning" size="sm" />}
        title="Platform terms come first"
        tone="warning"
      >
        Save Catch's platform terms before giving this organizer an override.
      </AlertRow>
    );
  }
  return (
    <AlertRow
      icon={<CatchIcon icon="warning" size="sm" />}
      title="Platform terms are not saved yet"
      tone="warning"
    >
      Until they are, payments that Catch splits through Razorpay Route and
      host memberships stay unavailable, and host-collected payments record no
      terms for the commission statement. Start from the owner's 30 Oct 2026
      decision, check the preview and save it with a reason.
    </AlertRow>
  );
}

function TermsPanel({controller}: {controller: CommercialTermsController}) {
  const listing = controller.listing!;
  const record = controller.scope === "platform" ? listing.platform : listing.organizer;
  const title = controller.scope === "platform" ? "Platform terms" :
    `Terms for ${listing.organizerName ?? "this organizer"}`;
  const action = record ?
    `Revision ${record.revision} · ${formatDateTime(record.updatedAtMillis)}` :
    controller.scope === "platform" ? "Not saved" : "Inherits every platform term";
  const rows = termsSummaryRows(listing.platform?.terms ?? null,
    listing.organizer?.terms ?? null, controller.scope);
  const editing = controller.editor !== null;
  return (
    <Panel span={2} icon={<CatchIcon icon="pricing" size="md" />} title={title} action={action}>
      {editing ? <TermsEditor controller={controller} /> : (
        <>
          {groups(termsFields).map(([group, fields]) => (
            <QualityList key={group}>
              <CatchText as="p" variant="supportingStrong">{group}</CatchText>
              {fields.map((field) => {
                const row = rows.find((entry) => entry.id === field.id)!;
                return <StateRow key={field.id} label={field.label} value={row.value} />;
              })}
            </QualityList>
          ))}
          {record ? (
            <StateRow label="Reason for this revision" value={record.reason} />
          ) : null}
          <AdminToolbar>
            {controller.scope === "platform" && !listing.platform ? (
              <AdminButton variant="primary" onClick={controller.startFromOwnerDecision}>
                Start from the owner's 30 Oct decision
              </AdminButton>
            ) : null}
            <AdminButton
              disabled={controller.scope === "organizer" && !listing.platform}
              onClick={controller.startEdit}
              variant={controller.scope === "platform" && !listing.platform ? "ghost" : "primary"}
            >
              {controller.scope === "platform" ?
                listing.platform ? "Edit platform terms" : "Enter terms by hand" :
                listing.organizer ? "Edit this organizer's override" : "Add an override"}
            </AdminButton>
            {controller.scope === "platform" ? <RefreshButton controller={controller} /> : null}
          </AdminToolbar>
        </>
      )}
    </Panel>
  );
}

function TermsEditor({controller}: {controller: CommercialTermsController}) {
  const editor = controller.editor!;
  const listing = controller.listing!;
  if (editor.preview) return <TermsPreview controller={controller} />;
  const platformTerms = listing.platform?.terms ?? null;
  return (
    <AdminForm
      onSubmit={(event) => {
        event.preventDefault();
        controller.review();
      }}
    >
      {controller.scope === "organizer" ? (
        <CatchText as="p" variant="supporting">
          Tick a term to set it for this organizer. Unticked terms inherit the
          platform value and follow it when it changes.
        </CatchText>
      ) : null}
      {groups(termsFields).map(([group, fields]) => (
        <QualityList key={group}>
          <CatchText as="p" variant="supportingStrong">{group}</CatchText>
          <AdminFieldGrid>
            {fields.map((field) => {
              const own = field.id in editor.draft;
              const inheritedValue = platformTerms ?
                termsSummaryRows(platformTerms, null, "platform")
                  .find((row) => row.id === field.id)!.value : "Not set";
              return (
                <QualityList key={field.id}>
                  {controller.scope === "organizer" ? (
                    <CheckboxField
                      checked={own}
                      label={`Set ${field.label.toLowerCase()} for this organizer`}
                      onChange={(checked) => controller.setInherited(field.id, !checked)}
                    />
                  ) : null}
                  {controller.scope === "platform" || own ? (
                    <TermsFieldInput
                      field={field}
                      onChange={(text) => controller.setField(field.id, text)}
                      value={editor.draft[field.id] ?? ""}
                    />
                  ) : (
                    <StateRow label={field.label} value={`Inherited (${inheritedValue})`} />
                  )}
                </QualityList>
              );
            })}
          </AdminFieldGrid>
        </QualityList>
      ))}
      <CatchField
        recipe="input"
        title="Reason for this change"
        helperText="Recorded with the revision and in the admin audit log."
        maxLength={500}
        maxLines={3}
        value={editor.reason}
        onChanged={controller.setReason}
      />
      {editor.errors.length > 0 ? (
        <AlertRow icon={<CatchIcon icon="warning" size="sm" />} title="Fix these first" tone="warning">
          {editor.errors.join(" ")}
        </AlertRow>
      ) : null}
      <AdminToolbar>
        <AdminButton type="submit" variant="primary">Review the change</AdminButton>
        <AdminButton onClick={controller.cancelEdit}>Cancel</AdminButton>
      </AdminToolbar>
    </AdminForm>
  );
}

function TermsFieldInput({
  field,
  onChange,
  value,
}: {
  field: TermsField;
  onChange: (text: string) => void;
  value: string;
}) {
  const parsed = value.trim() === "" && field.kind !== "rupeesOrNoCap" ?
    null : parseTermsField(field.id, value);
  const errorText = parsed && "error" in parsed ? parsed.error : undefined;
  if (field.kind === "choice") {
    return (
      <CatchField
        recipe="select"
        title={field.label}
        helperText={field.helperText}
        onChanged={(next) => onChange(next ?? "")}
        value={value}
        {...selectOptions(field.options ?? [])}
      />
    );
  }
  return (
    <CatchField
      recipe="input"
      title={field.label}
      helperText={errorText ? undefined : field.helperText}
      errorText={errorText}
      keyboardType="decimal"
      prefixText={field.kind === "rupees" || field.kind === "rupeesOrNoCap" ? "₹" : undefined}
      suffixText={field.kind === "percent" ? "%" : field.kind === "days" ? "days" : undefined}
      value={value}
      onChanged={onChange}
    />
  );
}

function TermsPreview({controller}: {controller: CommercialTermsController}) {
  const editor = controller.editor!;
  const rows = editor.preview ?? [];
  const changed = rows.filter((row) => row.changed);
  const nextRevision = editor.baseRevision + 1;
  return (
    <AdminWorkbenchStack compact>
      <CatchText as="p" variant="supporting">
        {changed.length} term{changed.length === 1 ? "" : "s"} change against
        {editor.baseRevision === 0 ? " the unsaved state" :
          ` revision ${editor.baseRevision}`}. New payments use the saved terms;
        payments already recorded keep the terms they were taken under.
      </CatchText>
      <AdminDiffList>
        <AdminDiffRow field="Term" before="Now" after="After saving" />
        {changed.map((row) => (
          <AdminDiffRow key={row.id} field={row.field} before={row.before} after={row.after} />
        ))}
      </AdminDiffList>
      <StateRow label="Reason" value={editor.reason.trim()} />
      {editor.unconfirmed ? (
        <AlertRow icon={<CatchIcon icon="warning" size="sm" />} title="Save not confirmed" tone="warning">
          Catch did not confirm the last save. Retrying sends exactly the same
          change, and it is applied only once.
        </AlertRow>
      ) : null}
      <AdminToolbar>
        <AdminButton
          disabled={controller.isSaving}
          loading={controller.isSaving}
          loadingLabel="Saving"
          onClick={() => void controller.save()}
          variant="primary"
        >
          {editor.unconfirmed ? "Retry the same save" : `Save as revision ${nextRevision}`}
        </AdminButton>
        <AdminButton disabled={controller.isSaving || Boolean(editor.unconfirmed)} onClick={controller.backToEdit}>
          Back to editing
        </AdminButton>
        <AdminButton disabled={controller.isSaving} onClick={controller.cancelEdit}>
          Discard
        </AdminButton>
      </AdminToolbar>
    </AdminWorkbenchStack>
  );
}

function HistoryPanel({controller}: {controller: CommercialTermsController}) {
  const listing = controller.listing!;
  const entries = listing.history;
  return (
    <Panel
      span={2}
      icon={<CatchIcon icon="history" size="md" />}
      title="Revision history"
      action={entries.length === 0 ? "No revisions" :
        listing.historyComplete ? `${entries.length} shown` :
          `Newest ${entries.length} shown`}
    >
      {entries.length === 0 ? (
        <EmptyState icon={<CatchIcon icon="history" size="sm" />}>
          {controller.scope === "platform" ?
            "Platform terms have never been saved." :
            "This organizer has never had an override."}
        </EmptyState>
      ) : (
        <DataTable ariaLabel="Commercial terms revisions" variant="workbench">
          <thead>
            <tr>
              <th>Revision</th>
              <th>Saved</th>
              <th>What changed</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              const previous = entries[index + 1] ?? null;
              const changes = previous || entry.revision === 1 ?
                revisionChanges(controller.scope, previous?.terms ?? null, entry.terms) : null;
              return (
                <AdminTableRow key={entry.revision}>
                  <td>{entry.revision}</td>
                  <td>
                    <AdminRowTitle>
                      <CatchText as="span" variant="supportingStrong">{formatDateTime(entry.createdAtMillis)}</CatchText>
                      <CatchText as="span" variant="supporting">by {entry.actorUid}</CatchText>
                    </AdminRowTitle>
                  </td>
                  <td>
                    {changes === null ? "Earlier revisions are not shown" :
                      entry.revision === 1 ? "First revision" :
                        changes.length === 0 ? "No term changed" : changes.join(", ")}
                  </td>
                  <td>{entry.reason}</td>
                </AdminTableRow>
              );
            })}
          </tbody>
        </DataTable>
      )}
    </Panel>
  );
}

function OverridesPanel({
  controller,
  onOpenOrganizer,
}: {
  controller: CommercialTermsController;
  onOpenOrganizer: (organizerId: string) => void;
}) {
  const listing = controller.listing!;
  return (
    <Panel
      span={2}
      icon={<CatchIcon icon="people" size="md" />}
      title="Organizer overrides"
      action={listing.overridesComplete ? `${listing.overrides.length} organizers` :
        `First ${listing.overrides.length} organizers`}
    >
      <CatchText as="p" variant="supporting">
        An override sets only the terms it lists for one organizer. Everything
        else inherits the platform terms.
      </CatchText>
      {listing.overrides.length === 0 ? (
        <EmptyState icon={<CatchIcon icon="people" size="sm" />}>
          No organizer has an override.
        </EmptyState>
      ) : (
        <DataTable ariaLabel="Organizer overrides" variant="workbench">
          <thead>
            <tr>
              <th>Organizer</th>
              <th>Sets</th>
              <th>Revision</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {listing.overrides.map((entry) => {
              const set = termsSummaryRows(listing.platform?.terms ?? null, entry.terms, "organizer")
                .filter((row) => !row.inherited);
              return (
                <AdminTableRow key={entry.organizerId}>
                  <td>
                    <AdminRowTitle>
                      <CatchText as="span" variant="supportingStrong">{entry.organizerName ?? entry.organizerId}</CatchText>
                      <CatchText as="span" variant="supporting">{entry.reason}</CatchText>
                    </AdminRowTitle>
                  </td>
                  <td>
                    {set.length === 0 ? "Nothing; inherits everything" :
                      set.map((row) => `${row.field} ${row.value}`).join(", ")}
                  </td>
                  <td>{entry.revision}</td>
                  <td>
                    <TableActionButton onClick={() => onOpenOrganizer(entry.organizerId)}>Open</TableActionButton>
                  </td>
                </AdminTableRow>
              );
            })}
          </tbody>
        </DataTable>
      )}
      <AdminForm
        onSubmit={(event) => {
          event.preventDefault();
          controller.search();
        }}
      >
        <AdminToolbar>
          <SearchField
            ariaLabel="Find an organizer to add an override"
            icon={<CatchIcon icon="search" size="sm" />}
            onChange={controller.setSearchText}
            placeholder="Find an organizer by name"
            value={controller.searchText}
          />
          <AdminButton type="submit">Find organizer</AdminButton>
        </AdminToolbar>
      </AdminForm>
      {controller.searchState === "loading" ? (
        <CatchText as="p" variant="supporting">Searching organizers…</CatchText>
      ) : controller.searchState === "error" ? (
        <CatchText as="p" variant="supporting" role="alert">Organizers could not be searched. Try again.</CatchText>
      ) : controller.searchState === "ready" && controller.searchMatches.length === 0 ? (
        <CatchText as="p" variant="supporting">No organizer matches that name.</CatchText>
      ) : controller.searchMatches.length > 0 ? (
        <QualityList>
          {controller.searchMatches.map((match) => {
            const existing = listing.overrides.some((entry) => entry.organizerId === match.organizerId);
            return (
              <StateRow
                key={match.organizerId}
                label={[match.organizerName ?? match.organizerId, match.cityName].filter(Boolean).join(" · ")}
                value={
                  <AdminToolbar>
                    {existing ? <CatchBadge label="Has an override" /> : null}
                    <TableActionButton onClick={() => onOpenOrganizer(match.organizerId)}>
                      {existing ? "Open" : "Add override"}
                    </TableActionButton>
                  </AdminToolbar>
                }
              />
            );
          })}
        </QualityList>
      ) : null}
    </Panel>
  );
}

function groups(fields: readonly TermsField[]): Array<[string, TermsField[]]> {
  const byGroup = new Map<string, TermsField[]>();
  for (const field of fields) {
    byGroup.set(field.group, [...(byGroup.get(field.group) ?? []), field]);
  }
  return [...byGroup.entries()];
}

function formatDateTime(millis: number): string {
  return new Intl.DateTimeFormat("en-IN", {dateStyle: "medium", timeStyle: "short"})
    .format(new Date(millis));
}

