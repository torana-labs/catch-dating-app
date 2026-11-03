import {CatchButton, CatchField, CatchGap, CatchSheet, CatchLegacyText} from "@catch/web-ui";
import {useState} from "react";
import {selectChoices} from "../controllers/salesLabels";
import {useSalesAddHostController} from "../controllers/useSalesAddHostController";

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
 * Adds an organizer Catch already lists to Sales, or nominates one it doesn't. Adding creates a private record and
 * publishes nothing. A nomination builds a draft listing that staff review in the Inbox. A sales associate can only nominate.
 */
export function SalesAddHostWorkspace({canAddExisting, onAdded, onClose, onError, onNotice}: {
  canAddExisting: boolean;
  onAdded: (organizerId: string) => void;
  onClose: () => void;
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
}) {
  const c = useSalesAddHostController({canAddExisting, onError, onNotice});
  const [mode, setMode] = useState<"add" | "nominate">(canAddExisting ? "add" : "nominate");
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [links, setLinks] = useState("");
  const [notes, setNotes] = useState("");
  const urls = nominationLinks(links);
  const problem = nominationProblem(name, city, urls);
  const touched = Boolean(name || city || links || notes);
  const nominate = async () => {
    if (problem) return;
    if (await c.nominate({name: name.trim() || null, market: city.trim(), urls, notes: notes.trim() || null, categories: []})) onClose();
  };
  const add = async () => {
    if (selectedId && await c.addExisting(selectedId)) onAdded(selectedId);
  };
  return (
    <CatchSheet recipe="standard" pinFooter open onClose={onClose} title={mode === "add" ? "Add a host" : "Nominate an organizer"} subtitle="Hosts"
      footer={mode === "add" ? <CatchButton label={c.isSaving ? "Adding" : "Add to Sales"} onPressed={selectedId && !c.isSaving ? () => void add() : null} /> :
        <CatchButton label={c.isSaving ? "Nominating" : "Nominate"} onPressed={!problem && !c.isSaving ? () => void nominate() : null} />}>
      <CatchGap size="related">
        {canAddExisting ? <CatchField recipe="select" title="What are you doing?" value={mode} onChanged={(value) => setMode(value === "nominate" ? "nominate" : "add")}
          {...selectChoices([{value: "add", label: "Adding an organizer Catch lists"}, {value: "nominate", label: "Nominating one it doesn't"}])} /> : null}
        {mode === "add" ? <>
          <CatchLegacyText as="p" variant="supporting">Adding it to Sales creates a private record. It doesn't publish a listing or approve a claim.</CatchLegacyText>
          <CatchField recipe="input" title="Search organizers" value={c.search} inputHint="Organizer name"
            onChanged={(value) => { c.setSearch(value); setSelectedId(""); }} />
          {c.isSearching ? <CatchLegacyText as="p" variant="supporting">Searching organizers…</CatchLegacyText> : null}
          {c.searchFailed ? <CatchLegacyText as="p" variant="supporting" role="alert">Organizer search failed. Try again.</CatchLegacyText> : null}
          {c.matches.length ? <CatchField recipe="select" title="Organizer" value={selectedId} onChanged={(value) => setSelectedId(value ?? "")}
            {...selectChoices([{value: "", label: "Choose a match"}, ...c.matches.map((item) => ({value: item.organizerId,
              label: `${item.name} · ${item.cityName || "Location unknown"} · ${(item.publishStatus ?? "unknown").replaceAll("_", " ")}`}))])} /> : null}
        </> : <>
          <CatchLegacyText as="p" variant="supporting">For an organizer Catch doesn't list yet. Catch reads their links, drafts a listing and finds their
            upcoming events. Staff review the draft in the Inbox, and nothing is published before then.</CatchLegacyText>
          <CatchField recipe="input" title="Organizer name" maxLength={160} value={name} onChanged={setName} />
          <CatchField recipe="input" title="City" maxLength={80} value={city} onChanged={setCity} required />
          <CatchField recipe="input" title="Links, one per line" maxLines={4} value={links} onChanged={setLinks}
            helperText="Their website, Instagram, Luma, District or Urbanaut pages." />
          <CatchField recipe="input" title="What should the reviewer know?" maxLines={3} maxLength={2000} value={notes} onChanged={setNotes} />
          {touched && problem ? <CatchLegacyText as="p" variant="supporting" role="status">{problem}</CatchLegacyText> : null}
        </>}
      </CatchGap>
    </CatchSheet>
  );
}
