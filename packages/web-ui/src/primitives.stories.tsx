import type {Meta, StoryObj} from "@storybook/react-vite";
import {
  CheckboxControl,
  DataTableControl,
  EmptyStateControl,
  ToggleButtonControl,
  ToggleGroupControl,
  UiLabel,
} from "./primitives";
import {ButtonControl} from "./components/ButtonControl";

const meta = {
  title: "Web UI/Primitives",
  component: UiLabel,
} satisfies Meta<typeof UiLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Label: Story = {
  args: {children: "Shared label"},
  render: () => (
    <div style={{display: "grid", gap: 12}}>
      <UiLabel>Span label</UiLabel>
      <UiLabel as="div">Div label</UiLabel>
      <UiLabel className="surface-label">Surface class label</UiLabel>
    </div>
  ),
};

export const Checkbox = {
  render: () => (
    <div style={{display: "grid", gap: 12}}>
      <label><CheckboxControl /> Unchecked</label>
      <label><CheckboxControl defaultChecked /> Checked</label>
      <label><CheckboxControl disabled /> Disabled</label>
    </div>
  ),
};

export const Button = {
  render: () => (
    <div style={{display: "flex", flexWrap: "wrap", gap: 8}}>
      <ButtonControl>Default</ButtonControl>
      <ButtonControl disabled>Disabled</ButtonControl>
      <ButtonControl loading>Loading</ButtonControl>
      <ButtonControl type="submit">Explicit submit</ButtonControl>
    </div>
  ),
};

export const DataTable = {
  render: () => (
    <DataTableControl ariaLabel="Shared table preview" style={{overflowX: "auto"}}>
      <thead><tr><th>Organizer</th><th>Status</th></tr></thead>
      <tbody><tr><td>Catch Club</td><td>Ready</td></tr></tbody>
    </DataTableControl>
  ),
};

export const Feedback = {
  render: () => (
    <div style={{display: "grid", gap: 12}}>
      <EmptyStateControl>No results yet.</EmptyStateControl>
      <EmptyStateControl announce="polite" contentElement="span">
        Updated results are empty.
      </EmptyStateControl>
    </div>
  ),
};

export const Toggle = {
  render: () => (
    <ToggleGroupControl aria-label="Shared toggle states" style={{display: "flex", gap: 8}}>
      <ToggleButtonControl selected={false}>Available</ToggleButtonControl>
      <ToggleButtonControl selected>Selected</ToggleButtonControl>
      <ToggleButtonControl disabled selected={false}>Disabled</ToggleButtonControl>
    </ToggleGroupControl>
  ),
};
