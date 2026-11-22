import {CatchChoiceInput, CatchStack, CatchText} from "@catch/web-ui";
import {useEffect, useId, useRef} from "react";
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
export function WalkthroughSlotGrid({slots, day, slotStartAt, timeZone, onDay, onSlot}: {
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

/**
 * A step heading that takes focus when the step changes after the first
 * render, so keyboard and screen-reader users land on the new step. Give
 * the heading this id and tabIndex -1.
 */
export function useStepFocus(step: string): string {
  const id = `walkthrough-step-${useId().replace(/:/gu, "")}`;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {first.current = false; return;}
    document.getElementById(id)?.focus();
  }, [id, step]);
  return id;
}
