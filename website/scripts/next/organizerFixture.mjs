import fs from "node:fs";
export function organizerFixture() {
const data = JSON.parse(fs.readFileSync(new URL("../../../contracts/fixtures/valid/organizer_doc.json", import.meta.url), "utf8"));
delete data.memberCount;
Object.assign(data, {name: "Next proof organizer", organizerType: "eventProducer", organizerPhotos: [], followerCount: 0,
  hostUserId: null, ownerUserId: null, hostName: null, hostAvatarUrl: null,
  hostUserIds: [], hostProfiles: [], ownership: {state: "programmatic", ownerUserId: null,
    primaryHostUserId: null, hostUserIds: [], claimedAt: null, claimedByUid: null},
  claim: {state: "unclaimed", claimHref: "/organizers/next-proof/#claim", lastClaimRequestId: null},
  publicPage: {slug: "next-proof", citySlug: "indore", canonicalPath: "/organizers/next-proof/",
    publishStatus: "published", indexStatus: "indexReady", robots: "index, follow",
    seoTitle: null, seoDescription: null, lastRenderedAt: null}});
return data;
}
