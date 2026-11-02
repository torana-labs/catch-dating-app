An event as a card: a poster in its format colour, a photo-led cover, a compact card for rails, or an outside event that links out.

**Registry:** `catch.event_card · catch.cover_story` · Flutter and React: `EventCard` · In this system: `Catch.EventCard`

## When to use
Use **poster** for the one event a screen is about (Today, a host's next night). **cover** in feeds and grids. **compact** in rails. **external** for events hosted elsewhere: they never open an event page.

## What you provide
`variant`, `title`, `format`, `formatLabel`, `when`, `place`, `flag`, `counts`, `people` + `peopleTotal`, `price`, `imageUrl`, `source`, `status`, `href` or `onPress`, `transitionName`.

## How it adapts
Posters set the format scope, so badges, avatar rings and markers inside take the event colour. Without a photo, covers show the title on the format colour.

## States and motion
Pressed scale; with `transitionName` the card grows into the event page hero (Flutter: Hero with the same tag).

<!-- generated:flutter:start -->
## Flutter

`catch.event_card`:
- `EventCard`
`catch.cover_story`:
- `FeaturedEventPoster`
<!-- generated:flutter:end -->

## Replaces
HostEventPoster, AppEventCard, FeaturedEventPoster and the external event tiles.
