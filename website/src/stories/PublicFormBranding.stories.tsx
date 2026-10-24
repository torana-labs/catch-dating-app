import type {Meta, StoryObj} from "@storybook/react-vite";
import {publicFormsCopy} from "../content/forms";
import {PublicFormFrame, PublicFormPanel, PublicFormPrivacy} from "../shared/ui/primitives/publicForms";
import {demoOrganizerName} from "./fixtures/demoWorld";

const meta = {
  title: "Marketing Website/Forms/Organizer branding",
  component: PublicFormFrame,
  parameters: {
    catchComponent: {
      id: "shared_public_form_shells", routeIds: ["public_form"], states: ["frame"],
    },
  },
} satisfies Meta<typeof PublicFormFrame>;
export default meta;
type Story = StoryObj<typeof meta>;

const [logoWord, ...logoRest] = demoOrganizerName.toUpperCase().split(" ");
const logo = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="64" viewBox="0 0 300 64"><rect width="64" height="64" rx="8" fill="#174b38"/><text x="32" y="42" text-anchor="middle" fill="white" font-family="Arial" font-size="30">${logoWord[0]}</text><text x="80" y="30" fill="#174b38" font-family="Arial" font-size="21" font-weight="700">${logoWord}</text><text x="80" y="51" fill="#174b38" font-family="Arial" font-size="15">${logoRest.join(" ")}</text></svg>`)}`;

const children = (
  <>
    <PublicFormPanel
      kicker={publicFormsCopy.completionKicker}
      title="Application received"
      body="The host can now review your application. Admission and payment are separate next steps."
    >
      <span />
    </PublicFormPanel>
    <PublicFormPrivacy
      brandLabel={publicFormsCopy.brand}
      brandWord={publicFormsCopy.brandWord}
      poweredByLabel={publicFormsCopy.poweredBy}
    >
      {publicFormsCopy.privacyNote}
    </PublicFormPrivacy>
  </>
);

export const NameFallback: Story = {
  args: {organizerName: demoOrganizerName, embed: false, appearance: "editorial", children},
};
export const OrganizerLogo: Story = {
  name: "Uploaded logo (illustrative fixture)",
  args: {...NameFallback.args, logoUrl: logo},
};
export const BrokenLogo: Story = {
  args: {...NameFallback.args, logoUrl: "data:image/png;base64,broken"},
};
export const Embedded: Story = {
  args: {...OrganizerLogo.args, embed: true},
};
export const LongOrganizerName: Story = {
  args: {...NameFallback.args, organizerName: `${demoOrganizerName} — Trivia Nights, Hosted Socials and Community Events`},
};
