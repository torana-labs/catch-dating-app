import 'package:catch_dating_app/contexts/forms/domain/forms/host_response_query.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_review_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_workspace_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_query_editor_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_query_workspace_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';

/// The versioned query workspace cannot represent the legacy route's search
/// or one-contact scope. Keep those routes on their existing inbox until the
/// exact scope can be carried into a manager query.
bool canMountHostResponseQuery({
  required bool enabled,
  required String? formId,
  required String? searchQuery,
  required String? contactId,
}) => enabled && formId != null && searchQuery == null && contactId == null;

/// Localized opt-in manager workspace for one authoritative published version.
/// Route owners supply the version; this factory never guesses it from a form ID.
HostResponseQueryCapability hostResponseQueryCapability(
  AppLocalizations l10n, {
  required String versionId,
}) => HostResponseQueryCapability(
  versionId: versionId,
  copy: HostResponseQueryWorkspaceCopy(
    filter: l10n.hostCustomersFilters,
    sort: l10n.hostCustomersSort,
    newest: l10n.hostApplicationsSortNewest,
    oldest: l10n.hostApplicationsSortOldest,
    refresh: l10n.hostResponseQueryRefresh,
    loadMore: l10n.hostFormResponsesLoadMore,
    loading: l10n.hostResponseQueryLoading,
    empty: l10n.hostResponseQueryEmpty,
    stale: l10n.hostResponseQueryStale,
    budgetExceeded: l10n.hostResponseQueryBudgetExceeded,
    permissionLost: l10n.hostResponseQueryPermissionLost,
    failed: l10n.hostResponseQueryFailed,
    selected: (count) => l10n.hostResponseQuerySelected(count: count),
    clearSelection: l10n.hostResponseQueryClearSelection,
    reviewSelection: l10n.hostResponseQueryReviewSelection,
    withdrawn: l10n.hostFormResponsesWithdrawn,
    select: l10n.hostResponseQuerySelect,
    deselect: l10n.hostResponseQueryDeselect,
    editor: HostResponseQueryEditorCopy(
      title: l10n.hostResponseQueryEditorTitle,
      matchAll: l10n.hostResponseQueryMatchAll,
      matchAny: l10n.hostResponseQueryMatchAny,
      field: l10n.hostResponseQueryField,
      condition: l10n.hostFormRuleOperator,
      value: l10n.hostResponseQueryValue,
      minimum: l10n.hostResponseQueryMinimum,
      maximum: l10n.hostResponseQueryMaximum,
      yes: l10n.hostFormRuleTrue,
      no: l10n.hostFormRuleFalse,
      addCondition: l10n.hostResponseQueryAddCondition,
      addGroup: l10n.hostResponseQueryAddGroup,
      remove: l10n.hostResponseQueryRemove,
      apply: l10n.hostResponseQueryApply,
      reset: l10n.hostFiltersResetAll,
      invalidCondition: l10n.hostResponseQueryInvalidCondition,
      operatorLabels: {
        HostResponseOperator.present: l10n.hostResponseQueryOperatorPresent,
        HostResponseOperator.missing: l10n.hostResponseQueryOperatorMissing,
        HostResponseOperator.choiceAny: l10n.hostResponseQueryOperatorChoiceAny,
        HostResponseOperator.choiceAll: l10n.hostResponseQueryOperatorChoiceAll,
        HostResponseOperator.choiceNone:
            l10n.hostResponseQueryOperatorChoiceNone,
        HostResponseOperator.textEquals:
            l10n.hostResponseQueryOperatorTextEquals,
        HostResponseOperator.textContains:
            l10n.hostResponseQueryOperatorTextContains,
        HostResponseOperator.textStartsWith:
            l10n.hostResponseQueryOperatorTextStartsWith,
        HostResponseOperator.numberEq: l10n.hostResponseQueryOperatorNumberEq,
        HostResponseOperator.numberGt: l10n.hostResponseQueryOperatorNumberGt,
        HostResponseOperator.numberGte: l10n.hostResponseQueryOperatorNumberGte,
        HostResponseOperator.numberLt: l10n.hostResponseQueryOperatorNumberLt,
        HostResponseOperator.numberLte: l10n.hostResponseQueryOperatorNumberLte,
        HostResponseOperator.numberBetween:
            l10n.hostResponseQueryOperatorNumberBetween,
        HostResponseOperator.dateOn: l10n.hostResponseQueryOperatorDateOn,
        HostResponseOperator.dateBefore:
            l10n.hostResponseQueryOperatorDateBefore,
        HostResponseOperator.dateAfter: l10n.hostResponseQueryOperatorDateAfter,
        HostResponseOperator.dateBetween:
            l10n.hostResponseQueryOperatorDateBetween,
        HostResponseOperator.booleanIs: l10n.hostResponseQueryOperatorBooleanIs,
      },
    ),
  ),
  offerWorkspace: hostEventOfferWorkspaceCopy(l10n),
);

