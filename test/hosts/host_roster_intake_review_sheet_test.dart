import 'package:catch_dating_app/contexts/audience/data/host_roster_intake_repository.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_roster_intake_review_sheet.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  testWidgets('explicit exclusion refreshes review before apply', (
    tester,
  ) async {
    final unresolved = _review(
      eligible: false,
      rows: const [
        HostRosterIntakePreviewRow(
          rowId: '2',
          sourceRowNumber: 2,
          displayName: 'Asha Shah',
          kind: 'needsReview',
          changedFields: [],
          issueCode: 'invalid-phone',
        ),
      ],
    );
    final scopeRevision = ValueNotifier<int>(0);
    addTearDown(scopeRevision.dispose);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: HostRosterIntakeReviewSheet(
            review: unresolved,
            scopeRevision: scopeRevision,
            onSetExcluded: (review, ids) async {
              final excluded = ids.toList(growable: false);
              if (excluded.isEmpty) return unresolved;
              expect(excluded, ['2']);
              return _review(
                eligible: true,
                rows: const [
                  HostRosterIntakePreviewRow(
                    rowId: '2',
                    sourceRowNumber: 2,
                    kind: 'excluded',
                    changedFields: [],
                    issueCode: null,
                  ),
                  HostRosterIntakePreviewRow(
                    rowId: '3',
                    sourceRowNumber: 3,
                    displayName: 'Ravi Rao',
                    externalReference: 'ticket-3',
                    kind: 'add',
                    changedFields: ['displayName'],
                    fieldChanges: [
                      HostRosterIntakeFieldChange(
                        field: 'displayName',
                        currentValue: null,
                        proposedValue: 'Ravi Rao',
                        origin: 'upload',
                      ),
                    ],
                    issueCode: null,
                  ),
                ],
              );
            },
            onApply: (review) async => review,
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);

    final applyBefore = tester.widget<CatchButton>(
      find.byKey(const ValueKey('host-roster-intake-apply')),
    );
    expect(applyBefore.onPressed, isNull);
    expect(
      find.textContaining('Correct or remove the shared phone'),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey('host-roster-intake-exclude')));
    await pumpFeatureUi(tester);
    expect(find.textContaining('invalid-phone'), findsNothing);
    final applyAfter = tester.widget<CatchButton>(
      find.byKey(const ValueKey('host-roster-intake-apply')),
    );
    expect(applyAfter.onPressed, isNotNull);
    expect(find.textContaining('Ravi Rao · source row 3'), findsOneWidget);
    expect(find.textContaining('Not provided → Ravi Rao'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('host-roster-intake-restore')));
    await pumpFeatureUi(tester);
    expect(
      find.textContaining('Correct or remove the shared phone'),
      findsOneWidget,
    );
  });

  testWidgets('scope change immediately scrubs an open review', (tester) async {
    final scopeRevision = ValueNotifier<int>(0);
    addTearDown(scopeRevision.dispose);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: HostRosterIntakeReviewSheet(
            review: _review(
              eligible: false,
              rows: const [
                HostRosterIntakePreviewRow(
                  rowId: '2',
                  sourceRowNumber: 2,
                  displayName: 'Private Guest',
                  kind: 'needsReview',
                  changedFields: [],
                  issueCode: 'invalid-phone',
                ),
              ],
            ),
            scopeRevision: scopeRevision,
            onSetExcluded: (review, ids) async => review,
            onApply: (review) async => review,
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.textContaining('Private Guest'), findsOneWidget);

    scopeRevision.value += 1;
    await tester.pump();

    expect(find.textContaining('Private Guest'), findsNothing);
  });
}

HostRosterIntakeReview _review({
  required bool eligible,
  required List<HostRosterIntakePreviewRow> rows,
}) => HostRosterIntakeReview(
  sessionId: 'hri_${List.filled(48, 'a').join()}',
  revision: eligible ? 2 : 1,
  fileName: 'guests.csv',
  state: 'review',
  reviewHash: List.filled(64, 'b').join(),
  eligibleForApply: eligible,
  counts: {
    'add': rows.where((row) => row.kind == 'add').length,
    'update': 0,
    'unchanged': 0,
    'excluded': rows.where((row) => row.kind == 'excluded').length,
    'needsReview': rows.where((row) => row.kind == 'needsReview').length,
    'identityConflict': 0,
  },
  rows: rows,
  evidenceRows: const [
    {
      'value': {'rowId': '2', 'displayName': '', 'status': 'registered'},
      'sourceRowNumber': 2,
      'fields': <String, Object?>{},
      'rawCells': <String>['', 'bad'],
      'issues': <String>['invalid-phone'],
    },
  ],
  excludedRowIds: eligible ? const ['2'] : const [],
);
