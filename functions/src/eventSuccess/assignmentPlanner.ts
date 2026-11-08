/**
 * Shape-driven assignment planner: the generic core behind
 * `runAssignmentEngine` for every format that asks for a unit shape rather
 * than a dating-coded pair or pod. One request describes the participants,
 * the unit shape (explicit sizes, a count, a target size, or a physical
 * resource such as courts x 4 seats), the number of rounds, the hard
 * constraints, and weighted soft objectives. The response is rounds of units
 * with an explicit bench, a cumulative time ledger and objective metrics.
 *
 * Contract: docs/assignment_engine.md. The planner never reads raw profile or
 * form data; callers pass already-authorized, normalized attribute values.
 */
import type {NormalizedFeatureValue} from "./assignmentFeatureScoring";
import {
  assignmentConstraintPairKey,
  NormalizedAssignmentConstraints,
} from "./assignmentConstraints";

export type PlannerAttributeMode =
  /** Each unit mirrors the pool's mix (spread colleges evenly). */
  "balance" |
  /** Each unit is as uniform as possible (pace or skill pods). */
  "cluster" |
  /** Each unit holds as many distinct values as it can (cross-section). */
  "cover" |
  /** Members of a unit are dissimilar to each other (pairwise novelty). */
  "diversify";

export interface PlannerAttributeObjective {
  /** Stable explainability id, e.g. `activity:skillBand`, `feature:college`. */
  id: string;
  mode: PlannerAttributeMode;
  /** 0-100, the same scale as host-configured feature weights. */
  weight: number;
  /** Authorized values only; absent means missing, which is neutral. */
  valuesByUid: ReadonlyMap<string, NormalizedFeatureValue>;
}

export interface PlannerParticipant {
  uid: string;
  arrivalGroup?: string | null;
}

export type PlannerArrivalGroupPolicy = "keepTogether" | "spread" | "ignore";

export interface PlannerResourceSpec {
  /** Number of concurrent physical resources (courts, tables, boards). */
  count: number;
  /** People a resource holds when full (doubles court 4, table 6). */
  seatsPerUnit: number;
  /** Fewest people a resource may run with (doubles 4, table 4). */
  minSeats?: number;
}

export interface PlannerUnitSpec {
  /** Explicit unit sizes, e.g. `[8, 8, 8]` or `[6, 6, 4]`. */
  sizes?: number[];
  /** Number of units; sizes are as even as possible. */
  count?: number;
  /** Target size; the unit count is derived from the pool. */
  size?: number;
  minSize?: number;
  maxSize?: number;
  /** Physical capacity per round; people beyond it go to the bench. */
  resource?: PlannerResourceSpec;
  /** Split every unit into subunits of this size (doubles partners). */
  subunitSize?: number;
  /** Order seats around each unit (dinner seat adjacency). */
  seatOrder?: boolean;
}

export interface PlannerHistory {
  /** Prior shared-unit meetings per pair key (any unit, any role). */
  pairMeetingCounts?: ReadonlyMap<string, number>;
  /** Prior partnerships per pair key (same subunit). */
  partnerCounts?: ReadonlyMap<string, number>;
  /** Prior opposition per pair key (same unit, different subunit). */
  opponentCounts?: ReadonlyMap<string, number>;
  /** Prior seat neighbours per pair key. */
  neighborCounts?: ReadonlyMap<string, number>;
  /** Prior assigned (on-resource) minutes per uid. */
  assignedMinutesByUid?: ReadonlyMap<string, number>;
}

export interface PlannerRepeatPolicy {
  repeatStrategy: "avoid" | "allowWhenExhausted";
  maxPairMeetings: number;
}

export interface PlannerRequest<T extends PlannerParticipant> {
  participants: T[];
  units: PlannerUnitSpec;
  /** Rounds to plan; 1 for a static assignment. */
  rounds: number;
  /** Minutes per round, used by the time ledger. 0 for static units. */
  roundMinutes: number;
  /** Safety blocks; never placed together, never relaxed. */
  blockedPairs: ReadonlySet<string>;
  constraints: NormalizedAssignmentConstraints;
  attributes: PlannerAttributeObjective[];
  arrivalGroupPolicy: PlannerArrivalGroupPolicy;
  /** Balance people who arrived alone evenly across units. */
  spreadSoloArrivals: boolean;
  repeatPolicy: PlannerRepeatPolicy;
  /**
   * Optional opt-in pair objective (romantic, questionnaire affinity or
   * novelty). Higher is better; the caller decides whether it is permitted.
   */
  pairScore?: (a: T, b: T) => number;
  history?: PlannerHistory;
  /** Deterministic tie-break seed, normally the event id. */
  seed: string;
  /** Upper bound on local-search swap evaluations per round. */
  searchBudget?: number;
}

export interface PlannedUnit<T extends PlannerParticipant> {
  unitIndex: number;
  members: T[];
  /** Present when the request asked for subunits (doubles partners). */
  subunits?: T[][];
  /** Present when the request asked for seat order; uids clockwise. */
  seatOrder?: string[];
  cost: number;
}

export interface PlannedRound<T extends PlannerParticipant> {
  roundIndex: number;
  units: Array<PlannedUnit<T>>;
  /** People not on a unit this round, told to mix in the common area. */
  bench: T[];
}

export interface PlannerTimeLedgerEntry {
  assignedMinutes: number;
  benchMinutes: number;
  assignedRounds: number;
  benchRounds: number;
  longestBenchStreak: number;
}

export interface PlannerTimeFairness {
  /** Fair on-resource minutes per person for the planned rounds. */
  targetMinutes: number;
  minimumAssignedMinutes: number;
  maximumAssignedMinutes: number;
  /** Max minus min assigned rounds; 1 is the best a bench allows. */
  assignedRoundSpread: number;
  /** People more than one round below the fair share. */
  belowFairShareUids: string[];
}

export interface PlannerAttributeStat {
  id: string;
  mode: PlannerAttributeMode;
  /** Units, summed over rounds, that fail the objective. */
  unmetUnitCount: number;
  missingValueCount: number;
}

export interface PlannerExplainability {
  roundCount: number;
  unitCount: number;
  benchSeatCount: number;
  hardViolationCount: number;
  repeatedPairCount: number;
  repeatedPartnerCount: number;
  repeatedNeighborCount: number;
  keepTogetherSplitCount: number;
  anchorMissCount: number;
  attributeStats: PlannerAttributeStat[];
  fairness: PlannerTimeFairness;
}

