import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {CatchField} from "./CatchField";
import {CatchGap} from "./CatchGap";
import {CatchPageBody} from "./CatchPageBody";

const meta = {
  title: "Web UI/CatchField",
  component: CatchField,
  args: {recipe: "input", title: "Name"},
} satisfies Meta<typeof CatchField>;

export default meta;
type Story = StoryObj<typeof meta>;

const cities = ["Delhi", "Mumbai", "Bengaluru"];

function PinGlyph() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function Fields() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("Sunday runs along the Yamuna.");
  const [city, setCity] = useState<string | null>("Mumbai");
  return (
    <CatchGap size="formField">
      <CatchField recipe="input" title="Name" inputHint="Your full name" value={name}
        onChanged={setName} />
      <CatchField recipe="input" title="Club" value="Fort Greene Run Club" />
      <CatchField recipe="input" title="Invite code" helperText="Invite code is available."
        helperTone="success" value="RUNCLUB" />
      <CatchField recipe="input" title="Email" errorText="Enter a valid email address"
        keyboardType="emailAddress" value="team@catch" />
      <CatchField recipe="input" title="Handle" inputMode="readOnly" value="@catch-hosts" />
      <CatchField recipe="input" title="Disabled email" inputMode="inactive"
        value="team@catch.events" />
      <CatchField recipe="input" title="Description" maxLines={4} maxLength={300} value={bio}
        onChanged={setBio} />
      <CatchField recipe="select" title="City" values={cities} itemLabelBuilder={(item) => item}
        value={city} onChanged={setCity} />
      <CatchField recipe="select" title="Neighbourhood" hintText="Choose a neighbourhood"
        values={cities} itemLabelBuilder={(item) => item} value={null} />
      <CatchField recipe="select" title="Home city" leading={<PinGlyph />} values={cities}
        itemLabelBuilder={(item) => item} value="Delhi" />
      <CatchField recipe="input" title="Search" labelMode="hidden" inputHint="Search hosts"
        value="" />
      <CatchField recipe="input" title="Your mobile number" prefixText="+91" keyboardType="phone"
        autoComplete="tel-national" inputHint="98765 43210" helperText="Your pass and updates come by text." />
      <CatchField recipe="input" title="Longest run" suffixText="km" keyboardType="decimal" value="21.1" />
    </CatchGap>
  );
}

/** catch.field on the web: input, multiline input and select recipes. */
export const Contract: Story = {
  render: () => (
    <>
      <CatchPageBody constrainToContentWidth>
        <Fields />
      </CatchPageBody>
      <div data-catch-theme="dark" style={{background: "var(--catch-theme-bg)"}}>
        <CatchPageBody constrainToContentWidth>
          <Fields />
        </CatchPageBody>
      </div>
    </>
  ),
};
