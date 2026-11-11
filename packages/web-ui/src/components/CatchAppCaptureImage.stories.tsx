import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchAppCaptureImage} from "./CatchAppCaptureImage";
import {CatchSurface} from "./CatchSurface";

// A drawn stand-in (a generic phone: no notch or island), so the story renders in every Storybook without the
// website's rendered captures.
const phone = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="510" height="982" viewBox="0 0 510 982">'
  + '<rect x="24" y="24" width="462" height="934" rx="72" fill="#141414"/>'
  + '<rect x="46" y="46" width="418" height="890" rx="54" fill="#f4f4f1"/>'
  + '<rect x="78" y="150" width="240" height="28" rx="6" fill="#141414"/>'
  + '<rect x="78" y="196" width="170" height="16" rx="4" fill="#8a8a85"/>'
  + '<rect x="46" y="250" width="418" height="320" fill="#141414"/>'
  + "</svg>",
)}`;

const meta = {
  title: "Web UI/App capture image",
  component: CatchAppCaptureImage,
  args: {src: phone, alt: "Live operations screen for a fictional trivia night", width: 510, height: 982},
  decorators: [Story => <div style={{maxWidth: 280}}><Story /></div>],
} satisfies Meta<typeof CatchAppCaptureImage>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
export const WithCaption: Story = {
  parameters: {catchComponent: {id: "shared_app_capture_image", routeIds: ["home", "host"], states: ["caption"]}},
  args: {caption: "Confirm guest arrivals and follow the host-led run of show.", disclosure: "Fictional app preview."},
};

export const ImageOnly: Story = {
  parameters: {catchComponent: {id: "shared_app_capture_image", routeIds: ["home", "host"], states: ["image-only"]}},
};

/** Turned and sized as the boards set devices, on a run band; the bleeding one runs off the band's bottom edge. */
export const TiltedAndBleeding: Story = {
  decorators: [Story => <Story />],
  render: (args) => (
    <CatchSurface aria-label="Run band" block="band" color="run">
      <div style={{display: "flex", gap: 48, justifyContent: "center"}}>
        <CatchAppCaptureImage {...args} size="sm" tilt="left" />
        <CatchAppCaptureImage {...args} bleed size="md" tilt="right" />
      </div>
    </CatchSurface>
  ),
};
