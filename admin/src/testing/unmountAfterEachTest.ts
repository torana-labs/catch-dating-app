import {cleanup} from "@testing-library/react";
import {afterEach} from "vitest";

/*
 * Testing Library unmounts what a test rendered only when the runner provides
 * a global afterEach, and this project runs Vitest without globals. Without
 * this hook every rendered screen and hook stays mounted after its test, so
 * its timers, query subscriptions and state updates keep running. One that
 * lands after the file's jsdom is torn down fails the whole run with
 * "window is not defined", blamed on whichever file left it behind.
 */
afterEach(() => {
  cleanup();
});
