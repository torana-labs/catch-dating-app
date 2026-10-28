import {CatchField, CatchIcon} from "@catch/web-ui";
import {
  AdminButton,
  AdminEditorSection,
  AdminFieldGrid,
  AdminToolbar,
  AlertRow,
  CheckboxField,
  selectOptions,
} from "../../../shared/ui/AdminPrimitives";
import {
  emptyOrganizerOwnerLinkDraft,
  maxOrganizerOwnerLinks,
  organizerOwnerLinkFieldId,
  organizerOwnerLinkIconOptions,
  type OrganizerOwnerLinkDraft,
} from "../controllers/organizerPublishingHelpers";

/**
 * The organizer page's owner links (CAT-254), in display order. Staff enter
 * them for an owner until the web owner view ships; the server checks every
 * address against the page's link policy on save.
 */
function OrganizerLinksEditor({
  links,
  onChange,
  targetIssue,
}: {
  links: OrganizerOwnerLinkDraft[];
  onChange: (links: OrganizerOwnerLinkDraft[]) => void;
  targetIssue: (targetId: string) => string | undefined;
}) {
  const update = (index: number, patch: Partial<OrganizerOwnerLinkDraft>) =>
    onChange(links.map((link, at) => at === index ? {...link, ...patch} : link));
  const move = (index: number, offset: -1 | 1) => {
    const next = [...links];
    const [link] = next.splice(index, 1);
    next.splice(index + offset, 0, link);
    onChange(next);
  };
  return (
    <AdminEditorSection>
      <legend>Page links</legend>
      <AlertRow
        icon={<CatchIcon icon="link" size="xs" />}
        title="Shown as tiles on the organizer page"
        tone="neutral"
      >
        Pinned links lead, the rest keep this order. A link with a show-until
        time disappears after it. Use full https:// addresses; link shorteners
        are refused.
      </AlertRow>
      {links.map((link, index) => (
        <AdminFieldGrid columns={3} key={link.id}>
          <CatchField
            recipe="input"
            id={organizerOwnerLinkFieldId(index, "label")}
            errorText={targetIssue(organizerOwnerLinkFieldId(index, "label"))}
            title={`Link ${index + 1} label`}
            maxLength={80}
            onChanged={(value) => update(index, {label: value})}
            value={link.label}
          />
          <CatchField
            recipe="input"
            id={organizerOwnerLinkFieldId(index, "url")}
            errorText={targetIssue(organizerOwnerLinkFieldId(index, "url"))}
            title="Address"
            keyboardType="url"
            onChanged={(value) => update(index, {url: value})}
            value={link.url}
          />
          <CatchField
            recipe="input"
            title="Subtitle (optional)"
            maxLength={80}
            onChanged={(value) => update(index, {subtitle: value})}
            value={link.subtitle}
          />
          <CatchField
            recipe="select"
            title="Icon"
            onChanged={(value) => update(index, {
              icon: (value ?? "") as OrganizerOwnerLinkDraft["icon"],
            })}
            {...selectOptions([...organizerOwnerLinkIconOptions])}
            value={link.icon}
          />
          <CatchField
            recipe="input"
            id={organizerOwnerLinkFieldId(index, "showUntil")}
            errorText={targetIssue(
              organizerOwnerLinkFieldId(index, "showUntil"))}
            title="Show until (optional)"
            keyboardType="datetime"
            onChanged={(value) => update(index, {showUntil: value})}
            value={link.showUntil}
          />
          <AdminToolbar compact>
            <CheckboxField
              checked={link.pinned}
              label="Pin to the top"
              onChange={(pinned) => update(index, {pinned})}
            />
            <AdminButton
              aria-label={`Move link ${index + 1} up`}
              disabled={index === 0}
              icon={<CatchIcon icon="moveUp" size="sm" />}
              onClick={() => move(index, -1)}
            >
              Up
            </AdminButton>
            <AdminButton
              aria-label={`Move link ${index + 1} down`}
              disabled={index === links.length - 1}
              icon={<CatchIcon icon="moveDown" size="sm" />}
              onClick={() => move(index, 1)}
            >
              Down
            </AdminButton>
            <AdminButton
              aria-label={`Remove link ${index + 1}`}
              icon={<CatchIcon icon="delete" size="sm" />}
              onClick={() => onChange(links.filter((_, at) => at !== index))}
            >
              Remove
            </AdminButton>
          </AdminToolbar>
        </AdminFieldGrid>
      ))}
      <AdminToolbar compact>
        <AdminButton
          disabled={links.length >= maxOrganizerOwnerLinks}
          icon={<CatchIcon icon="add" size="sm" />}
          onClick={() => onChange([...links, emptyOrganizerOwnerLinkDraft()])}
        >
          Add link
        </AdminButton>
      </AdminToolbar>
    </AdminEditorSection>
  );
}

export const organizerLinksPanels = {OrganizerLinksEditor};
