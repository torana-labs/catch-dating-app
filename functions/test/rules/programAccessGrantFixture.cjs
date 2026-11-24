// Programme access grants for the rules specs (#2474). The programme rules
// authorise from accessGrants/program__{programId}__{uid}; the specs keep
// describing authority as a programAccessViews-shaped fixture, which this
// helper turns into the access document the transactional writers store,
// the same mapping as functions/src/domain/access/programAccessGrants.ts.
const reachKeys = ["duties", "pickupAll", "pickupScoped", "hotelAll",
  "hotelScoped", "functionAll", "functionScoped", "programAll", "workPickup",
  "workHotel", "workFunction", "arrivalRoutes", "tripRoutes"];

/**
 * The access document for a view fixture. A key the fixture deletes stays
 * absent from reach, as in a document written before that key existed.
 * @param {object} view A programAccessViews-shaped fixture.
 * @return {object} The accessGrants document.
 */
function accessGrantFromView(view) {
  const reach = {};
  for (const key of reachKeys) {
    if (Object.hasOwn(view, key)) reach[key] = view[key];
    else if (!(view.absentReach ?? []).includes(key)) reach[key] = {};
  }
  const owner = view.role === "manager";
  return {scopeType: "program", scopeId: view.programId, uid: view.uid,
    organizerId: view.organizerId, role: owner ? "owner" : "staff",
    status: view.status, activeFromMillis: view.activeFromMillis,
    expiresAtMillis: view.expiresAtMillis, reach,
    assignments: view.assignments ?? [], grantedBy: owner ? null : "owner-1",
    revision: view.revision ?? 0, updatedAt: new Date(), version: 1};
}

/**
 * The access document's path segments.
 * @param {string} programId The programme.
 * @param {string} uid The account.
 * @return {string[]} Collection and document id.
 */
function accessGrantPath(programId, uid) {
  return ["accessGrants", `program__${programId}__${uid}`];
}

module.exports = {accessGrantFromView, accessGrantPath, reachKeys};
