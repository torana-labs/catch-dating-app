---
doc_id: marketing_landing_page_research
version: 0.4.1
updated: 2026-10-18
owner: marketing_website
status: active
---

# Marketing Landing Page Research

This document is the durable research and design brief for the Catch marketing
site and the broader product visual system. Read it before changing
`website/`, app marketing screenshots, launch waitlist copy, host acquisition
copy, or app theme tokens that should inherit from the consumer brand.

The May 25, 2026 pass reviewed the current Catch homepage and host page, then
benchmarked 16 reference sites across dating apps, IRL dating events, social
event platforms, host software, ticketing, and active-community tooling.

## Executive Direction

Catch should look like a sophisticated consumer technology company built around
real-world momentum. The current site looks like a warm placeholder SaaS page:
large beige voids, orange-only accents, weak phone placeholders, decorative route
lines, and generic "how it works" copy. It explains the concept, but it does not
make the product feel inevitable, social, premium, or operationally credible.

The next page should be a single, confident story with two clear paths:

- **Members:** dating gets higher-signal because people meet through curated
  real-world events before the private interest layer opens.
- **Hosts:** Catch gives hosts an event operating system for singles and social
  formats: publish, shape admission, manage demand, check in attendees, run
  live facilitation, and turn the event into post-event matches, feedback, and
  repeat community momentum.

The site should be less "decorated startup landing page" and more
"editorial product launch." Use stronger typography, real or high-quality
generated lifestyle/event media, real app screenshots, and restrained product
UI. Product images must prove the loop instead of acting as soft orange blobs.

## Product Truth Correction

The first isolated preview generated from this research is rejected. It is too
run-club-specific, visually weak, and no longer matches the current product
surface. Keep it only as a discarded iteration, not as an approved direction.

Current repo truth from `PROJECT_CONTEXT.md`, `lib/kernel/activity_taxonomy.dart`,
`lib/event_policies/README.md`, and `docs/event_success.md`:

- Catch is evolving from a run-club dating app into a singles event platform
  built around clubs, hosts, city discovery, event booking, attendance, and
  post-event dating.
- Activity formats now include social run, walking, pickleball, padel, tennis,
  badminton, cycling, spin class, yoga, dinner, pub quiz, bar crawl, singles
  mixer, and custom open activities.
- Event structure is explicit through `EventFormatSnapshot`: format,
  interaction model, custom label, playbook, and event-success primitives.
- Host tooling includes event creation, editing, management, attendance,
  QR/self check-in, private links, invite-only access, policy snapshots,
  waitlists, cohort balance, dynamic pricing, cancellation, settlement, and
  post-event reporting.
- Event Success is live-wired product code: host setup/live/report, attendee
  companion, First Hello, social missions, rotations, micro-pods, private
  crushes, wingman requests, compatibility prompts, reveal moments, aggregate
  feedback, and host coaching.
- Swiping and matching still depend on event attendance, but the marketing
  promise should not say or imply that Catch is only for runners.

New positioning constraint:

> Catch is where curated singles events become real dating context.

That can include runs, racket sports, dinners, quiz nights, mixers, and custom
host-led formats. Running can remain a strong launch proof point, but it cannot
be the whole brand story.

## Current Catch Assessment

Evidence:

- Homepage screenshot:
  `docs/visual_references/marketing_site_research/current-catch-home.png`
- Host page screenshot:
  `docs/visual_references/marketing_site_research/current-catch-host.png`

What is working:

- The product premise is understandable when narrowed to the old run loop:
  book, show up, unlock a catch window.
- Member and host paths already exist as separate pages.
- The app screenshot manifest exists, so future production visuals can be
  sourced from the app instead of hand-authored marketing mockups.
- The waitlist and host forms already use the same `/api/join-waitlist` path.

What is not working:

- The first viewport does not feel like a dating or event company. It feels like
  a placeholder app deck with abstract route decoration.
- The palette is dominated by beige and orange. It lacks contrast, depth, nightlife
  energy, athletic freshness, and premium consumer-tech restraint.
- The phone visuals are weak because the placeholder screenshots are soft,
  washed out, and unreadable at the hero scale.
- The copy is accurate but not conversion-grade. It explains mechanics before it
  creates desire, status, safety, or urgency.
- Host value is present but thin. Hosts need to see event control, turnout,
  demand, revenue, attendance, and repeat-community growth.
