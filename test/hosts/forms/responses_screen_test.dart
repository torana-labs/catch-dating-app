import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/forms/response_screen.dart';
import 'package:catch_dating_app/hosts/forms/responses_body.dart';
import 'package:catch_dating_app/hosts/forms/responses_filter_sheet.dart';
import 'package:catch_dating_app/hosts/forms/responses_state.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'forms_fixtures.dart';

const _pace = HostFormResponseFilterOption(
  questionId: 'pace',
  label: 'Your easy pace',
  options: {'easy': 'Easy', 'steady': 'Steady', 'brisk': 'Brisk'},
);

void main() {
  group('Responses filters', () {
    testWidgets('every status shows, with sort, filters, the version line '
        'and what narrows the list', (tester) async {
      final filters = <HostResponsesFilter>[];
      var sorted = 0;
      var opened = 0;
      var cleared = 0;
      await pumpFormsBody(
        tester,
        HostResponsesBody(
          state: HostResponsesState(
            status: HostResponsesStatus.content,
            filter: HostResponsesFilter.all,
            entries: formEntries,
            oldestFirst: true,
            canFilter: true,
            filterCount: 1,
            filterSummary: 'Your easy pace: Easy',
            version: const HostResponsesVersion(published: 3, selected: 3),
          ),
          now: formsNow,
          onView: (_) {},
          onFilter: filters.add,
          onOpen: (_) {},
          onLoadMore: () {},
          onSort: () => sorted++,
          onFilters: () => opened++,
          onClearFilters: () => cleared++,
        ),
      );

      expect(find.text('All'), findsOneWidget);
      expect(find.text('Oldest first'), findsOneWidget);
      expect(find.text('Filters · 1'), findsOneWidget);
      expect(find.text('Published version 3'), findsOneWidget);
      expect(find.text('Your easy pace: Easy'), findsOneWidget);
      expect(find.textContaining('Catch form'), findsWidgets);

      await tester.tap(find.byKey(const ValueKey('host-responses-sort')));
      await tester.tap(find.byKey(const ValueKey('host-responses-filters')));
      await tester.tap(find.byKey(const ValueKey('host-responses-clear')));
      await tester.ensureVisible(find.text('Withdrawn'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Withdrawn'));
      await tester.pump();

      expect([sorted, opened, cleared], [1, 1, 1]);
      expect(filters, [HostResponsesFilter.withdrawn]);
    });

    testWidgets('a narrowed list with no answers says nothing matches', (
      tester,
    ) async {
      await pumpFormsBody(
        tester,
        HostResponsesBody(
          state: const HostResponsesState(
            status: HostResponsesStatus.content,
            filter: HostResponsesFilter.declined,
          ),
          now: formsNow,
          onView: (_) {},
          onFilter: (_) {},
          onOpen: (_) {},
          onLoadMore: () {},
        ),
      );

      expect(find.text('No responses match'), findsOneWidget);
      expect(find.text('No responses yet'), findsNothing);
    });

    testWidgets('every form at once leads each row with its form', (
      tester,
    ) async {
      await pumpFormsBody(
        tester,
        HostResponsesBody(
          state: HostResponsesState(
            status: HostResponsesStatus.content,
            forForm: false,
            entries: [formEntry(id: 'tara', name: 'Tara Menon', review: null)],
          ),
          now: formsNow,
          onView: (_) {},
          onFilter: (_) {},
          onOpen: (_) {},
          onLoadMore: () {},
        ),
      );

      expect(
        find.text('Join the Sunday run · Steady pace · 5 km · Instagram'),
        findsOneWidget,
      );
      expect(find.textContaining('Instagram bio'), findsOneWidget);
    });
  });

  group('Filter sheet', () {
    testWidgets('chooses a version, then answers, and resets', (tester) async {
      final versions = <int?>[];
      final answers = <String>[];
      var reset = 0;
      await pumpFormsBody(
        tester,
        CatchPageBody.screen(
          child: HostResponsesFilterSheet(
            version: const HostResponsesVersion(published: 3, selected: 3),
            options: const [_pace],
            answers: const {
              'pace': {'easy'},
            },
            onVersion: versions.add,
            onAnswers: (question, values) =>
                answers.add('$question:${(values.toList()..sort()).join(',')}'),
            onReset: () => reset++,
          ),
        ),
      );

      expect(find.text('All versions'), findsOneWidget);
      expect(find.text('Version 1'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('response-version-all')));
      await tester.tap(find.byKey(const ValueKey('response-version-2')));
      await tester.tap(
        find.byKey(const ValueKey('response-filter-pace-brisk')),
      );
      await tester.tap(find.byKey(const ValueKey('response-filter-pace-easy')));
      await tester.tap(
        find.byKey(const ValueKey('host-responses-filters-reset')),
      );

      expect(versions, [null, 2]);
      expect(answers, ['pace:brisk,easy', 'pace:']);
      expect(reset, 1);
    });

    testWidgets('every version hides the answer filters', (tester) async {
      await pumpFormsBody(
        tester,
        CatchPageBody.screen(
          child: HostResponsesFilterSheet(
            version: const HostResponsesVersion(published: 3),
            options: const [_pace],
            answers: const {},
            onVersion: (_) {},
            onAnswers: (_, _) {},
            onReset: null,
          ),
        ),
      );

      expect(find.text('Your easy pace'), findsNothing);
    });

    testWidgets('a form with more than fifty versions takes a number', (
      tester,
    ) async {
      final versions = <int?>[];
      await pumpFormsBody(
        tester,
        CatchPageBody.screen(
          child: HostResponsesFilterSheet(
            version: const HostResponsesVersion(published: 60, selected: 60),
            options: const [],
            answers: const {},
            onVersion: versions.add,
            onAnswers: (_, _) {},
            onReset: null,
          ),
        ),
      );

      expect(find.text('Version 11'), findsOneWidget);
      expect(find.text('Version 10'), findsNothing);
      await tester.enterText(
        find.byKey(const ValueKey('response-version-number')),
        '4',
      );
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.enterText(
        find.byKey(const ValueKey('response-version-number')),
        '99',
      );
      await tester.testTextInput.receiveAction(TextInputAction.done);

      expect(versions, [4]);
    });
  });

  group('Stepping through the list', () {
    final entries = [
      formEntry(id: 'a', name: 'A'),
      formEntry(id: 'b', name: 'B'),
      formEntry(id: 'c', name: 'C'),
    ];
    const request = HostFormResponseListRequest(organizerId: 'lantern-lane');

    test('steps either side of the answer', () {
      const queue = HostResponsesQueue(
        request: request,
        entryId: 'entry-b',
        index: 1,
      );
      expect(queue.targetIndex(entries, -1), 0);
      expect(queue.targetIndex(entries, 1), 2);
    });

    test('steps from where the answer was once it leaves the list', () {
      const queue = HostResponsesQueue(
        request: request,
        entryId: 'entry-gone',
        index: 1,
      );
      expect(queue.targetIndex(entries, 1), 1);
      expect(queue.targetIndex(entries, -1), 0);
      const last = HostResponsesQueue(
        request: request,
        entryId: 'entry-gone',
        index: 5,
      );
      expect(last.targetIndex(entries, -1, hasMore: false), 2);
    });
  });

  testWidgets('Next answer opens the next application in place', (
    tester,
  ) async {
    final entries = [
      formEntry(id: 'a', name: 'A'),
      formEntry(id: 'b', name: 'B'),
    ];
    const request = HostFormResponseListRequest(
      organizerId: 'org-1',
      includeApplications: true,
    );
    final opened = <(String, Object?)>[];
    final router = GoRouter(
      initialLocation: '/application/application-a',
      initialExtra: const HostResponsesQueue(
        request: request,
        entryId: 'entry-a',
        index: 0,
      ),
      routes: [
        GoRoute(
          path: '/application/:applicationId',
          name: Routes.hostApplicationDetailScreen.name,
          builder: (context, state) {
            opened.add((state.pathParameters['applicationId']!, state.extra));
            return HostResponseScreen.application(
              organizerId: 'org-1',
              applicationId: state.pathParameters['applicationId']!,
              queue: state.extra as HostResponsesQueue?,
            );
          },
        ),
      ],
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          for (final id in ['application-a', 'application-b'])
            hostApplicationDetailProvider(
              'org-1',
              id,
            ).overrideWith((_) => Stream.value(_application(id))),
          hostFormResponsesControllerProvider(
            request,
          ).overrideWith(() => _Responses(entries)),
        ],
        child: MaterialApp.router(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          routerConfig: router,
        ),
      ),
    );
    await pumpFeatureUi(tester);

    final previous = tester.widget<CatchIconAction>(
      find.byKey(const ValueKey('host-response-previous')),
    );
    expect(previous.onPressed, isNull);
    await tester.tap(find.byKey(const ValueKey('host-response-next')));
    await pumpFeatureUi(tester);

    expect(opened.last.$1, 'application-b');
    expect((opened.last.$2! as HostResponsesQueue).index, 1);
    final next = tester.widget<CatchIconAction>(
      find.byKey(const ValueKey('host-response-next')),
    );
    expect(next.onPressed, isNull);
  });
}

class _Responses extends HostFormResponsesController {
  _Responses(this.entries);

  final List<HostFormInboxEntry> entries;

  @override
  Future<HostFormResponsesState> build(HostFormResponseListRequest request) =>
      Future.value(
        HostFormResponsesState(
          responses: const [],
          entries: entries,
          nextCursor: null,
        ),
      );
}

HostApplicationDetail _application(String id) => HostApplicationDetail(
  organizerId: 'org-1',
  applicationId: id,
  formId: 'form-1',
  formVersionId: 'version-1',
  targetKind: 'organizer',
  targetId: null,
  applicantDisplayName: id,
  reviewStatus: HostApplicationReviewStatus.submitted,
  answers: const [],
  outreach: const HostApplicationOutreach(
    phoneE164: null,
    email: null,
    instagramUrl: null,
    linkedinUrl: null,
  ),
  reviewNote: null,
  assignedReviewerUid: null,
  submittedAt: DateTime(2026, 9),
  reviewedAt: null,
  revision: 2,
  contactId: 'person-1',
  dataAccessState: 'submittedFormResponse',
);