export interface PlannerResult<T extends PlannerParticipant> {
  rounds: Array<PlannedRound<T>>;
  ledger: Record<string, PlannerTimeLedgerEntry>;
  /** Updated history so the caller can persist it across occurrences. */
  history: {
    pairMeetingCounts: Record<string, number>;
    partnerCounts: Record<string, number>;
    opponentCounts: Record<string, number>;
    neighborCounts: Record<string, number>;
  };
  explainability: PlannerExplainability;
}

const REPEAT_PAIR_PENALTY = 75;
const REPEAT_PAIR_SOFT_PENALTY = 30;
const EXHAUSTED_PAIR_PENALTY = 1000;
const REPEAT_PARTNER_PENALTY = 140;
const REPEAT_OPPONENT_PENALTY = 20;
const REPEAT_NEIGHBOR_PENALTY = 40;
const AVOID_REPEAT_PENALTY = 260;
const REQUESTED_REPEAT_REWARD = 260;
const KEEP_TOGETHER_REWARD = 180;
const ANCHOR_MISS_PENALTY = 450;
const ARRIVAL_TOGETHER_REWARD = 60;
const ARRIVAL_SPREAD_PENALTY = 40;
const SOLO_SPREAD_WEIGHT = 30;
const COVER_MISS_FACTOR = 1.5;
const SCALAR_BALANCE_FACTOR = 4;
const DEFAULT_SEARCH_BUDGET = 250_000;
const MAX_ENUMERATED_SUBUNIT_SIZE = 8;

/**
 * Plans rounds of units for any requested shape.
 * @param {PlannerRequest<T>} request Planner request.
 * @return {PlannerResult<T>} Rounds, ledger, updated history and metrics.
 */
export function planAssignmentRounds<T extends PlannerParticipant>(
  request: PlannerRequest<T>
): PlannerResult<T> {
  const participants = uniqueSorted(request.participants);
  const roundCount = Math.max(0, Math.floor(request.rounds));
  const roundMinutes = Math.max(0, request.roundMinutes);
  const state = new PlannerState(request, participants);
  const rounds: Array<PlannedRound<T>> = [];

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex++) {
    const sizes = resolveUnitSizes(participants.length, request.units);
    if (sizes.length === 0) break;
    const capacity = sizes.reduce((sum, size) => sum + size, 0);
    const active = state.selectActive(capacity, roundIndex);
    const {units, unplaced} = state.partition(active, sizes, roundIndex);
    const unplacedUids = new Set(unplaced.map((person) => person.uid));
    const bench = participants.filter((person) =>
      unplacedUids.has(person.uid) ||
      !active.some((member) => member.uid === person.uid));
    const plannedUnits = units
      .map((members, unitIndex): PlannedUnit<T> => {
        const unit: PlannedUnit<T> = {
          unitIndex,
          members,
          cost: state.unitCost(members, unitIndex),
        };
        if (request.units.subunitSize !== undefined &&
            request.units.subunitSize > 0 &&
            members.length > request.units.subunitSize) {
          unit.subunits = state.bestSubunits(members).subunits;
        }
        if (request.units.seatOrder === true && members.length > 2) {
          unit.seatOrder = state.seatOrder(members);
        }
        return unit;
      })
      .filter((unit) => unit.members.length > 0);
    state.recordRound(plannedUnits, bench, roundMinutes);
    rounds.push({roundIndex, units: plannedUnits, bench});
  }

  return {
    rounds,
    ledger: state.ledgerRecord(),
    history: state.historyRecord(),
    explainability: state.explain(rounds, roundMinutes),
  };
}

/**
 * Resolves the unit sizes for one round from the request shape.
 * @param {number} participantCount People available this round.
 * @param {PlannerUnitSpec} spec Unit shape.
 * @return {number[]} Sizes, largest first; their sum is the round capacity.
 */
export function resolveUnitSizes(
  participantCount: number,
  spec: PlannerUnitSpec
): number[] {
  const n = Math.max(0, Math.floor(participantCount));
  if (n === 0) return [];
  const minSize = Math.max(1, Math.floor(spec.minSize ?? 1));
  const maxSize = Math.max(minSize, Math.floor(spec.maxSize ?? n));

  if (spec.resource !== undefined) {
    const seats = Math.max(1, Math.floor(spec.resource.seatsPerUnit));
    const minSeats = Math.min(seats,
      Math.max(1, Math.floor(spec.resource.minSeats ?? seats)));
    const resourceCount = Math.max(0, Math.floor(spec.resource.count));
    const usable = Math.min(resourceCount, Math.floor(n / minSeats));
    if (usable === 0) return [];
    if (minSeats === seats) return Array(usable).fill(seats);
    // Flexible resources (tables of 4-6): use as few as hold everyone.
    const needed = Math.min(usable, Math.max(1, Math.ceil(n / seats)));
    const seated = Math.min(n, needed * seats);
    return evenSizes(seated, needed);
  }

  if (spec.sizes !== undefined && spec.sizes.length > 0) {
    const requested = spec.sizes
      .map((size) => Math.max(1, Math.floor(size)))
      .filter((size) => Number.isFinite(size));
    const total = requested.reduce((sum, size) => sum + size, 0);
    if (total <= n) return [...requested].sort((a, b) => b - a);
    // Fewer people than seats: shrink units evenly, keep the unit count.
    return evenSizes(n, Math.min(requested.length, n));
  }

  let count: number;
  if (spec.count !== undefined && spec.count > 0) {
    count = Math.min(n, Math.floor(spec.count));
  } else {
    const target = Math.max(1, Math.floor(spec.size ?? Math.min(n, 5)));
    count = Math.max(1, Math.ceil(n / Math.min(target, maxSize)));
    while (count > 1 && Math.floor(n / count) < minSize) count--;
  }
  return evenSizes(n, Math.max(1, count));
}

/** Splits `total` into `count` sizes that differ by at most one. */
function evenSizes(total: number, count: number): number[] {
  const base = Math.floor(total / count);
  const extra = total % count;
  return Array.from({length: count}, (_, index) =>
    base + (index < extra ? 1 : 0));
}

/** Mutable per-request planning state and the objective function. */
class PlannerState<T extends PlannerParticipant> {
  private readonly pairMeetings: Map<string, number>;
  private readonly partners: Map<string, number>;
  private readonly opponents: Map<string, number>;
  private readonly neighbors: Map<string, number>;
  private readonly assignedMinutes = new Map<string, number>();
  private readonly benchMinutes = new Map<string, number>();
  private readonly assignedRounds = new Map<string, number>();
  private readonly benchRounds = new Map<string, number>();
  private readonly benchStreak = new Map<string, number>();
  private readonly longestBenchStreak = new Map<string, number>();
  private readonly arrivalGroupSize = new Map<string, number>();
  private readonly hashByUid = new Map<string, number>();
  private readonly pairCache = new Map<string, number>();
  private readonly soloValues: Map<string, NormalizedFeatureValue>;
  private poolShares = new Map<string, Map<string, number>>();
  private poolMeans = new Map<string, number>();
  private poolDistinct = new Map<string, number>();
  private poolKnownShare = new Map<string, number>();
  /** Unit capacities for the round being built; empty when explaining. */
  private roundSizes: number[] = [];

