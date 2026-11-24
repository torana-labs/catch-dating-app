import {CatchChoiceInput, CatchStack, CatchText} from "@catch/web-ui";
import {useEffect, useId, useRef, type ReactNode} from "react";
import {interpolateContent as fill} from "@content/interpolate";
import {walkthroughBookingCopy as copy} from "@content/walkthroughBooking";
import {walkthroughIndiaTime, walkthroughLocalTime, type WalkthroughSlots} from "./walkthroughModel";

/** The choice groups are never optional here, so their optional wording is never shown. */
const requiredLabelCopy = {optionalLabel: "", optionalSuffix: "", optionalSemantics: (label: string) => label};

/**
 * The open slots, grouped by day: a radio group of days, then a radio group
 * of that day's times in India time. Arrow keys move through each group and
 * Tab moves between them. Under the times, the chosen time on the visitor's
 * own clock when that is not India time, or the slot length.
 */
function WalkthroughSlotGrid({slots, day, slotStartAt, timeZone, onDay, onSlot}: {
  slots: WalkthroughSlots;
  day: string | null;
  slotStartAt: string | null;
  timeZone: string | null;
  onDay: (date: string) => void;
  onSlot: (startAt: string) => void;
}) {
  const current = slots.days.find((entry) => entry.date === day) ?? slots.days[0];
  if (!current) return null;
  const chosen = slotStartAt && current.slots.some((slot) => slot.startAt === slotStartAt) ? slotStartAt : null;
  const local = chosen ? walkthroughLocalTime(chosen, timeZone) : null;
  const line = local && timeZone ? fill(copy.localTime, {local, zone: timeZone}) :
    slots.slotMinutes ? fill(copy.length, {minutes: String(slots.slotMinutes)}) : "";
  return (
    <CatchStack gap={16}>
      <CatchChoiceInput<string>
        copy={requiredLabelCopy}
        itemLabelBuilder={(date) => slots.days.find((entry) => entry.date === date)?.label ?? date}
        label={copy.day}
        mode="single"
        onChanged={(next) => {const [first] = next; if (first) onDay(first);}}
        recipe="form"
        selected={new Set([current.date])}
        values={slots.days.map((entry) => entry.date)}
      />
      <CatchStack gap={8}>
        <CatchChoiceInput<string>
          copy={requiredLabelCopy}
          itemLabelBuilder={walkthroughIndiaTime}
          label={copy.time}
          mode="single"
          onChanged={(next) => {const [first] = next; if (first) onSlot(first);}}
          recipe="form"
          selected={new Set(chosen ? [chosen] : [])}
          values={current.slots.map((slot) => slot.startAt)}
        />
        <CatchText aria-live="polite" as="p" role="status" tone="secondary" variant="body-small">{line}</CatchText>
      </CatchStack>
    </CatchStack>
  );
}

/** The slot grid as a node, for the booking and the manage page's move step. */
export function walkthroughSlotGridNode(props: Parameters<typeof WalkthroughSlotGrid>[0]): ReactNode {
  return <WalkthroughSlotGrid {...props} />;
}

/**
 * A step heading that takes focus when the shown step changes, so keyboard
 * and screen-reader users land on the new step. `step` is null while nothing
 * is shown yet (loading), and the first step shown keeps focus where the
 * visitor has it: slots arriving is not a step change, and focusing then
 * would scroll the page and pull focus from wherever the visitor is,
 * including a chip they are already using. A step left for loading and
 * shown again unchanged keeps focus too. Give the heading this id and
 * tabIndex -1.
 */
export function useStepFocus(step: string | null): string {
  const id = `walkthrough-step-${useId().replace(/:/gu, "")}`;
  const shown = useRef<string | null>(null);
  useEffect(() => {
    if (step === null) return;
    const previous = shown.current;
    shown.current = step;
    if (previous !== null && previous !== step) document.getElementById(id)?.focus();
  }, [id, step]);
  return id;
}
