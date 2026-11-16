import {
  CatchBandHeader,
  CatchButton,
  CatchFeatureTile,
  CatchRoot,
  CatchStack,
  CatchSurface,
  type CatchFeatureTileProps,
} from "@catch/web-ui";
import {notFoundCopy as copy} from "@content/notFound";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {whatsOnBody} from "./whatsOnBody";

type TileId = keyof typeof copy.tiles;

/** The tiles in the board's order, each on its kit tone's ground. */
const tiles = [
  {id: "whatsOn", ground: "coral"},
  {id: "directory", ground: "yellow"},
  {id: "claim", ground: "mint"},
  {id: "host", ground: "indigo"},
] as const satisfies readonly {id: TileId; ground: NonNullable<CatchFeatureTileProps["ground"]>}[];

function Tile({id, ground}: (typeof tiles)[number]) {
  const tile = copy.tiles[id];
  const body = id === "whatsOn" ? whatsOnBody() : tile.body;
  return <CatchFeatureTile body={body} ground={ground} link={tile.link} title={tile.title} />;
}

/**
 * Four across on a wide page, two by two on a medium one, one column on a
 * phone: a row of two pairs that stacks below expanded, each pair a row that
 * stacks below medium.
 */
function Tiles() {
  const pairs = [tiles.slice(0, 2), tiles.slice(2)];
  return (
    <CatchStack collapseBelow="expanded" direction="row" equal gap={16}>
      {pairs.map((pair) => (
        <CatchStack collapseBelow="medium" direction="row" equal gap={16} key={pair[0].id}>
          {pair.map((tile) => <Tile key={tile.id} {...tile} />)}
        </CatchStack>
      ))}
    </CatchStack>
  );
}

/**
 * The not-found page, as the Live404 board: the site header, one band with
 * the page-not-found headline, four ways on (what's on, the organizer
 * directory, claiming a listing and hosting) and the way home or to help,
 * then the site footer. Unknown routes and the static 404.html render it.
 */
export function NotFoundPage() {
  return (
    <CatchRoot theme="day">
      <PublicSiteHeader />
      <WebsitePageMain id="top">
        <CatchSurface aria-labelledby="not-found-title" as="section" block="band">
          <CatchBandHeader align="center" kicker={copy.kicker} kickerTone="danger" lead={copy.lead} level={1} title={copy.title} titleId="not-found-title" />
          <Tiles />
          <CatchStack collapseBelow="medium" direction="row" gap={12} wrap>
            <CatchButton href={copy.home.href} label={copy.home.label} />
            <CatchButton href={copy.help.href} label={copy.help.label} variant="secondary" />
          </CatchStack>
        </CatchSurface>
      </WebsitePageMain>
      <PublicSiteFooter />
    </CatchRoot>
  );
}
