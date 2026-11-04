import {
  CatchButton,
  CatchCheckboxInput,
  CatchDialog,
  CatchField,
  CatchGap,
  CatchIndexRow,
  CatchMetaRow,
  CatchSection,
  CatchLegacyText,
  type CatchMetaEntry,
} from "@catch/web-ui";
import {useState, type ReactNode} from "react";
import type {
  OrganizerAppVisibility,
  OrganizerPublishStatus,
  OrganizerSourceConfidence,
  OrganizerType,
  OrganizerVerificationStatus,
} from "../../../shared/types/adminTypes";
import {AdminFieldGrid, selectOptions} from "../../../shared/ui/AdminPrimitives";
import {
  emptyOrganizerOwnerLinkDraft,
  maxOrganizerOwnerLinks,
  organizerAppVisibilityOptions,
  organizerLaunchMarketOptions,
  organizerOwnerLinkIconOptions,
  organizerPublishStatusOptions,
  organizerSourceConfidenceOptions,
  organizerTypeOptions,
  organizerVerificationStatusOptions,
  publishChecklistItems,
  updateOrganizerLaunchMarket,
  updateOrganizerSlug,
  type OrganizerOwnerLinkDraft,
  type OrganizerPublishingFormState,
} from "../controllers/organizerPublishingHelpers";
import {organizerClaimLabel} from "../controllers/organizerRecordLabels";
import type {OrganizerPageEditorController} from "../controllers/useOrganizerPageEditorController";

const smallButton = {size: "sm", variant: "secondary"} as const;
const inSearchLabels: Record<string, string> = {
  noindex: "Not listed",
  indexReady: "Ready to list",
  indexed: "Listed",
};

function RowAction({label, onPressed}: {label: string; onPressed: () => void}) {
  return <CatchButton label={label} onPressed={onPressed} {...smallButton} />;
}

function Facts({entries}: {entries: CatchMetaEntry[]}) {
  return <CatchMetaRow columns={1} entries={entries} />;
}

/** One link's fields, in a dialog, so the page shows a single row for each link. */
function LinkDialog({link, index, count, onChange, onClose, onMove, onRemove}: {
  link: OrganizerOwnerLinkDraft;
  index: number;
  count: number;
  onChange: (patch: Partial<OrganizerOwnerLinkDraft>) => void;
  onClose: () => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <CatchDialog
      cancel={{label: "Remove link", onPressed: onRemove}}
      confirm={{label: "Done", onPressed: onClose}}
      message="Pinned links lead and the rest keep this order. Use a full https:// address; link shorteners are refused."
      onClose={onClose}
      open
      title={link.label.trim() || "New link"}
    >
      <CatchGap size="section">
        <CatchField maxLength={80} onChanged={(value) => onChange({label: value})} recipe="input" title="Label" value={link.label} />
        <CatchField keyboardType="url" onChanged={(value) => onChange({url: value})} recipe="input" title="Address" value={link.url} />
        <CatchField maxLength={80} onChanged={(value) => onChange({subtitle: value})} recipe="input" title="Subtitle (optional)" value={link.subtitle} />
        <CatchField
          onChanged={(value) => onChange({icon: (value ?? "") as OrganizerOwnerLinkDraft["icon"]})}
          recipe="select"
          title="Icon"
          {...selectOptions([...organizerOwnerLinkIconOptions])}
          value={link.icon}
        />
        <CatchField keyboardType="datetime" onChanged={(value) => onChange({showUntil: value})} recipe="input" title="Show until (optional)" value={link.showUntil} />
        <CatchCheckboxInput label="Pin to the top" onChanged={(pinned) => onChange({pinned})} value={link.pinned} />
        <CatchGap direction="horizontal" size="related">
          <CatchButton label="Move up" onPressed={index > 0 ? () => onMove(-1) : null} {...smallButton} />
          <CatchButton label="Move down" onPressed={index < count - 1 ? () => onMove(1) : null} {...smallButton} />
        </CatchGap>
      </CatchGap>
    </CatchDialog>
  );
}

