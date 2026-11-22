// The Functions this area deploys. src/index.ts re-exports this file
// (read by functions/scripts/functionExports.cjs).

export {generateSalesPartnerOutreach, getSalesPartnerOutreachJob,
  getSalesPartnerOutreachDraft, reviewSalesPartnerOutreachDraft,
  copySalesPartnerOutreachDraft, recordSalesPartnerManualSend,
  getSalesPartnerPreparation, registerSalesPartner, nominateSalesOrganizer,
  getSalesPartnerWorkspace, decideSalesPartnerAssignment,
  updateSalesPartnerAssignment, adminAssignSalesPartner,
  adminRevokeSalesPartnerAccess, adminGetSalesPartnerAccess} from
  "./callables";
export {getSalesPartnerDemoReviews,
  proposeSalesPartnerDemoWording} from "./callables";
