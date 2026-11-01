---
doc_id: clubs_to_organizers_migration
version: 1.2.3
updated: 2026-11-01
owner: data_platform
status: active
---

# Clubs To Organizers Migration

This document records the completed one-time authority cutover from `clubs` to
`organizers`. `Organizer` is the durable entity; `club` is one value of its
required `organizerType`.

The original migration was additive and idempotent. The application has not
launched, and the owner has approved local retirement of its legacy contracts,
callable aliases, rule paths, storage paths, and client fallbacks. This record
does not authorize remote deletion; any synthetic-data reset and deployment
still require a separate explicit approval.

## Canonical Type Model

`organizers/{organizerId}.organizerType` is a closed enum:

| Type | Use it for | Typical examples |
|---|---|---|
| `club` | A membership-oriented group organized around a recurring activity or identity. | run club, book club, cycling club |
| `community` | A broader social community whose identity is not primarily a formal club. | neighborhood group, creator community, interest collective |
| `individual` | A person publishing events in their own professional capacity. | independent host, coach, facilitator |
| `eventProducer` | An organization primarily producing programmed events or experiences. | singles-events company, festival producer, workshop series |
| `venue` | A place that hosts or curates events under its own identity. | cafe, studio, bar, coworking space |
| `brand` | A commercial or institutional brand organizing community activity. | sports brand, university, employer community |

The values are operational identity, not marketing copy. The optional
`publicCategoryLabel` can carry a reviewed display label without expanding the
enum. Legacy records with no usable classification become `club`.
`creatorCommunity` maps to `community`; `eventOrganizer` maps to
`eventProducer`; `venue` and `brand` retain their meaning.

The organizer owner can edit `organizerType` in the Hosts app. Managers can see
the field but cannot change it. Every change writes `organizerTypeUpdatedAt`
and `organizerTypeUpdatedByUid`; public category text remains independently
reviewed.

## Authority And Compatibility

| Concern | Canonical authority | Retired local projection |
|---|---|---|
| Entity | `organizers/{organizerId}` | `clubs/{clubId}` |
| Owner/manager relationship | `organizerTeamMemberships/{organizerId_uid}` | host-role `clubMemberships` and `clubHostClaims` |
| Consumer relationship | `organizerFollows/{organizerId_uid}` | member-role `clubMemberships/{clubId_uid}` |
| Posts | `organizers/{organizerId}/posts/{postId}` | `clubs/{clubId}/posts/{postId}` |
| Claim review | `organizerClaimRequests/{requestId}` | `clubClaimRequests/{requestId}` |
| Schedule lock | `organizerScheduleLocks/{lockId}` | `clubScheduleLocks/{lockId}` |
| Media | `organizers/{organizerId}/...` | `clubs/{clubId}/...` |
| Dependent identity | `organizerId` | `clubId` |
| Public route | `/organizers/.../` | existing legacy redirects only |

New Flutter, React, and Functions code must use the canonical column. Legacy
fields and paths are not local source contracts or alternate sources of truth.
`tool/check_organizer_nomenclature.mjs` enforces the selected cutover points.

Flutter organizer reads now use `organizers` exclusively. The temporary
permission-denied fallback to `clubs` was retired on 2026-07-22 after staging
and production rules were deployed and production parity reached 41 clubs, 41
organizers, zero remaining writes, and zero blockers. The legacy collections
are not local read/write projections, callable aliases, or rule paths. Existing
remote synthetic data must be reset or migrated before a deployment that removes
those legacy surfaces.

## Migration Record

The one-time migration tool copied every `clubs/{id}` document
into `organizers/{id}` (defaulting the type to `club`), split host and member
edges into `organizerTeamMemberships` and `organizerFollows`, backfilled
`organizerId` on dependent documents, and copied Storage objects from `clubs/`
to `organizers/`. It never deleted source data.

The read-only dry run ran on 2026-07-20. Staging and production were applied
and reached parity on 2026-07-22: production created 41 canonical organizers
through 6,780 writes, and an independent reread found zero remaining writes,
blockers, or Storage copies.

The migration is complete. The tool, its migration contract and the dry-run
and rollout evidence files were deleted on 2026-11-01 and remain in git
history. Remaining
legacy data goes with the owner-approved wipe-and-reseed after the
Club-to-Organizer wire rename (#1296), not with another migration.
