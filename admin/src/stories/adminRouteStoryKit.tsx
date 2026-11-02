import {sampleAdminActionExecutionRows, sampleOverview} from "../shared/api/sampleData";

// Fixtures more than one feature's route stories use.

export const overview = sampleOverview;

export const actionExecutionRows = sampleAdminActionExecutionRows;

export const noop = () => {
  // Storybook preview only; route-state mutation is covered by app/controller tests.
};

// Shared preview clock keeps queue ages at their reviewed capture date.
export const installReviewedQueueClock = () => {
  const realNow = Date.now;
  Date.now = () => Date.parse("2026-07-14T12:00:00.000Z");
  return () => {
    Date.now = realNow;
  };
};
