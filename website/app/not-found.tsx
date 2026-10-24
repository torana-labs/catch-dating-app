import type {Metadata} from "next";
import {PublicProviders} from "../src/app/next/PublicProviders";
import {PublicPage} from "../src/app/next/PublicPage";
import {pageMeta} from "../src/app/pageMeta";
import {previewCardImage} from "../src/server/previewCards";

// A thrown notFound() drops the catch-all route's metadata, so the 404 owns its own.
const meta = pageMeta.not_found;
const image = previewCardImage("default");
export const metadata: Metadata = {title: meta.title, description: meta.description, robots: meta.robots,
  openGraph: {title: meta.title, description: meta.description, type: "website", images: [image]},
  twitter: {card: "summary_large_image", title: meta.title, description: meta.twitterDescription, images: [image]}};

export default function NotFound() {
  return <PublicProviders pathname="/404/" catalog={{listings: [], readAt: 0}} live={false}>
    <PublicPage page="not_found" readAt={0} />
  </PublicProviders>;
}
