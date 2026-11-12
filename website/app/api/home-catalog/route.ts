import {homeCatalogResponse} from "../../../src/server/homeCatalogResponse";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {return homeCatalogResponse(request);}
