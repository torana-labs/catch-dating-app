---
status: active
---

# User Profile

User profile owns the private `users/{uid}` profile, profile editing, preview
data, and the source fields that feed public profile projection.

## Current Contract

- Public profile name should come from `displayName`, with legacy fallbacks
  only while old data exists.
- Last name is private and should not become a public profile field by default.
- Date of birth and gender are identity fields, not casual profile text.
- Schema changes belong in `contracts/` first, then generated Dart/TypeScript
  outputs and rules/tests should be updated through `docs/data_contracts.md`.

## Participant form cards

The Forms & cards tab remains available before dating setup. The authenticated
form directory groups submissions by organizer ID, even when two organizers have
the same name, and shows the newest loaded submission first within each group.
Unclaimed submissions are labelled as awaiting review; claimed rows show how many
applicant-selected answers are on their private card. Pagination counts are not
presented as totals. Opening a row retains the existing explicit profile/card
review flow. CRM notes, tags and reviews never enter these cards.

The Edit tab explains the boundary between core Catch profile details and private
organizer cards. Running remains an optional, initially collapsed activity section
after core and lifestyle details; its existing persisted preferences and editors
are preserved. Choosing answers to share in an eligible event chat is a separate
action, and other organizers cannot read private cards.

## Verified Open Issues

Verified on 2026-06-29 against the profile tab (now
`lib/user_profile/presentation/widgets/profile_tab_body.dart`),
`lib/contexts/profiles/domain/user_profile.dart`, and
`test/profile/profile_widgets_test.dart`:

1. `Phone` is display-only in Profile. The profile patch contract excludes it,
   and initial profile creation must match the Firebase Auth phone claim. A
   future phone change must update the Auth credential through OTP first and
   then synchronize the private profile through a server-owned operation.
2. `Date of birth` is still display-only. Decide whether corrections go
   through an in-app support flow, admin review, or a carefully constrained
   editor.
3. `Gender` is still display-only. Decide whether corrections go through
   support/admin review or a constrained editor.
4. `UserProfile` still carries legacy `name` alongside `firstName`,
   `lastName`, and `displayName`. Pick the canonical storage contract and plan
   the migration before removing compatibility fallbacks.

## Re-Audit Rule

Do not reuse old pre-rename run/club profile-adjacent audit findings without a
fresh read of current `lib/events/**`, `lib/clubs/**`, `lib/user_profile/**`,
tests, and relevant Functions. Notification and map preferences have moved
toward Settings, so old "not exposed" claims need live verification.
