import type {AdminAreaRender} from "../adminAreaKit";
import {renderSales} from "./salesScreens";

const render: AdminAreaRender = (context) => renderSales(context, "nominations");

export default render;
