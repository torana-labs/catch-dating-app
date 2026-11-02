import type {AdminAreaRender} from "../adminAreaKit";
import {renderSales} from "./salesScreens";

const render: AdminAreaRender = (context) => renderSales(context, "deals");

export default render;