- The current public story is stale against the product: it over-indexes on
  running and under-explains the broader event-platform model, format taxonomy,
  event policies, live event success, host reporting, and safety/privacy layers.
- There is no strong trust layer: no safety model, attendance-gating rationale,
  host controls, privacy expectation, or quality standard.
- The site does not show the real social object: a room, a court, a table, a
  route, a host-led mixer, a group, or the post-event moment.

## Reference Set

Screenshots are stored in
`docs/visual_references/marketing_site_research/`. A few sites block headless
capture by region or security checks; those are still included because their
text was accessible and their blocked screenshots are useful evidence.

| # | Reference | Category | URL | Screenshot | Relevance |
|---:|---|---|---|---|---|
| 1 | Matchbox | Event matchmaking software | https://match.box/ | `matchbox.png` | Closest exact reference for hosted-event matching. |
| 2 | Hinge | Dating app | https://hinge.co/ | `hinge.png` | Relationship positioning, research credibility, user outcomes. |
| 3 | Tinder | Dating app | https://tinder.com/ | `tinder.png` | Iconic simple CTA and mainstream dating category language. |
| 4 | Bumble | Dating and social app | https://bumble.com/ | `bumble.png` | Bright consumer confidence, profile-card visual language. |
| 5 | Feeld | Dating/community app | https://feeld.co/ | `feeld.png` | Sophisticated editorial photo/video feel and community positioning. |
| 6 | Thursday | IRL dating events | https://www.getthursday.com/ | `thursday.png` | Strongest visual proof for IRL dating energy and host lane. |
| 7 | Partiful Matchmaking | Dating-event host tools | https://partiful.com/matchmaking-events | `partiful-matchmaking.png` | Crush/mutual reveal flow, no-app host promise, dating event content. |
| 8 | Partiful Organizers | Community/event host tools | https://partiful.com/org-profiles | `partiful-organizers.png` | Organizer profiles, repeat communities, run-club adjacent examples. |
| 9 | Luma | Event hosting software | https://web.luma.com/ | `luma.png` | Clean event SaaS first viewport with product render and direct CTA. |
| 10 | Posh | Social event discovery and organizers | https://posh.vip/ | `posh.png` | Culture, run-club mention, organizer monetization. Visual blocked by region. |
| 11 | Eventbrite Organizer | Event management software | https://www.eventbrite.com/l/organize-an-event/ | `eventbrite-organize.png` | Creator growth, event management, proof/testimonials. |
| 12 | Meetup Organizers | Community hosting | https://www.meetup.com/start/organizing/ | `meetup-organizers.png` | Local community creation, organizer education, recurring events. |
| 13 | Splash | Event marketing platform | https://splashthat.com/ | `splash.png` | Enterprise event conversion, event-led growth, design plus analytics. Headless screenshot blocked by verification. |
| 14 | Ticket Tailor | Ticketing platform | https://www.tickettailor.com/en-us | `ticket-tailor.png` | Host economics, ticketing, lowest-friction event setup claims. |
| 15 | DICE | Event ticketing/discovery | https://dice.fm/ | `dice.png` | Music/event culture and app-only ticket trust model. Headless screenshot blocked by security. |
| 16 | Gametime Hero | Active community software | https://www.gametimehero.com/ | `gametimehero.png` | Run/hiking group relevance, organizer pain framing, payments/waivers/community. |

## Reference Findings

### 1. Matchbox

Matchbox is the closest conceptual competitor: host an event, guests answer a
questionnaire, the algorithm calculates matches, and results release at the same
time. Its page sells the host on control, pricing, capacity, public events,
private relay, countdown suspense, clues, insights, and commercial rights.

Useful patterns for Catch:

- The host is the buyer and operator, not just a passive event creator.
- Matching is framed as an event moment, not a background profile feed.
- Pricing and host rights are explicit, which makes the product feel real.
- "Release" is a ritual. The page gives the reveal emotional shape.
- FAQ content answers host-control questions directly.

Avoid:

- Matchbox leans dinner-party/cocktail-hour. Catch should feel more athletic,
  social, city-led, and app-native.
- Its dark rounded hero is elegant but too static for Catch if copied directly.

### 2. Hinge

Hinge sells the outcome rather than the interface: go on the last first date,
get off the app, and trust a researched matching approach. It uses human photo
proof, testimonials, and relationship-science credibility.

