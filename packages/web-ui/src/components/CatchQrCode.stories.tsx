import type {Meta, StoryObj} from "@storybook/react-vite";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGap} from "./CatchGap";
import {CatchQrCode} from "./CatchQrCode";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchQrCode",
  component: CatchQrCode,
  args: {label: "QR code for carterroadrunners.club", value: "https://carterroadrunners.club"},
} satisfies Meta<typeof CatchQrCode>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["home", "organizer_listing_canonical"];

const caption = (text: string) => <CatchText as="span" color="ink2" variant="bodyS">{text}</CatchText>;

/** The three sizes, and a long and a non-Latin value, which grow the code's version. */
export const Sizes: Story = {
  parameters: {catchComponent: {id: "shared_qr_code", routeIds: storyRoutes, states: ["small", "medium", "large", "long-value", "utf-8"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="QR codes" ground="paper" pb="compact" pt="compact">
        <CatchGap crossAxisAlignment="end" direction="horizontal" size="section" wrap>
          {(["s", "m", "l"] as const).map((size) => (
            <CatchGap key={size} size="inline">
              <CatchQrCode label={`QR code for carterroadrunners.club, size ${size}`} size={size} value="https://carterroadrunners.club" />
              {caption(`Size ${size}`)}
            </CatchGap>
          ))}
          <CatchGap size="inline">
            <CatchQrCode label="QR code for a long event link" value="https://catchdates.com/events/carter-road-runners/half-marathon-training-15k-sunday-23-november?utm_source=poster" />
            {caption("Long link")}
          </CatchGap>
          <CatchGap size="inline">
            <CatchQrCode label="QR code for a Hindi link" value="https://catchdates.com/मुंबई/रन-क्लब" />
            {caption("UTF-8 link")}
          </CatchGap>
        </CatchGap>
      </CatchBand>
    </StoryPage>
  ),
};

/** On the ink ground the code keeps ink on white, so cameras still read it. */
export const OnInk: Story = {
  parameters: {catchComponent: {id: "shared_qr_code", routeIds: storyRoutes, states: ["on-ink"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="On ink" ground="ink" pb="compact" pt="compact">
        <CatchQrCode label="QR code for the Catch app" size="l" value="https://catchdates.com/app" />
      </CatchBand>
    </StoryPage>
  ),
};

/** The homepage's "Scan to get the app" card. */
export const Reference: Story = {
  parameters: {catchComponent: {id: "shared_qr_code", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "home/mumbai_live/1280", height: 236, width: 208, x: 956, y: 5534}}
      label="QR code"
      render={() => (
        <CatchGap crossAxisAlignment="center" size="inline">
          <CatchQrCode label="QR code for the Catch app" size="l" value="https://catchdates.com/app" />
          <CatchText as="span" variant="supportingStrong">Scan to get the app</CatchText>
        </CatchGap>
      )}
    />
  ),
};
