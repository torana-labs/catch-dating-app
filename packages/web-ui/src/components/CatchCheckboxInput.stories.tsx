import type {Meta,StoryObj} from "@storybook/react-vite";
import {type CSSProperties,useState} from "react";
import {expect,userEvent,within} from "storybook/test";
import {CatchCheckboxInput} from "./CatchCheckboxInput";
import {CatchPageBody} from "./CatchPageBody";
import {CatchGap} from "./CatchGap";
const noop=()=>{};
const meta={title:"Web UI/CatchCheckboxInput",component:CatchCheckboxInput,args:{value:false,onChanged:noop,label:"I acknowledge the venue rules"}} satisfies Meta<typeof CatchCheckboxInput>;
export default meta;
type Story=StoryObj<typeof CatchCheckboxInput>;
function States(){return <CatchPageBody constrainToContentWidth><CatchGap size="formField">
  <CatchCheckboxInput value={false} onChanged={noop} label="Unchecked acknowledgement" />
  <CatchCheckboxInput value onChanged={noop} label="Checked acknowledgement" />
  <CatchCheckboxInput value={false} onChanged={null} label="Disabled acknowledgement" />
  <CatchCheckboxInput value onChanged={null} label="Disabled checked acknowledgement" />
  <CatchCheckboxInput value={false} onChanged={noop} label="Confirm attendee details" description="This applies to everyone in the booking." />
  <CatchCheckboxInput value onChanged={noop} label="Agree" semanticLabel="Acknowledge venue rules" />
  <CatchCheckboxInput value={false} onChanged={noop} label="I acknowledge the complete venue and attendee conduct requirements." description="Full details remain readable and are never truncated." />
</CatchGap></CatchPageBody>;}
export const Contract:Story={render:()=> <><States /><div data-catch-theme="dark" style={{background:"var(--catch-theme-bg)"}}><States /></div></>};
export const Unchecked:Story={};
export const Checked:Story={args:{value:true}};
export const Disabled:Story={args:{onChanged:null}};
export const DisabledChecked:Story={args:{value:true,onChanged:null}};
export const Description:Story={args:{description:"This applies to everyone in the booking."}};
export const SemanticLabelled:Story={args:{label:"Agree",semanticLabel:"Acknowledge venue rules"}};
export const LargeText:Story={render:()=> <div style={{"--catch-typography-web-secondary-size":"28px","--catch-typography-web-secondary-line-height":"40px","--catch-typography-web-context-size":"24px","--catch-typography-web-context-line-height":"36px"} as CSSProperties}><States /></div>};
function InteractiveCheckbox(){const [value,setValue]=useState(false);return <CatchCheckboxInput value={value} onChanged={setValue} label="I acknowledge the venue rules" />;}
export const Interactive:Story={render:()=> <InteractiveCheckbox />,play:async({canvasElement})=>{
  const canvas=within(canvasElement),input=canvas.getByRole("checkbox",{name:"I acknowledge the venue rules"});
  await expect(input).not.toBeChecked();await userEvent.click(canvas.getByText("I acknowledge the venue rules"));await expect(input).toBeChecked();
  input.focus();await userEvent.keyboard(" ");await expect(input).not.toBeChecked();
}};
