import 'package:catch_dating_app/contexts/audience/domain/crm/host_contact_merge.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_contact_merge_review_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/widgetbook_harness.dart';
import 'preview.dart';

const _path = '[P1 product surfaces]/Host operations/Customers';

HostContactMergeCandidate _candidate({
  required String id,
  HostContactMergeDecisionState decisionState =
      HostContactMergeDecisionState.none,
  bool canReopen = true,
}) => HostContactMergeCandidate(
  candidateId: id,
  contacts: const [
    HostContactMergeCandidateContact(
      contactId: 'design-merge-ananya-app',
      displayName: 'Ananya Rao',
      phoneE164: '+919876543210',
      email: 'ananya@example.com',
      linkedAccount: true,
      primarySource: 'catchBooking',
      revision: 3,
    ),
    HostContactMergeCandidateContact(
      contactId: 'design-merge-ananya-import',
      displayName: 'Ananya R.',
      phoneE164: '+919876543210',
      email: null,
      linkedAccount: false,
      primarySource: 'hostImport',
      revision: 1,
    ),
  ],
  matchKinds: const {HostContactMergeMatchKind.sameImportedPhone},
  confidence: HostContactMergeConfidence.proposed,
  sourceKinds: const {'catchBooking', 'hostImport'},
  sharedEventIds: const ['design-event-1', 'design-event-2'],
  sharedEventCount: 2,
  updatedAt: DateTime(2030, 6, 20),
  decisionState: decisionState,
  decisionRevision: decisionState == HostContactMergeDecisionState.none
      ? null
      : 1,
  canReopen: canReopen,
);

final _activeCandidate = _candidate(id: 'design-merge-active');
final _dismissedCandidate = _candidate(
  id: 'design-merge-dismissed',
  decisionState: HostContactMergeDecisionState.differentPeople,
);

@widgetbook.UseCase(
  name: 'Duplicate review',
  type: HostContactMergeReviewSheet,
  path: _path,
)
Widget hostContactMergeReviewSheetStates(BuildContext context) {
  final organizerId = HostOperationsFixtures.primaryOrganizer.id;
  return widgetbookHostComponentStates('HostContactMergeReviewSheet', [
    (
      'active and dismissed duplicates',
      WidgetbookFixtureScope(
        overrides: [
          hostCustomersControllerProvider.overrideWithValue(
            _PreviewMergeActions(
              HostContactMergeCandidatePage(
                organizerId: organizerId,
                candidates: [_activeCandidate],
                dismissedCandidates: [_dismissedCandidate],
                nextCursor: null,
                truncated: false,
              ),
            ),
          ),
        ],
        child: HostContactMergeReviewSheet(organizerId: organizerId),
      ),
    ),
  ]);
}

@widgetbook.UseCase(
  name: 'Choose the surviving record',
  type: HostContactMergeCandidateCard,
  path: _path,
)
Widget hostContactMergeCandidateCardStates(BuildContext context) =>
    widgetbookHostComponentStates('HostContactMergeCandidateCard', [
      (
        'shared imported phone',
        HostContactMergeCandidateCard(
          organizerId: HostOperationsFixtures.primaryOrganizer.id,
          candidate: _activeCandidate,
          onChanged: () {},
          onMerged: () {},
        ),
      ),
    ]);

@widgetbook.UseCase(
  name: 'Reopen states',
  type: HostDismissedMergeCandidateCard,
  path: _path,
)
Widget hostDismissedMergeCandidateCardStates(BuildContext context) =>
    widgetbookHostComponentStates('HostDismissedMergeCandidateCard', [
      (
        'owner can reopen',
        HostDismissedMergeCandidateCard(
          organizerId: HostOperationsFixtures.primaryOrganizer.id,
          candidate: _dismissedCandidate,
          onChanged: () {},
        ),
      ),
      (
        'co-host read only',
        HostDismissedMergeCandidateCard(
          organizerId: HostOperationsFixtures.primaryOrganizer.id,
          candidate: _candidate(
            id: 'design-merge-locked',
            decisionState: HostContactMergeDecisionState.differentPeople,
            canReopen: false,
          ),
          onChanged: () {},
        ),
      ),
    ]);

class _PreviewMergeActions implements HostCustomersController {
  _PreviewMergeActions(this.page);

  final HostContactMergeCandidatePage page;

  @override
  Future<HostContactMergeCandidatePage> listMergeCandidates({
    required String organizerId,
    String? cursor,
  }) async => page;

  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw UnsupportedError('Offline preview');
}
