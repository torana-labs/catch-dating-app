import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_response_query.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_review_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_query_editor_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_query_workspace_section.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'event_editor_preview.dart';

const _field = HostResponseQueryField(
  questionId: 'city',
  label: 'Event city',
  kind: 'singleChoice',
  operators: {HostResponseOperator.present, HostResponseOperator.choiceAny},
  sortable: true,
  options: {'Mumbai': 'Mumbai', 'Delhi': 'Delhi'},
);
const _condition = HostResponseCondition(
  questionId: 'city',
  operator: HostResponseOperator.choiceAny,
  values: ['Mumbai'],
);
const _group = HostResponseGroup(
  match: HostResponseMatch.all,
  children: [_condition],
);
final _editorCopy = HostResponseQueryEditorCopy(
  title: 'Filter responses',
  matchAll: 'Match all',
  matchAny: 'Match any',
  field: 'Field',
  condition: 'Condition',
  value: 'Value',
  minimum: 'Minimum',
  maximum: 'Maximum',
  yes: 'Yes',
  no: 'No',
  addCondition: 'Add condition',
  addGroup: 'Add group',
  remove: 'Remove',
  apply: 'Apply filters',
  reset: 'Reset filters',
  invalidCondition: 'Complete the filter before applying it.',
  operatorLabels: {for (final op in HostResponseOperator.values) op: op.name},
);
final _workspaceCopy = HostResponseQueryWorkspaceCopy(
  filter: 'Filter',
  sort: 'Sort',
  newest: 'Newest',
  oldest: 'Oldest',
  refresh: 'Refresh',
  loadMore: 'Load more',
  loading: 'Loading responses',
  empty: 'No responses',
  stale: 'Results changed; refresh',
  budgetExceeded: 'Query limit reached',
  permissionLost: 'Manager access changed',
  failed: 'Responses could not load',
  selected: (count) => '$count selected',
  clearSelection: 'Clear selection',
  reviewSelection: 'Review selected',
  withdrawn: 'Withdrawn',
  select: 'Select',
  deselect: 'Deselect',
  editor: _editorCopy,
);
const _offerCopy = HostEventOfferReviewCopy(
  title: 'Event offer',
  preview: 'Preview offers',
  previewing: 'Previewing',
  review: 'Review offers',
  expires: _expires,
  commit: 'Commit offers',
  committing: 'Committing',
  committed: 'Offer committed',
  failed: 'Offer failed',
  noReservation: 'No seat or admission is created.',
  paymentReference: 'Payment reference',
  recordReference: 'Record reference',
  evidenceSubmitted: 'Evidence submitted',
  bankReceiptChecked: 'I checked the bank receipt',
  reviewNote: 'Review note',
  attestReceived: 'Attest received',
  rejectReference: 'Reject reference',
  hostAttested: 'Host attested',
  rejected: 'Rejected',
);
String _expires(String day) => 'Expires $day';
final _draft = HostOfferBatchDraft(
  organizerId: 'org_demo',
  eventId: 'event_demo',
  rows: [
    HostOfferRow(
      organizerId: 'org_demo',
      eventId: 'event_demo',
      contactId: 'contact_demo',
      sourceKind: HostOfferSourceKind.formResponse,
      sourceId: 'response_demo',
      expiresAt: DateTime.utc(2026, 10, 1),
    ),
  ],
);
final _offer = HostEventOffer(
  offerId: 'offer_demo',
  organizerId: 'org_demo',
  eventId: 'event_demo',
  contactId: 'contact_demo',
  sourceId: 'response_demo',
  sourceKind: HostOfferSourceKind.formResponse,
  status: HostOfferStatus.offered,
  effectiveStatus: HostOfferStatus.offered,
  generation: 1,
  revision: 1,
  expiresAt: DateTime.utc(2026, 10, 1),
  organizerPaymentLink: null,
  manualPayment: const HostManualPaymentReview(
    status: HostManualPaymentStatus.none,
    evidenceReference: null,
    evidenceRecordedAt: null,
    reviewedByUid: null,
    reviewedAt: null,
    reviewNote: null,
    bankReceiptChecked: false,
  ),
);

Widget _frame(Widget child) =>
    SizedBox(width: 480, child: SingleChildScrollView(child: child));

