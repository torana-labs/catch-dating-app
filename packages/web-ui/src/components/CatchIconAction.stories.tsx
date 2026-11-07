import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {CatchIconAction, catchIconActionSizes, catchIconActionVariants} from "./CatchIconAction";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";

const meta = {title: "Web UI/CatchIconAction", component: CatchIconAction, args: {icon: "share", label: "Share"}} satisfies Meta<typeof CatchIconAction>;

export default meta;
type Story = StoryObj<typeof meta>;
const noop = () => undefined;

function State({label, children}: {label: string; children: ReactNode}) {
  return (
    <CatchStack gap={8}>
      <CatchText tone="secondary" variant="label-kicker">{label}</CatchText>
      <CatchStack align="center" direction="row" gap={12} wrap>{children}</CatchStack>
    </CatchStack>
  );
}

/** catch.icon_button on the web: each variant and size, square, a badge, pressed, and its look on a tile. */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchSurface block="plain" padding="lg">
        <CatchStack gap={20}>
          {catchIconActionVariants.map((variant) => (
            <State key={variant} label={variant}>
              {variant === "overlay"
                ? <CatchSurface block="spotlight" color="dinner" padding="md"><CatchIconAction icon="bookmark" label="Save" onPressed={noop} variant="overlay" /></CatchSurface>
                : <CatchIconAction icon="share" label="Share" onPressed={noop} variant={variant} />}
            </State>
          ))}
          <State label="sizes">{catchIconActionSizes.map((size) => <CatchIconAction icon="back" key={size} label={`Back (${size})`} onPressed={noop} size={size} />)}</State>
          <State label="square"><CatchIconAction icon="more" label="More" onPressed={noop} shape="square" /></State>
          <State label="badge"><CatchIconAction badge={3} icon="notifications" label="Notifications" onPressed={noop} /></State>
          <State label="pressed"><CatchIconAction icon="bookmark" label="Saved" onPressed={noop} pressed /></State>
          <State label="on-tile"><CatchSurface padding="md"><CatchIconAction icon="share" label="Share" onPressed={noop} /></CatchSurface></State>
        </CatchStack>
      </CatchSurface>
    </CatchRoot>
  ),
};