Useful patterns for Catch:

- Lead with a sharper belief, not a mechanics list.
- Treat research, compatibility, and daters' needs as credibility.
- Use real couple/user proof when available, but do not fake it before proof
  exists.
- A dating product can feel mature without being sterile.

Avoid:

- Hinge is relationship-led and broad. Catch has a stronger event gate and host
  surface; hiding that would waste differentiation.

### 3. Tinder

Tinder's page is simple and brand-iconic: "Swipe Right" plus create account.
It relies on brand memory, mainstream reach, and success stories.

Useful patterns for Catch:

- A short, repeatable phrase matters. Catch needs its own compact phrase around
  showing up first.
- Mainstream dating copy should not over-explain.
- Success stories will matter later, once real.

Avoid:

- Tinder's broad "meet anyone" promise is the opposite of Catch's filter. Catch
  should not sound like another infinite swipe app.

### 4. Bumble

Bumble uses huge brand typography, bright color, real people, and clear app
modes. The page is consumer-friendly and direct, with the product brand visible
immediately.

Useful patterns for Catch:

- Strong color fields can be memorable if they are disciplined.
- People and interests do more work than generic app mockups.
- App mode segmentation is easy to understand.

Avoid:

- Bumble yellow is too one-note to emulate. Catch needs more range: dawn,
  pavement, nightlife, athletic green, and warm coral as an accent.

### 5. Feeld

Feeld is the strongest reference for mature visual tone. It uses full-bleed
editorial photography/video, minimal chrome, large expressive type, and language
around curiosity, community, and desire. It feels adult and confident.

Useful patterns for Catch:

- Use real human imagery, not abstract gradients, as the emotional anchor.
- Keep nav restrained and premium.
- Let large typography occupy space without clutter.
- Treat the audience as socially sophisticated.

Avoid:

- Feeld's sensual/alternative tone does not map directly to Catch's hosted
  activity rooms. Catch should borrow the confidence and editorial quality, not
  the sexualized mood.

### 6. Thursday

Thursday is the strongest IRL dating-events reference. It uses nightlife video,
bold oversized type, press logos, city lists, direct event browsing, and an
explicit host program. It is loud, cultural, and unapologetically about getting
people offline.

Useful patterns for Catch:

- The site must show the event energy immediately.
- City presence and repeat cadence make the product feel alive.
- A host lane can sit in the same brand system as the member pitch.
- Press/social proof bars work when the brand has real proof.

Avoid:

- Thursday is intentionally brash. Catch should feel premium and athletic, not
  chaotic nightlife-only.

### 7. Partiful Matchmaking

Partiful's matchmaking page is extremely relevant: it explicitly targets speed
dating, matchmaking, singles events, and mutual crush reveal. The page makes the
host promise simple: guests RSVP, guests pick crushes, mutual matches reveal.

Useful patterns for Catch:

- A three-step dating-event flow converts because it is easy to retell.
- The host does not want awkward manual matching.
- "No rejections" and mutuality are trust copy, not only feature copy.
- App screenshots must be readable enough to prove the exact interaction.

Avoid:

- Partiful is playful and party-first. Catch should be more polished and
  activity-specific.

### 8. Partiful Organizers

Partiful's organizer page is useful because it speaks to recurring communities:
run clubs, book clubs, rec leagues, supper clubs, and organizer profiles. It
sells repeat attendance and a shareable home, not just one event page.

Useful patterns for Catch:

- Hosts need a reason to believe Catch compounds community value over time.
- Organizer identity matters. Host pages should not be generic admin screens.
- Community pages, repeat events, co-admins, text blasts, and reminders are all
  credible host benefits.

Avoid:

- Partiful can be intentionally unserious. Catch should be more premium because
  dating, payment, safety, and attendance quality require trust.

### 9. Luma

Luma has a clean, direct event software promise: create an event page, invite,
sell tickets. It uses a product render and a light, polished background.

Useful patterns for Catch:

- A single direct product sentence can carry the first viewport.
- Product visuals should be crisp, bright, and specific.
- Event software can feel delightful without looking childish.

Avoid:

- Luma's page is too generic for Catch by itself. Catch needs more emotional and
  social proof than a pure tool landing page.

### 10. Posh

