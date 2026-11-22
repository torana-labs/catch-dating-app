import {HttpsError} from "firebase-functions/v2/https";

/** Players on one doubles court: two partnerships of two. */
export const DOUBLES_SEATS_PER_COURT = 4;

/** What the bench is told to do while sitting out a doubles round. */
export const DOUBLES_BENCH_NOTE = "commonArea" as const;

interface DoublesPlannedUnit<T extends {uid: string}> {
  unitIndex: number;
  members: T[];
  subunits?: T[][];
}

interface DoublesPlannedRound<T extends {uid: string}> {
  roundIndex: number;
  units: DoublesPlannedUnit<T>[];
}

/** One partnership on a court, facing the other partnership. */
export interface DoublesPartnership<T extends {uid: string}> {
  a: T;
  b: T;
  opponents: [T, T];
  unitIndex: number;
  side: 0 | 1;
}

/** The doubles partnerships of one round. */
export interface DoublesRound<T extends {uid: string}> {
  roundIndex: number;
  partnerships: DoublesPartnership<T>[];
}

/**
 * Whether a saved court capacity is doubles. Courts hold two (singles) or
 * four (doubles); any other seat count is refused.
 * @param {number | null | undefined} seatsPerUnit Saved seats per court.
 * @return {boolean} True for doubles courts.
 */
export function isDoublesCourt(
  seatsPerUnit: number | null | undefined
): boolean {
  if (seatsPerUnit === null || seatsPerUnit === undefined) return false;
  if (seatsPerUnit <= 2) return false;
  if (seatsPerUnit === DOUBLES_SEATS_PER_COURT) return true;
  throw new HttpsError("failed-precondition",
    "Courts hold two players (singles) or four (doubles).");
}

/**
 * Turns the engine's planned doubles rounds into partnerships. Each court
 * holds two partnerships; each partnership lists the other as opponents.
 * A court the engine did not split into two sides of two is skipped, so a
 * partial court never reaches a guest.
 * @param {DoublesPlannedRound[]} rounds Engine planned rounds.
 * @return {DoublesRound[]} Partnerships by round.
 */
export function doublesRoundsFromPlannedRounds<T extends {uid: string}>(
  rounds: DoublesPlannedRound<T>[]
): DoublesRound<T>[] {
  return rounds.map((round) => ({
    roundIndex: round.roundIndex,
    partnerships: round.units.flatMap((unit) => {
      const sides = unit.subunits;
      if (
        sides === undefined ||
        sides.length !== 2 ||
        sides.some((side) => side.length !== 2)
      ) {
        return [];
      }
      const [first, second] = sides;
      return [
        {a: first[0], b: first[1], opponents: [second[0], second[1]],
          unitIndex: unit.unitIndex, side: 0},
        {a: second[0], b: second[1], opponents: [first[0], first[1]],
          unitIndex: unit.unitIndex, side: 1},
      ] as DoublesPartnership<T>[];
    }),
  }));
}