  constructor(
    private readonly request: PlannerRequest<T>,
    private readonly participants: T[]
  ) {
    this.pairMeetings = new Map(request.history?.pairMeetingCounts ?? []);
    this.partners = new Map(request.history?.partnerCounts ?? []);
    this.opponents = new Map(request.history?.opponentCounts ?? []);
    this.neighbors = new Map(request.history?.neighborCounts ?? []);
    for (const person of participants) {
      this.assignedMinutes.set(person.uid,
        finite(request.history?.assignedMinutesByUid?.get(person.uid)));
      this.benchMinutes.set(person.uid, finite(
        request.constraints.exclusionMinutesByUid.get(person.uid)));
      this.assignedRounds.set(person.uid, 0);
      this.benchRounds.set(person.uid, 0);
      this.benchStreak.set(person.uid, 0);
      this.longestBenchStreak.set(person.uid, 0);
      this.hashByUid.set(person.uid, fnv1a(`${request.seed}|${person.uid}`));
      const group = arrivalKey(person);
      if (group !== null) {
        this.arrivalGroupSize.set(group,
          (this.arrivalGroupSize.get(group) ?? 0) + 1);
      }
    }
    this.soloValues = new Map(participants.map((person) => [
      person.uid,
      {kind: "category", value: this.isSolo(person) ? "solo" : "group"},
    ]));
  }

  /**
   * Chooses who is on a resource this round. Fairness first: the longest
   * cumulative bench time plays, then the fewest assigned minutes, then the
   * longest current bench streak, then a seeded per-round hash.
   */
  selectActive(capacity: number, roundIndex: number): T[] {
    if (capacity >= this.participants.length) return [...this.participants];
    const ordered = [...this.participants].sort((a, b) =>
      this.benchMinutesOf(b) - this.benchMinutesOf(a) ||
      this.assignedMinutesOf(a) - this.assignedMinutesOf(b) ||
      (this.benchStreak.get(b.uid) ?? 0) -
        (this.benchStreak.get(a.uid) ?? 0) ||
      roundHash(this.request.seed, roundIndex, a.uid) -
        roundHash(this.request.seed, roundIndex, b.uid) ||
      a.uid.localeCompare(b.uid));
    const selected: T[] = [];
    const selectedUids = new Set<string>();
    const take = (person: T) => {
      const block = this.keepTogetherBlock(person, ordered)
        .filter((member) => !selectedUids.has(member.uid));
      const members = block.length <= capacity - selected.length ?
        block : [person];
      for (const member of members) {
        selected.push(member);
        selectedUids.add(member.uid);
      }
    };
    // Everyone strictly ahead of the cut plays. Within the tier that the cut
    // falls in (equal fairness priority), prefer people who keep the active
    // mix close to the pool mix on balance and cover objectives.
    const tierKey = (person: T) =>
      `${this.benchMinutesOf(person)}|${this.assignedMinutesOf(person)}`;
    let index = 0;
    while (index < ordered.length && selected.length < capacity) {
      const key = tierKey(ordered[index]);
      const tier: T[] = [];
      while (index < ordered.length && tierKey(ordered[index]) === key) {
        tier.push(ordered[index]);
        index++;
      }
      const remaining = tier.filter((person) =>
        !selectedUids.has(person.uid));
      if (selected.length + remaining.length <= capacity) {
        remaining.forEach(take);
        continue;
      }
      while (selected.length < capacity) {
        const candidates = remaining.filter((person) =>
          !selectedUids.has(person.uid));
        if (candidates.length === 0) break;
        let best = candidates[0];
        let bestCost = Number.POSITIVE_INFINITY;
        for (const candidate of candidates) {
          const cost = this.selectionMixCost([...selected, candidate],
            capacity);
          if (cost < bestCost - 1e-9) {
            bestCost = cost;
            best = candidate;
          }
        }
        take(best);
      }
    }
    return selected;
  }

  /** How far a partly chosen active set strays from the full pool mix. */
  private selectionMixCost(selected: T[], capacity: number): number {
    let cost = 0;
    for (const objective of this.request.attributes) {
      if (objective.mode !== "balance" && objective.mode !== "cover") {
        continue;
      }
      const poolValues = this.participants
        .map((person) => objective.valuesByUid.get(person.uid))
        .filter((value): value is NormalizedFeatureValue =>
          value !== undefined);
      if (poolValues.length === 0) continue;
      const poolCounts = valueCounts(poolValues);
      const counts = valueCounts(selected
        .map((person) => objective.valuesByUid.get(person.uid))
        .filter((value): value is NormalizedFeatureValue =>
          value !== undefined));
      const knownCapacity = capacity * poolValues.length /
        this.participants.length;
      for (const [key, poolCount] of poolCounts) {
        cost += objective.weight * Math.max(0, (counts.get(key) ?? 0) -
          poolCount / poolValues.length * knownCapacity);
      }
    }
    return cost;
  }

