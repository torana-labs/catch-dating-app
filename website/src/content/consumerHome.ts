// What the legacy Explore route and the generated preview cards still read.
// The homepage's copy is homePage.ts; CAT-261 retires the rest with Explore.
export const consumerHomeCopy = {
  filtersLabel: "Event formats",
  categories: [
    {id: "all", label: "All"}, {id: "runs", label: "Runs"}, {id: "food", label: "Food & drink"},
    {id: "games", label: "Games"}, {id: "sport", label: "Sport"}, {id: "nights", label: "Nights out"},
  ],
  events: {by: "by {name}"},
} as const;