@widgetbook.UseCase(
  name: 'Response query editor',
  type: HostResponseQueryEditorSection,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget responseQueryEditorPreview(BuildContext context) => _frame(
  HostResponseQueryEditorSection(
    fields: const [_field],
    copy: _editorCopy,
    initial: _group,
    onApply: (_) {},
  ),
);

@widgetbook.UseCase(
  name: 'Response group',
  type: HostResponseGroupSection,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget responseGroupPreview(BuildContext context) => _frame(
  HostResponseGroupSection(
    root: _group,
    group: _group,
    path: const [],
    fields: const [_field],
    copy: _editorCopy,
    defaultCondition: () => _condition,
    onAppend: (_, _) {},
    onReplace: (_, _) {},
    onSetMatch: (_, _) {},
  ),
);

@widgetbook.UseCase(
  name: 'Response condition',
  type: HostResponseConditionSection,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget responseConditionPreview(BuildContext context) => _frame(
  HostResponseConditionSection(
    path: const [0],
    condition: _condition,
    fields: const [_field],
    copy: _editorCopy,
    onReplace: (_, _) {},
  ),
);

@widgetbook.UseCase(
  name: 'Response condition value',
  type: HostResponseConditionValueSection,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget responseConditionValuePreview(BuildContext context) => _frame(
  HostResponseConditionValueSection(
    path: const [0],
    field: _field,
    condition: _condition,
    copy: _editorCopy,
    onReplace: (_, _) {},
  ),
);

@widgetbook.UseCase(
  name: 'Response value field',
  type: HostResponseValueFieldSection,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget responseValueFieldPreview(BuildContext context) => _frame(
  HostResponseValueFieldSection(
    path: const [0],
    field: _field,
    condition: const HostResponseCondition(
      questionId: 'city',
      operator: HostResponseOperator.textContains,
      value: 'Mumbai',
    ),
    copy: _editorCopy,
    onReplace: (_, _) {},
  ),
);

@widgetbook.UseCase(
  name: 'Response query workspace',
  type: HostResponseQueryWorkspaceSection,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget responseQueryWorkspacePreview(BuildContext context) => _frame(
  HostResponseQueryWorkspaceSection(
    controller: HostResponseQueryController(_PreviewQueryGateway()),
    request: const HostResponseQueryRequest(
      organizerId: 'org_demo',
      formId: 'form_demo',
      versionId: 'v1',
    ),
    copy: _workspaceCopy,
    onOpenResponse: (_) {},
  ),
);

@widgetbook.UseCase(
  name: 'Event offer review',
  type: HostEventOfferReviewSection,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget eventOfferReviewPreview(BuildContext context) => _frame(
  eventOfferPreview(
    _PreviewOfferGateway(),
    HostEventOfferReviewSection(
      scope: previewOfferScope,
      draft: _draft,
      eventTitle: 'Sunday run',
      contactLabel: (_) => 'Maya',
      eventStartsAt: DateTime.utc(2026, 10, 4),
      now: () => DateTime.utc(2026, 9, 24),
      commitRequestId: 'preview_request_001',
      copy: _offerCopy,
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Manual payment review',
  type: HostManualPaymentReviewSection,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget manualPaymentReviewPreview(BuildContext context) => _frame(
  eventOfferPreview(
    _PreviewOfferGateway(),
    HostManualPaymentReviewSection(
      scope: previewOfferScope,
      offer: _offer,
      copy: _offerCopy,
      referenceRequestId: 'preview_reference_001',
      reviewRequestId: 'preview_review_001',
      onUpdated: (_) {},
    ),
  ),
);

class _PreviewQueryGateway implements HostResponseQueryGateway {
  @override
  Future<HostResponseQueryPage> query(HostResponseQueryRequest request) =>
      Future.error(StateError('Preview has no manager query callable.'));
}

class _PreviewOfferGateway implements HostEventOfferGateway {
  @override
  Future<HostOfferPreview> preview(HostOfferBatchDraft draft) async =>
      const HostOfferPreview(
        planDigest: 'preview',
        rows: [
          HostOfferPreviewRow(
            offerId: 'offer_demo',
            revision: 0,
            generation: 0,
            status: 'new',
          ),
        ],
      );

  @override
  Future<HostOfferCommitReceipt> commit({
    required HostOfferBatchDraft draft,
    required HostOfferPreview preview,
    required String requestId,
  }) => Future.error(StateError('Preview does not commit offers.'));

  @override
  Future<HostEventOffer> recordReference({
    required HostEventOffer offer,
    required String reference,
    required String requestId,
  }) => Future.error(StateError('Preview does not record payment references.'));

  @override
  Future<HostEventOffer> reviewReference({
    required HostEventOffer offer,
    required HostManualPaymentStatus decision,
    required String note,
    required bool bankReceiptChecked,
    required String requestId,
  }) => Future.error(StateError('Preview does not attest payment.'));
}
