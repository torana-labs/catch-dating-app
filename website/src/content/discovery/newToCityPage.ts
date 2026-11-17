import {brand} from "../brand.ts";

/**
 * Copy for the new-to-the-city pages (/new-to-<city>/, the redesign's
 * PlaybookNewToCity board). Friends and community only: the page never
 * mentions the guest app's matching (owner decision). The board's "came
 * alone" counts are not shown: no read model holds them.
 */
export const newToCityPageCopy = {
  hero: {
    kicker: "New to {city}",
    title: "Just moved? Your first friends here are at a table this week.",
    lead: "Runs, quizzes, suppers and socials where coming on your own is normal. The host puts you in a group, someone says hello, and by next month you’re a regular.",
    plansAction: "See this week’s plans",
    notifyAction: "Get new plans on WhatsApp",
    cardLabel: "New to {city}",
    cardSubtitle: "{host} · {place} · {when}",
  },
  plans: {
    kicker: "Good for coming alone",
    title: "This week, for newcomers",
    /** Nothing this week: the next two weeks instead (the owner's 14-day rule). */
    quietTitle: "Coming up, for newcomers",
    lead: "Plans where the host makes the groups, so you’re never standing by the door.",
    seeAll: "See everything in {city}",
    empty: "Nothing for newcomers in the next two weeks yet.",
    emptyBody: "New plans go up as hosts add them. Get them on WhatsApp below.",
  },
  alone: {
    kicker: "Coming on your own",
    title: "What happens when you walk in alone.",
    items: [
      {title: "You know who to look for", body: "When you check in, your phone shows your group, team or table, and who’s leading it."},
      {title: "The host knows you’re new", body: "First-timers are marked on the host’s door list, so you get a proper hello."},
      {title: "Groups change through the night", body: "At quizzes, suppers and socials, you’ll meet a few groups, not just the people next to you."},
    ],
  },
  month: {
    kicker: "A first month in {city}",
    title: "Four plans, then you’re a regular.",
    items: [
      {label: "Week 1", title: "A Sunday run", body: "Free, early, easy. Coffee after is where people talk."},
      {label: "Week 2", title: "A pub quiz", body: "Teams are made at the door. You’ll know five names by round three."},
      {label: "Week 3", title: "A long-table supper", body: "Six to a table, a seat swap at dessert."},
      {label: "Week 4", title: "Back to your favourite", body: "Follow the host and you’ll hear about the next one first."},
    ],
  },
  trust: {
    kicker: "Hosts you can trust",
    title: "Real hosts, real reviews.",
    lead: `Every plan is run by a host with a page, past events and reviews from people who booked. Payments go through ${brand.name}, and you can see the cancellation policy before you book.`,
    items: [
      {title: "Reviews from people who went", body: "Only people who booked can review."},
      {title: "Busy, public places", body: "Cafés, bars, parks and courts."},
      {title: "You choose what you hear", body: "Updates from a host only if you say yes."},
      {title: "Help on the night", body: "Ask the host from your phone."},
    ],
    action: "How we keep plans safe",
  },
  areas: {
    kicker: "By neighbourhood",
    title: "Near where you’ve moved",
  },
  faq: {
    kicker: "Questions",
    title: "New to {city}: common questions",
    items: [
      {question: "Is it weird to go on my own?", answer: "Not at these. Hosts plan for people coming alone: groups, teams and tables are made for you, and first-timers get a hello."},
      {question: "What’s the easiest first plan?", answer: "A free Sunday run or a pub quiz. Both put you in a group straight away and last about two hours."},
      {question: "Do I need the app?", answer: "No. You can book and pay for a plan on the website in your phone’s browser. Some hosts also check you in there; the rest check you in at the door."},
      {question: "How do I keep meeting the same people?", answer: "Go back to the plans you liked and follow the host. Regulars are how friendships start."},
      {question: "Will hosts message me?", answer: "About the plan you booked, yes: where to be and any changes. Anything else, like news of their next event, only if you say yes."},
      {question: "What if I can’t make it?", answer: "Cancel from your booking. Refunds follow the host’s cancellation policy, shown before you book."},
    ],
  },
  notify: {
    kicker: "Hear about new plans first",
    title: "Get newcomer-friendly plans on WhatsApp.",
  },
  meta: {
    title: `New to {city}? Plans for your first month | ${brand.name}`,
    description: "Just moved to {city}? Runs, quizzes, suppers and socials where coming on your own is normal, run by hosts with reviews.",
  },
} as const;