  /** Partitions the active people into units of the given sizes. */
  partition(
    active: T[],
    sizes: number[],
    roundIndex: number
  ): {units: T[][]; unplaced: T[]} {
    this.preparePool(active);
    this.roundSizes = sizes;
    const attempts = active.length <= 60 ? 12 : active.length <= 200 ? 4 : 1;
    let best: {units: T[][]; unplaced: T[]; cost: number} | null = null;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const built = this.constructAndImprove(active, sizes, roundIndex,
        attempt);
      const cost = built.unplaced.length * EXHAUSTED_PAIR_PENALTY * 10 +
        built.units.reduce((sum, unit, index) =>
          sum + this.unitCost(unit, index), 0);
      if (best === null || cost < best.cost - 1e-9) {
        best = {...built, cost};
      }
    }
    return best === null ? {units: sizes.map(() => []), unplaced: []} :
      {units: best.units, unplaced: best.unplaced};
  }

  private constructAndImprove(
    active: T[],
    sizes: number[],
    roundIndex: number,
    attempt: number
  ): {units: T[][]; unplaced: T[]} {
    const units: T[][] = sizes.map(() => []);
    const placed = new Set<string>();
    const unplaced: T[] = [];
    for (const person of this.constructionOrder(active, roundIndex,
      attempt)) {
      if (placed.has(person.uid)) continue;
      const block = this.placementBlock(person, active, sizes)
        .filter((member) => !placed.has(member.uid));
      const target = this.bestUnitFor(block, units, sizes) ??
        (block.length > 1 ? null : undefined);
      if (target !== null && target !== undefined) {
        units[target].push(...block);
        block.forEach((member) => placed.add(member.uid));
        continue;
      }
      const single = this.bestUnitFor([person], units, sizes);
      if (single === undefined || single === null) {
        unplaced.push(person);
      } else {
        units[single].push(person);
      }
      placed.add(person.uid);
    }
    this.improve(units);
    return {units, unplaced};
  }

  /**
   * The people placed together during construction: the host keep-together
   * closure plus, under `keepTogether`, the rest of the arrival group when it
   * fits in the largest unit. Local search may still split a soft block.
   */
  private placementBlock(person: T, active: T[], sizes: number[]): T[] {
    const block = this.keepTogetherBlock(person, active);
    const group = arrivalKey(person);
    if (this.request.arrivalGroupPolicy !== "keepTogether" ||
        group === null) return block;
    const largest = Math.max(...sizes);
    const withGroup = new Map(block.map((member) => [member.uid, member]));
    for (const member of active) {
      if (arrivalKey(member) === group) withGroup.set(member.uid, member);
    }
    return withGroup.size <= largest ? [...withGroup.values()] : block;
  }

  /** Full cost of one unit; lower is better. */
  unitCost(members: T[], unitIndex: number): number {
    const capacity = this.roundSizes[unitIndex] ?? members.length;
    let cost = 0;
    for (let i = 0; i < members.length; i++) {
      const anchor = this.request.constraints.anchorGroupByUid
        .get(members[i].uid);
      if (anchor !== undefined && anchor !== unitIndex) {
        cost += ANCHOR_MISS_PENALTY;
      }
      for (let j = i + 1; j < members.length; j++) {
        cost += this.pairCost(members[i], members[j]);
      }
    }
    for (const objective of this.request.attributes) {
      cost += this.attributeCost(objective, members, capacity);
    }
    if (this.request.spreadSoloArrivals) {
      cost += this.attributeCost(this.soloObjective(), members, capacity);
    }
    const subunitSize = this.request.units.subunitSize ?? 0;
    if (subunitSize > 0 && members.length > subunitSize &&
        members.length <= MAX_ENUMERATED_SUBUNIT_SIZE) {
      cost += this.bestSubunits(members).cost;
    }
    return cost;
  }

  /** Best split of a unit into subunits (partners vs opponents). */
  bestSubunits(members: T[]): {subunits: T[][]; cost: number} {
    const size = Math.max(1, this.request.units.subunitSize ?? 1);
    const ordered = [...members].sort((a, b) => a.uid.localeCompare(b.uid));
    if (ordered.length <= MAX_ENUMERATED_SUBUNIT_SIZE &&
        ordered.length % size === 0) {
      let best: {subunits: T[][]; cost: number} | null = null;
      for (const split of enumeratePartitions(ordered, size)) {
        const cost = this.subunitSplitCost(split);
        if (best === null || cost < best.cost - 1e-9) {
          best = {subunits: split, cost};
        }
      }
      if (best !== null) return best;
    }
    const subunits: T[][] = [];
    const remaining = [...ordered];
    while (remaining.length > 0) {
      const subunit = [remaining.shift() as T];
      while (subunit.length < size && remaining.length > 0) {
        let bestIndex = 0;
        let bestCost = Number.POSITIVE_INFINITY;
        remaining.forEach((candidate, index) => {
          const cost = subunit.reduce((sum, member) =>
            sum + this.partnerCost(member, candidate), 0);
          if (cost < bestCost) {
            bestCost = cost;
            bestIndex = index;
          }
        });
        subunit.push(remaining.splice(bestIndex, 1)[0]);
      }
      subunits.push(subunit);
    }
    return {subunits, cost: this.subunitSplitCost(subunits)};
  }

  /** Orders seats around a unit; neighbours are scored pairwise. */
  seatOrder(members: T[]): string[] {
    const ordered = [...members].sort((a, b) =>
      (this.hashByUid.get(a.uid) ?? 0) - (this.hashByUid.get(b.uid) ?? 0) ||
      a.uid.localeCompare(b.uid));
    const seats: T[] = [ordered.shift() as T];
    while (ordered.length > 0) {
      const last = seats[seats.length - 1];
      let bestIndex = 0;
      let bestCost = Number.POSITIVE_INFINITY;
      ordered.forEach((candidate, index) => {
        const cost = this.neighborCost(last, candidate);
        if (cost < bestCost) {
          bestCost = cost;
          bestIndex = index;
        }
      });
      seats.push(ordered.splice(bestIndex, 1)[0]);
    }
    // 2-opt on the closed ring.
    let improved = true;
    for (let pass = 0; improved && pass < 20; pass++) {
      improved = false;
      for (let i = 0; i < seats.length - 1; i++) {
        for (let k = i + 1; k < seats.length; k++) {
          const before = this.ringCost(seats);
          const candidate = [
            ...seats.slice(0, i),
            ...seats.slice(i, k + 1).reverse(),
            ...seats.slice(k + 1),
          ];
          if (this.ringCost(candidate) < before - 1e-9) {
            seats.splice(0, seats.length, ...candidate);
            improved = true;
          }
        }
      }
    }
    return seats.map((person) => person.uid);
  }

  /** Records one planned round into history and the time ledger. */
  recordRound(
    units: Array<PlannedUnit<T>>,
    bench: T[],
    roundMinutes: number
  ): void {
    this.pairCache.clear();
    for (const unit of units) {
      for (const key of pairKeys(unit.members)) {
        increment(this.pairMeetings, key);
      }
      if (unit.subunits !== undefined) {
        for (const subunit of unit.subunits) {
          for (const key of pairKeys(subunit)) increment(this.partners, key);
        }
        for (let i = 0; i < unit.subunits.length; i++) {
          for (let j = i + 1; j < unit.subunits.length; j++) {
            for (const a of unit.subunits[i]) {
              for (const b of unit.subunits[j]) {
                increment(this.opponents,
                  assignmentConstraintPairKey(a.uid, b.uid));
              }
            }
          }
        }
      }
      if (unit.seatOrder !== undefined) {
        for (const key of ringNeighborKeys(unit.seatOrder)) {
          increment(this.neighbors, key);
        }
      }
      for (const member of unit.members) {
        add(this.assignedMinutes, member.uid, roundMinutes);
        add(this.assignedRounds, member.uid, 1);
        this.benchStreak.set(member.uid, 0);
      }
    }
    for (const person of bench) {
      add(this.benchMinutes, person.uid, roundMinutes);
      add(this.benchRounds, person.uid, 1);
      add(this.benchStreak, person.uid, 1);
      this.longestBenchStreak.set(person.uid, Math.max(
        this.longestBenchStreak.get(person.uid) ?? 0,
        this.benchStreak.get(person.uid) ?? 0));
    }
  }

  ledgerRecord(): Record<string, PlannerTimeLedgerEntry> {
    return Object.fromEntries(this.participants.map((person) => [
      person.uid,
      {
        assignedMinutes: this.assignedMinutes.get(person.uid) ?? 0,
        benchMinutes: this.benchMinutes.get(person.uid) ?? 0,
        assignedRounds: this.assignedRounds.get(person.uid) ?? 0,
        benchRounds: this.benchRounds.get(person.uid) ?? 0,
        longestBenchStreak: this.longestBenchStreak.get(person.uid) ?? 0,
      },
    ]));
  }

  historyRecord(): PlannerResult<T>["history"] {
    return {
      pairMeetingCounts: sortedRecord(this.pairMeetings),
      partnerCounts: sortedRecord(this.partners),
      opponentCounts: sortedRecord(this.opponents),
      neighborCounts: sortedRecord(this.neighbors),
    };
  }

  explain(
    rounds: Array<PlannedRound<T>>,
    roundMinutes: number
  ): PlannerExplainability {
    const seen = new Map(this.request.history?.pairMeetingCounts ?? []);
    const seenPartners = new Map(this.request.history?.partnerCounts ?? []);
    const seenNeighbors = new Map(this.request.history?.neighborCounts ?? []);
    let hardViolationCount = 0;
    let repeatedPairCount = 0;
    let repeatedPartnerCount = 0;
    let repeatedNeighborCount = 0;
    let keepTogetherSplitCount = 0;
    let anchorMissCount = 0;
    let unitCount = 0;
    let benchSeatCount = 0;
    const statById = new Map<string, PlannerAttributeStat>(
      this.request.attributes.map((objective) => [objective.id, {
        id: objective.id,
        mode: objective.mode,
        unmetUnitCount: 0,
        missingValueCount: this.participants.filter((person) =>
          !objective.valuesByUid.has(person.uid)).length,
      }]));
    this.roundSizes = [];
    for (const round of rounds) {
      benchSeatCount += round.bench.length;
      const unitByUid = new Map<string, number>();
      this.preparePool(round.units.flatMap((unit) => unit.members));
      for (const unit of round.units) {
        unitCount++;
        for (const member of unit.members) {
          unitByUid.set(member.uid, unit.unitIndex);
          const anchor = this.request.constraints.anchorGroupByUid
            .get(member.uid);
          if (anchor !== undefined && anchor !== unit.unitIndex) {
            anchorMissCount++;
          }
        }
        for (const key of pairKeys(unit.members)) {
          if (this.isHardPairKey(key)) hardViolationCount++;
          if ((seen.get(key) ?? 0) > 0) repeatedPairCount++;
        }
        for (const subunit of unit.subunits ?? []) {
          for (const key of pairKeys(subunit)) {
            if ((seenPartners.get(key) ?? 0) > 0) repeatedPartnerCount++;
            increment(seenPartners, key);
          }
        }
        for (const key of ringNeighborKeys(unit.seatOrder ?? [])) {
          if ((seenNeighbors.get(key) ?? 0) > 0) repeatedNeighborCount++;
          increment(seenNeighbors, key);
        }
        for (const objective of this.request.attributes) {
          if (!this.attributeMet(objective, unit.members, round.units)) {
            const stat = statById.get(objective.id);
            if (stat !== undefined) stat.unmetUnitCount++;
          }
        }
      }
      for (const unit of round.units) {
        for (const key of pairKeys(unit.members)) increment(seen, key);
      }
      for (const key of this.request.constraints.keepTogetherPairs) {
        const [a, b] = key.split("__");
        const aUnit = unitByUid.get(a);
        const bUnit = unitByUid.get(b);
        if (aUnit !== undefined && bUnit !== undefined && aUnit !== bUnit) {
          keepTogetherSplitCount++;
        }
      }
    }
    const fairness = this.fairness(rounds, roundMinutes);
    return {
      roundCount: rounds.length,
      unitCount,
      benchSeatCount,
      hardViolationCount,
      repeatedPairCount,
      repeatedPartnerCount,
      repeatedNeighborCount,
      keepTogetherSplitCount,
      anchorMissCount,
      attributeStats: [...statById.values()],
      fairness,
    };
  }

  private fairness(
    rounds: Array<PlannedRound<T>>,
    roundMinutes: number
  ): PlannerTimeFairness {
    const n = this.participants.length;
    const seatMinutes = rounds.reduce((sum, round) => sum +
      round.units.reduce((units, unit) => units + unit.members.length, 0) *
        roundMinutes, 0);
    const targetMinutes = n === 0 ? 0 : seatMinutes / n;
    const minutes = this.participants.map((person) =>
      this.assignedMinutes.get(person.uid) ?? 0);
    const roundsAssigned = this.participants.map((person) =>
      this.assignedRounds.get(person.uid) ?? 0);
    return {
      targetMinutes,
      minimumAssignedMinutes: minutes.length ? Math.min(...minutes) : 0,
      maximumAssignedMinutes: minutes.length ? Math.max(...minutes) : 0,
      assignedRoundSpread: roundsAssigned.length ?
        Math.max(...roundsAssigned) - Math.min(...roundsAssigned) : 0,
      belowFairShareUids: roundMinutes <= 0 ? [] : this.participants
        .filter((person) => (this.assignedMinutes.get(person.uid) ?? 0) <
          targetMinutes - roundMinutes - 1e-9)
        .map((person) => person.uid),
    };
  }

  private attributeMet(
    objective: PlannerAttributeObjective,
    members: T[],
    roundUnits: Array<PlannedUnit<T>>
  ): boolean {
    const values = members
      .map((member) => objective.valuesByUid.get(member.uid))
      .filter((value): value is NormalizedFeatureValue => value !== undefined);
    if (values.length === 0) return true;
    switch (objective.mode) {
    case "cover":
      return distinctCount(values) >= Math.min(values.length,
        this.poolDistinct.get(objective.id) ?? 0, coverableValueCount(
          objective, roundUnits.flatMap((unit) => unit.members),
          roundUnits.length));
    case "cluster":
      return distinctCount(values) <= 1 || values.every((value) =>
        value.kind === "scalar");
    case "balance":
      return this.balanceDeviation(objective, values) <= 1 + 1e-9;
    case "diversify":
      return true;
    }
  }

  private keepTogetherBlock(person: T, pool: T[]): T[] {
    const byUid = new Map(pool.map((member) => [member.uid, member]));
    const block = new Map<string, T>([[person.uid, person]]);
    const queue = [person.uid];
    while (queue.length > 0) {
      const uid = queue.shift() as string;
      for (const peer of this.request.constraints.keepTogetherPeersByUid
        .get(uid) ?? []) {
        const member = byUid.get(peer);
        if (member !== undefined && !block.has(peer)) {
          block.set(peer, member);
          queue.push(peer);
        }
      }
    }
    return [...block.values()];
  }

  private constructionOrder(
    active: T[],
    roundIndex: number,
    attempt: number
  ): T[] {
    const blockedDegree = new Map(active.map((person) => [person.uid,
      active.filter((other) => other.uid !== person.uid &&
        this.isHardPair(person, other)).length]));
    const groupSize = (person: T) => {
      const group = arrivalKey(person);
      return this.request.arrivalGroupPolicy === "keepTogether" &&
        group !== null ? this.arrivalGroupSize.get(group) ?? 1 : 1;
    };
    const salt = attempt === 0 ? roundIndex : `${roundIndex}:${attempt}`;
    return [...active].sort((a, b) =>
      anchorRank(a, this.request.constraints) -
        anchorRank(b, this.request.constraints) ||
      (blockedDegree.get(b.uid) ?? 0) - (blockedDegree.get(a.uid) ?? 0) ||
      groupSize(b) - groupSize(a) ||
      (attempt === 0 ? this.rarity(a) - this.rarity(b) : 0) ||
      roundHash(this.request.seed, salt, a.uid) -
        roundHash(this.request.seed, salt, b.uid) ||
      a.uid.localeCompare(b.uid));
  }

  /** Lower is rarer: people holding scarce values are placed first. */
  private rarity(person: T): number {
    let rarest = 1;
    for (const objective of this.request.attributes) {
      if (objective.mode !== "cover" && objective.mode !== "balance") {
        continue;
      }
      const value = objective.valuesByUid.get(person.uid);
      if (value === undefined) continue;
      const shares = this.poolShares.get(objective.id);
      for (const key of valueKeys(value)) {
        rarest = Math.min(rarest, shares?.get(key) ?? 1);
      }
    }
    return rarest;
  }

  private bestUnitFor(
    block: T[],
    units: T[][],
    sizes: number[]
  ): number | undefined {
    let best: number | undefined;
    let bestCost = Number.POSITIVE_INFINITY;
    units.forEach((unit, index) => {
      if (unit.length + block.length > sizes[index]) return;
      if (!this.canJoin(block, unit)) return;
      const cost = this.unitCost([...unit, ...block], index) -
        this.unitCost(unit, index);
      if (cost < bestCost - 1e-9) {
        bestCost = cost;
        best = index;
      }
    });
    return best;
  }

  /** Bounded first-improvement swap search; hard constraints never break. */
  private improve(units: T[][]): void {
    let budget = this.request.searchBudget ?? DEFAULT_SEARCH_BUDGET;
    const costs = units.map((unit, index) => this.unitCost(unit, index));
    for (let pass = 0; pass < 30 && budget > 0; pass++) {
      let improved = false;
      for (let i = 0; i < units.length && budget > 0; i++) {
        for (let j = i + 1; j < units.length && budget > 0; j++) {
          for (let a = 0; a < units[i].length && budget > 0; a++) {
            for (let b = 0; b < units[j].length && budget > 0; b++) {
              budget--;
              const left = units[i][a];
              const right = units[j][b];
              if (!this.canJoinExcept(right, units[i], a) ||
                  !this.canJoinExcept(left, units[j], b)) continue;
              const nextLeft = units[i].slice();
              nextLeft[a] = right;
              const nextRight = units[j].slice();
              nextRight[b] = left;
              const leftCost = this.unitCost(nextLeft, i);
              const rightCost = this.unitCost(nextRight, j);
              if (leftCost + rightCost < costs[i] + costs[j] - 1e-9) {
                units[i][a] = right;
                units[j][b] = left;
                costs[i] = leftCost;
                costs[j] = rightCost;
                improved = true;
              }
            }
          }
        }
      }
      if (!improved) break;
    }
  }

  /** Whether `person` may replace the member at `skip` in `unit`. */
  private canJoinExcept(person: T, unit: T[], skip: number): boolean {
    for (let index = 0; index < unit.length; index++) {
      if (index !== skip && this.isHardPair(person, unit[index])) {
        return false;
      }
    }
    return true;
  }

  private canJoin(block: T[], unit: T[]): boolean {
    for (const person of block) {
      for (const member of unit) {
        if (this.isHardPair(person, member)) return false;
      }
    }
    for (let i = 0; i < block.length; i++) {
      for (let j = i + 1; j < block.length; j++) {
        if (this.isHardPair(block[i], block[j])) return false;
      }
    }
    return true;
  }

  private isHardPair(a: T, b: T): boolean {
    return this.isHardPairKey(assignmentConstraintPairKey(a.uid, b.uid));
  }

  private isHardPairKey(key: string): boolean {
    return this.request.blockedPairs.has(key) ||
      this.request.constraints.keepApartPairs.has(key);
  }

  /** Symmetric pair cost inside one unit; cached per round. */
  private pairCost(a: T, b: T): number {
    const key = assignmentConstraintPairKey(a.uid, b.uid);
    const cached = this.pairCache.get(key);
    if (cached !== undefined) return cached;
    const constraints = this.request.constraints;
    let cost = 0;
    const meetings = this.pairMeetings.get(key) ?? 0;
    if (meetings > 0) {
      const requested = constraints.requestedRepeatPairs.has(key);
      if (requested) {
        cost -= REQUESTED_REPEAT_REWARD;
      } else {
        cost += meetings * (this.request.repeatPolicy.repeatStrategy ===
          "allowWhenExhausted" ? REPEAT_PAIR_SOFT_PENALTY :
          REPEAT_PAIR_PENALTY);
        if (meetings >= this.request.repeatPolicy.maxPairMeetings) {
          cost += EXHAUSTED_PAIR_PENALTY;
        }
        if (constraints.avoidRepeatPairs.has(key)) {
          cost += AVOID_REPEAT_PENALTY * meetings;
        }
      }
    }
    if (constraints.keepTogetherPairs.has(key)) cost -= KEEP_TOGETHER_REWARD;
    const aGroup = arrivalKey(a);
    if (aGroup !== null && aGroup === arrivalKey(b)) {
      if (this.request.arrivalGroupPolicy === "keepTogether") {
        cost -= ARRIVAL_TOGETHER_REWARD;
      } else if (this.request.arrivalGroupPolicy === "spread") {
        cost += ARRIVAL_SPREAD_PENALTY;
      }
    }
    if (this.request.pairScore !== undefined) {
      cost -= this.request.pairScore(a, b);
    }
    for (const objective of this.request.attributes) {
      if (objective.mode !== "diversify") continue;
      const similarity = valueSimilarity(objective.valuesByUid.get(a.uid),
        objective.valuesByUid.get(b.uid));
      cost += objective.weight * similarity;
    }
    this.pairCache.set(key, cost);
    return cost;
  }

  private partnerCost(a: T, b: T): number {
    const key = assignmentConstraintPairKey(a.uid, b.uid);
    let cost = (this.partners.get(key) ?? 0) * REPEAT_PARTNER_PENALTY;
    if (this.request.constraints.keepTogetherPairs.has(key)) {
      cost -= KEEP_TOGETHER_REWARD;
    }
    if (this.request.pairScore !== undefined) {
      cost -= this.request.pairScore(a, b);
    }
    return cost;
  }

  private subunitSplitCost(subunits: T[][]): number {
    let cost = 0;
    for (const subunit of subunits) {
      for (let i = 0; i < subunit.length; i++) {
        for (let j = i + 1; j < subunit.length; j++) {
          cost += this.partnerCost(subunit[i], subunit[j]);
        }
      }
    }
    for (let i = 0; i < subunits.length; i++) {
      for (let j = i + 1; j < subunits.length; j++) {
        for (const a of subunits[i]) {
          for (const b of subunits[j]) {
            cost += (this.opponents.get(
              assignmentConstraintPairKey(a.uid, b.uid)) ?? 0) *
              REPEAT_OPPONENT_PENALTY;
          }
        }
      }
    }
    // Balanced sides: subunits should mirror each other on balance/cover.
    for (const objective of this.request.attributes) {
      if (objective.mode !== "balance" && objective.mode !== "cover") continue;
      const profiles = subunits.map((subunit) =>
        sideProfile(objective, subunit));
      for (let i = 0; i < profiles.length; i++) {
        for (let j = i + 1; j < profiles.length; j++) {
          cost += objective.weight * profileDistance(profiles[i],
            profiles[j]);
        }
      }
    }
    return cost;
  }

  private neighborCost(a: T, b: T): number {
    const key = assignmentConstraintPairKey(a.uid, b.uid);
    let cost = (this.neighbors.get(key) ?? 0) * REPEAT_NEIGHBOR_PENALTY;
    if (this.request.constraints.keepTogetherPairs.has(key)) {
      cost -= KEEP_TOGETHER_REWARD;
    }
    const group = arrivalKey(a);
    if (group !== null && group === arrivalKey(b) &&
        this.request.arrivalGroupPolicy === "keepTogether") {
      cost -= ARRIVAL_TOGETHER_REWARD;
    }
    if (this.request.pairScore !== undefined) {
      cost -= this.request.pairScore(a, b);
    }
    for (const objective of this.request.attributes) {
      const similarity = valueSimilarity(objective.valuesByUid.get(a.uid),
        objective.valuesByUid.get(b.uid));
      if (objective.mode === "cluster") {
        cost -= objective.weight * similarity;
      } else {
        cost += objective.weight * similarity;
      }
    }
    return cost;
  }

  private ringCost(seats: T[]): number {
    let cost = 0;
    for (let i = 0; i < seats.length; i++) {
      cost += this.neighborCost(seats[i], seats[(i + 1) % seats.length]);
    }
    return cost;
  }

  private soloObjective(): PlannerAttributeObjective {
    return {
      id: "arrival:solo",
      mode: "balance",
      weight: SOLO_SPREAD_WEIGHT,
      valuesByUid: this.soloValues,
    };
  }

  private attributeCost(
    objective: PlannerAttributeObjective,
    members: T[],
    capacity: number
  ): number {
    if (objective.weight <= 0) return 0;
    const values = members
      .map((member) => objective.valuesByUid.get(member.uid))
      .filter((value): value is NormalizedFeatureValue => value !== undefined);
    if (values.length === 0) return 0;
    switch (objective.mode) {
    case "balance":
      return objective.weight *
        this.balanceDeviation(objective, values, capacity);
    case "cover": {
      const target = Math.min(values.length,
        this.poolDistinct.get(objective.id) ?? 0);
      const missing = Math.max(0, target - distinctCount(values));
      return objective.weight * (missing * COVER_MISS_FACTOR +
        this.balanceDeviation(objective, values, capacity) / 4);
    }
    case "cluster": {
      if (values.every((value) => value.kind === "scalar")) {
        const mean = values.reduce((sum, value) =>
          sum + (value.kind === "scalar" ? value.value : 0), 0) /
          values.length;
        return objective.weight * values.reduce((sum, value) => sum +
          Math.abs((value.kind === "scalar" ? value.value : 0) - mean), 0) *
          SCALAR_BALANCE_FACTOR;
      }
      const counts = valueCounts(values);
      const modal = Math.max(...counts.values());
      return objective.weight * (values.length - modal);
    }
    case "diversify":
      return 0;
    }
  }

  /**
   * Excess of a unit's value counts over its fair share. The share is taken
   * at the unit's capacity, so a half-built unit is only charged for values
   * it already holds too many of; a full unit is charged half its L1
   * distance from the pool mix.
   */
  private balanceDeviation(
    objective: PlannerAttributeObjective,
    values: NormalizedFeatureValue[],
    capacity = values.length
  ): number {
    if (values.every((value) => value.kind === "scalar")) {
      const mean = this.poolMeans.get(objective.id) ?? 0;
      const sum = values.reduce((total, value) =>
        total + (value.kind === "scalar" ? value.value : 0), 0);
      return Math.abs(sum - values.length * mean) * SCALAR_BALANCE_FACTOR;
    }
    const shares = this.poolShares.get(objective.id) ?? new Map();
    const knownCapacity = Math.max(values.length,
      capacity * (this.poolKnownShare.get(objective.id) ?? 1));
    const counts = valueCounts(values);
    let deviation = 0;
    for (const [key, share] of shares) {
      deviation += Math.max(0, (counts.get(key) ?? 0) - share * knownCapacity);
    }
    return deviation;
  }

  /** Pool statistics for the people active this round. */
  private preparePool(active: T[]): void {
    this.poolShares = new Map();
    this.poolMeans = new Map();
    this.poolDistinct = new Map();
    this.poolKnownShare = new Map();
    const objectives = this.request.spreadSoloArrivals ?
      [...this.request.attributes, this.soloObjective()] :
      this.request.attributes;
    for (const objective of objectives) {
      const values = active
        .map((person) => objective.valuesByUid.get(person.uid))
        .filter((value): value is NormalizedFeatureValue =>
          value !== undefined);
      const counts = valueCounts(values);
      const shares = new Map<string, number>();
      for (const [key, count] of counts) {
        shares.set(key, values.length === 0 ? 0 : count / values.length);
      }
      this.poolShares.set(objective.id, shares);
      this.poolDistinct.set(objective.id, counts.size);
      this.poolKnownShare.set(objective.id,
        active.length === 0 ? 1 : values.length / active.length);
      this.poolMeans.set(objective.id, values.length === 0 ? 0 :
        values.reduce((sum, value) =>
          sum + (value.kind === "scalar" ? value.value : 0), 0) /
        values.length);
    }
  }

  private isSolo(person: T): boolean {
    const group = arrivalKey(person);
    return group === null || (this.arrivalGroupSize.get(group) ?? 0) <= 1;
  }

  private benchMinutesOf(person: T): number {
    return this.benchMinutes.get(person.uid) ?? 0;
  }

  private assignedMinutesOf(person: T): number {
    return this.assignedMinutes.get(person.uid) ?? 0;
  }
}

