import {CatchField, CatchText} from "@catch/web-ui";
import {useState} from "react";
import {ClipboardCheck} from "lucide-react";
import {
  AdminButton,
  AdminFieldGrid,
  AdminForm,
  AdminLinkButton,
  AdminOrganizerIntakeCheckboxField,
  AdminToolbar,
  Panel,
  selectOptions,
  StateRow,
} from "../../../../shared/ui/AdminPrimitives";
import {launchMarkets} from "../../../../shared/config/launchMarkets";
import type {ListingApprovalInput, ListingReview} from "../api/organizerListingReviewRepository";
import type {OrganizerListingReviewController} from "../controllers/useOrganizerListingReviewController";

type Checklist = ListingApprovalInput["checklist"];

const organizerTypeOptions = [
  {value: "community", label: "Community"},
  {value: "club", label: "Club"},
  {value: "eventProducer", label: "Event producer"},
  {value: "venue", label: "Venue"},
  {value: "brand", label: "Brand"},
  {value: "individual", label: "Individual"},
];

const checklistItems: Array<[keyof Checklist, string]> = [
  ["identityReviewed", "This is one real organizer, not one Catch already lists"],
  ["surfaceInventoryReviewed", "Every link belongs to this organizer"],
  ["ownerSafeCopyReviewed", "The description is fit to show the organizer"],
  ["marketScopeReviewed", "They run events in the chosen market"],
  ["mediaRightsReviewed", "No image or copy is used without the right to"],
  ["crawlDisabledReviewed", "Crawling stays off for this page"],
  ["claimTargetReviewed", "Claim target is present and owner-safe"],
  ["takedownPathReviewed", "Takedown path is available"],
  ["impersonationReviewed", "Identity does not impersonate another organizer"],
];

const kindLabels: Record<ListingReview["kind"], string> = {
  nomination: "Nomination", self_submission: "Organizer's own submission", discovery: "Discovery",
};

const uncheckedList = (): Checklist => Object.fromEntries(checklistItems.map(([key]) => [key, false])) as never;

/**
 * Listings Supply Intake built and nobody has approved. Approving one
 * publishes it unclaimed and noindex and opens its Sales work.
 */
export function renderOrganizerListingReview(controller: OrganizerListingReviewController) {
  return <OrganizerListingReview controller={controller} />;
}

function OrganizerListingReview({controller}: {controller: OrganizerListingReviewController}) {
  const [selected, setSelected] = useState<string | null>(null);
  const row = controller.rows.find((entry) => entry.listingWorkItemId === selected) ?? null;
  return <>
    <Panel title="Listings to review" icon={<ClipboardCheck size={18} />}>
      <CatchText as="p" variant="supporting">Organizers nominated by Sales, partners or themselves.
        Approving one publishes its page unclaimed and hidden from search, and opens its Sales work.</CatchText>
      {controller.page.isPending ? <CatchText as="p" variant="supporting">Loading listings…</CatchText> : null}
      {controller.page.error ? <CatchText as="p" variant="supporting" role="alert">
        Listings could not be loaded. Try again.</CatchText> : null}
      {!controller.page.isPending && !controller.page.error && controller.rows.length === 0 ?
        <CatchText as="p" variant="supporting">No listings are waiting for review.</CatchText> : null}
      {controller.unavailableCount ? <CatchText as="p" variant="supporting" role="status">
        {controller.unavailableCount} finished request{controller.unavailableCount === 1 ? "" : "s"} on this page
        could not be read.</CatchText> : null}
      {controller.rows.map((entry) => <StateRow key={entry.listingWorkItemId}
        label={entry.listing.name ?? "Unnamed organizer"}
        value={<>
          {kindLabels[entry.kind]} · {entry.market.label ?? entry.market.slug} ·{" "}
          {entry.listing.eventCount} event{entry.listing.eventCount === 1 ? "" : "s"} ·{" "}
          {entry.listing.fetchedPageCount} of {entry.listing.pageCount} pages read
          {entry.listing.gaps.length ? <> · {entry.listing.gaps.length} gaps</> : null}{" "}
          <AdminButton onClick={() => setSelected(entry.listingWorkItemId)}>Review</AdminButton>
        </>} />)}
      <AdminToolbar>
        <AdminButton disabled={!controller.hasPreviousPage} onClick={controller.previousPage}>Previous page</AdminButton>
        <AdminButton disabled={!controller.hasNextPage} onClick={controller.nextPage}>Next page</AdminButton>
      </AdminToolbar>
    </Panel>
    {row ? <ListingApprovalForm key={row.listingWorkItemId} row={row} controller={controller}
      onClose={() => setSelected(null)} /> : null}
  </>;
}