Posh is about social event discovery and culture. Its accessible content
positions the product around meaningful IRL experiences, club parties, run
clubs, fashion shows, music festivals, organizer dashboards, selling out, and
scaling events. The headless screenshot is region-blocked in India.

Useful patterns for Catch:

- "Find your world" type positioning is stronger than generic "find events."
- Hosts want to build culture, not only manage logistics.
- Organizer economics and analytics can sit beside consumer discovery.

Avoid:

- Posh's cultural breadth can dilute the dating promise. Catch should keep the
  event-to-catch loop central.

### 11. Eventbrite Organizer

Eventbrite is a broad event management reference. Its organizer page sells
attendance growth, event management confidence, creator testimonials, and
sales/contact CTAs.

Useful patterns for Catch:

- Host pages should include creator proof and operational outcomes.
- "Increase attendance, engage community, create events with confidence" is the
  right kind of host benefit stack.
- Cookie banners and dense nav can damage first-impression polish.

Avoid:

- Generic event management language makes the product feel commoditized. Catch
  should only borrow the operational credibility.

### 12. Meetup Organizers

Meetup frames organizing as local community building. It explains finding
members, scheduling events, getting help from co-hosts, group review, and
monetization through dues or tickets.

Useful patterns for Catch:

- Host education matters. New hosts need to understand the path to a good room.
- Co-host and recurring-group concepts are important for clubs and repeat hosts.
- "Find your members" is relevant, but Catch should promise quality and context,
  not raw reach.

Avoid:

- Meetup's visual system is informational and dated compared with modern
  consumer brands.

### 13. Splash

Splash is event marketing for companies. The page sells higher-converting event
pages, branded templates, guest management, ticketing, invites, on-site tools,
integrations, reporting, and revenue attribution. Headless visual capture was
blocked by verification.

Useful patterns for Catch:

- Event pages must look great because the page itself shapes conversion.
- Host trust increases when analytics, check-in, reminders, and follow-up are
  presented as one connected workflow.
- Host-facing software can be premium without becoming enterprise-heavy.

Avoid:

- Do not adopt B2B jargon like pipeline or revenue attribution for members.
  Host copy can be operational, but member copy must stay human.

### 14. Ticket Tailor

Ticket Tailor is ticketing-first, but it explains first-timers, event pros, free
events, check-in app, time slots, products, memberships, API, reporting, and low
fees.

Useful patterns for Catch:

- Host economics need plain-language treatment.
- Check-in, time slots, waitlists, payment, and reporting are conversion
  features for operators.
- Simplicity and pricing can reduce host anxiety.

Avoid:

- Ticketing alone is not Catch's differentiator. The site should not become a
  ticketing SaaS page.

### 15. DICE

DICE is culture and ticket trust. The direct screenshot hit a security
verification page, but DICE remains relevant as a reference for app-first event
discovery, artists/promoters/venues, anti-scalping posture, and mobile ticket
trust.

Useful patterns for Catch:

- Event discovery can feel culturally curated instead of utility-only.
- Mobile-only or app-first ticket mechanics can increase trust if explained.
- Consumer event brands need strong taste signals.

Avoid:

- DICE is music-first. Catch should use activity and social compatibility as the
  organizing principle.

### 16. Gametime Hero

Gametime Hero is directly relevant to active communities. It sells replacement
of spreadsheets, forms, Venmo, websites, and messy chats. It covers events,
payments, waivers, public sites, rosters, reminders, and running/hiking groups.

Useful patterns for Catch:

- Host pain copy should name the tools they currently juggle.
- Active communities need payments, reminders, waitlists, forms, and rosters in
  one place.
- Running-group testimonials are a useful future proof format.

Avoid:

- The page uses generic mock product imagery and chat widgets that can cheapen
  the feel. Catch should make every product visual high-quality.

## Cross-Reference Patterns To Adopt

1. **Use the social object first.** Thursday, Feeld, and Partiful prove that
   people need to see the room, event, or invite before they care about feature
   mechanics.
2. **Make the loop retellable.** Partiful and Matchbox win because their flows
   are easy to explain. Catch's loop should be: choose a curated event, show
   up, let the host/event guide the room, privately catch people you met, match
   with context.
3. **Sell hosts on control.** Matchbox, Splash, Eventbrite, Ticket Tailor, and
   Gametime Hero all tell hosts what they can control: format, admission,
   capacity, invitations, cohort balance, waitlist, payments, check-in, live
   facilitation, reporting, and follow-up.
