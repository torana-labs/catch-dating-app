import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_saved_audience_members_controller.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../test_pump_helpers.dart';

void main() {
  test(
    'member controller follows the server cursor and preserves the full list',
    () async {
      final repository = _AudienceRepository();
      final container = ProviderContainer(
        overrides: [
          firebaseFunctionsProvider.overrideWithValue(_UnusedFunctions()),
          hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
          hostContactsRepositoryProvider.overrideWithValue(repository.contacts),
        ],
      );
      addTearDown(container.dispose);
      final provider = hostSavedAudienceMembersControllerProvider(
        repository.audience,
      );
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      await container.read(provider.future);
      await container.read(provider.notifier).loadMore();
      expect(repository.cursors, [null, 'page-2']);
      expect(
        container.read(provider).requireValue.members.map((m) => m.contactId),
        ['ada', 'grace'],
      );
    },
  );

  testWidgets(
    'audience overview inspects members and hands its scope to Messaging',
    (tester) async {
      final repository = _AudienceRepository();
      await _pump(tester, repository);
      expect(
        find.byKey(const ValueKey('host-saved-audience-name')),
        findsNothing,
      );
      expect(find.text('Ada'), findsOneWidget);
      await tester.ensureVisible(
        find.byKey(const ValueKey('host-saved-audience-more-members')),
      );
      await tester.tap(
        find.byKey(const ValueKey('host-saved-audience-more-members')),
      );
      await pumpFeatureUi(tester);
      expect(find.text('Grace'), findsOneWidget);
      await tester.ensureVisible(
        find.byKey(const ValueKey('host-saved-audience-message')),
      );
      await tester.tap(
        find.byKey(const ValueKey('host-saved-audience-message')),
      );
      await pumpFeatureUi(tester);
      expect(find.text('Compose org-1 audience-1'), findsOneWidget);
    },
  );

  testWidgets(
    'filter options retry replaces the error and restores the saved rules',
    (tester) async {
      final retryOptions = Completer<void>();
      final repository = _AudienceRepository(
        failFirstOptions: true,
        retryOptions: retryOptions,
      );
      await _pump(tester, repository);
      await tester.tap(find.byKey(const ValueKey('host-saved-audience-edit')));
      await pumpUntilFound(tester, find.bySubtype<CatchErrorState>());
      expect(repository.optionsRequests, 1);
      expect(
        find.byKey(const ValueKey('host-saved-audience-name')),
        findsNothing,
      );

      await tester.tap(
        find.descendant(
          of: find.bySubtype<CatchErrorState>(),
          matching: find.byType(CatchButton),
        ),
      );
      await pumpUntilFound(tester, find.byType(CatchLoadingIndicator));
      expect(find.bySubtype<CatchErrorState>(), findsNothing);
      expect(repository.optionsRequests, 2);

      retryOptions.complete();
      await pumpUntilFound(
        tester,
        find.byKey(const ValueKey('host-saved-audience-name')),
      );
      expect(find.bySubtype<CatchErrorState>(), findsNothing);
      expect(find.text('Sunday regulars'), findsWidgets);
      expect(find.text('Regulars'), findsNWidgets(2));
    },
  );

  testWidgets(
    'combined saved filters retain edits on dismissal and expose stored SMS',
    (tester) async {
      final repository = _AudienceRepository()
        ..saved = const HostSavedAudienceDefinition(
          join: HostSavedAudienceJoin.all,
          predicates: [
            HostSavedAudienceDirectoryFilters(
              manualTagIds: {},
              segments: {
                HostAudienceSegment.repeatAttendee,
                HostAudienceSegment.reliableAttendee,
                HostAudienceSegment.smsReachable,
              },
            ),
          ],
        );
      await _pump(tester, repository);
      await tester.tap(find.byKey(const ValueKey('host-saved-audience-edit')));
      await pumpFeatureUi(tester);
      final filters = find.byKey(
        const ValueKey('host-saved-audience-directory-filters-1'),
      );
      await tester.ensureVisible(filters);
      await tester.tap(filters);
      await pumpFeatureUi(tester);
      for (final filter in ['firstTime', 'needsConfirmation', 'smsReachable']) {
        final chip = find.byKey(ValueKey('host-customer-filter-$filter'));
        await tester.ensureVisible(chip);
        await tester.tap(chip);
        await pumpFeatureUi(tester);
      }
      Navigator.of(tester.element(find.byType(HostCustomerFilterSheet))).pop();
      await pumpFeatureUi(tester);
      await tester.tap(find.byKey(const ValueKey('host-saved-audience-save')));
      await pumpFeatureUi(tester);
      final saved =
          repository.saved!.predicates.single
              as HostSavedAudienceDirectoryFilters;
      expect(saved.segments, {
        HostAudienceSegment.firstTimeAttendee,
        HostAudienceSegment.repeatAttendee,
        HostAudienceSegment.reliableAttendee,
        HostAudienceSegment.needsConfirmation,
      });
      expect(saved.manualTagIds, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'form-answer authoring saves the selected published version and choice',
    (tester) async {
      final repository = _AudienceRepository();
      await _pump(tester, repository);
      await tester.tap(find.byKey(const ValueKey('host-saved-audience-edit')));
      await pumpFeatureUi(tester);
      await tester.ensureVisible(
        find.byKey(const ValueKey('host-saved-audience-rule-type-1')),
      );
      await tester.tap(
        find.byKey(const ValueKey('host-saved-audience-rule-type-1')),
      );
      await pumpFeatureUi(tester);
      await _selectMenuChoice(tester, 'Form answer');
      await pumpFeatureUi(tester);
      final questionField = find.descendant(
        of: find.byKey(const ValueKey('host-saved-audience-rule-0')),
        matching: find.byKey(
          const ValueKey('host-saved-audience-source-question'),
        ),
      );
      await tester.ensureVisible(questionField);
      await tester.tap(questionField);
      await pumpFeatureUi(tester);
      await _selectMenuChoice(
        tester,
        'Published application · v1 · Favorite drink',
      );
      await pumpFeatureUi(tester);
      final answerField = find.descendant(
        of: find.byKey(const ValueKey('host-saved-audience-rule-0')),
        matching: find.byKey(
          const ValueKey('host-saved-audience-source-answer'),
        ),
      );
      await tester.ensureVisible(answerField);
      await tester.tap(answerField);
      await pumpFeatureUi(tester);
      await _selectMenuChoice(tester, 'Coffee');
      await pumpFeatureUi(tester);
      await tester.tap(find.byKey(const ValueKey('host-saved-audience-save')));
      await pumpFeatureUi(tester);
      final saved =
          repository.saved!.predicates.single as HostSavedAudienceFormAnswer;
      expect(saved.formId, 'form-1');
      expect(saved.versionId, 'version-1');
      expect(saved.questionId, 'drink');
      expect(saved.value, 'coffee');
      expect(
        find.byKey(const ValueKey('host-saved-audience-name')),
        findsNothing,
      );
      expect(
        find.text('Published application · v1 · Favorite drink: Coffee'),
        findsOneWidget,
      );
    },
  );

  testWidgets('spend authoring stores exact minor units and a time window', (
    tester,
  ) async {
    final repository = _AudienceRepository();
    await _pump(tester, repository);
    await tester.tap(find.byKey(const ValueKey('host-saved-audience-edit')));
    await pumpFeatureUi(tester);
    await tester.tap(
      find.byKey(const ValueKey('host-saved-audience-rule-type-1')),
    );
    await pumpFeatureUi(tester);
    await _selectMenuChoice(tester, 'Catch spend');
    await pumpFeatureUi(tester);
    await tester.ensureVisible(
      find.byKey(const ValueKey('host-audience-spend-amount-INR')),
    );
    await tester.enterText(_input('host-audience-spend-amount-INR'), '1234.56');
    await tester.ensureVisible(
      find.byKey(const ValueKey('host-audience-spend-days')),
    );
    await tester.enterText(_input('host-audience-spend-days'), '90');
    await tester.tap(find.byKey(const ValueKey('host-saved-audience-save')));
    await pumpFeatureUi(tester);
    final rule = repository.saved!.predicates.single as HostSavedAudienceSpend;
    expect(rule.currency, 'INR');
    expect(rule.amountMinor, 123456);
    expect(rule.withinDays, 90);
  });

  testWidgets(
    'static editing removes unavailable aliases and selects from later pages',
    (tester) async {
      final repository = _AudienceRepository()
        ..saved = const HostSavedAudienceDefinition(
          join: HostSavedAudienceJoin.all,
          predicates: [
            HostSavedAudienceStaticMembers(['old-ada', 'deleted']),
          ],
        );
      await _pump(tester, repository);
      await tester.tap(find.byKey(const ValueKey('host-saved-audience-edit')));
      await pumpFeatureUi(tester);
      expect(
        find.byKey(const ValueKey('host-saved-audience-rule-type-1')),
        findsNothing,
      );
      await tester.ensureVisible(
        find.byKey(const ValueKey('host-static-remove-deleted')),
      );
      await tester.tap(
        find.byKey(const ValueKey('host-static-remove-deleted')),
      );
      await pumpFeatureUi(tester);
      await tester.ensureVisible(
        find.byKey(const ValueKey('host-static-person-ada')),
      );
      await tester.tap(find.byKey(const ValueKey('host-static-person-ada')));
      await pumpFeatureUi(tester);
      await tester.ensureVisible(
        find.byKey(const ValueKey('host-static-next')),
      );
      await tester.tap(find.byKey(const ValueKey('host-static-next')));
      await pumpFeatureUi(tester);
      await tester.ensureVisible(
        find.byKey(const ValueKey('host-static-person-grace')),
      );
      await tester.tap(find.byKey(const ValueKey('host-static-person-grace')));
      await pumpFeatureUi(tester);
      await tester.ensureVisible(
        find.byKey(const ValueKey('host-static-search')),
      );
      await tester.enterText(_input('host-static-search'), 'Grace');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await pumpFeatureUi(tester);
      expect(
        repository.contacts.peopleQueries.map((query) => query.cursor),
        contains('people-2'),
      );
      expect(repository.contacts.peopleQueries.last.search, 'Grace');
      expect(repository.contacts.peopleQueries.last.cursor, isNull);
      await tester.tap(find.byKey(const ValueKey('host-saved-audience-save')));
      await pumpFeatureUi(tester);
      expect(repository.saved!.selectedContactIds, ['grace']);
    },
  );
}

Finder _input(String key) => find.descendant(
  of: find.byKey(ValueKey(key)),
  matching: find.byType(EditableText),
);

Future<void> _selectMenuChoice(WidgetTester tester, String label) async {
  final choice = _menuChoice(label);
  // The canonical menu scrolls when its choices exceed the available side.
  await tester.ensureVisible(choice);
  await tester.pump();
  await tester.tap(choice);
}

Finder _menuChoice(String label) => find.descendant(
  of: find.byWidgetPredicate(
    (widget) => widget is CatchMenu<Object?> && widget.builder == null,
  ),
  matching: find.text(label),
);

Future<void> _pump(WidgetTester tester, _AudienceRepository repository) async {
  await tester.binding.setSurfaceSize(const Size(1000, 1100));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  final router = GoRouter(
    routes: [
      GoRoute(
        path: '/',
        builder: (_, _) => HostSavedAudienceEditorScreen(
          organizerId: 'org-1',
          initialAudience: repository.audience,
        ),
      ),
      GoRoute(
        path: '/compose',
        name: Routes.hostInboxScreen.name,
        builder: (_, state) => Scaffold(
          body: Text(
            'Compose ${state.uri.queryParameters['organizerId']} '
            '${state.uri.queryParameters['audienceId']}',
          ),
        ),
      ),
      GoRoute(
        path: '/person/:contactId',
        name: Routes.hostCustomerDetailScreen.name,
        builder: (_, state) =>
            Scaffold(body: Text('Person ${state.pathParameters['contactId']}')),
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      retry: (_, _) => null,
      overrides: [
        firebaseFunctionsProvider.overrideWithValue(_UnusedFunctions()),
        hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
        hostContactsRepositoryProvider.overrideWithValue(repository.contacts),
      ],
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  await pumpFeatureUi(tester);
}

class _UnusedFunctions extends Fake implements FirebaseFunctions {}

class _AudienceRepository extends HostSavedAudienceRepository {
  _AudienceRepository({this.failFirstOptions = false, this.retryOptions})
    : super(_UnusedFunctions());
  final bool failFirstOptions;
  final Completer<void>? retryOptions;
  int optionsRequests = 0;
  final cursors = <String?>[];
  HostSavedAudienceDefinition? saved;
  HostSavedAudience get audience => _audience(
    saved ??
        const HostSavedAudienceDefinition(
          join: HostSavedAudienceJoin.all,
          predicates: [
            HostSavedAudienceComputedSegment(HostAudienceSegment.regular),
          ],
        ),
  );

  final contacts = _ContactsRepository();

  @override
  Future<List<HostStaticAudienceMember>> resolveAudienceMembers(
    String organizerId,
    List<String> ids,
  ) async => [
    for (final id in ids)
      HostStaticAudienceMember(
        selectedContactId: id,
        contactId: id == 'deleted' ? null : 'ada',
        displayName: id == 'deleted' ? null : 'Ada',
        available: id != 'deleted',
      ),
  ];

  @override
  Future<HostSavedAudienceFilterOptions> savedAudienceFilterOptions(
    String organizerId,
  ) async {
    optionsRequests++;
    if (failFirstOptions && optionsRequests == 1) {
      throw FirebaseFunctionsException(
        code: 'unavailable',
        message: 'Filter options are temporarily unavailable.',
      );
    }
    if (retryOptions != null) await retryOptions!.future;
    return const HostSavedAudienceFilterOptions(
      forms: [
        HostAudienceSourceOption(id: 'form-1', title: 'Published application'),
      ],
      questions: [
        HostAudienceQuestionOption(
          formId: 'form-1',
          versionId: 'version-1',
          version: 1,
          formTitle: 'Published application',
          questionId: 'drink',
          label: 'Favorite drink',
          options: [
            HostAudienceAnswerOption(label: 'Tea', value: 'tea'),
            HostAudienceAnswerOption(label: 'Coffee', value: 'coffee'),
          ],
        ),
      ],
      events: [HostAudienceSourceOption(id: 'event-1', title: 'Sunday social')],
      tags: [],
    );
  }

  @override
  Future<HostSavedAudiencePreview> previewSavedAudience({
    required String organizerId,
    required HostSavedAudience audience,
    int sampleLimit = 10,
    String? cursor,
  }) async {
    cursors.add(cursor);
    return HostSavedAudiencePreview(
      audience: audience,
      matchCount: 2,
      reachSummary: const HostAudienceReachSummary(
        inCatch: 0,
        automatic: 0,
        byHand: 2,
        unavailable: 0,
      ),
      sample: [
        cursor == null
            ? const HostSavedAudiencePreviewContact(
                contactId: 'ada',
                displayName: 'Ada',
              )
            : const HostSavedAudiencePreviewContact(
                contactId: 'grace',
                displayName: 'Grace',
              ),
      ],
      nextCursor: cursor == null ? 'page-2' : null,
      evaluatedAt: DateTime(2026, 9, 3),
    );
  }

  @override
  Future<HostSavedAudience> upsertSavedAudience({
    required String organizerId,
    required String requestId,
    required String name,
    required HostSavedAudienceDefinition definition,
    String? audienceId,
    int? expectedRevision,
  }) async {
    saved = definition;
    return audience;
  }
}

HostSavedAudience _audience(HostSavedAudienceDefinition definition) =>
    HostSavedAudience(
      organizerId: 'org-1',
      audienceId: 'audience-1',
      name: 'Sunday regulars',
      status: 'active',
      definition: definition,
      definitionHash: 'hash',
      definitionVersion: 2,
      revision: 1,
      lastPreviewMatchCount: 2,
      lastPreviewAt: DateTime(2026, 9, 3),
      createdAt: DateTime(2026, 9),
      updatedAt: DateTime(2026, 9, 3),
    );

HostAudienceContact _person(String id, String name) => HostAudienceContact(
  contactId: id,
  displayName: name,
  phoneE164: null,
  email: null,
  identityState: HostAudienceIdentityState.verified,
  identityConfidence: 'verified',
  ambiguousCandidateCount: 0,
  attendedEventCount: 0,
  expectedEventCount: 0,
  lastAttendedAt: null,
  segments: const {},
  whatsappStatus: HostAudiencePermissionStatus.unknown,
  whatsappAdminSuppressed: false,
  smsStatus: HostAudiencePermissionStatus.unknown,
  sourceCoverage: HostAudienceSourceCoverage.exact,
  revision: 1,
);

class _ContactsRepository extends HostContactsRepository {
  _ContactsRepository() : super(_UnusedFunctions());
  final peopleQueries = <HostAudienceQuery>[];
  @override
  Future<HostAudiencePage> listContacts(
    String organizerId, {
    HostAudienceQuery query = const HostAudienceQuery(),
    int limit = 25,
  }) async {
    peopleQueries.add(query);
    final second = query.cursor != null || query.search != null;
    return HostAudiencePage(
      organizerId: organizerId,
      contacts: [_person(second ? 'grace' : 'ada', second ? 'Grace' : 'Ada')],
      nextCursor: second ? null : 'people-2',
      matchCount: 2,
      matchCountCoverage: HostAudienceMatchCountCoverage.exact,
      sourceCoverage: HostAudienceSourceCoverage.exact,
      projectionVersion: 1,
    );
  }
}
