import {productionIndexing} from "../src/server/publicEnvironment";
import {robotsPolicy} from "../src/server/robotsPolicy";
export const dynamic = "force-dynamic";
import type {MetadataRoute} from "next";
export default function robots(): MetadataRoute.Robots {
  return robotsPolicy(productionIndexing());
}