4. **Pair emotional proof with operational proof.** Members need desire and
   safety. Hosts need turnout and tools.
5. **Use large brand typography, not tiny startup badges.** Bumble, Thursday,
   Feeld, and Matchbox make the brand unmistakable in the first viewport.
6. **Use real media.** Editorial photography, event video, and readable app
   screenshots are non-negotiable for conversion.
7. **Avoid one-note palettes.** Strong references use contrast: dark/light,
   photo/color, sober UI/accent moments. Catch should move beyond orange/beige.
8. **Make city/community visible.** Thursday, Meetup, Partiful, and Gametime
   Hero show that local community credibility is part of conversion.
9. **Trust is a feature.** Mutuality, attendance gates, host controls, no
   rejection exposure, private contact handling, and safety expectations need
   explicit treatment.
10. **Do not over-index on app chrome.** Product UI should prove the loop, but
   the first emotional signal should come from people and real events.

## Content Inventory For The Next Page

| Content | Audience | Why it is necessary | Source pattern | Status |
|---|---|---|---|---|
| Brand-first hero with `Catch` as the first-viewport signal | All | The current page explains too much before establishing brand confidence. | Bumble, Feeld, Matchbox | Required |
| One-line positioning: curated singles events become dating context | Members, hosts | Differentiates Catch from swipe apps, run-only apps, and generic event tools. | Hinge, Thursday, Partiful | Required |
| Member CTA and host CTA in the first viewport | Both | Catch has two conversion paths with different motivations. | Thursday, Posh, Eventbrite | Required |
| Real multi-format event/lifestyle hero media | Members | Dating conversion needs desire, people, energy, and trust across more than runs. | Feeld, Thursday, Bumble | Required asset |
| Product loop section: Choose, Show up, Guided moment, Catch, Chat | Members | Makes the mechanic retellable and lowers confusion. | Partiful, Matchbox | Required |
| Host operating system section | Hosts | Host conversion requires more than "apply as host." | Matchbox, Eventbrite, Gametime Hero | Required |
| Event-format breadth | Both | The product is no longer pure run club; the page must show courts, dinners, quizzes, mixers, walks, and custom hosted formats. | Partiful, Posh, Meetup | Required |
| Host economics/control copy | Hosts | Hosts need to know if this helps fill events, manage waitlists, shape cohorts, handle payments, and run safer rooms. | Ticket Tailor, Splash, Eventbrite | Required |
| Trust and safety model | Both | Attendance-gated dating needs explicit consent, privacy, host controls, and no cold-DM norms. | Hinge, Partiful, DICE | Required |
| App screenshot proof | Both | The site needs tangible software credibility. | Luma, Bumble, Partiful | Required asset |
| City launch and community sequencing | Both | Mumbai-first access needs to feel curated, not unavailable. | Thursday, Meetup | Required |
| Waitlist form | Members | Current conversion path remains useful. | Current Catch | Required |
| Host application form | Hosts | Host supply is strategically important before broad member launch. | Current Catch, Eventbrite | Required |
| FAQ | Both | Explains who sees whom, when matching opens, host control, privacy, and no-show rules. | Matchbox, Meetup | Required |
| Future proof metrics/testimonials | Both | Needed later, but must not be invented. | Hinge, Eventbrite, Splash | Deferred until real |

## Rejected Preview

The rejected `website/research-preview/index.html` was deleted during the public
sitemap consolidation on 2026-10-18. It was never wired into Firebase Hosting.
Git history retains its source; the screenshots below remain historical evidence.
Supported discovery, attendance, private mutual catches, host controls and access
journeys are covered by `/explore/`, `/host/` and `/host/apply/`. Fictional counters,
run-only positioning and fixed catch-window claims are not promoted as live facts.
Do not reuse that preview as an approved visual or content direction.

Reasons:

- It presents Catch as a pure run-club product.
- It ignores the current activity taxonomy and event-format breadth.
- It underplays event policy, admission, cohort balance, waitlist, pricing,
  live facilitation, and host reporting.
- It is visually not strong enough for the intended consumer-tech brand.
- It treats the event as a background card instead of making the social room,
  host, and attendee energy the hero.

The current React pages and `docs/marketing_website_architecture.md` supersede
this rejected preview; this section records the historical rejection.