function LinksSection({form, setForm}: {
  form: OrganizerPublishingFormState;
  setForm: (form: OrganizerPublishingFormState) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const links = form.ownerLinks;
  const setLinks = (ownerLinks: OrganizerOwnerLinkDraft[]) => setForm({...form, ownerLinks});
  const open = editing === null ? null : links[editing] ?? null;
  return (
    <CatchSection
      action={links.length < maxOrganizerOwnerLinks ? {
        label: "Add a link",
        onPressed: () => {
          setLinks([...links, emptyOrganizerOwnerLinkDraft()]);
          setEditing(links.length);
        },
      } : undefined}
      count={links.length}
      empty="No links yet."
      title="Links on the page"
    >
      {links.length === 0 ? null : links.map((link, index) => (
        <CatchIndexRow
          key={link.id}
          subtitle={[link.url, link.pinned ? "pinned to the top" : null,
            link.showUntil ? `shows until ${link.showUntil}` : null].filter(Boolean).join(" · ")}
          title={link.label.trim() || "New link"}
          titleVariant="bodyM"
          trailing={<RowAction label="Edit" onPressed={() => setEditing(index)} />}
        />
      ))}
      {open && editing !== null ? (
        <LinkDialog
          count={links.length}
          index={editing}
          link={open}
          onChange={(patch) => setLinks(links.map((link, at) => at === editing ? {...link, ...patch} : link))}
          onClose={() => setEditing(null)}
          onMove={(offset) => {
            const next = [...links];
            const [moved] = next.splice(editing, 1);
            next.splice(editing + offset, 0, moved!);
            setLinks(next);
            setEditing(editing + offset);
          }}
          onRemove={() => {
            setLinks(links.filter((_, at) => at !== editing));
            setEditing(null);
          }}
        />
      ) : null}
    </CatchSection>
  );
}

function PictureRow({title, value, onChange}: {title: string; value: string; onChange: (value: string) => void}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <CatchIndexRow
        subtitle={value || "None we have the right to use. The page uses a lettermark."}
        title={title}
        titleMaxLines={2}
        titleVariant="bodyM"
        trailing={<RowAction label={value ? "Edit" : "Add"} onPressed={() => setOpen(true)} />}
      />
      <CatchDialog
        confirm={{label: "Done", onPressed: () => setOpen(false)}}
        message="Only use a picture we have the right to show."
        onClose={() => setOpen(false)}
        open={open}
        title={title}
      >
        <CatchField keyboardType="url" onChanged={onChange} recipe="input" title="Address" value={value} />
      </CatchDialog>
    </>
  );
}

