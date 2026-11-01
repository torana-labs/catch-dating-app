// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
  {
    "actionId": "nominations.list",
    "callable": "adminListMyNominations",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/nominations",
    "kind": "read",
    "risk": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support",
      "salesStaff"
    ],
    "summary": "List the organizers the caller nominated, newest first, published, waiting or stuck, with real totals per filter.",
    "controlPlane": false
  },
  {
    "actionId": "sales.accounts.setSuppression",
    "callable": "adminSetSalesAccountSuppression",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales accounts.setSuppression operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.activities.log",
    "callable": "adminRecordSalesActivity",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales activities.log operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.commercial.detail",
    "callable": "adminGetSalesCommercialDetail",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review private host pilot or quote records with current evidence.",
    "controlPlane": false
  },
  {
    "actionId": "sales.commercial.finance.attest",
    "callable": "adminAttestSalesHostSettlement",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "adminOwner"
    ],
    "summary": "Attest a reviewed host subscription collection against accepted terms.",
    "controlPlane": false
  },
  {
    "actionId": "sales.commercial.pilots.upsert",
    "callable": "adminUpsertSalesPilotPlan",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review private host pilot or quote records with current evidence.",
    "controlPlane": false
  },
  {
    "actionId": "sales.commercial.quotes.accept",
    "callable": "adminAcceptSalesQuote",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review private host pilot or quote records with current evidence.",
    "controlPlane": false
  },
  {
    "actionId": "sales.commercial.quotes.approve",
    "callable": "adminApproveSalesQuote",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review private host pilot or quote records with current evidence.",
    "controlPlane": false
  },
  {
    "actionId": "sales.commercial.quotes.revise",
    "callable": "adminReviseSalesQuote",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review private host pilot or quote records with current evidence.",
    "controlPlane": false
  },
  {
    "actionId": "sales.commercial.report",
    "callable": "adminListSalesCommercialReport",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review private host pilot or quote records with current evidence.",
    "controlPlane": false
  },
  {
    "actionId": "sales.contacts.list",
    "callable": "adminListSalesContacts",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales contacts.list operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.contacts.setContactability",
    "callable": "adminSetSalesContactability",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales contacts.setContactability operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.contacts.upsert",
    "callable": "adminUpsertSalesContact",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales contacts.upsert operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.demo.GetSalesDemoBlueprint",
    "callable": "adminGetSalesDemoBlueprint",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "adminOwner"
    ],
    "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
    "controlPlane": false
  },
  {
    "actionId": "sales.demo.GetSalesDemoCapability",
    "callable": "adminGetSalesDemoCapability",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "adminOwner"
    ],
    "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
    "controlPlane": false
  },
  {
    "actionId": "sales.demo.GetSalesDemoInvitation",
    "callable": "adminGetSalesDemoInvitation",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "adminOwner"
    ],
    "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
    "controlPlane": false
  },
  {
    "actionId": "sales.demo.GetSalesDemoPartnerReview",
    "callable": "adminGetSalesDemoPartnerReview",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "adminOwner"
    ],
    "summary": "Review an exact current partner recipient and separately share or withdraw a synthetic composition preview.",
    "controlPlane": false
  },
  {
    "actionId": "sales.demo.IssueSalesDemoInvitation",
    "callable": "adminIssueSalesDemoInvitation",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "adminOwner"
    ],
    "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
    "controlPlane": false
  },
  {
    "actionId": "sales.demo.ListSalesDemoBlueprints",
    "callable": "adminListSalesDemoBlueprints",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "adminOwner"
    ],
    "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
    "controlPlane": false
  },
  {
    "actionId": "sales.demo.ListSalesDemoInvitations",
    "callable": "adminListSalesDemoInvitations",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "adminOwner"
    ],
    "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
    "controlPlane": false
  },
  {
    "actionId": "sales.demo.ReviewSalesDemoBlueprint",
    "callable": "adminReviewSalesDemoBlueprint",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "adminOwner"
    ],
    "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
    "controlPlane": false
  },
  {
    "actionId": "sales.demo.RevokeSalesDemoInvitation",
    "callable": "adminRevokeSalesDemoInvitation",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "adminOwner"
    ],
    "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
    "controlPlane": false
  },
  {
    "actionId": "sales.demo.SaveSalesDemoBlueprint",
    "callable": "adminSaveSalesDemoBlueprint",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "adminOwner"
    ],
    "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
    "controlPlane": false
  },
  {
    "actionId": "sales.demo.ShareSalesDemoPartnerReview",
    "callable": "adminShareSalesDemoPartnerReview",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "adminOwner"
    ],
    "summary": "Review an exact current partner recipient and separately share or withdraw a synthetic composition preview.",
    "controlPlane": false
  },
  {
    "actionId": "sales.demo.WithdrawSalesDemoBlueprint",
    "callable": "adminWithdrawSalesDemoBlueprint",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "adminOwner"
    ],
    "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
    "controlPlane": false
  },
  {
    "actionId": "sales.evidence.add",
    "callable": "adminAddSalesEvidence",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/research",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales evidence.add operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.evidence.list",
    "callable": "adminListSalesEvidence",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/research",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales evidence.list operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.evidence.propose",
    "callable": "adminProposeSalesEvidence",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/research",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Suggest an unreviewed private fact; never grants qualification.",
    "controlPlane": true
  },
  {
    "actionId": "sales.evidence.reviewProposal",
    "callable": "adminReviewSalesEvidenceProposal",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/research",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Employee accepts or rejects the exact version of a suggested fact.",
    "controlPlane": false
  },
  {
    "actionId": "sales.evidenceProposals.list",
    "callable": "adminListSalesEvidenceProposals",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/research",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Read private evidence suggestions awaiting employee review.",
    "controlPlane": false
  },
  {
    "actionId": "sales.fields.create",
    "callable": "adminCreateSalesCustomField",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/settings",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales fields.create operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.fields.list",
    "callable": "adminListSalesCustomFields",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/settings",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales fields.list operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.fields.setValue",
    "callable": "adminSetSalesCustomFieldValue",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales fields.setValue operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.fitQueue.list",
    "callable": "adminListSalesFitQueue",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review or refresh current private fit ranking without outreach authority.",
    "controlPlane": false
  },
  {
    "actionId": "sales.fitQueue.refresh",
    "callable": "adminRefreshSalesFitQueue",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "medium",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review or refresh current private fit ranking without outreach authority.",
    "controlPlane": true
  },
  {
    "actionId": "sales.fitQueue.refresh_batch",
    "callable": "adminRefreshSalesFitQueueBatch",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "medium",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review or refresh current private fit ranking without outreach authority.",
    "controlPlane": true
  },
  {
    "actionId": "sales.hosts.create",
    "callable": "adminCreateSalesAccount",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales hosts.create operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.hosts.get",
    "callable": "adminGetSalesAccount",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales hosts.get operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.hosts.search",
    "callable": "adminListSalesAccounts",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales hosts.search operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.hosts.update",
    "callable": "adminUpdateSalesAccount",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales hosts.update operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.imports.apply",
    "callable": "adminApplySalesImport",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/research",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales imports.apply operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.imports.compensation.apply",
    "callable": "adminApplySalesImportCompensation",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/imports",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "adminOwner"
    ],
    "summary": "Inspect or compensate one proven import effect without deleting the organizer.",
    "controlPlane": true
  },
  {
    "actionId": "sales.imports.compensation.preview",
    "callable": "adminPreviewSalesImportCompensation",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/imports",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "adminOwner"
    ],
    "summary": "Inspect or compensate one proven import effect without deleting the organizer.",
    "controlPlane": true
  },
  {
    "actionId": "sales.imports.history.apply",
    "callable": "adminApplySalesImportHistory",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/settings",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "adminOwner"
    ],
    "summary": "Review preserved source history without granting current contact, score, or sending authority.",
    "controlPlane": true
  },
  {
    "actionId": "sales.imports.history.list",
    "callable": "adminListSalesImportHistory",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review preserved source history without granting current contact, score, or sending authority.",
    "controlPlane": true
  },
  {
    "actionId": "sales.imports.history.preview",
    "callable": "adminPreviewSalesImportHistory",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/settings",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "adminOwner"
    ],
    "summary": "Review preserved source history without granting current contact, score, or sending authority.",
    "controlPlane": true
  },
  {
    "actionId": "sales.imports.history.rows.list",
    "callable": "adminListSalesImportHistoryRows",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review preserved source history without granting current contact, score, or sending authority.",
    "controlPlane": true
  },
  {
    "actionId": "sales.imports.preview",
    "callable": "adminPreviewSalesImport",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/research",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales imports.preview operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.intake.link",
    "callable": "adminLinkOrganizerIntakeToSales",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/organizer-intake",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Join an explicitly reviewed Intake identity to its private Sales account.",
    "controlPlane": false
  },
  {
    "actionId": "sales.intake.list-message-nominators",
    "callable": "adminListSupplyNominators",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/intake/organizers",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner",
      "salesStaff"
    ],
    "summary": "List who may nominate organizers by messaging Catch, with numbers shown only as their last four digits.",
    "controlPlane": true
  },
  {
    "actionId": "sales.intake.nominate-organizer",
    "callable": "adminNominateOrganizer",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "medium",
    "roles": [
      "admin",
      "adminOwner",
      "salesStaff"
    ],
    "summary": "Nominate an organizer for Supply Intake; the listing is built from its links and waits for staff review before anything is published.",
    "controlPlane": false
  },
  {
    "actionId": "sales.intake.set-message-nominator",
    "callable": "adminSetSupplyNominator",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/intake/organizers",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Let a sales associate or partner nominate organizers by sending links to Catch's WhatsApp number, or stop their messages counting.",
    "controlPlane": true
  },
  {
    "actionId": "sales.intelligence.BuildSalesOutreachInput",
    "callable": "adminBuildSalesOutreachInput",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
    "controlPlane": true
  },
  {
    "actionId": "sales.intelligence.CopySalesOutreachDraft",
    "callable": "adminCopySalesOutreachDraft",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
    "controlPlane": false
  },
  {
    "actionId": "sales.intelligence.GenerateSalesOutreachDraft",
    "callable": "adminGenerateSalesOutreachDraft",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
    "controlPlane": false
  },
  {
    "actionId": "sales.intelligence.GetSalesIntelligenceCatalog",
    "callable": "adminGetSalesIntelligenceCatalog",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
    "controlPlane": false
  },
  {
    "actionId": "sales.intelligence.GetSalesIntelligenceScore",
    "callable": "adminGetSalesIntelligenceScore",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
    "controlPlane": false
  },
  {
    "actionId": "sales.intelligence.GetSalesOutreachDraft",
    "callable": "adminGetSalesOutreachDraft",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
    "controlPlane": false
  },
  {
    "actionId": "sales.intelligence.GetSalesOutreachDraftJob",
    "callable": "adminGetSalesOutreachDraftJob",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
    "controlPlane": false
  },
  {
    "actionId": "sales.intelligence.ListSalesOutreachDrafts",
    "callable": "adminListSalesOutreachDrafts",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
    "controlPlane": false
  },
  {
    "actionId": "sales.intelligence.ReviewSalesIntelligenceClause",
    "callable": "adminReviewSalesIntelligenceClause",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "adminOwner"
    ],
    "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
    "controlPlane": false
  },
  {
    "actionId": "sales.intelligence.ReviewSalesOutreachDraft",
    "callable": "adminReviewSalesOutreachDraft",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
    "controlPlane": false
  },
  {
    "actionId": "sales.intelligence.SaveSalesFactorAssessment",
    "callable": "adminSaveSalesFactorAssessment",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
    "controlPlane": false
  },
  {
    "actionId": "sales.intelligence.SaveSalesIntelligenceClause",
    "callable": "adminSaveSalesIntelligenceClause",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
    "controlPlane": false
  },
  {
    "actionId": "sales.intelligence.SaveSalesIntelligencePolicy",
    "callable": "adminSaveSalesIntelligencePolicy",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "adminOwner"
    ],
    "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
    "controlPlane": false
  },
  {
    "actionId": "sales.intelligence.SaveSalesScoreSnapshot",
    "callable": "adminSaveSalesScoreSnapshot",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
    "controlPlane": true
  },
  {
    "actionId": "sales.intents.link",
    "callable": "adminLinkSalesInboundIntent",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/research",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales intents.link operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.intents.list",
    "callable": "adminListSalesInboundIntents",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/research",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales intents.list operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.opportunities.list",
    "callable": "adminListSalesOpportunities",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/pipeline",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales opportunities.list operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.opportunities.upsert",
    "callable": "adminUpsertSalesOpportunity",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/pipeline",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales opportunities.upsert operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.partners.offer",
    "callable": "adminAssignSalesPartner",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/hosts",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Offer a reviewed organizer lead to an exact active referral partner with a bounded next action, review time and expiry.",
    "controlPlane": true
  },
  {
    "actionId": "sales.privacy.batch.apply",
    "callable": "adminApplySalesPrivacyBatch",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/settings",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "adminOwner"
    ],
    "summary": "Owner-reviewed private Sales restriction and bounded cleanup with explicit retained and unresolved records.",
    "controlPlane": true
  },
  {
    "actionId": "sales.privacy.case.get",
    "callable": "adminGetSalesPrivacyCase",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/settings",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "adminOwner"
    ],
    "summary": "Owner-reviewed private Sales restriction and bounded cleanup with explicit retained and unresolved records.",
    "controlPlane": true
  },
  {
    "actionId": "sales.privacy.organizer.restrict",
    "callable": "adminRestrictSalesOrganizer",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/settings",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "adminOwner"
    ],
    "summary": "Owner-reviewed private Sales restriction and bounded cleanup with explicit retained and unresolved records.",
    "controlPlane": true
  },
  {
    "actionId": "sales.privacy.plan.preview",
    "callable": "adminPreviewSalesPrivacyPlan",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/settings",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "adminOwner"
    ],
    "summary": "Owner-reviewed private Sales restriction and bounded cleanup with explicit retained and unresolved records.",
    "controlPlane": true
  },
  {
    "actionId": "sales.privacy.plan.review",
    "callable": "adminReviewSalesPrivacyPlan",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/settings",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "adminOwner"
    ],
    "summary": "Owner-reviewed private Sales restriction and bounded cleanup with explicit retained and unresolved records.",
    "controlPlane": true
  },
  {
    "actionId": "sales.privacy.policy.review",
    "callable": "adminReviewSalesPrivacyPolicy",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/settings",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "adminOwner"
    ],
    "summary": "Owner-reviewed private Sales restriction and bounded cleanup with explicit retained and unresolved records.",
    "controlPlane": true
  },
  {
    "actionId": "sales.receipts.get",
    "callable": "adminGetSalesReceipt",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/settings",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales receipts.get operation.",
    "controlPlane": true
  },
  {
    "actionId": "sales.reporting.funnel",
    "callable": "adminGetSalesFunnelReport",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/pipeline",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Read bounded current funnel totals, stage entries, and follow-up obligations.",
    "controlPlane": true
  },
  {
    "actionId": "sales.tasks.list",
    "callable": "adminListSalesTasks",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/today",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales tasks.list operation.",
    "controlPlane": false
  },
  {
    "actionId": "sales.tasks.upsert",
    "callable": "adminUpsertSalesTask",
    "workflowIds": [
      "sales"
    ],
    "guiPath": "/sales/today",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Review and execute the bounded private Sales tasks.upsert operation.",
    "controlPlane": false
  }
] as const;
