import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_import.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_applications_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_responses_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_screen.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../../clubs/clubs_test_helpers.dart';
import '../../test_pump_helpers.dart';

void main() {
  test('response contact links normalize E.164 and restrict social hosts', () {
    expect(
      hostResponsePhoneUri(' +919876543210 ')?.toString(),
      'tel:+919876543210',
    );
    expect(hostResponsePhoneUri('91 98765 43210'), isNull);
    expect(hostResponsePhoneUri('tel:+919876543210'), isNull);
    expect(
      hostResponseSocialUri(
        ' https://www.instagram.com/runner/ ',
        'instagram.com',
      )?.toString(),
      'https://www.instagram.com/runner/',
    );
    expect(
      hostResponseSocialUri('javascript:alert(1)', 'instagram.com'),
      isNull,
    );
    expect(
      hostResponseSocialUri(
        'https://instagram.com.evil.test/a',
        'instagram.com',
      ),
      isNull,
    );
    expect(
      hostResponseSocialUri('https://linkedin.com:444/a', 'linkedin.com'),
      isNull,
    );
  });
  testWidgets(
    'Responses app-bar import confirms in a sheet and refreshes unfiltered inbox',
    (tester) async {
      final requests = <HostFormResponseListRequest>[];
      final importer = _Importer();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            firebaseAuthProvider.overrideWithValue(_LifecycleAuth()),
            uidProvider.overrideWithValue(const AsyncData<String?>('host')),
            hostOperableClubsProvider('host').overrideWithValue(
              AsyncData([buildClub(id: 'org', ownerUserId: 'host')]),
            ),
            hostFormsDirectoryControllerProvider.overrideWith2((_) => _Forms()),
            hostFormResponsesControllerProvider.overrideWith2(
              (_) => _Inbox(requests),
            ),
            hostApplicationsControllerProvider.overrideWithValue(importer),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const HostFormsScreen(
              initialResponses: true,
              initialOrganizerId: 'org',
              initialFormId: 'old-form',
              initialContactId: 'old-person',
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Submitted'));
      await pumpFeatureUi(tester);
      final action = find.byKey(const ValueKey('host-responses-import'));
      expect(
        find.descendant(of: find.byType(CatchTopBar), matching: action),
        findsOneWidget,
      );
      await tester.tap(action);
      await pumpFeatureUi(tester);
      expect(importer.picks, 1);
      expect(importer.imports, 0);
      expect(find.byType(CatchSheet), findsOneWidget);
      await tester.tap(find.text('Import 1 response'));
      await pumpFeatureUi(tester);
      expect(importer.imports, 1);
      expect(requests.last.formId, isNull);
      expect(requests.last.contactId, isNull);
      expect(requests.last.reviewStatus, isNull);
      expect(requests.last.includeApplications, isTrue);
      expect(find.byType(CatchSheet), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'Lifecycle rail requests every review outcome with original scope',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(1400, 900));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final requests = <HostFormResponseListRequest>[];
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            hostFormResponsesControllerProvider.overrideWith2(
              (_) => _Inbox(requests),
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const Scaffold(
              body: CustomScrollView(
                slivers: [
                  HostFormResponsesSection(
                    organizerId: 'org',
                    formId: 'form',
                    contactId: 'person',
                    query: 'Maya',
                  ),
                ],
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(requests.last.reviewStatus, isNull);
      expect(requests.last.includeApplications, isTrue);
      expect(find.text('Applications'), findsNothing);
      for (final (label, status) in [
        ('Submitted', HostApplicationReviewStatus.submitted),
        ('In review', HostApplicationReviewStatus.inReview),
        ('Approved', HostApplicationReviewStatus.approved),
        ('Waitlisted', HostApplicationReviewStatus.waitlisted),
        ('Declined', HostApplicationReviewStatus.declined),
        ('Withdrawn', HostApplicationReviewStatus.withdrawn),
      ]) {
        final option = find.descendant(
          of: find.byKey(const ValueKey('host-responses-lifecycle')),
          matching: find.text(label),
        );
        await tester.ensureVisible(option);
        await tester.tap(option);
        await pumpFeatureUi(tester);
        expect(requests.last.reviewStatus, status);
        expect(requests.last.formId, 'form');
        expect(requests.last.contactId, 'person');
        expect(requests.last.query, 'Maya');
        expect(requests.last.statuses, isEmpty);
      }
      await tester.ensureVisible(
        find.descendant(
          of: find.byKey(const ValueKey('host-responses-lifecycle')),
          matching: find.text('All'),
        ),
      );
      await tester.tap(
        find.descendant(
          of: find.byKey(const ValueKey('host-responses-lifecycle')),
          matching: find.text('All'),
        ),
      );
      await pumpFeatureUi(tester);
      expect(
        tester
            .widget<CatchChoiceInput<HostApplicationReviewStatus?>>(
              find.byKey(const ValueKey('host-responses-lifecycle')),
            )
            .selected,
        {null},
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'One list routes native review, imports and ordinary responses to their details',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(1200, 1100));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final requests = <HostFormResponseListRequest>[];
      final native = _response('native', 'Maya');
      final ordinary = _response('ordinary', 'Noor');
      final entries = [
        HostFormInboxEntry(
          entryId: 'native',
          submittedAt: native.submittedAt,
          response: native,
          application: _application(
            'application-native',
            'Maya',
            HostApplicationSourceKind.native,
          ),
        ),
        HostFormInboxEntry(
          entryId: 'import',
          submittedAt: native.submittedAt,
          application: _application(
            'application-import',
            'Asha',
            HostApplicationSourceKind.tabularImport,
          ),
        ),
        HostFormInboxEntry.fromResponse(ordinary),
      ];
      HostResponseReviewQueue? openedQueue;
      final router = GoRouter(
        routes: [
          GoRoute(
            path: '/',
            builder: (_, _) => const Scaffold(
              body: CustomScrollView(
                slivers: [HostFormResponsesSection(organizerId: 'org')],
              ),
            ),
          ),
          GoRoute(
            path: '/applications/:applicationId',
            name: Routes.hostApplicationDetailScreen.name,
            builder: (_, state) {
              openedQueue = state.extra as HostResponseReviewQueue?;
              return Scaffold(
                body: Text('Review ${state.pathParameters['applicationId']}'),
              );
            },
          ),
          GoRoute(
            path: '/responses/:responseId',
            name: Routes.hostFormResponseDetailScreen.name,
            builder: (_, state) {
              openedQueue = state.extra as HostResponseReviewQueue?;
              return Scaffold(
                body: Text('Response ${state.pathParameters['responseId']}'),
              );
            },
          ),
        ],
      );
      addTearDown(router.dispose);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            hostFormResponsesControllerProvider.overrideWith2(
              (_) => _Inbox(requests, entries: entries),
            ),
          ],
          child: MaterialApp.router(
            theme: AppTheme.light,
            routerConfig: router,
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(find.text('Maya'), findsOneWidget);
      expect(find.text('Asha'), findsOneWidget);
      expect(find.text('Noor'), findsOneWidget);
      for (final id in ['native', 'import']) {
        expect(
          find.descendant(
            of: find.byKey(ValueKey('host-response-entry-$id')),
            matching: find.text('Approved'),
          ),
          findsOneWidget,
        );
      }
      expect(
        find.descendant(
          of: find.byKey(
            const ValueKey('host-response-entry-response:ordinary'),
          ),
          matching: find.text('Submitted'),
        ),
        findsNothing,
      );
      for (final (index, (name, expected)) in [
        ('Maya', 'Review application-native'),
        ('Asha', 'Review application-import'),
        ('Noor', 'Response ordinary'),
      ].indexed) {
        await tester.tap(find.text(name));
        await pumpFeatureUi(tester);
        expect(find.text(expected), findsOneWidget);
        expect(openedQueue?.index, index);
        expect(openedQueue?.entryId, entries[index].entryId);
        expect(openedQueue?.request, requests.last);
        router.pop();
        await pumpFeatureUi(tester);
      }
      expect(tester.takeException(), isNull);
    },
  );

  test('Unified entries parse both sources and reject an empty row', () {
    expect(
      () => HostFormResponsePage.fromCallableData(const {
        'organizerId': 'org',
        'items': [],
        'nextCursor': null,
      }, requireUnifiedEntries: true),
      throwsFormatException,
    );
    final response = _response('id', 'Name');
    expect(HostFormInboxEntry.fromResponse(response).response, same(response));
    expect(
      () => HostFormInboxEntry.fromMap(const {
        'entryId': 'empty',
        'submittedAtMillis': 1,
        'response': null,
        'application': null,
      }),
      throwsFormatException,
    );
    const request = HostFormResponseListRequest(
      organizerId: 'org',
      includeApplications: true,
      reviewStatus: HostApplicationReviewStatus.approved,
      contactId: 'person',
    );
    expect(
      request.copyWith(cursor: 'next').reviewStatus,
      HostApplicationReviewStatus.approved,
    );
    expect(request.copyWith(cursor: 'next').includeApplications, isTrue);
    expect(request.copyWith(cursor: 'next').contactId, 'person');
    expect(
      request,
      isNot(const HostFormResponseListRequest(organizerId: 'org')),
    );
  });

  test(
    'review queue targets the shifted neighbor when the current row leaves',
    () {
      final entries = [
        for (final id in ['a', 'b', 'c'])
          HostFormInboxEntry.fromResponse(_response(id, id)),
      ];
      const queue = HostResponseReviewQueue(
        request: HostFormResponseListRequest(
          organizerId: 'org',
          formId: 'form',
          versionId: 'form_v2',
          answerFilters: {
            'city': {'Mumbai', 'Delhi'},
          },
        ),
        entryId: 'response:b',
        index: 1,
      );
      expect(queue.targetIndex(entries, -1), 0);
      expect(queue.targetIndex(entries, 1), 2);
      final afterReview = [entries.first, entries.last];
      expect(queue.targetIndex(afterReview, -1), 0);
      expect(queue.targetIndex(afterReview, 1), 1);
      expect(queue.targetIndex([entries.first], -1, hasMore: false), 0);
      expect(queue.targetIndex([entries.first], 1, hasMore: false), 1);
      expect(queue.request.versionId, 'form_v2');
      expect(queue.request.answerFilters['city'], {'Mumbai', 'Delhi'});
    },
  );
}

class _Inbox extends HostFormResponsesController {
  _Inbox(this.requests, {this.entries = const []});
  final List<HostFormResponseListRequest> requests;
  final List<HostFormInboxEntry> entries;
  @override
  Future<HostFormResponsesState> build(
    HostFormResponseListRequest request,
  ) async {
    requests.add(request);
    return HostFormResponsesState(
      responses: const [],
      entries: entries,
      nextCursor: null,
    );
  }
}

HostFormResponseSummary _response(String id, String name) =>
    HostFormResponseSummary(
      responseId: id,
      formId: 'form',
      formTitle: 'Weekend feedback',
      versionId: 'v1',
      version: 1,
      status: HostFormResponseStatus.submitted,
      identityKind: HostFormResponseIdentityKind.catchAccount,
      identity: HostFormResponseIdentity(
        displayName: name,
        email: null,
        phoneE164: null,
        origin: HostFormDataOrigin.respondentGranted,
      ),
      sourceLinkId: null,
      sourceLabel: null,
      submittedAt: DateTime(2026, 9, 21),
      withdrawnAt: null,
      highlights: const [],
      conversionKinds: const {},
    );
HostApplicationSummary _application(
  String id,
  String name,
  HostApplicationSourceKind source,
) => HostApplicationSummary(
  applicationId: id,
  formId: 'form',
  formVersionId: 'v1',
  targetKind: 'organizer',
  targetId: 'org',
  applicantDisplayName: name,
  reviewStatus: HostApplicationReviewStatus.approved,
  sourceKind: source,
  providerId: null,
  submittedAt: DateTime(2026, 9, 21),
  revision: 1,
);

class _Forms extends HostFormsDirectoryController {
  @override
  Future<HostFormsDirectoryState> build(HostFormListRequest request) async =>
      const HostFormsDirectoryState(forms: [], nextCursor: null);
}

class _Importer extends Fake implements HostApplicationsController {
  int picks = 0;
  int imports = 0;
  @override
  Future<HostRosterTable?> pickImportFile() async {
    picks++;
    return const HostRosterTable(
      fileName: 'responses.csv',
      format: EventAttendeeImportFormat.csv,
      headers: ['Full name'],
      rows: [
        ['Asha Mehta'],
      ],
      suggestedMapping: {},
      adapter: HostRosterAdapterDetection(
        adapterId: HostRosterAdapterId.genericV1,
        support: HostRosterAdapterSupport.generic,
        confidence: 1,
      ),
    );
  }

  @override
  Future<HostApplicationImportResult> importDraft({
    required String organizerId,
    required HostApplicationImportDraft draft,
    required String consentCopy,
    required String consentVersion,
    required String retentionCopy,
  }) async {
    imports++;
    expect(organizerId, 'org');
    expect(draft.rows, [
      ['Asha Mehta'],
    ]);
    return const HostApplicationImportResult(
      receiptId: 'receipt',
      status: 'completed',
      rowCount: 1,
      createdCount: 1,
      skippedCount: 0,
      replayed: false,
    );
  }
}

class _LifecycleAuth extends Fake implements FirebaseAuth {
  @override
  User? get currentUser => _LifecycleUser();
}

class _LifecycleUser extends Fake implements User {
  @override
  String get uid => 'host';
}
