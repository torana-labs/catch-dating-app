import {
  CatchButton,
  CatchCheckboxInput,
  CatchField,
  CatchGap,
  CatchLegacyText,
  CatchTable,
  CatchWorkspaceHeader,
  useCatchViewport,
  type CatchTableColumn,
} from "@catch/web-ui";
import {useState} from "react";
import type {
  DiscoveryAudience,
  DiscoverySettingsUpdate,
  DiscoverySurface,
} from "../api/discoverySettingsRepository";
import {
  HOME_ORGANIZERS_MINIMUM_RANGE,
  sameDiscoveryRules,
  validHomeOrganizersMinimum,
  type DiscoverySettingsController,
} from "../controllers/useDiscoverySettingsController";

/** The form while it is edited: the band minimum stays as typed. */
type DiscoveryForm = Omit<DiscoverySettingsUpdate, "homeOrganizersMinimum"> &
  {homeOrganizersMinimum: string};

const SURFACES: ReadonlyArray<{key: DiscoverySurface; title: string;
  subtitle: string}> = [
  {key: "homeOrganizers", title: "Homepage organisers band",
    subtitle: "The people behind the plans"},
  {key: "cityOrganizers", title: "City pages and Explore's organisers tab",
    subtitle: "The organisers listed for each city"},
  {key: "plans", title: "Their plans in “This week” and Explore",
    subtitle: "Plans you can't book on Catch link out to the organiser"},
  {key: "totals", title: "City and format totals",
    subtitle: "Counts like 8 organisers in Indore, and when a format page " +
      "is indexed"},
];

const AUDIENCES: ReadonlyArray<{key: DiscoveryAudience; label: string}> = [
  {key: "onCatch", label: "On Catch"},
  {key: "notOnCatch", label: "Not on Catch yet"},
];

const changedAt = new Intl.DateTimeFormat("en-IN", {day: "numeric",
  month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  timeZone: "Asia/Kolkata"});

function toForm(rules: DiscoverySettingsUpdate): DiscoveryForm {
  return {
    surfaces: {
      homeOrganizers: {...rules.surfaces.homeOrganizers},
      cityOrganizers: {...rules.surfaces.cityOrganizers},
      plans: {...rules.surfaces.plans},
      totals: {...rules.surfaces.totals},
    },
    homeOrganizersMinimum: String(rules.homeOrganizersMinimum),
    homeClaimAction: rules.homeClaimAction,
  };
}

function toUpdate(form: DiscoveryForm): DiscoverySettingsUpdate {
  const text = form.homeOrganizersMinimum.trim();
  return {...form,
    homeOrganizersMinimum: /^\d+$/u.test(text) ? Number(text) : Number.NaN};
}

function Section({title, children}: {title: string;
  children: React.ReactNode}) {
  return (
    <CatchGap size="related">
      <CatchLegacyText as="h2" variant="sectionTitle">{title}</CatchLegacyText>
      {children}
    </CatchGap>
  );
}

function Supporting({children}: {children: React.ReactNode}) {
  return (
    <CatchLegacyText as="p" color="ink2" variant="bodyS">{children}
    </CatchLegacyText>
  );
}

type SurfaceRow = (typeof SURFACES)[number] & {
  rule: {title: string; subtitle: string};
  onCatch: boolean;
  notOnCatch: boolean;
};

/**
 * Settings → Discovery: where organisers appear on the website, split by
 * whether they run their page on Catch, the homepage organisers band and
 * the claim-your-page button. Only the owner edits; everyone else reads.
 * Rules nobody can switch (organiser pages, organiser search, search
 * engines and the app) are stated, not drawn as switches.
 */
