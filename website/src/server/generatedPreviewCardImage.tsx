import "server-only";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {ImageResponse} from "next/og";
import previewCards from "../content/previewCards.json" with {type: "json"};
import {siteOrigin, type GeneratedPreviewCard} from "./generatedPreviewCards";

// renderPreviewCards.mjs writes these beside the static cards: satori draws
// static fonts only, so the Archivo instances are cut from the variable font.
const fontFiles = [
  {name: "Archivo Headline", file: "archivo-card-headline.ttf", weight: 700},
  {name: "Archivo", file: "archivo-card-text.ttf", weight: 400},
  {name: "IBM Plex Mono", file: "ibm-plex-mono-medium.ttf", weight: 500},
] as const;
const photoTypes = new Set(["image/jpeg", "image/png"]);
const photoBytesLimit = 5 * 1024 * 1024;
// WhatsApp crops small previews to the centre square, so the words sit inside it.
const column = {left: 300, width: 600};

type CardAssets = {fonts: {name: string; data: Buffer; weight: 400 | 500 | 700; style: "normal"}[]; mark: string};
let assets: Promise<CardAssets> | null = null;

function loadAssets(): Promise<CardAssets> {
  const read = (file: string) => readFile(path.join(process.cwd(), "public/assets/og/generated", file));
  assets ??= Promise.all([
    Promise.all(fontFiles.map(async font => ({name: font.name, data: await read(font.file), weight: font.weight, style: "normal" as const}))),
    read("mark.png"),
  ]).then(([fonts, mark]) => ({fonts, mark: `data:image/png;base64,${mark.toString("base64")}`}),
    error => {assets = null; throw error;});
  return assets;
}

/** The published photo as a data URI, or null when it cannot be drawn safely and quickly. */
async function photoData(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, {redirect: "error", signal: AbortSignal.timeout(3000)});
    const type = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (!response.ok || !photoTypes.has(type) || Number(response.headers.get("content-length") ?? 0) > photoBytesLimit) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    return bytes.byteLength <= photoBytesLimit ? `data:${type};base64,${bytes.toString("base64")}` : null;
  } catch {
    return null;
  }
}

function ink(alpha: number) {
  const [r, g, b] = [1, 3, 5].map(index => parseInt(previewCards.generated.colors.ink.slice(index, index + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function headlineSize(title: string) {
  return title.length <= 24 ? 88 : title.length <= 48 ? 72 : 60;
}

/** The card as PNG bytes; rendering finishes before any response starts. */
export async function renderGeneratedPreviewCard(card: GeneratedPreviewCard): Promise<ArrayBuffer> {
  const [{fonts, mark}, photo] = await Promise.all([loadAssets(), photoData(card.photoUrl)]);
  const {width, height, generated} = previewCards;
  const fill = {position: "absolute", left: 0, top: 0, width, height} as const;
  const image = new ImageResponse(
    <div style={{display: "flex", position: "relative", width, height, background: card.ground.deep, color: generated.colors.surface}}>
      {photo
        ? <img alt="" src={photo} width={width} height={height} style={{...fill, objectFit: "cover"}} />
        : <div style={{...fill, backgroundImage: `linear-gradient(135deg, ${card.ground.accent}, ${card.ground.deep})`}} />}
      {/* Ink scrims keep white type legible on any photo and deepen the plain ground slightly. */}
      <div style={{...fill, backgroundImage: photo
        ? `linear-gradient(180deg, ${ink(0.42)} 0%, ${ink(0.6)} 45%, ${ink(0.84)} 100%)`
        : `linear-gradient(180deg, ${ink(0)} 0%, ${ink(0.18)} 100%)`}} />
      <div style={{position: "absolute", top: 0, left: column.left, width: column.width, height, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center"}}>
        <img alt="" src={mark} height={40} width={Math.round(generated.mark.width * 40 / generated.mark.height)} style={{marginBottom: 34}} />
        <div style={{fontFamily: "IBM Plex Mono", fontSize: 22, letterSpacing: 3, textTransform: "uppercase", opacity: 0.86}}>{card.kicker}</div>
        <div style={{display: "block", marginTop: 18, fontFamily: "Archivo Headline", fontSize: headlineSize(card.title),
          lineHeight: 1, letterSpacing: -1.5, lineClamp: 3}}>{card.title}</div>
        <div style={{display: "flex", flexDirection: "column", alignItems: "center", marginTop: 28, fontFamily: "IBM Plex Mono", fontSize: 22, lineHeight: 1.45}}>
          {card.lines.map(line => <div key={line}>{line}</div>)}
        </div>
        {card.byline ? <div style={{marginTop: 12, fontFamily: "Archivo", fontSize: 24, opacity: 0.86}}>{card.byline}</div> : null}
      </div>
      <div style={{position: "absolute", left: 0, bottom: 34, width, display: "flex", justifyContent: "center",
        fontFamily: "IBM Plex Mono", fontSize: 20, letterSpacing: 1, opacity: 0.8}}>{new URL(siteOrigin).host}</div>
    </div>,
    {width, height, fonts},
  );
  return image.arrayBuffer();
}
