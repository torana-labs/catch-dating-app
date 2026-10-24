import {CatchField, CatchText} from "@catch/web-ui";
import {useState} from "react";
import {UserPlus} from "lucide-react";
import {
  AdminButton, AdminForm, AdminToolbar, Panel,
} from "../../../shared/ui/AdminPrimitives";
import type {SalesWorkspaceController} from "../controllers/useSalesWorkspaceController";

type NominationController = Pick<SalesWorkspaceController, "nominateOrganizer" | "isSaving">;

const maxLinks = 10;

/** One link per line: trimmed, deduplicated, blank lines dropped. */
function nominationLinks(text: string): string[] {
  return [...new Set(text.split("\n").map((line) => line.trim()).filter(Boolean))];
}

function nominationProblem(name: string, city: string, urls: string[]): string | null {
  if (!city.trim()) return "Add the city where they run events.";
  if (!name.trim() && !urls.length) return "Add their name, a link, or both.";
  const badLink = urls.find((url) => !/^https?:\/\/\S+$/u.test(url));
  if (badLink) return `Links start with https://. Check "${badLink}".`;
  if (urls.length > maxLinks) return `Add at most ${maxLinks} links.`;
  return null;
}

/**
 * Nominates an organizer Catch does not list yet. Intake builds a draft
 * listing from the name and links; staff review it before it is published.
 */
export function renderSalesNominationWorkspace(controller: NominationController, onClose: () => void) {
  return <SalesNominationWorkspace controller={controller} onClose={onClose} />;
}

function SalesNominationWorkspace({controller, onClose}: {
  controller: NominationController;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [links, setLinks] = useState("");
  const [notes, setNotes] = useState("");
  const urls = nominationLinks(links);
  const problem = nominationProblem(name, city, urls);
  const touched = Boolean(name || city || links || notes);
  const submit = async () => {
    if (problem) return;
    const saved = await controller.nominateOrganizer({
      name: name.trim() || null, market: city.trim(), urls,
      notes: notes.trim() || null, categories: [],
    });
    if (saved) onClose();
  };
  return <Panel title="Nominate an organizer" icon={<UserPlus size={18} />}>
    <CatchText as="p" variant="supporting">For an organizer Catch does not list yet. Catch reads
      their links, drafts a listing and finds their upcoming events. Staff review the draft in
      Organizer Intake; nothing is published before then.</CatchText>
    <AdminForm onSubmit={(event) => {event.preventDefault(); void submit();}}>
      <CatchField recipe="input" title="Organizer name" maxLength={160}
        value={name} onChanged={setName} />
      <CatchField recipe="input" title="City" maxLength={80} value={city}
        onChanged={setCity} required />
      <CatchField recipe="input" title="Links, one per line" maxLines={4}
        helperText="Their website, Instagram, Luma, District or Urbanaut pages."
        value={links} onChanged={setLinks} />
      <CatchField recipe="input" title="What should the reviewer know?"
        maxLines={3} maxLength={2000} value={notes} onChanged={setNotes} />
      {touched && problem ? <CatchText as="p" variant="supporting" role="status">
        {problem}</CatchText> : null}
      <AdminToolbar>
        <AdminButton type="submit" variant="primary"
          disabled={Boolean(problem) || controller.isSaving}>Nominate</AdminButton>
        <AdminButton onClick={onClose}>Cancel</AdminButton>
      </AdminToolbar>
    </AdminForm>
  </Panel>;
}
