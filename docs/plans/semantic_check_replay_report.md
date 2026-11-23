---
doc_id: semantic_check_replay_report
owner: release_operations
status: draft
---

# Semantic Check Replay Report (23 Nov 2026)

The owner decided that whole-repo semantic checks may block in the merge
queue only after a clean replay. This report is that replay and a proposal.
It changes no gating; moving any check into a gating lane needs the owner's
approval. The tool and its method are in
[release_operations.md](../release_operations.md#semantic-check-replay).

## Summary

- **Inventory.** 74 whole-repo checks (`node tool/ci/semantic_check_replay.mjs inventory`).
  All 74 run in the tools lane when affected-tools selects them, and that
  lane is reporting-only under the sprint floor. 16 of them also run in a lane
  `Required CI` needs, so they gate today when that lane is selected. The other
  58 never block a merge.
- **Replay.** 8,765 judged runs over 124 first-parent commits of `main`
  (`03e29354` to `decffe32`, 19–22 Nov), plus 12 boundary commits for the three
  checks that failed. There were **0 flakes** and **4 failure incidents, all
  real**. Each was fixed by a follow-up commit within 0.5–4.8 hours.
- **Recommendation.**
  - 70 checks are gate-ready: zero flakes, and every failure they reported was real.
  - The 4 checks added on 21–22 Nov are **not yet**: re-evaluate them from a week of nightlies.
  - Gate the 70 in the queue on every entry, not only when affected-tools
    selects them: 2 of the 4 real breaks merged because affected-tools never
    selected the check that would have caught them.

**The window was sampled after commit 85.** The full run stopped at the
two-hour job limit after the oldest 85 commits (19–20 Nov). The newer 115 were
replayed at every third commit (39 commits). Where a failure began or ended in
the sampled part, the unsampled commits around it were replayed too, so the
commits named below as introducing and fixing each failure are exact.

## Where each check runs today

A merge-queue CI run executes a check:

- in the tools lane (`tools-ci.yml`), when `run.mjs affected-tools` selects
  it. Across the window, a check was selected on 37% of commits on average;
- in a lane workflow step that runs its script. The step gates when its
  lane is in `Required CI`'s needs and neither the step nor its job continues
  on error.

| Gates today (16) | Lane |
|---|---|
| `contracts:validate-schemas`, `market-catalog`, `market-lists`, `flutter-form-inventory`, `type-boundaries`, `path-literals`, `schema-fixtures`, `rules-semantics` | contracts |
| `contracts:firestore-contract`, `audit:fn-rate-limits`, `audit:fn-readme-inventory`, `firebase:params-coverage` | functions |
| `contracts:firestore-contract`, `contracts:storage-contract` | firestore-rules |
| `audit:unused-code` (surface workspaces only), `web:react-dependency-graph`, `design:icon-family-usage` | admin, marketing |

The flutter lane runs `copy:l10n-key-usage`, `contracts:organizer-nomenclature`,
`design:component-enforcement-coverage`, `design:new-widget-inventory` and
`design:icon-family-usage` on continue-on-error steps (sprint floor), so those
copies do not gate. The other 58 checks, including `meta:tool-manifest`,
`firebase:function-binding-intent`, `audit:functions-contexts` and
`operations:boundaries`, run only in the reporting tools lane.

## Failures (all real)

| Check | Introduced by | Fixed by | Red on `main` | Selected when introduced | Merged anyway |
|---|---|---|---:|---|---|
| `audit:unused-code` | #2181 `3236a34e`: new `tool/marketing` script imports `playwright`, which the root workspace does not list | #2226 `a1941d5a` (edits `tool/audit/knip.jsonc`) | 4.8 h | no | yes |
| `audit:unused-code` | #2359 `4d66cf5e`: `tool/ci/test_read_map.mjs` runs `strace`, an unlisted binary | #2364 `ff91986f` (allows `strace` in Knip) | 0.5 h | yes, in the reporting lane | yes |
| `audit:host-crm-boundaries` | #2292 `813503d2`: `websiteAccountSections.ts` reads a permission-authority collection with no reviewed owner | #2296 `94965b37` (checker and baseline) | 1.2 h | no | yes |
| `copy:l10n-key-usage` | #2273 `cf3e49fe`: removes the last use of an ARB entry | #2272 `05b21ebe` (ARB catalog), whose message notes the check failed for any PR touching copy | 1.3 h | yes, reporting lane and advisory flutter step | yes |

- **Blocking would have caught 2 of the 4.** For #2359 and #2273, affected-tools
  selected the check, so gating the tools lane would have blocked the breaking
  PR itself.
- **Selection missed the other 2.** For #2181 and #2292, the check was not
  selected: `audit:unused-code`'s `impactPaths` cover only its Knip
  configuration, and `audit:host-crm-boundaries`' cover only its own test.
  Each breaks on source files outside its paths, which is exactly what a
  whole-repo check does.
- **Admin lane copy.** The admin lane did run its `audit:unused-code` copy on #2181, but
  with only the surface workspaces (`admin`, `packages/web-ui`,
  `packages/web-config`), not the root workspace that owns `tool/`.
- **Red main blocks later PRs.** "Blocked merges" in the table below counts the
  failing commits whose queue run selected the check, including the breaking
  commit itself. For #2359 that is 1, the breaking PR alone. For #2273 it is 2:
  the breaking PR and one later PR. Under gating the break would not have
  landed, so the later PR would not have been held. A break that selection
  misses, and so lands, holds every later PR that selects the check until the fix.

## Replay artefacts found and excluded

- **Ratchets that compare with `origin/main`.** Six checks read `origin/main`:
  - `web:react-ui-lint` and `web:shared-ui-adoption`;
  - three `design:` widget inventories;
  - `meta:tool-manifest`.

  In a plain worktree that is today's `main`. So `web:react-ui-lint` failed on
  38 older commits against a suppression count that #2200 had since lowered.
  The replay now runs each commit in a shared clone whose `origin/main` is the
  commit's first parent, the base the queue compared with. Rerun that way, all
  six are clean on all 124 commits.
- **Memory kills.** Three parallel replay workers hit the container's memory
  limit (the cgroup OOM killer, logged in `dmesg`). Two `web:shared-ui-adoption`
  attempts died that way, one with exit 137 and one through an inner
  measurement child returning nothing, and passed on rerun. Run alone, three
  times each on both commits, all 6 attempts passed in 42–44 s. Neither is a
  flake. Attempts killed with SIGKILL or exit 137 are now counted apart from
  check results.

## Recommendation

1. **Gate-ready: 70 checks**, meaning every check in the table below except the 4 marked
   `insufficient`. Each has zero flakes in 123–136 commits, and every failure
   was a real break that a later commit fixed. Of these, 16 already gate in a
   lane, which leaves **54 to move from reporting to gating**.
2. **Run them on every queue entry.** All 70 run serially in 197 s at p50 and
   233 s at p95:
   - The 65 that each take under 10 s at p95 total 53 s at p50 and 64 s at p95.
     Run them on every queue entry in one job. That alone catches all 4
     breaks above, including the 2 that affected-tools missed.
   - Keep affected-tools selection for the 5 slow ones: `web:shared-ui-adoption`
     (56 s p50), `firebase:function-binding-intent` (36 s), `web:react-ui-lint`
     (25 s), `design:new-widget-inventory` (15 s) and
     `contracts:organizer-nomenclature` (12 s). That holds until each has a
     week of nightlies or its own `impactPaths` cover what it reads.
3. **Gate exactly the named list, not the whole tools lane.** Removing `tools` from
   `$reporting` would also gate the tools lane's unit tests and other tools,
   which this replay did not cover.
4. **Not yet: 4 checks with under 3 days of history.**
   - `audit:functions-contexts` (21 commits);
   - `contracts:bigquery-export-paths` (26);
   - `contracts:client-write-contracts` (27);
   - `docs:function-catalog` (7).

   They have passed every commit so far. Re-evaluate them from a week of
   nightly runs.
5. **Separately, fix the two selection gaps.** Widen `audit:unused-code`'s and
   `audit:host-crm-boundaries`' `impactPaths` to cover the sources they read.
   This applies whatever the gating decision is.

## Full results

Replayed 136 first-parent commits of decffe32cb0e118518cfed597af9fe870f330ebc, 03e29354 to decffe32.

| Check | Gates in queue today | Commits | Pass | Fail | Flaky | Setup | Pass rate | Selected | Blocked merges | p50 s | p95 s | Verdict |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `audit:app-architecture-exhibits` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 26 | 0 | 0.0 | 0.1 | clean |
| `audit:context-map` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 26 | 0 | 0.3 | 0.3 | clean |
| `audit:flutter-source-size` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 46 | 0 | 0.4 | 0.5 | clean |
| `audit:fn-rate-limits` | yes (functions) | 124 | 124 | 0 | 0 | 0 | 100.0% | 71 | 0 | 0.7 | 0.8 | clean |
| `audit:fn-readme-inventory` | yes (functions) | 124 | 124 | 0 | 0 | 0 | 100.0% | 43 | 0 | 0.0 | 0.1 | clean |
| `audit:functions-contexts` | no | 21 | 21 | 0 | 0 | 0 | 100.0% | 17 | 0 | 3.3 | 3.5 | insufficient |
| `audit:host-crm-boundaries` | no | 136 | 133 | 3 | 0 | 0 | 97.8% | 44 | 0 | 0.6 | 0.7 | failing |
| `audit:mutation-error-surfaces` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 35 | 0 | 0.2 | 0.2 | clean |
| `audit:route-string-literals` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 35 | 0 | 0.1 | 0.2 | clean |
| `audit:unused-code` | yes (admin, marketing) | 136 | 128 | 8 | 0 | 0 | 94.1% | 30 | 1 | 5.4 | 7.0 | failing |
| `audit:widget-cleanup` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 25 | 0 | 0.3 | 0.4 | clean |
| `contracts:bigquery-export-paths` | no | 26 | 26 | 0 | 0 | 0 | 100.0% | 13 | 0 | 0.1 | 0.1 | insufficient |
| `contracts:client-write-contracts` | no | 27 | 27 | 0 | 0 | 0 | 100.0% | 18 | 0 | 0.2 | 0.2 | insufficient |
| `contracts:firestore-contract` | yes (functions, firestore-rules) | 124 | 124 | 0 | 0 | 0 | 100.0% | 39 | 0 | 0.5 | 0.7 | clean |
| `contracts:firestore-query-indexes` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 47 | 0 | 0.1 | 0.1 | clean |
| `contracts:firestore-read-limits` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 36 | 0 | 0.1 | 0.1 | clean |
| `contracts:flutter-form-inventory` | yes (contracts) | 124 | 124 | 0 | 0 | 0 | 100.0% | 25 | 0 | 0.4 | 0.6 | clean |
| `contracts:market-catalog` | yes (contracts) | 124 | 124 | 0 | 0 | 0 | 100.0% | 36 | 0 | 0.4 | 0.5 | clean |
| `contracts:market-lists` | yes (contracts) | 124 | 124 | 0 | 0 | 0 | 100.0% | 124 | 0 | 0.3 | 0.4 | clean |
| `contracts:migration-contracts` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 25 | 0 | 0.0 | 0.1 | clean |
| `contracts:organizer-nomenclature` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 101 | 0 | 11.9 | 13.1 | clean |
| `contracts:path-literals` | yes (contracts) | 124 | 124 | 0 | 0 | 0 | 100.0% | 25 | 0 | 0.2 | 0.3 | clean |
| `contracts:rules-semantics` | yes (contracts) | 124 | 124 | 0 | 0 | 0 | 100.0% | 25 | 0 | 0.3 | 0.3 | clean |
| `contracts:schema-fixtures` | yes (contracts) | 124 | 124 | 0 | 0 | 0 | 100.0% | 60 | 0 | 2.2 | 2.4 | clean |
| `contracts:storage-contract` | yes (firestore-rules) | 124 | 124 | 0 | 0 | 0 | 100.0% | 25 | 0 | 0.0 | 0.1 | clean |
| `contracts:type-boundaries` | yes (contracts) | 124 | 124 | 0 | 0 | 0 | 100.0% | 25 | 0 | 2.7 | 3.2 | clean |
| `contracts:validate-schemas` | yes (contracts) | 124 | 124 | 0 | 0 | 0 | 100.0% | 60 | 0 | 0.2 | 0.3 | clean |
| `copy:l10n-key-usage` | no | 136 | 132 | 4 | 0 | 0 | 97.1% | 52 | 2 | 1.7 | 2.0 | failing |
| `copy:mobile-catalog` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 85 | 0 | 0.1 | 0.1 | clean |
| `design:component-enforcement-coverage` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 30 | 0 | 0.1 | 0.1 | clean |
| `design:field-facade-inventory` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 25 | 0 | 0.1 | 0.1 | clean |
| `design:host-event-field-contracts` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 39 | 0 | 0.1 | 0.2 | clean |
| `design:host-shell-coverage` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 28 | 0 | 0.0 | 0.1 | clean |
| `design:icon-family-usage` | yes (admin, marketing) | 124 | 124 | 0 | 0 | 0 | 100.0% | 66 | 0 | 2.0 | 2.3 | clean |
| `design:library-shims` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 27 | 0 | 0.2 | 0.3 | clean |
| `design:new-widget-inventory` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 49 | 0 | 14.7 | 16.2 | clean |
| `design:platform-token-coverage` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 27 | 0 | 0.2 | 0.2 | clean |
| `design:public-surface-behavior` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 35 | 0 | 0.2 | 0.3 | clean |
| `design:root-screen-composition-contracts` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 36 | 0 | 0.2 | 0.2 | clean |
| `design:screen-top-bar-contracts` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 45 | 0 | 0.5 | 0.6 | clean |
| `design:terminal-padding` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 25 | 0 | 0.2 | 0.2 | clean |
| `design:website-playbook` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 25 | 0 | 0.3 | 0.4 | clean |
| `design:widget-classification-check` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 34 | 0 | 2.6 | 2.9 | clean |
| `design:widget-pattern-families` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 37 | 0 | 0.1 | 0.2 | clean |
| `design:widgetbook-coverage` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 30 | 0 | 1.5 | 1.7 | clean |
| `docs:function-catalog` | no | 7 | 7 | 0 | 0 | 0 | 100.0% | 5 | 0 | 0.1 | 0.1 | insufficient |
| `firebase:function-binding-intent` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 70 | 0 | 36.2 | 40.4 | clean |
| `firebase:functions-source-closure` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 25 | 0 | 3.3 | 4.3 | clean |
| `firebase:params-coverage` | yes (functions) | 123 | 123 | 0 | 0 | 0 | 100.0% | 70 | 0 | 3.6 | 4.1 | clean |
| `marketing:website-a11y-debt` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 25 | 0 | 0.1 | 0.1 | clean |
| `marketing:website-components` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 25 | 0 | 0.1 | 0.1 | clean |
| `marketing:website-routes` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 42 | 0 | 0.1 | 0.2 | clean |
| `meta:brand-literals` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 123 | 0 | 0.9 | 1.2 | clean |
| `meta:ci-tool-category-coverage` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 35 | 0 | 0.0 | 0.1 | clean |
| `meta:repository-root-hygiene` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 123 | 0 | 1.0 | 1.3 | clean |
| `meta:third-party-names` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 123 | 0 | 2.8 | 3.2 | clean |
| `meta:tool-manifest` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 124 | 0 | 0.4 | 0.5 | clean |
| `operations:admin-action-catalog` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 26 | 0 | 0.7 | 0.9 | clean |
| `operations:boundaries` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 123 | 0 | 1.4 | 1.9 | clean |
| `operations:workflow-manifest` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 25 | 0 | 0.2 | 0.2 | clean |
| `platform:app-package-graphs` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 25 | 0 | 0.0 | 0.1 | clean |
| `platform:app-targets` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 30 | 0 | 0.1 | 0.1 | clean |
| `test:flutter-test-size` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 46 | 0 | 0.1 | 0.2 | clean |
| `web:admin-components` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 25 | 0 | 0.4 | 0.5 | clean |
| `web:admin-feature-exports` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 25 | 0 | 0.1 | 0.1 | clean |
| `web:admin-feature-ui-size` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 25 | 0 | 0.1 | 0.1 | clean |
| `web:admin-pending-operations` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 57 | 0 | 0.3 | 0.4 | clean |
| `web:react-component-governance` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 45 | 0 | 3.6 | 3.9 | clean |
| `web:react-controller-test-targets` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 34 | 0 | 4.7 | 5.5 | clean |
| `web:react-dependency-graph` | yes (admin, marketing) | 123 | 123 | 0 | 0 | 0 | 100.0% | 80 | 0 | 2.5 | 2.9 | clean |
| `web:react-query-state` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 34 | 0 | 0.1 | 0.1 | clean |
| `web:react-ui-lint` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 39 | 0 | 24.5 | 32.1 | clean |
| `web:shared-ui-adoption` | no | 124 | 124 | 0 | 0 | 0 | 100.0% | 60 | 0 | 56.0 | 67.2 | clean |
| `web:website-copy-ownership` | no | 123 | 123 | 0 | 0 | 0 | 100.0% | 37 | 0 | 1.1 | 1.4 | clean |

1 attempt(s) were killed by the replay host (SIGKILL, exit 137) and are not counted.

### Failures and flakes

- `audit:host-crm-boundaries`: failed on 3 commit(s) from 813503d2 (Website account page listens to the guest's own rows; the account read keeps only messages (#2292)), passing again at 94965b37 (red on main for 1.2 h); selected at introduction: no; blocked merges: 0.
  `functions/src/profiles/websiteAccountSections.ts:31: Permission-authority collection access requires an explicit reviewed owner.`
- `audit:unused-code`: failed on 5 commit(s) from 3236a34e (Add a website imagery audit that flags empty visual lanes (#2181)), passing again at a1941d5a (red on main for 4.8 h); selected at introduction: no; blocked merges: 0.
  `unlisted tool/marketing/audit_website_imagery.mjs playwright`
- `audit:unused-code`: failed on 3 commit(s) from 4d66cf5e (ci: nightly shadow read map of the dart:io Flutter tests (#2359)), passing again at ff91986f (red on main for 0.5 h); selected at introduction: yes; blocked merges: 1.
  `binary tool/ci/test_read_map.mjs strace`
- `copy:l10n-key-usage`: failed on 4 commit(s) from cf3e49fe (Sign-up and checkout: drop the separate ad notice, keep one terms line (#2273)), passing again at 05b21ebe (red on main for 1.3 h); selected at introduction: yes; blocked merges: 2.
  `Restore a handwritten production use or remove the obsolete ARB entry.`