export function DiscoverySettingsWorkspace({
  currentUserUid,
  settings,
}: {
  currentUserUid: string | null;
  settings: DiscoverySettingsController;
}) {
  const {sizeClass} = useCatchViewport();
  const snapshot = settings.snapshot;
  const [draft, setDraft] = useState<DiscoveryForm | null>(null);
  if (!snapshot) {
    return (
      <>
        <CatchWorkspaceHeader kicker="Settings" title="Discovery" />
        <CatchLegacyText as="p" color="ink2" variant="bodyM">
          {settings.loadState === "error" ?
            "Discovery settings didn't load." : "Loading discovery settings"}
        </CatchLegacyText>
      </>
    );
  }
  const stored = snapshot.settings;
  const current = draft ?? toForm(stored);
  const update = toUpdate(current);
  const minimumValid = validHomeOrganizersMinimum(update.homeOrganizersMinimum);
  const dirty = draft !== null &&
    (!minimumValid || !sameDiscoveryRules(update, stored));
  const atDefaults = minimumValid &&
    sameDiscoveryRules(update, snapshot.defaults);
  const edit = settings.canEdit && !settings.isSaving ?
    (patch: Partial<DiscoveryForm>) => setDraft({...current, ...patch}) :
    null;
  const setSurface = (surface: DiscoverySurface,
    audience: DiscoveryAudience) => edit && ((value: boolean) => edit({
    surfaces: {...current.surfaces,
      [surface]: {...current.surfaces[surface], [audience]: value}},
  }));
  const rows: SurfaceRow[] = SURFACES.map((surface) => ({
    ...surface,
    rule: {title: surface.title, subtitle: surface.subtitle},
    ...current.surfaces[surface.key],
  }));
  const columns: CatchTableColumn<SurfaceRow>[] = [
    {key: "rule", label: "Where", kind: "title"},
    ...AUDIENCES.map(({key, label}): CatchTableColumn<SurfaceRow> => ({
      key, label, width: "160px",
      render: (row) => (
        <CatchCheckboxInput
          label={row[key] ? "Shown" : "Hidden"}
          onChanged={setSurface(row.key, key)}
          semanticLabel={`${row.title}: ${label.toLowerCase()}`}
          value={row[key]}
        />
      ),
    })),
  ];
  const actor = stored.updatedByUid === null ? null :
    stored.updatedByUid === currentUserUid ? "you" : "an owner";
  const lastChanged = stored.updatedAtMillis === null ?
    "Defaults, never changed." :
    `Last changed ${changedAt.format(stored.updatedAtMillis)}` +
      `${actor ? ` by ${actor}` : ""}.`;
  return (
    <>
      <CatchWorkspaceHeader
        actions={settings.canEdit ? (
          <>
            <CatchButton
              label="Reset to defaults"
              onPressed={edit && !atDefaults ?
                () => setDraft(toForm(snapshot.defaults)) : null}
              size="sm"
              variant="secondary"
            />
            <CatchButton
              label={settings.isSaving ? "Saving" : "Save"}
              onPressed={dirty && minimumValid && !settings.isSaving ?
                async () => {
                  if (await settings.save(update)) setDraft(null);
                } : null}
              size="sm"
            />
          </>
        ) : undefined}
        kicker="Settings"
        note={settings.canEdit ? dirty ? "Unsaved changes" : undefined :
          "Only the owner changes these"}
        title="Discovery"
      />
      <CatchGap size="section">
        <CatchLegacyText as="p" variant="bodyM">
          Where organisers appear, by whether they run their page on Catch. A
          single organiser&apos;s page can still be hidden on its own page; it
          can never show somewhere these rules hide it.
        </CatchLegacyText>
        <Section title="Where organisers appear">
          {sizeClass === "compact" ? rows.map((row) => (
            <CatchGap key={row.key} size="inline">
              <CatchLegacyText as="h3" variant="bodyM">{row.title}
              </CatchLegacyText>
              <Supporting>{row.subtitle}</Supporting>
              {AUDIENCES.map(({key, label}) => (
                <CatchCheckboxInput
                  key={key}
                  label={label}
                  onChanged={setSurface(row.key, key)}
                  semanticLabel={`${row.title}: ${label.toLowerCase()}`}
                  value={row[key]}
                />
              ))}
            </CatchGap>
          )) : (
            <CatchTable columns={columns} label="Where organisers appear"
              rowKey="key" rows={rows} />
          )}
          <Supporting>
            On Catch means the organiser has claimed or verified their page.
            Not on Catch yet means their page is unclaimed or a claim is
            pending.
          </Supporting>
          <Supporting>
            Their organiser page and organiser search always include
            organisers not on Catch yet, so they can claim their page.
          </Supporting>
          <Supporting>
            Search engines and the Catch app are set on each organiser&apos;s
            page.
          </Supporting>
        </Section>
        <Section title="Homepage">
          <CatchField
            errorText={minimumValid ? null :
              `Choose a number from ${HOME_ORGANIZERS_MINIMUM_RANGE.min} ` +
              `to ${HOME_ORGANIZERS_MINIMUM_RANGE.max}`}
            helperText="Fewer than this and the band is left out"
            inputMode={edit ? "editable" : "readOnly"}
            keyboardType="number"
            max={HOME_ORGANIZERS_MINIMUM_RANGE.max}
            min={HOME_ORGANIZERS_MINIMUM_RANGE.min}
            onChanged={edit ? (value) =>
              edit({homeOrganizersMinimum: value}) : undefined}
            recipe="input"
            suffixText="organisers"
            title="Show the organisers band once a city has at least"
            value={current.homeOrganizersMinimum}
          />
          <CatchCheckboxInput
            label={"“Claim your page” button on the guest homepage"}
            onChanged={edit && ((value) => edit({homeClaimAction: value}))}
            value={current.homeClaimAction}
          />
        </Section>
        <CatchGap size="inline">
          {settings.canEdit ? null : (
            <Supporting>Only the owner can change discovery settings.
            </Supporting>
          )}
          <Supporting>Changes reach the website within a few minutes.
          </Supporting>
          <Supporting>{lastChanged}</Supporting>
        </CatchGap>
      </CatchGap>
    </>
  );
}