/** Number of values every unit can hold given how many people carry them. */
function coverableValueCount<T extends PlannerParticipant>(
  objective: PlannerAttributeObjective,
  members: T[],
  unitCount: number
): number {
  const counts = valueCounts(members
    .map((member) => objective.valuesByUid.get(member.uid))
    .filter((value): value is NormalizedFeatureValue => value !== undefined));
  return [...counts.values()].filter((count) => count >= unitCount).length;
}

function sideProfile<T extends PlannerParticipant>(
  objective: PlannerAttributeObjective,
  members: T[]
): Map<string, number> {
  const profile = new Map<string, number>();
  for (const member of members) {
    const value = objective.valuesByUid.get(member.uid);
    if (value === undefined) continue;
    if (value.kind === "scalar") {
      profile.set("#", (profile.get("#") ?? 0) +
        value.value * SCALAR_BALANCE_FACTOR);
    } else {
      for (const key of valueKeys(value)) {
        profile.set(key, (profile.get(key) ?? 0) + 1);
      }
    }
  }
  return profile;
}

function profileDistance(
  a: Map<string, number>,
  b: Map<string, number>
): number {
  let distance = 0;
  for (const key of new Set([...a.keys(), ...b.keys()])) {
    distance += Math.abs((a.get(key) ?? 0) - (b.get(key) ?? 0));
  }
  return distance / 2;
}