/** The form: who they are, how to reach them, where the page shows, and why it changed. */
function OrganizerPageEditorForm({editor}: {editor: OrganizerPageEditorController}): ReactNode {
  const {form, setForm, organizer, issues} = editor;
  if (!form || !organizer) {
    return <CatchLegacyText as="p" color="ink2" variant="bodyM">Loading the organizer</CatchLegacyText>;
  }
  const update = <K extends keyof OrganizerPublishingFormState>(key: K, value: OrganizerPublishingFormState[K]) =>
    setForm({...form, [key]: value});
  const errorOf = (targetId: string) => issues.find((issue) => issue.targetId === targetId)?.detail;
  return (
    <CatchGap size="majorSection">
      <CatchSection dividers="none" title="Who they are">
        <CatchGap size="section">
          <AdminFieldGrid columns={2}>
            <CatchField errorText={errorOf("organizer-name")} onChanged={(value) => update("name", value)} recipe="input" title="Name" value={form.name} />
            <CatchField
              onChanged={(value) => update("organizerType", (value ?? "") as OrganizerType)}
              recipe="select"
              title="Kind"
              {...selectOptions([...organizerTypeOptions])}
              value={form.organizerType}
            />
          </AdminFieldGrid>
          <CatchField
            onChanged={(value) => update("publicCategoryLabel", value)}
            recipe="input"
            title="Label shown instead (optional)"
            value={form.publicCategoryLabel}
          />
          <AdminFieldGrid columns={2}>
            <CatchField
              errorText={errorOf("organizer-area")}
              helperText="Only an area we have checked."
              onChanged={(value) => update("area", value)}
              recipe="input"
              title="Area"
              value={form.area}
            />
            <CatchField
              onChanged={(value) => setForm(updateOrganizerLaunchMarket(form, value ?? ""))}
              recipe="select"
              title="City"
              {...selectOptions(organizerLaunchMarketOptions)}
              value={form.location}
            />
          </AdminFieldGrid>
          <CatchField onChanged={(value) => update("headline", value)} recipe="input" title="Headline" value={form.headline} />
          <CatchField errorText={errorOf("organizer-description")} maxLines={4} onChanged={(value) => update("description", value)} recipe="input" title="About" value={form.description} />
          <CatchField maxLines={3} onChanged={(value) => update("summary", value)} recipe="input" title="Short summary" value={form.summary} />
          <CatchField
            helperText="Separate with commas. Shown as tags."
            onChanged={(value) => update("formatsText", value)}
            recipe="input"
            title="What they run"
            value={form.formatsText}
          />
          <CatchField
            helperText="Separate with commas."
            onChanged={(value) => update("tagsText", value)}
            recipe="input"
            title="Tags"
            value={form.tagsText}
          />
        </CatchGap>
      </CatchSection>
      <CatchSection dividers="none" note="Shown on the page only once they have claimed it" title="How to reach them">
        <CatchGap size="section">
          <CatchField onChanged={(value) => update("instagramHandle", value)} recipe="input" title="Instagram" value={form.instagramHandle} />
          <CatchField errorText={errorOf("organizer-email")} onChanged={(value) => update("email", value)} recipe="input" title="Email" value={form.email} />
          <CatchField keyboardType="phone" onChanged={(value) => update("phoneNumber", value)} recipe="input" title="Phone" value={form.phoneNumber} />
        </CatchGap>
      </CatchSection>
      <CatchSection dividers="none" note="The app and the public page are separate" title="Where it shows">
        <CatchGap size="section">
          <CatchField
            onChanged={(value) => update("appVisibility", (value ?? "") as OrganizerAppVisibility)}
            recipe="select"
            title="In the app"
            {...selectOptions([...organizerAppVisibilityOptions])}
            value={form.appVisibility}
          />
          <CatchField
            onChanged={(value) => update("publishStatus", (value ?? "") as OrganizerPublishStatus)}
            recipe="select"
            title="Public page"
            {...selectOptions([...organizerPublishStatusOptions])}
            value={form.publishStatus}
          />
        </CatchGap>
      </CatchSection>
      <CatchSection dividers="none" title="Pictures">
        <PictureRow onChange={(value) => update("imageUrl", value)} title="Cover photo" value={form.imageUrl} />
        <PictureRow onChange={(value) => update("profileImageUrl", value)} title="Logo" value={form.profileImageUrl} />
      </CatchSection>
      <LinksSection form={form} setForm={setForm} />
      <CatchSection dividers="none" title="Address and search">
        <CatchGap size="section">
          <CatchField
            errorText={errorOf("organizer-public-page-slug")}
            helperText={form.canonicalPath}
            onChanged={(value) => setForm(updateOrganizerSlug(form, value))}
            pattern="[a-z0-9-]+"
            recipe="input"
            title="Page address"
            value={form.publicPageSlug}
          />
          <CatchField onChanged={(value) => update("seoTitle", value)} recipe="input" title="Title in search results" value={form.seoTitle} />
          <CatchField maxLines={2} onChanged={(value) => update("seoDescription", value)} recipe="input" title="Description in search results" value={form.seoDescription} />
        </CatchGap>
      </CatchSection>
      <CatchSection dividers="none" title="What we know and why">
        <CatchGap size="section">
          <CatchField
            onChanged={(value) => update("sourceConfidence", (value ?? "") as OrganizerSourceConfidence)}
            recipe="select"
            title="How sure are we"
            {...selectOptions([...organizerSourceConfidenceOptions])}
            value={form.sourceConfidence}
          />
          <CatchField
            onChanged={(value) => update("verificationStatus", (value ?? "") as OrganizerVerificationStatus)}
            recipe="select"
            title="Verified"
            {...selectOptions([...organizerVerificationStatusOptions])}
            value={form.verificationStatus}
          />
          <CatchField onChanged={(value) => update("sourceSummary", value)} recipe="input" title="Where this came from" value={form.sourceSummary} />
          <CatchField
            errorText={errorOf("organizer-review-note")}
            helperText="Kept in History. The organizer never sees it."
            maxLines={2}
            onChanged={(value) => update("reviewNote", value)}
            recipe="input"
            title="Note for the team"
            value={form.reviewNote}
          />
        </CatchGap>
      </CatchSection>
    </CatchGap>
  );
}