## Proposed Page Structure

1. **Hero: Catch. The room before the match.**
   - Purpose: make the brand and the category promise immediate.
   - Content: member CTA, host CTA, short member and host value sentence,
     launch/city/status cues.
   - Visual: editorial multi-format event scene or generated equivalent:
     people arriving, talking, laughing, checking in, playing, dining, or
     gathering. Running can appear as one scene, not the whole canvas.

2. **The Loop**
   - Purpose: make the product mechanic memorable.
   - Content: choose a hosted event, show up/check in, follow the room moment,
     catch privately, match/chat with shared context.
   - Visual: horizontal steps with strong numeric rhythm.

3. **Formats**
   - Purpose: make clear this is not a run-only app.
   - Content: social runs, walks, racket sports, dinners, pub quizzes, bar
     crawls, singles mixers, and custom host-led formats.
   - Visual: modular event tiles with format, social structure, and trust cue.

4. **For Members / For Hosts**
   - Purpose: clarify two audiences without splitting the whole journey too
     early.
   - Content: members get higher-signal dating through real rooms; hosts get
     event control, demand management, live guidance, and post-event signal.
   - Visual: two side-by-side proof panels.

5. **Host Console**
   - Purpose: show this is real software for operators.
   - Content: publish, configure format and admission, shape demand, balance
     cohorts, manage waitlist/payment, check in, start live mode, review
     aggregate signal.
   - Visual: denser dashboard-like product panel with live event state.

6. **Quality Gates**
   - Purpose: address trust, consent, no-shows, and host control.
   - Content: attendance gate, mutual matching, host-owned room standards,
     private contact rules, safety escalation.

7. **City Launch**
   - Purpose: make waitlist scarcity feel intentional.
   - Content: Mumbai pilot, city sequencing, member waitlist, founding host
     application.

8. **FAQ**
   - Purpose: answer conversion blockers without diluting the hero.
   - Content: who can join, when matching opens, what hosts control, what
     happens if someone no-shows, whether this is only for runners, which event
     formats are supported, and how privacy works.

## App UI And Brand Implications

The website should inform the app, not diverge from it.

Palette direction:

- `ink`: near-black charcoal for premium editorial grounding.
- `paper`: warm off-white used sparingly, not as an all-page beige wash.
- `sport green`: active, social, and host-operational.
- `coral`: Catch action color, used with restraint.
- `lime`: small signal/accent for live states, reveal moments, and success.
- `sky/lavender`: secondary atmospheric accents for city/event variety.

Typography direction:

- Use a confident grotesk display style for major brand statements.
- Keep body copy calm, readable, and tighter than the current site.
- Avoid tiny uppercase eyebrow labels in hero sections.
- In app UI, use compact labels and event data with clearer hierarchy.

Component direction:

- Reduce oversized pills and heavy soft shadows.
- Use open bands, rails, media panels, and crisp event/product surfaces.
- Keep cards at 8px radius or less unless the app design system requires a
  larger radius for phone mockups or media crops.
- Do not nest cards inside cards.
- Product proof should show real states: event discovery, format selection,
  booking, admission/waitlist status, check-in, live event companion, catch
  window/private crush, match chat, host setup, live console, and post-event
  report.

Photography/media direction:

- Primary images should show real people, group energy, city culture, hosts,
  venue/court/table/route contexts, and after-event social moments.
- Avoid stock-like solitary runners, generic sunsets, and blurred atmospheric
  crops that do not show the product's social object.
- Until owned media exists, use clearly documented generated or temporary
  concept assets, not ambiguous placeholders.

## Asset Requirements Before Production Rewrite

- Hero lifestyle/event media: one desktop crop and one mobile crop showing a
  social event, not a solitary runner.
- Member app captures: event discovery with multiple formats, booking/admission
  status, check-in/live companion, catch/private-crush moment, match chat with
  shared event context.
- Host app captures: event format setup, admission/waitlist/cohort controls,
  demand/payment state, check-in/live console, post-event report.
- Optional motion: short loop of a route/event card becoming a catch window.
- Logo/brand lockup refinement: current `C` dot is not enough for a premium
  consumer landing page.
- Testimonial/proof policy: do not invent user counts, press, marriages, or
  host revenue. Use "founding host access" until real proof exists.

## Open Product Questions

