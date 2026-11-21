---
doc_id: shadow_organizer_profiles
owner: host_tooling
status: active
---

# Shadow Organizer Profiles

Owner decision, 20 Nov 2026. Some organizers already have a page on Catch that
nobody has claimed: Catch imported it, staff added it, or someone submitted it.
When the person who runs it signs into Catch Host with a phone number Catch
already holds for that page, Catch Host asks "Is this you?". It builds their
profile from the page and asks only for what is missing.

Everything ships switched off. Each phone source has its own switch, and the
owner has not yet chosen which to turn on.

## How it works

1. **The index.** `organizerPhoneLeads/{leadId}` maps one phone number to the
   unclaimed organizers it was seen with.
   - The id is a keyed hash of the E.164 number. No document stores the number
     itself.
   - Each entry names one organizer, the source that saw the number, how
     strong that source is, and when it last saw it.
   - The collection is server-only: client rules deny every read and write.
2. **Feeding it.** Triggers read the records that phones already arrive in. No
   front door changes. Each trigger returns at once while every source is off.
   | Source | Strength | Where it comes from | Wired |
   |---|---|---|---|
   | `self_verified_submitter` | strong | The number a person verified while submitting an instant draft, once the draft is saved as an organizer (`supplyIntakeRequests`) | Yes |
   | `sales_crm_verified` | strong | A phone endpoint staff marked verified on a sales contact relationship (`salesContactRelationships`) | Yes |
   | `staff_entered` | medium | A phone endpoint staff entered but did not verify, on the same records | Yes |
   | `public_page` | weak | A number printed on the organizer's public page | Not yet. No import keeps page phones today (listing approval clears `phoneNumber`), so the source has nothing to read until one does. |
3. **Finding a match.** Catch Host calls `findClaimableOrganizers` after sign-in.
   - The phone comes only from the caller's verified Firebase token, never from
     the request.
   - The answer lists up to five organizers that can still be claimed: not
     owned, not archived, not suppressed, not under another person's claim, and
     clear of the do-not-list.
   - Each candidate carries its public fields as the onboarding prefill, which
     fields are filled and which are missing, and source labels.
   - The answer never holds the phone or the lead id.
4. **Claiming.** The person claims through the existing `requestOrganizerClaim`.
   - When their verified phone matches an entry for that organizer, the claim
     request records `evidence: {kind: "phone_match", sources, strength}`.
   - Staff see that evidence in claim review. It is a hint, never approval on
     its own: a weak source is often a venue's or a shared line.
   - The request then waits for staff, exactly as today. If the person also
     passes the existing Instagram or Luma verification (#2096 registry), that
     verification approves the pending request at once.

5. **In Catch Host.** Organiser setup's step one reads the candidates
   (`hostClaimableOrganizersProvider`, `OrganizerClaimsRepository`).
   - With the read off, nothing found or a failed read, setup starts a new
     page exactly as before.
   - Otherwise it asks "Is this you?" (`HostSetupFoundBody`): each page's
     name, city, logo and, in plain words, why it was found.
   - "This is me" opens the claim form (`HostSetupClaimFormBody`): the
     claimant's name and role, which `requestOrganizerClaim` requires. "None
     of these" starts a new page.
   - Once sent (`HostSetupClaimSentBody`), setup shows what the page already
     has and what the host adds once it is theirs. The host does not retype
     what the page has; the missing fields are edited after approval, because
     nobody can edit a page before owning it. A page already waiting for this
     person's review goes straight to this view.
   - "Verify on the website now" opens `/claim/{organizerId}?requestId=…`,
     where the existing Instagram or Luma check hands the page over at once.
     The app builds no verification screen of its own.

## Privacy

- The phone is hashed with the server-held key, and no document stores it.
- The index is server-only and is never shown to clients.
- It is used only to suggest a claim to the verified owner of that number.
- Logs carry counts, never the phone or the lead id.
- The hash key is the do-not-list key (`LISTING_SUPPRESSION_HMAC_KEY`) under
  its own `phone-lead:` namespace. No new secret is needed before a deploy,
  and no lead id can equal a do-not-list hash.

## Switching it on

`functions/src/organizers/phoneLeads/policy.ts` holds the switches.
1. Set `enabled`, the owner's `decisionId`, and the chosen sources.
2. Catch Host already reads `findClaimableOrganizers` in setup step one
   (`lib/hosts/onboarding/setup_find_screen.dart`); it needs an app release
   carrying that step before hosts see it.
3. Index records that already exist, because triggers only see new writes.
   This needs a one-off backfill over `salesContactRelationships` and saved
   instant drafts.
