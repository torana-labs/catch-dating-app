export const consumerHomeCopy = {
  hero: {title: "Find something worth showing up for.", body: "Discover runs, dinners, games, nights out, and the people who bring them together.", alt: "People enjoying a social run together at sunset"},
  actions: {find: "Find events", all: "See all events", organisers: "Browse organisers", organiser: "View organiser", changeCity: "Change city", clear: "Clear filters", host: "Explore Catch Host", retry: "Try again", help: "Visit Catch Help"},
  cityLabel: "Choose your city",
  filtersLabel: "Event formats",
  categories: [
    {id: "all", label: "All"}, {id: "runs", label: "Runs"}, {id: "food", label: "Food & drink"},
    {id: "games", label: "Games"}, {id: "sport", label: "Sport"}, {id: "nights", label: "Nights out"},
  ],
  events: {title: "Make a plan in {city}.", empty: "We don’t have upcoming events listed in {city} yet.", emptyBody: "Try another city, or discover organisers and see what they run.", filtered: "No events match this format in {city}.", filteredBody: "Try another format to see what’s coming up.", loading: "Finding upcoming events…", unavailable: "We couldn’t load events right now.", unavailableBody: "Please try again in a moment. You can still explore Catch below.", by: "by {name}", soldOut: "Sold out", closed: "Registration closed", illustration: "Illustrative image", count: "{count} upcoming events"},
  experience: {badge: "Catch Experience", title: "A little help saying hello.", body: "Some events go a step further, with introductions, shared activities, or group rotations that make it easier to join in.", reassurance: "Brief prompts. More time together. Join in at your own pace, and skip anything optional. Each event explains what’s included.", action: "How it works", alt: "Guests getting to know each other at an evening social", prompt: "First hello · Ask someone: what brought you here?", items: [
    {title: "An easy first hello.", body: "A person to meet and a simple question to start with."},
    {title: "Something to do together.", body: "A shared game or challenge gives conversation somewhere to begin."},
    {title: "A chance to meet someone new.", body: "New partners, tables, or teams bring different people together."},
  ], explanation: "The Catch Experience badge means an event includes tools that help guests participate and interact. Check its event page for the activities included."},
  organisers: {title: "Find the people behind your next favourite plan.", across: "Discover organisers across Catch.", body: "Discover independent hosts, clubs, and communities.", empty: "Get to know the organiser before you book. Explore their profile to see what they run.", unavailable: "Organiser profiles are temporarily unavailable."},
  faq: {title: "A few things you might be wondering.", items: [
    {question: "Can I come on my own?", answer: "Check the event description to see who it’s for. Catch Experiences explain the introductions and activities included."},
    {question: "Is Catch only for dating?", answer: "No. Catch is for discovering events, sharing interests, and spending time with people. Singles events are one of the formats you can find."},
    {question: "Do I need the app?", answer: "Your event page explains how to book, join and take part, including whether an app is needed."},
    {question: "Are my answers and choices private?", answer: "Private social questionnaire answers and matching choices stay out of organiser guest records. A quiet introduction request goes only to the host who can help. Private event feedback is shared as combined patterns, not your individual answers."},
    {question: "What if I need help?", answer: "Check your event page for organiser contact details and cancellation terms. Visit Catch Help for support with your account or using Catch."},
  ]},
  host: {eyebrow: "For organisers", title: "Run great events. Build a business around them.", body: "Bring bookings, guest relationships, and the experience itself together with Catch Host.", audience: "For independent hosts, growing clubs, community organisers, and event teams."},
  close: "Find your next plan.",
} as const;
