import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/host_response_query_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_export.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_response_query.dart';
import 'package:catch_dating_app/hosts/forms/responses_query_editor.dart';
import 'package:catch_dating_app/hosts/forms/responses_query_workspace.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/external_links.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:firebase_auth_mocks/firebase_auth_mocks.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:url_launcher/url_launcher.dart';

import 'forms_fixtures.dart';

class _Workspace {
  final gateway = _Query();
  final exports = _Exports();
  final opened = <String>[];
  final offered = <HostResponseQueryController>[];
  final downloads = <Uri>[];
  var exited = 0;
}

Future<_Workspace> _pump(WidgetTester tester) async {
  final calls = _Workspace();
  tester.view.physicalSize = const Size(390, 2600);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        hostResponseQueryGatewayProvider.overrideWithValue(calls.gateway),
        hostResponseExportGatewayProvider.overrideWithValue(calls.exports),
        firebaseAuthProvider.overrideWithValue(
          MockFirebaseAuth(signedIn: true, mockUser: MockUser(uid: 'manager')),
        ),
        externalUrlLauncherProvider.overrideWithValue((
          uri, {
          LaunchMode mode = LaunchMode.platformDefault,
        }) async {
          calls.downloads.add(uri);
          return true;
        }),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: CatchRoot(
          child: CatchScreen(
            body: HostResponsesQueryWorkspace(
              organizerId: 'org',
              formId: 'form',
              versionId: 'form_v1',
              accountId: 'manager',
              now: formsNow,
              onExit: () => calls.exited++,
              onOpenResponse: calls.opened.add,
              onOffer: calls.offered.add,
            ),
          ),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
  return calls;
}

void main() {
  group('Filter by answers', () {
    testWidgets('lists the version, its count and rows; opening a row does '
        'not choose it, Select does', (tester) async {
      final calls = await _pump(tester);

      expect(
        find.text('Published version 1 · All review statuses'),
        findsOneWidget,
      );
      expect(find.text('6 responses'), findsOneWidget);
      expect(find.text('Maya Kapoor'), findsOneWidget);
      expect(calls.gateway.requests.single.statuses, {'submitted'});

      await tester.tap(find.text('Maya Kapoor'));
      expect(calls.opened, ['response-0']);
      expect(
        find.byKey(const ValueKey('response-query-selected')),
        findsNothing,
      );

      await tester.tap(
        find.descendant(
          of: find.byKey(const ValueKey('query-response-response-0')),
          matching: find.text('Select response'),
        ),
      );
      await pumpFeatureUi(tester);
      expect(
        find.byKey(const ValueKey('response-query-selected')),
        findsOneWidget,
      );
      await tester.tap(find.byKey(const ValueKey('response-query-offer')));
      expect(calls.offered.single.selectionIntent?.ids, ['response-0']);

      await tester.tap(
        find.byKey(const ValueKey('response-query-clear-selection')),
      );
      await pumpFeatureUi(tester);
      expect(find.byKey(const ValueKey('response-query-offer')), findsNothing);

      await tester.tap(find.byKey(const ValueKey('response-query-exit')));
      expect(calls.exited, 1);
    });

    testWidgets('loads the next page under the rows', (tester) async {
      final calls = await _pump(tester);

      await tester.ensureVisible(
        find.byKey(const ValueKey('response-query-more')),
      );
      await tester.tap(find.byKey(const ValueKey('response-query-more')));
      await pumpFeatureUi(tester);

      expect(find.text('Kabir Sen'), findsOneWidget);
      expect(calls.gateway.requests.last.cursor, 'page-2');
      expect(find.byKey(const ValueKey('response-query-more')), findsNothing);
    });

    testWidgets('sorts by a sortable answer in either direction', (
      tester,
    ) async {
      final calls = await _pump(tester);

      await tester.tap(find.byKey(const ValueKey('response-query-sort')));
      await pumpFeatureUi(tester);
      expect(find.text('Age · Ascending'), findsOneWidget);
      expect(find.text('Age · Descending'), findsOneWidget);
      await tester.tap(find.text('Age · Ascending'));
      await pumpFeatureUi(tester);

      expect(calls.gateway.requests.last.sort.questionId, 'age');
      expect(calls.gateway.requests.last.sort.direction, 'asc');
    });

    testWidgets('applies an answer filter and clears it', (tester) async {
      final calls = await _pump(tester);

      await tester.tap(find.byKey(const ValueKey('response-query-filter')));
      await pumpFeatureUi(tester);
      await tester.tap(find.byKey(const ValueKey('response-add-condition-')));
      await pumpFeatureUi(tester);
      await tester.enterText(
        find.byKey(const ValueKey('response-value-0-null-null')),
        '30',
      );
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await pumpFeatureUi(tester);
      await tester.tap(find.byKey(const ValueKey('response-query-apply')));
      await pumpFeatureUi(tester);

      final predicate =
          calls.gateway.requests.last.predicate! as HostResponseGroup;
      final condition = predicate.children.single as HostResponseCondition;
      expect(condition.questionId, 'age');
      expect(condition.operator, HostResponseOperator.numberGte);
      expect(condition.value, 30);
      expect(find.text('1 condition'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('response-query-clear')));
      await pumpFeatureUi(tester);
      expect(calls.gateway.requests.last.predicate, isNull);
    });

    testWidgets('exports what the filter matches and opens the file', (
      tester,
    ) async {
      final calls = await _pump(tester);

      await tester.ensureVisible(
        find.byKey(const ValueKey('response-export-csv')),
      );
      await tester.tap(find.byKey(const ValueKey('response-export-csv')));
      await pumpFeatureUi(tester);

      expect(calls.exports.calls.single.format, HostFormExportFormat.csv);
      expect(calls.exports.calls.single.expectedResultHash, 'result-hash');
      expect(calls.downloads, [Uri.parse('https://catch.example/export.csv')]);
    });
  });

  group('Answer filter editor', () {
    testWidgets('a choice condition picks choices and a group nests once', (
      tester,
    ) async {
      HostResponsePredicate? applied;
      await pumpFormsBody(
        tester,
        ProviderScope(
          child: CatchPageBody.screen(
            child: HostResponsesQueryEditor(
              fields: [_fields.last],
              initial: null,
              onApply: (predicate) => applied = predicate,
            ),
          ),
        ),
      );

      await tester.tap(find.byKey(const ValueKey('response-add-group')));
      await pumpFeatureUi(tester);
      expect(find.byKey(const ValueKey('response-add-group')), findsOneWidget);
      expect(
        find.byKey(const ValueKey('response-add-condition-0')),
        findsOneWidget,
      );
      await tester.tap(find.byKey(const ValueKey('response-value-0-0-delhi')));
      await pumpFeatureUi(tester);
      await tester.tap(find.byKey(const ValueKey('response-query-apply')));
      await pumpFeatureUi(tester);

      final root = applied! as HostResponseGroup;
      final group = root.children.single as HostResponseGroup;
      expect(group.match, HostResponseMatch.any);
      expect((group.children.single as HostResponseCondition).values, [
        'delhi',
      ]);
    });

    testWidgets('an incomplete condition is not applied', (tester) async {
      HostResponsePredicate? applied;
      await pumpFormsBody(
        tester,
        ProviderScope(
          child: CatchPageBody.screen(
            child: HostResponsesQueryEditor(
              fields: [_fields.last],
              initial: null,
              onApply: (predicate) => applied = predicate,
            ),
          ),
        ),
      );

      await tester.tap(find.byKey(const ValueKey('response-add-condition-')));
      await pumpFeatureUi(tester);
      await tester.tap(find.byKey(const ValueKey('response-query-apply')));
      await pumpFeatureUi(tester);

      expect(applied, isNull);
    });
  });
}

class _Query implements HostResponseQueryGateway {
  final requests = <HostResponseQueryRequest>[];

  @override
  Future<HostResponseQueryPage> query(HostResponseQueryRequest request) async {
    requests.add(request);
    return _page(request.cursor == null ? 0 : 3);
  }
}

class _Exports implements HostResponseExportGateway {
  final calls = <HostResponseExportCommand>[];

  @override
  Future<HostResponseExportCommand?> pending({
    required String accountId,
    required String organizerId,
    required String formId,
  }) async => null;

  @override
  Future<HostFormExportReceipt> execute(
    HostResponseExportCommand command,
  ) async {
    calls.add(command);
    return HostFormExportReceipt(
      exportId: 'formexport_fixture',
      status: HostFormExportStatus.completed,
      format: command.format,
      rowCount: 6,
      downloadUrl: 'https://catch.example/export.csv',
      expiresAt: DateTime.fromMillisecondsSinceEpoch(1000000),
      errorMessage: null,
    );
  }
}

const _fields = [
  HostResponseQueryField(
    questionId: 'age',
    label: 'Age',
    kind: 'number',
    operators: {HostResponseOperator.numberGte},
    sortable: true,
    options: {},
  ),
  HostResponseQueryField(
    questionId: 'city',
    label: 'City',
    kind: 'singleChoice',
    operators: {HostResponseOperator.choiceAny},
    sortable: false,
    options: {'delhi': 'Delhi', 'mumbai': 'Mumbai'},
  ),
];

HostResponseQueryPage _page(int start) => HostResponseQueryPage(
  form: const HostResponseQueryForm(
    formId: 'form',
    title: 'Saturday Social',
    versionId: 'form_v1',
    version: 1,
  ),
  items: [
    for (var i = start; i < start + 3; i++)
      HostResponseQueryRow(
        responseId: 'response-$i',
        formId: 'form',
        formTitle: 'Saturday Social',
        versionId: 'form_v1',
        version: 1,
        status: HostFormResponseStatus.submitted,
        identityKind: HostFormResponseIdentityKind.phoneVerified,
        identity: HostFormResponseIdentity(
          displayName: [
            'Maya Kapoor',
            'Rohan Mehta',
            'Aisha Khan',
            'Dev Shah',
            'Nia Rao',
            'Kabir Sen',
          ][i],
          email: null,
          phoneE164: null,
          origin: HostFormDataOrigin.respondentGranted,
        ),
        sourceLinkId: null,
        submittedAt: DateTime.utc(2026, 9, 25, 10, i),
        withdrawnAt: null,
      ),
  ],
  nextCursor: start == 0 ? 'page-2' : null,
  total: 6,
  selectedIds: {for (var i = 0; i < 6; i++) 'response-$i'},
  queryHash: 'query-hash',
  resultHash: 'result-hash',
  fieldCatalog: _fields,
);
