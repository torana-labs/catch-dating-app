import {readPublicCatalog} from "../../src/server/publicCatalog";
import {buildPublicEventDetailRecords} from "../../src/features/events/eventDetailModel";
import {brand} from "@catch/brand";

export const dynamic = "force-dynamic";
const xml = (text: string) => text.replace(/[<>&"']/g, ch => ({"<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;"})[ch]!);
export async function GET() {
  const headers = {"Cache-Control": "private, no-store", "Content-Type": "application/xml; charset=utf-8"};
  try {
    const {listings, readAt} = await readPublicCatalog();
    const indexable = listings.filter(item => item.indexing === "index, follow" &&
      ["indexReady", "indexed"].includes(item.authority?.indexStatus ?? ""));
    const paths = ["/", "/explore/", "/host/", "/host/apply/", "/organizers/", "/privacy/", "/terms/", "/help/", "/delete-account/", "/refunds/", "/contact/",
      ...indexable.map(item => item.path), ...buildPublicEventDetailRecords(indexable, readAt).map(event => event.path)];
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${
      [...new Set(paths)].map(path => `<url><loc>${xml(`${brand.web.origin}${path}`)}</loc></url>`).join("")}</urlset>`, {headers});
  } catch {return new Response(null, {status: 503, headers});}
}
