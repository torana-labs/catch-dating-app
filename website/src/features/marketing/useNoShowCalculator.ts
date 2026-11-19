import {useState} from "react";
import {clampRate, noShowFigures, type NoShowInputs} from "./noShowCalculatorModel";

/**
 * The numbers the calculator opens with. They are a starting point to
 * overwrite, not a typical or measured rate: the page says so next to them,
 * and every figure follows what the host types.
 */
export const noShowStartingInputs: NoShowInputs = {places: "40", events: "4", price: "500", costPerHead: "", rate: 20, target: 10};

/** A slider's value: a range slider reports its upper thumb. */
function sliderValue(value: number | readonly number[]): number {
  return Number(Array.isArray(value) ? value[value.length - 1] : value);
}

/**
 * The no-show calculator's state: the host's own inputs as they type them,
 * and every figure worked out from them (./noShowCalculatorModel). The
 * what-if rate never sits above today's rate; lowering today's rate pulls it
 * down with it.
 */
export function useNoShowCalculator(initial: NoShowInputs = noShowStartingInputs) {
  const [inputs, setInputs] = useState<NoShowInputs>(initial);
  const set = (patch: Partial<NoShowInputs>) => setInputs((current) => ({...current, ...patch}));
  return {
    inputs,
    figures: noShowFigures(inputs),
    setPlaces: (places: string) => set({places}),
    setEvents: (events: string) => set({events}),
    setPrice: (price: string) => set({price}),
    setCostPerHead: (costPerHead: string) => set({costPerHead}),
    setRate: (value: number | readonly number[]) => {
      const rate = clampRate(sliderValue(value));
      setInputs((current) => ({...current, rate, target: Math.min(current.target, rate)}));
    },
    setTarget: (value: number | readonly number[]) => {
      const target = clampRate(sliderValue(value));
      setInputs((current) => ({...current, target: Math.min(target, current.rate)}));
    },
  };
}
