// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
type AdminAction = {
  actionId: string;
  callable: string;
  workflowIds: readonly string[];
  guiPath: string;
  kind: string;
  risk: string;
  roles: readonly string[];
  summary: string;
  controlPlane: boolean;
};

const files = import.meta.glob<readonly AdminAction[]>("./adminActions/*.ts", {eager: true, import: "default"});

export const adminActionCatalog = {
  actions: Object.values(files).flat().sort((a, b) => (a.actionId < b.actionId ? -1 : 1)),
};