function valueKeys(value: NormalizedFeatureValue): string[] {
  switch (value.kind) {
  case "category":
    return [value.value];
  case "set":
    return [...value.values].sort();
  case "scalar":
    return [];
  }
}

function valueCounts(values: NormalizedFeatureValue[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    for (const key of valueKeys(value)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

function distinctCount(values: NormalizedFeatureValue[]): number {
  return valueCounts(values).size;
}

/** 0-1 similarity; neutral 0 when either value is missing. */
function valueSimilarity(
  a: NormalizedFeatureValue | undefined,
  b: NormalizedFeatureValue | undefined
): number {
  if (a === undefined || b === undefined || a.kind !== b.kind) return 0;
  if (a.kind === "scalar" && b.kind === "scalar") {
    return 1 - Math.abs(a.value - b.value);
  }
  if (a.kind === "category" && b.kind === "category") {
    return a.value === b.value ? 1 : 0;
  }
  if (a.kind === "set" && b.kind === "set") {
    const union = new Set([...a.values, ...b.values]).size;
    if (union === 0) return 0;
    return [...a.values].filter((value) => b.values.has(value)).length /
      union;
  }
  return 0;
}

/** All partitions of `members` into ordered-independent blocks of `size`. */
function* enumeratePartitions<T>(members: T[], size: number):
  Generator<T[][]> {
  if (members.length === 0) {
    yield [];
    return;
  }
  const [first, ...rest] = members;
  for (const companions of combinations(rest, size - 1)) {
    const remaining = rest.filter((member) => !companions.includes(member));
    for (const tail of enumeratePartitions(remaining, size)) {
      yield [[first, ...companions], ...tail];
    }
  }
}

function* combinations<T>(items: T[], k: number): Generator<T[]> {
  if (k === 0) {
    yield [];
    return;
  }
  for (let i = 0; i <= items.length - k; i++) {
    for (const tail of combinations(items.slice(i + 1), k - 1)) {
      yield [items[i], ...tail];
    }
  }
}

function anchorRank(
  person: PlannerParticipant,
  constraints: NormalizedAssignmentConstraints
): number {
  if (constraints.anchorGroupByUid.has(person.uid)) return 0;
  if (constraints.keepTogetherPeersByUid.has(person.uid)) return 1;
  return 2;
}

function arrivalKey(person: PlannerParticipant): string | null {
  const value = person.arrivalGroup?.trim().toLowerCase();
  return value === undefined || value.length === 0 ? null : value;
}

function pairKeys(members: PlannerParticipant[]): string[] {
  const keys: string[] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      keys.push(assignmentConstraintPairKey(members[i].uid, members[j].uid));
    }
  }
  return keys;
}

function ringNeighborKeys(seatOrder: string[]): string[] {
  if (seatOrder.length < 2) return [];
  if (seatOrder.length === 2) {
    return [assignmentConstraintPairKey(seatOrder[0], seatOrder[1])];
  }
  return seatOrder.map((uid, index) => assignmentConstraintPairKey(uid,
    seatOrder[(index + 1) % seatOrder.length]));
}

function uniqueSorted<T extends PlannerParticipant>(participants: T[]): T[] {
  const byUid = new Map<string, T>();
  for (const person of participants) {
    if (person.uid.trim().length === 0) continue;
    if (!byUid.has(person.uid)) byUid.set(person.uid, person);
  }
  return [...byUid.values()].sort((a, b) => a.uid.localeCompare(b.uid));
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function add(map: Map<string, number>, key: string, value: number): void {
  map.set(key, (map.get(key) ?? 0) + value);
}

function finite(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) ?
    Math.max(0, value) : 0;
}

function sortedRecord(map: Map<string, number>): Record<string, number> {
  return Object.fromEntries([...map.entries()]
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => a.localeCompare(b)));
}

function roundHash(
  seed: string,
  roundIndex: number | string,
  uid: string
): number {
  return fnv1a(`${seed}|${roundIndex}|${uid}`);
}

/** 32-bit FNV-1a; deterministic, dependency-free tie-breaking. */
function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}
