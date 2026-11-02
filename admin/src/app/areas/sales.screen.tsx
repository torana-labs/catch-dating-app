import type {AdminAreaRender} from "../adminAreaKit";
import {renderOlderSales, renderSales} from "./salesScreens";

const render: AdminAreaRender = (context) => context.route.salesArea === "today" ? renderSales(context, "today") : renderOlderSales(context);

export default render;
