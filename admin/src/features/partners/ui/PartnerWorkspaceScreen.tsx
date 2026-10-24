import {CatchText, CatchField} from "@catch/web-ui";
import {AlertCircle, CheckCircle2, Handshake} from "lucide-react";
import {useCallback, useState} from "react";
import {
  AdminButton,
  AdminDirectoryScreenStack,
  AdminForm,
  EmptyState,
  PageHeader,
  Panel,
  selectOptions,
  StateRow,
  StatusBanner,
} from "../../../shared/ui/AdminPrimitives";
import {useAdminOperationPending} from "../../../shared/pendingOperation";
import {usePartnerWorkspaceController} from "../controllers/usePartnerWorkspaceController";
import {PartnerDemoReviewWorkspace} from "./PartnerDemoReviewWorkspace";
import {PartnerOutreachWorkspace} from "./PartnerOutreachWorkspace";
import type {PartnerLead} from "../api/partnerRepository";

export function PartnerWorkspaceScreen({actorUid, isCurrentSession, onSignOut}: {actorUid: string;
  isCurrentSession: () => boolean; onSignOut: () => void}) {
  const c = usePartnerWorkspaceController({actorUid, isCurrentSession});
  const [recoveries, setRecoveries] = useState<Record<string, boolean>>({});
  const reportRecovery = useCallback((scope: string, unresolved: boolean) => {
    setRecoveries((old) => old[scope] === unresolved ? old : {...old, [scope]: unresolved});
  }, []);
  const operationPending = useAdminOperationPending();
  const unresolvedOutreach = Object.values(recoveries).some(Boolean);
  const pending = operationPending || unresolvedOutreach;
  const [displayName, setDisplayName] = useState("");
  const [name, setName] = useState(""); const [city, setCity] = useState("");
  const [url, setUrl] = useState(""); const [relationship, setRelationship] = useState("");
  const data = c.data;
  const retained = c.workspace.data?.membership.uid === actorUid && isCurrentSession() ? c.workspace.data : undefined;
  const membershipRequired = !data && c.workspace.error &&
    "code" in c.workspace.error && c.workspace.error.code === "functions/permission-denied";
  return <AdminDirectoryScreenStack>
    <PageHeader title="Catch referral partners">Introduce an organizer, review the preparation, and keep the next action clear.</PageHeader>
    <AdminButton disabled={operationPending} onClick={onSignOut}>Sign out</AdminButton>
    <AdminButton disabled={operationPending || c.workspace.isFetching} onClick={() => void c.workspace.refetch()}>Refresh partner access</AdminButton>
    {unresolvedOutreach && <CatchText as="p" variant="supporting">A preparation action is unconfirmed. Refresh access to reconcile it, or sign out to leave this session. Signing out discards local retry details.</CatchText>}
    {c.error && <StatusBanner tone="error" icon={<AlertCircle />}>{c.error}</StatusBanner>}
    {c.needsRetry && <AdminButton disabled={pending || c.workspace.isFetching} onClick={() => void c.retry()}>Retry interrupted save</AdminButton>}
    {c.notice && <StatusBanner tone="success" icon={<CheckCircle2 />}>{c.notice}</StatusBanner>}
    {c.workspace.isLoading && <StateRow label="Partner access" value="Checking your workspace…" />}
    {membershipRequired ? <Panel icon={<Handshake />} title="Accept a bounded referral role">
      <CatchText as="p" variant="supporting">You can nominate organizers and review leads assigned to you. You are a prospective collaborator.
        This role does not make you a Catch employee or grant organizer control. Marketing access is granted separately.</CatchText>
      <AdminForm onSubmit={(e) => {e.preventDefault(); void c.save("register", {
        displayName: displayName.trim(), termsVersion: "referral-preview-v1"});}}>
        <CatchField
          recipe="input"
          title="Your name"
          value={displayName}
          onChanged={setDisplayName}
          inputMode={pending ? "inactive" : "editable"}
        />
        <AdminButton type="submit" variant="primary" disabled={pending || !displayName.trim()}>Accept referral role</AdminButton>
      </AdminForm>
    </Panel> : c.workspace.error ? <StatusBanner tone="error" icon={<AlertCircle />}>{c.workspace.error.message}</StatusBanner> : null}
    {data && <>
      <Panel icon={<Handshake />} title="Nominate an organizer">
        <CatchText as="p" variant="supporting">A nomination is self-reported and requires identity review. It creates no claim or published listing.</CatchText>
        <AdminForm onSubmit={(e) => {e.preventDefault(); void c.save("nominate", {
          name: name.trim(), city: city.trim(), url: url.trim(), relationshipContext: relationship.trim() || null})
          .then((saved) => {if (saved) {setName(""); setCity(""); setUrl(""); setRelationship("");}});}}>
          <CatchField
            recipe="input"
            title="Organizer name"
            value={name}
            onChanged={setName}
            inputMode={pending ? "inactive" : "editable"}
          />
          <CatchField
            recipe="input"
            title="City or region"
            value={city}
            onChanged={setCity}
            inputMode={pending ? "inactive" : "editable"}
          />
          <CatchField
            recipe="input"
            title="Official site or event link"
            value={url}
            onChanged={setUrl}
            inputMode={pending ? "inactive" : "editable"}
          />
          <CatchField
            recipe="input"
            maxLines={3}
            title="How you know them (optional)"
            value={relationship}
            onChanged={setRelationship}
            inputMode={pending ? "inactive" : "editable"}
          />
          <AdminButton type="submit" variant="primary" disabled={pending || !name.trim() || !city.trim() || !url.trim()}>Submit for review</AdminButton>
        </AdminForm>
      </Panel>
      <Panel icon={<Handshake />} title="Your nominations">
        {data.submissions.length ? data.submissions.map((s) => <StateRow key={s.intentId} label={s.name} value={s.status.replaceAll("_", " ")} />) :
          <EmptyState>No nominations yet. Start with one organizer you can introduce.</EmptyState>}
      </Panel>

    </>}
    {retained && <Panel icon={<Handshake />} title="Assigned leads">
        {retained.leads.length ? retained.leads.map((lead) => renderLead(lead, pending, c.save, actorUid, isCurrentSession, retained.membership.expiresAt, !!data, reportRecovery)) :
          <EmptyState>No current assignments. A Catch lead owner will review identity and offer eligible leads here.</EmptyState>}
        {data?.nextCursor && <AdminButton disabled={pending} onClick={() => c.setCursor(data.nextCursor)}>More leads</AdminButton>}
        {c.cursor && <AdminButton disabled={pending} onClick={() => c.setCursor(null)}>First page</AdminButton>}
      </Panel>}
  </AdminDirectoryScreenStack>;
}
function renderLead(lead: PartnerLead, pending: boolean,
  save: ReturnType<typeof usePartnerWorkspaceController>["save"], actorUid: string,
  isCurrentSession: () => boolean, membershipExpiresAt: string, visible: boolean, onRecoveryChange: (scope: string, unresolved: boolean) => void) {
  return <LeadReview key={`${lead.assignment.organizerId}:${lead.assignment.revision}`} lead={lead} pending={pending} save={save} actorUid={actorUid}
    isCurrentSession={isCurrentSession} membershipExpiresAt={membershipExpiresAt} visible={visible} onRecoveryChange={onRecoveryChange} />;
}
function LeadReview({lead, pending, save, actorUid, isCurrentSession, membershipExpiresAt, visible, onRecoveryChange}: {lead: PartnerLead; pending: boolean;
  save: ReturnType<typeof usePartnerWorkspaceController>["save"]; actorUid: string;
  isCurrentSession: () => boolean; membershipExpiresAt: string; visible: boolean; onRecoveryChange: (scope: string, unresolved: boolean) => void}) {
  const [relationship, setRelationship] = useState(lead.assignment.relationshipContext ?? "");
  const [channel, setChannel] = useState(lead.assignment.channel ?? "whatsapp");
  const [nextAction, setNextAction] = useState(lead.assignment.nextAction);
  const [reviewAt, setReviewAt] = useState(lead.assignment.reviewAt.slice(0, 16));
  return <>
    {visible && <Panel icon={<Handshake />} title={lead.organizer.name}>
    <CatchText as="p" variant="supporting">{lead.organizer.city} · {lead.assignment.status} · claim: {lead.organizer.claimState}</CatchText>
    <CatchText as="p" variant="supporting">Next action: {lead.assignment.nextAction}. Review by {new Date(lead.assignment.reviewAt).toLocaleDateString()}.</CatchText>
    {lead.assignment.status === "offered" && <AdminForm onSubmit={(e) => {e.preventDefault(); void save("decide", {
      organizerId: lead.organizer.organizerId, expectedRevision: lead.assignment.revision,
      decision: "accept", channel, relationshipContext: relationship.trim() || null});}}>
      <CatchField
        recipe="input"
        maxLines={3}
        title="Relationship context"
        value={relationship}
        onChanged={setRelationship}
        inputMode={pending ? "inactive" : "editable"}
      />
      <CatchField
        recipe="select"
        title="Established contact channel"
        value={channel}
        onChanged={(value) => setChannel(value ?? "")}
        inputMode={pending ? "inactive" : "editable"}
        {...selectOptions([{value: "whatsapp", label: "WhatsApp"}, {value: "email", label: "Email"}, {value: "other", label: "Other"}])}
      />
      <AdminButton type="submit" disabled={pending}>Accept lead</AdminButton>
      <AdminButton disabled={pending} onClick={() => void save("decide", {
        organizerId: lead.organizer.organizerId, expectedRevision: lead.assignment.revision,
        decision: "decline", channel: null, relationshipContext: relationship.trim() || null})}>Decline</AdminButton>
    </AdminForm>}
    {lead.assignment.status === "accepted" && <AdminForm onSubmit={(e) => {
      e.preventDefault(); const date = new Date(`${reviewAt}:00.000Z`);
      if (!Number.isFinite(date.getTime())) return;
      void save("update", {organizerId: lead.organizer.organizerId,
        expectedRevision: lead.assignment.revision, relationshipContext: relationship.trim() || null,
        channel, nextAction: nextAction.trim(), reviewAt: date.toISOString()});
    }}>
      <CatchField
        recipe="input"
        maxLines={3}
        title="Your relationship context (self-reported)"
        value={relationship}
        onChanged={setRelationship}
        inputMode={pending ? "inactive" : "editable"}
      />
      <CatchField
        recipe="select"
        title="Established contact channel"
        value={channel}
        onChanged={(value) => setChannel(value ?? "")}
        inputMode={pending ? "inactive" : "editable"}
        {...selectOptions([{value: "whatsapp", label: "WhatsApp"}, {value: "email", label: "Email"}, {value: "other", label: "Other"}])}
      />
      <CatchField
        recipe="input"
        title="Next action"
        value={nextAction}
        onChanged={setNextAction}
        inputMode={pending ? "inactive" : "editable"}
      />
      <CatchField
        recipe="input"
        title="Review at (UTC)"
        value={reviewAt}
        onChanged={setReviewAt}
        inputMode={pending ? "inactive" : "editable"}
        keyboardType="datetime"
      />
      <AdminButton type="submit" disabled={pending || !nextAction.trim() || !reviewAt}>Save private next step</AdminButton>
      <CatchText as="p" variant="supporting">Saving context or a next step does not send outreach, claim or publish this organizer.</CatchText>
    </AdminForm>}
    </Panel>}
    {lead.assignment.status === "accepted" && <PartnerOutreachWorkspace actorUid={actorUid}
      organizerId={lead.organizer.organizerId} assignmentRevision={lead.assignment.revision}
      accessExpiresAt={new Date(Math.min(Date.parse(membershipExpiresAt), Date.parse(lead.assignment.expiresAt))).toISOString()}
      isCurrentSession={isCurrentSession} channel={lead.assignment.channel} parentAccessCurrent={visible} onRecoveryChange={onRecoveryChange} />}
    {lead.assignment.status === "accepted" && <PartnerDemoReviewWorkspace actorUid={actorUid}
      organizerId={lead.organizer.organizerId} assignmentRevision={lead.assignment.revision}
      accessExpiresAt={new Date(Math.min(Date.parse(membershipExpiresAt), Date.parse(lead.assignment.expiresAt))).toISOString()}
      isCurrentSession={isCurrentSession} parentAccessCurrent={visible} onRecoveryChange={onRecoveryChange} />}
  </>;
}