/** Beside the form: what's left to save or publish, what changed, and how the page stands. */
function OrganizerPageEditorSide({editor}: {editor: OrganizerPageEditorController}) {
  const {diffRows, form, issues, organizer, publishIssues} = editor;
  if (!form || !organizer) return null;
  const saveBlockers = issues.filter((issue) => issue.severity === "blocker");
  const publishOnly = publishIssues.filter((issue) =>
    !saveBlockers.some((blocker) => blocker.id === issue.id));
  return (
    <CatchGap size="majorSection">
      <CatchSection dividers="none" title="Checks">
        {saveBlockers.length === 0 ? <CatchIndexRow title="Ready to save" titleVariant="bodyM" /> : null}
        {saveBlockers.map((issue) => (
          <CatchIndexRow key={issue.id} subtitle={issue.detail} title={issue.label} titleMaxLines={2} titleVariant="bodyM" />
        ))}
        {!publishIssues.some((issue) => issue.severity === "blocker") ? <CatchIndexRow title="Ready to publish" titleVariant="bodyM" /> : null}
        {publishOnly.map((issue) => (
          <CatchIndexRow key={issue.id} subtitle={`Before publishing: ${issue.detail}`} title={issue.label} titleMaxLines={2} titleVariant="bodyM" />
        ))}
      </CatchSection>
      <CatchSection count={diffRows.length} dividers="none" empty="No changes yet." title="Your changes">
        {diffRows.length === 0 ? null : diffRows.slice(0, 12).map((row) => (
          <CatchIndexRow key={row.field} subtitle={`${row.before} → ${row.after}`} title={row.field} titleVariant="bodyM" />
        ))}
      </CatchSection>
      <CatchSection dividers="none" title="After you save">
        <Facts entries={[
          {label: "In the app", value: form.appVisibility === "discoverable" ? "Discoverable" : "Hidden"},
          {label: "Public page", value: organizerPublishStatusOptions.find((option) => option.value === form.publishStatus)?.label ?? form.publishStatus},
          {label: "In search", value: inSearchLabels[organizer.publicPage.indexStatus ?? ""] ?? "Unknown"},
          {label: "Search engines", value: organizer.publicPage.robots ?? "Unknown"},
          {label: "Claim", value: organizerClaimLabel({claimState: organizer.claimState, claimedByName: null}).text},
          {label: "Address", value: form.canonicalPath || "—"},
        ]} />
        <CatchLegacyText as="p" color="ink2" variant="supporting">In search only changes when you publish.</CatchLegacyText>
      </CatchSection>
    </CatchGap>
  );
}

/** Discard, Save and Publish for the top bar. Publishing asks for the four confirmations first. */
function OrganizerPageEditorActions({editor}: {editor: OrganizerPageEditorController}) {
  const [open, setOpen] = useState(false);
  const {checklist, setChecklist} = editor;
  const complete = publishChecklistItems.every((item) => checklist[item.key]);
  return (
    <>
      <CatchButton label="Discard" onPressed={editor.diffRows.length > 0 && !editor.isBusy ? editor.discard : null} {...smallButton} />
      <CatchButton label="Publish" onPressed={editor.canPublish ? () => setOpen(true) : null} {...smallButton} />
      <CatchButton label={editor.isBusy ? "Saving" : "Save changes"} onPressed={editor.canSave ? () => void editor.save() : null} size="sm" />
      <CatchDialog
        confirm={{
          label: "Save and publish",
          onPressed: complete && !editor.isBusy ? () => {
            void editor.saveAndPublish().then((done) => {
              if (done) setOpen(false);
            });
          } : null,
        }}
        message="This saves your changes and lets search engines list the page."
        onClose={() => setOpen(false)}
        open={open}
        title="Publish this page?"
      >
        <CatchGap size="related">
          {publishChecklistItems.map((item) => (
            <CatchCheckboxInput
              description={item.detail}
              key={item.key}
              label={item.label}
              onChanged={(checked) => setChecklist({...checklist, [item.key]: checked})}
              value={checklist[item.key]}
            />
          ))}
        </CatchGap>
      </CatchDialog>
    </>
  );
}

export const organizerPageEditorPanels = {OrganizerPageEditorForm, OrganizerPageEditorSide, OrganizerPageEditorActions};
