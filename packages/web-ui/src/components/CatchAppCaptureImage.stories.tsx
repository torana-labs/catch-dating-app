import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchAppCaptureImage} from "./CatchAppCaptureImage";
import {CatchSurface} from "./CatchSurface";

// A drawn stand-in for a phone screen (the 402 x 874 screen at 2x, no frame), so the story renders in every Storybook
// without the website's rendered captures. The frame comes from CatchDeviceFrame.
const phone = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="804" height="1748" viewBox="0 0 804 1748">'
  + '<rect width="804" height="1748" fill="#f4f4f1"/>'
  + '<rect width="804" height="560" fill="#141414"/>'
  + '<rect x="56" y="260" width="420" height="56" rx="12" fill="#f4f4f1"/>'
  + '<rect x="56" y="640" width="692" height="300" rx="28" fill="#ffffff"/>'
  + '<rect x="56" y="1000" width="420" height="32" rx="8" fill="#8a8a85"/>'
  + "</svg>",
)}`;

const meta = {
  title: "Web UI/App capture image",
  component: CatchAppCaptureImage,
  args: {src: phone, alt: "Live operations screen for a trivia night", width: 804, height: 1748, device: "phone"},
  decorators: [Story => <div style={{maxWidth: 280}}><Story /></div>],
} satisfies Meta<typeof CatchAppCaptureImage>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
export const WithCaption: Story = {
  parameters: {catchComponent: {id: "shared_app_capture_image", routeIds: ["home", "host"], states: ["caption"]}},
  args: {caption: "Confirm guest arrivals and follow the host-led run of show."},
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

/** Without a device the screen draws bare, as a card's cover does. */
export const Bare: Story = {
  args: {device: undefined},
};