HostEventOfferWorkspaceCopy hostEventOfferWorkspaceCopy(
  AppLocalizations l10n,
) => HostEventOfferWorkspaceCopy(
  create: l10n.hostEventOfferCreate,
  selectEvent: l10n.hostEventOfferSelectEvent,
  chooseForRecipient: (name) =>
      l10n.hostEventOfferChooseForRecipient(name: name),
  chooseForRecipients: (count) =>
      l10n.hostEventOfferChooseForRecipients(count: count),
  loadingEvents: l10n.hostEventOfferLoadingEvents,
  preparingOffer: l10n.hostEventOfferPreparing,
  loadingOffer: l10n.hostEventOfferLoadingExisting,
  preparingMessage: l10n.hostEventOfferPreparingMessage,
  cancelPreparation: l10n.hostEventOfferCancelPreparation,
  emptyEvents: l10n.hostEventOfferSelectEventEmpty,
  untitledEvent: l10n.hostEventOfferUntitledEvent,
  loadMoreEvents: l10n.hostEventOfferLoadMoreEvents,
  needsContact: l10n.hostEventOfferNeedsContact,
  convertContact: l10n.hostEventOfferConvertContact,
  selectionChanged: l10n.hostEventOfferSelectionChanged,
  loadFailed: l10n.hostEventOfferLoadFailed,
  issued: l10n.hostEventOfferIssued,
  refresh: l10n.hostEventOfferRefresh,
  existing: l10n.hostEventOfferExisting,
  noOffers: l10n.hostEventOfferNoOffers,
  configurePayment: l10n.hostEventOfferSetupRequired,
  openSettings: l10n.hostEventOfferOpenSettings,
  statusDraft: l10n.hostEventOfferStatusDraft,
  statusOffered: l10n.hostEventOfferStatusOffered,
  statusWithdrawn: l10n.hostEventOfferStatusWithdrawn,
  statusExpired: l10n.hostEventOfferStatusExpired,
  personalPaymentLink: (name) =>
      l10n.hostEventOfferPersonalPaymentLink(name: name),
  openExisting: l10n.hostEventOfferOpenExisting,
  handoffPrepare: l10n.hostEventOfferHandoffPrepare,
  handoffBlocked: l10n.hostEventOfferHandoffBlocked,
  handoffDisclosure: l10n.hostEventOfferHandoffDisclosure,
  openWhatsapp: l10n.hostEventOfferOpenWhatsapp,
  copyMessage: l10n.hostEventOfferCopyMessage,
  messageCopied: l10n.hostEventOfferMessageCopied,
  handoffOpenFailed: l10n.hostEventOfferHandoffOpenFailed,
  review: HostEventOfferReviewCopy(
    title: l10n.hostEventOfferReviewTitle,
    preview: l10n.hostEventOfferPreview,
    previewing: l10n.hostEventOfferPreviewing,
    review: l10n.hostEventOfferReview,
    expires: (date) => l10n.hostEventOfferExpires(date: date),
    commit: l10n.hostEventOfferCommit,
    committing: l10n.hostEventOfferCommitting,
    committed: l10n.hostEventOfferCommitted,
    failed: l10n.hostEventOfferFailed,
    noReservation: l10n.hostEventOfferNoReservation,
    paymentReference: l10n.hostEventOfferPaymentReference,
    recordReference: l10n.hostEventOfferRecordReference,
    evidenceSubmitted: l10n.hostEventOfferEvidenceSubmitted,
    bankReceiptChecked: l10n.hostEventOfferBankReceiptChecked,
    reviewNote: l10n.hostEventOfferReviewNote,
    attestReceived: l10n.hostEventOfferAttestReceived,
    rejectReference: l10n.hostEventOfferRejectReference,
    hostAttested: l10n.hostEventOfferHostAttested,
    rejected: l10n.hostEventOfferRejected,
  ),
);
