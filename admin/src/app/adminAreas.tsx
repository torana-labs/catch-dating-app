import type {AdminArea, AdminAreaRender, AdminNavId} from "./adminAreaKit";
import {adminAreaList} from "./adminRoutes";

// Every area's screen, from the .screen.tsx files in areas/. The shell loads this after
// sign-in, and each screen itself loads lazily.
const screens = import.meta.glob<{default: AdminAreaRender}>("./areas/*.screen.tsx", {eager: true});

export type AdminAreaWithScreen = AdminArea & {render: AdminAreaRender};

export const adminAreas = Object.fromEntries(adminAreaList.map((area) => {
  const screen = screens[`./areas/${area.id}.screen.tsx`];
  if (!screen) throw new Error(`Admin area ${area.id} has no areas/${area.id}.screen.tsx.`);
  return [area.id, {...area, render: screen.default}];
})) as Record<AdminNavId, AdminAreaWithScreen>;