1. Which event formats are public-launch-ready versus product-roadmap-visible?
2. What exact host supply is being recruited first: run clubs, racket-sport
   organizers, supper-club hosts, quiz/bar hosts, venues, event promoters, or
   all of them?
3. Are paid events part of the first public host pitch, or should payment/revenue
   language stay below the fold until operations are ready?
4. What safety/verification claims are true today and can be stated publicly?
5. What cities beyond Mumbai should appear in launch copy, if any?
6. Should host conversion go to the same waitlist endpoint or a more structured
   host intake later?
7. What product metrics are allowed once beta starts: attendance, matches,
   catches, host fill rate, repeat attendance, event-success scorecards, or
   user stories?

## Production Implementation: 2026-05-25

The approved next pass rewrote the live site instead of keeping the work
isolated in `website/research-preview/`. On 2026-06-02, the implementation was
migrated from standalone static HTML/CSS/JS to Vite + React + TypeScript while
preserving the approved content, section order, capture manifest contract, and
visual direction.

Implemented surfaces:

- `website/src/App.tsx`: member-facing homepage and host-specific conversion
  page with shared React components, waitlist handling, capture manifest loading,
  and route-specific metadata updates.
- `website/src/styles.css`: responsive shared stylesheet using one React
  structure, mobile-first constraints, breakpoints at `720px`, `980px`, and
  `1180px`, controlled text measures, 8px surfaces, and a dark premium palette
  led by ink, bone, lime, oxblood/plum, teal, and cobalt accents.
- `website/scripts/postbuild.mjs`: creates route-specific static metadata for
  `/` and `/host/` in the deployable Vite output.
- `website/public/assets/marketing/catch-hero-event-temporary.png`: temporary
  generated event media used as the homepage hero until owned event photography
  replaces it.
- `tool/marketing/capture_manifest.json` and
  `website/public/assets/app-screenshots/manifest.json`: copy updated away from
  the old run-only story while keeping the app screenshot capture pipeline
  intact.

Implemented content rationale:

- **Hero:** the brand and "The room before the match" communicate the core
  belief immediately, with event energy as the primary visual proof.
- **Formats:** establishes that Catch is a multi-format singles event platform,
  not a pure run-club app.
- **Member loop:** explains why dating quality improves when browsing,
  attendance, private catches, and matching happen in that order.
- **Host proof:** makes hosts a first-class buyer/operator and shows admission,
  waitlist, live mode, and reporting as real controls.
- **App-sourced screenshots:** keeps the marketing site tied to deterministic
  product captures instead of hand-authored phone mockups.
- **Trust:** states the conversion-critical privacy and safety model without
  inventing proof, user counts, or press claims.
- **Waitlist and host application:** gives both audiences direct conversion
  paths while reusing the existing `/api/join-waitlist` boundary.

Verification evidence:

- Desktop and mobile production screenshots are cataloged in
  `docs/visual_references/marketing_site_research/README.md`.
- The homepage was visually inspected against the generated desktop concept and
  the corrected mobile concept. The final implementation intentionally keeps
  the stronger dark editorial direction while removing the old run-only framing.

## Production Tracker Closure

The marketing landing-page tracker is folded into this document. The production
rewrite shipped, then moved to Vite + React + TypeScript. The rejected isolated
preview remains historical evidence only; it is not a product direction.

Durable guardrails:

- Do not invent social proof, press, user counts, host revenue, match success,
  or safety guarantees.
- Do not return to a run-club-only frame.
- Do not bury the host path below member-only copy.
- Keep host tooling concrete: admission, cohort balance, waitlist, payments,
  check-in/live mode, and reporting where those claims are true.
- Do not imply every event format supports the same live facilitation depth.
- Do not ship placeholder phone mockups as the primary proof when deterministic
  app-sourced captures exist.
- Keep the screenshot manifest contract intact unless
  `docs/marketing_app_media_pipeline.md` changes in the same pass.

Residual product decisions:

- Which event formats are public-launch-ready versus roadmap-visible.
- Whether the next site iteration should keep one combined member/host page or
  deepen `/host/` as a host-specific conversion page.
- Which claims are safe today: attendance-gated matching, private catches, host
  controls, live guide, event-success report, App Store/Play Store timing, and
  payment.
- Whether temporary hero/event media should be generated, owned, or blocked
  until real event photography exists.
