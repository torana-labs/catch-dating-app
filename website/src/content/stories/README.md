# Host stories

`/stories/` and `/stories/<slug>/` are built and shelved: the page is written
(`content/playbook/pages/resources/stories.json`) but not served until real
stories exist. `docs/marketing_website_architecture.md` (Playbook pages,
Shelved pages) says how to switch it on.

A real story needs all of these before it goes in `hostStories.ts` or gets a
`story_detail/<slug>` page:

- **The organiser's written consent** to publish the story, their name and
  any figures and photos, with the date and where the consent is filed
  (`consent` in `hostStories.ts`). They approve the final text.
- **Real figures only**, each with its source: from their Catch records with
  the dates they cover, or self-reported by the organiser and marked as such.
  No estimates, averages or "up to" claims.
- **Photos with rights**: taken by or for Catch with the organiser's and the
  guests' agreement, or supplied by the organiser with permission to publish,
  saved under `website/public/assets/`.

Fictional stories for Storybook and tests live in
`website/src/stories/fixtures/hostStories.ts`. Never put a placeholder or
sample story in this folder or in shipped page content.
