import {activeMarket} from "@content/markets";
import {consumerHomeCopy as copy} from "@content/consumerHome";

// The legacy Explore route's city and category state. CAT-261 replaces it with
// Explore on the cityPlans read model and the library format vocabulary.
export type HomeCategory = typeof copy.categories[number]["id"];
export function homeRouteStateForSearch(search: string) {
  const params = new URLSearchParams(search);
  const city = activeMarket.cities.find(item => item.slug === params.get("city"))?.slug ?? "mumbai";
  const category = copy.categories.find(item => item.id === params.get("format"))?.id ?? "all";
  return {city, category};
}
export function categoryForActivity(kind: string): HomeCategory {
  if (/run|walk|cycling/i.test(kind)) return "runs";
  if (/dinner|food|table/i.test(kind)) return "food";
  if (/quiz|trivia|game/i.test(kind)) return "games";
  if (/pickle|padel|racket|tennis|badminton|sport/i.test(kind)) return "sport";
  if (/bar|crawl|mixer|night/i.test(kind)) return "nights";
  return "all";
}