function ListingApprovalForm({row, controller, onClose}: {
  row: ListingReview;
  controller: OrganizerListingReviewController;
  onClose: () => void;
}) {
  const [name, setName] = useState(row.listing.name ?? "");
  const [publicSlug, setPublicSlug] = useState(row.suggestedSlug);
  const [marketId, setMarketId] = useState(row.market.open && row.market.marketId ? row.market.marketId : "");
  const [organizerType, setOrganizerType] = useState("community");
  const [checklist, setChecklist] = useState<Checklist>(uncheckedList);
  const [note, setNote] = useState("");
  const ready = Boolean(name.trim() && /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$/u.test(publicSlug) && marketId &&
    note.trim().length >= 10 && checklistItems.every(([key]) => checklist[key]));
  const submit = async () => {
    if (!ready) return;
    const approved = await controller.approve({listingWorkItemId: row.listingWorkItemId,
      contentHash: row.listing.contentHash, name: name.trim(), publicSlug, marketId,
      organizerType: organizerType as ListingApprovalInput["organizerType"], checklist, note: note.trim()});
    if (approved) onClose();
  };
  return <Panel title={`Review ${row.listing.name ?? "listing"}`} icon={<ClipboardCheck size={18} />}>
    {row.listing.description ? <CatchText as="p" variant="bodyM">{row.listing.description}</CatchText> : null}
    {row.listing.links.map((link) => <StateRow key={link.url} label={link.platform}
      value={<AdminLinkButton href={link.url} rel="noreferrer" target="_blank">{link.url}</AdminLinkButton>} />)}
    {row.listing.gaps.length ? <CatchText as="p" variant="supporting">Gaps: {row.listing.gaps.join(", ")}.
      {row.listing.researchNeeded ? " Research is still needed." : ""}</CatchText> : null}
    {!row.market.open ? <CatchText as="p" variant="supporting" role="status">They were nominated
      for {row.market.label ?? row.market.slug}, which Catch has not opened. Choose an open market or wait.</CatchText> : null}
    {controller.canApprove ? <AdminForm onSubmit={(event) => {event.preventDefault(); void submit();}}>
      <AdminFieldGrid>
        <CatchField recipe="input" title="Organizer name" maxLength={120} value={name} onChanged={setName} />
        <CatchField recipe="input" title="Public page slug" maxLength={64} value={publicSlug}
          onChanged={(value) => setPublicSlug(value.trim().toLowerCase())} />
        <CatchField recipe="select" title="Launch market" value={marketId}
          onChanged={(value) => setMarketId(value ?? "")} {...selectOptions([
            {value: "", label: "Choose a launch market"},
            ...launchMarkets.map((market) => ({value: market.id, label: market.label})),
          ])} />
        <CatchField recipe="select" title="Organizer type" value={organizerType}
          onChanged={(value) => setOrganizerType(value ?? "community")} {...selectOptions(organizerTypeOptions)} />
      </AdminFieldGrid>
      {checklistItems.map(([key, label]) => <AdminOrganizerIntakeCheckboxField key={key} label={label}
        checked={checklist[key]} onChange={(checked) => setChecklist((current) => ({...current, [key]: checked}))} />)}
      <CatchField recipe="input" title="Review note" maxLines={3} maxLength={500} value={note} onChanged={setNote}
        helperText="What you checked, in at least ten characters." />
      <AdminToolbar>
        <AdminButton type="submit" variant="primary" disabled={!ready || controller.isApproving}>
          Approve and publish unclaimed</AdminButton>
        <AdminButton onClick={onClose}>Cancel</AdminButton>
      </AdminToolbar>
    </AdminForm> : <CatchText as="p" variant="supporting" role="status">Approving a listing
      needs an admin or admin owner, because it opens Sales records.</CatchText>}
  </Panel>;
}
