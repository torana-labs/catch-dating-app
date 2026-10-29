import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
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
  testWidgets('Retry reloads revision and rules before restarting members', (
    tester,
  ) async {
    final repository = _RetryRepository();
    await _pump(tester, repository);
    repository.revision = 2;
    repository.failPreview = true;
    await tester.tap(
      find.byKey(const ValueKey('host-saved-audience-refresh-preview')),
    );
    await pumpFeatureUi(tester);
    expect(find.bySubtype<CatchErrorState>(), findsOneWidget);
    repository.failPreview = false;
    await tester.tap(
      find.descendant(
        of: find.bySubtype<CatchErrorState>(),
        matching: find.byType(CatchButton),
      ),
    );
    await pumpFeatureUi(tester);
    expect(repository.expectedRevisions.last, 2);
    expect(find.bySubtype<CatchErrorState>(), findsNothing);
    expect(find.text('Group 2'), findsOneWidget);
    expect(find.text('Last seen within 2 days'), findsOneWidget);
    expect(repository.definitionReads, 2);
    await tester.tap(find.byKey(const ValueKey('host-saved-audience-edit')));
    await pumpFeatureUi(tester);
    expect(find.text('Group 2'), findsWidgets);
  });

  testWidgets('editor refresh keeps dirty name and original save fence', (
    tester,
  ) async {
    final repository = _RetryRepository();
    await _pump(tester, repository);
    await tester.tap(find.byKey(const ValueKey('host-saved-audience-edit')));
    await pumpFeatureUi(tester);
    final name = find.descendant(
      of: find.byKey(const ValueKey('host-saved-audience-name')),
      matching: find.byType(TextField),
    );
    await tester.enterText(name, 'My unsaved draft');
    repository.revision = 2;
    final refresh = find.byKey(
      const ValueKey('host-saved-audience-refresh-preview'),
    );
    await tester.ensureVisible(refresh);
    repository.failDefinition = true;
    await tester.tap(refresh);
    await pumpFeatureUi(tester);
    expect(find.bySubtype<CatchErrorState>(), findsOneWidget);
    expect(
      find.text('Group saved. Membership could not be checked.'),
      findsNothing,
    );
    expect(find.text('My unsaved draft'), findsOneWidget);
    repository.failDefinition = false;
    final retry = find.descendant(
      of: find.bySubtype<CatchErrorState>(),
      matching: find.byType(CatchButton),
    );
    await tester.ensureVisible(retry);
    await tester.tap(retry);
    await pumpFeatureUi(tester);
    expect(repository.expectedRevisions.last, 2);
    expect(find.text('My unsaved draft'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('host-saved-audience-save')));
    await pumpFeatureUi(tester);
    expect(repository.savedRevision, 1);
    expect(repository.savedName, 'My unsaved draft');
    expect(find.text('My unsaved draft'), findsOneWidget);
  });

  test(
    'pagination started during refresh cannot restore retained data',
    () async {
      final repository = _RetryRepository();
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(container.dispose);
      final provider = hostSavedAudienceMembersControllerProvider(
        repository.audience,
      );
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      await container.read(provider.future);
      repository.revision = 2;
      repository.pendingDefinition = Completer<HostSavedAudiencePage>();
      repository.pendingPage = Completer<HostSavedAudiencePreview>();
      container.invalidate(provider);
      final refreshed = container.read(provider.future);
      final more = container.read(provider.notifier).loadMore();
      repository.pendingDefinition!.complete(
        HostSavedAudiencePage(
          audiences: [repository.audience],
          nextCursor: null,
        ),
      );
      await refreshed;
      repository.pendingPage!.complete(
        repository.preview(_audience(1), cursor: 'old'),
      );
      await more;
      expect(repository.expectedRevisions, [1, 2]);
      expect(
        container.read(provider).requireValue.preview.audience.revision,
        2,
      );
      expect(
        container.read(provider).requireValue.members.map((m) => m.contactId),
        ['member-2'],
      );
    },
  );

  test(
    'repeated refresh reads current revisions and drops old cursors',
    () async {
      final repository = _RetryRepository();
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
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
      for (final revision in [2, 3]) {
        repository.revision = revision;
        container.invalidate(provider);
        await container.read(provider.future);
        expect(container.read(provider).requireValue.members, hasLength(1));
        await container.read(provider.notifier).loadMore();
      }
      expect(repository.expectedRevisions, [1, 1, 2, 2, 3, 3]);
      expect(repository.definitionReads, 2);
    },
  );

  test(
    'definition failure stays an error and does not preview stale revision',
    () async {
      final repository = _RetryRepository();
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(container.dispose);
      final provider = hostSavedAudienceMembersControllerProvider(
        repository.audience,
      );
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      await container.read(provider.future);
      repository.failDefinition = true;
      container.invalidate(provider);
      await expectLater(
        container.read(provider.future),
        throwsA(isA<StateError>()),
      );
      expect(container.read(provider).hasError, isTrue);
      expect(repository.expectedRevisions, [1]);
    },
  );

  test('disposal during definition read starts no preview', () async {
    final repository = _RetryRepository();
    final container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);
    final provider = hostSavedAudienceMembersControllerProvider(
      repository.audience,
    );
    final subscription = container.listen(provider, (_, _) {});
    await container.read(provider.future);
    repository.pendingDefinition = Completer<HostSavedAudiencePage>();
    container.invalidate(provider);
    container.read(provider);
    subscription.close();
    await container.pump();
    repository.pendingDefinition!.complete(
      HostSavedAudiencePage(
        audiences: [repository.audience],
        nextCursor: 'unused',
      ),
    );
    await container.pump();
    expect(repository.expectedRevisions, [1]);
    expect(repository.definitionReads, 1);
  });

  test(
    'real repository follows definition cursors and sends refreshed fence',
    () async {
      final functions = _CallableFunctions();
      final repository = HostSavedAudienceRepository(functions);
      final audience = await repository.reloadSavedAudience(
        organizerId: 'org-1',
        audienceId: 'audience-1',
        isCurrent: () => true,
      );
      final preview = await repository.previewSavedAudience(
        organizerId: 'org-1',
        audience: audience,
      );
      expect(preview.audience.revision, 2);
      expect(functions.calls.map((c) => c.$1), [
        'listOrganizerSavedAudiences',
        'listOrganizerSavedAudiences',
        'previewOrganizerSavedAudience',
      ]);
      expect(functions.calls[1].$2['cursor'], 'definitions-page-2');
      expect(functions.calls.last.$2['expectedRevision'], 2);
      expect(functions.calls.last.$2['cursor'], isNull);
    },
  );

  test(
    'concurrent edit after definition read still fails the preview fence',
    () async {
      final repository = _RetryRepository();
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(container.dispose);
      final provider = hostSavedAudienceMembersControllerProvider(
        repository.audience,
      );
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      await container.read(provider.future);
      repository.revision = 2;
      repository.editAfterDefinition = true;
      container.invalidate(provider);
      await expectLater(
        container.read(provider.future),
        throwsA(isA<FirebaseFunctionsException>()),
      );
      expect(repository.expectedRevisions, [1, 2]);
      expect(container.read(provider).hasError, isTrue);
    },
  );

  test('missing saved definition never falls back to stale preview', () async {
    final repository = _RetryRepository();
    final container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);
    final provider = hostSavedAudienceMembersControllerProvider(
      repository.audience,
    );
    final subscription = container.listen(provider, (_, _) {});
    addTearDown(subscription.close);
    await container.read(provider.future);
    repository.missingDefinition = true;
    container.invalidate(provider);
    await expectLater(
      container.read(provider.future),
      throwsA(isA<StateError>()),
    );
    expect(repository.expectedRevisions, [1]);
  });

  testWidgets('organizer switch during editor refresh ignores old completion', (
    tester,
  ) async {
    final repository = _RetryRepository();
    final selection = ValueNotifier(_audience(1));
    addTearDown(selection.dispose);
    await _pump(tester, repository, selection: selection);
    await tester.tap(find.byKey(const ValueKey('host-saved-audience-edit')));
    await pumpFeatureUi(tester);
    repository.pendingDefinition = Completer<HostSavedAudiencePage>();
    final refresh = find.byKey(
      const ValueKey('host-saved-audience-refresh-preview'),
    );
    await tester.ensureVisible(refresh);
    await tester.tap(refresh);
    await tester.pump();
    repository.revision = 2;
    selection.value = _audience(2, organizerId: 'org-2');
    await pumpFeatureUi(tester);
    repository.pendingDefinition!.complete(
      HostSavedAudiencePage(audiences: [_audience(1)], nextCursor: 'unused'),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Group 2'), findsOneWidget);
    expect(find.text('Last seen within 2 days'), findsOneWidget);
    expect(find.bySubtype<CatchErrorState>(), findsNothing);
    expect(repository.expectedRevisions, [1, 2]);
  });

  testWidgets('organizer switch fences the old refresh and editor state', (
    tester,
  ) async {
    final repository = _RetryRepository();
    final selection = ValueNotifier(_audience(1));
    addTearDown(selection.dispose);
    await _pump(tester, repository, selection: selection);
    repository.pendingDefinition = Completer<HostSavedAudiencePage>();
    await tester.tap(
      find.byKey(const ValueKey('host-saved-audience-refresh-preview')),
    );
    await tester.pump();
    repository.revision = 2;
    selection.value = _audience(2, organizerId: 'org-2');
    await pumpFeatureUi(tester);
    repository.pendingDefinition!.complete(
      HostSavedAudiencePage(audiences: [_audience(1)], nextCursor: 'unused'),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Group 2'), findsOneWidget);
    expect(find.text('Member 1'), findsNothing);
    expect(find.bySubtype<CatchErrorState>(), findsNothing);
    await tester.tap(find.byKey(const ValueKey('host-saved-audience-edit')));
    await pumpFeatureUi(tester);
    expect(find.text('Group 2'), findsWidgets);
  });

  test('invalidated pending page cannot overwrite refreshed members', () async {
    final repository = _RetryRepository();
    final container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);
    final provider = hostSavedAudienceMembersControllerProvider(
      repository.audience,
    );
    final subscription = container.listen(provider, (_, _) {});
    addTearDown(subscription.close);
    await container.read(provider.future);
    repository.pendingPage = Completer<HostSavedAudiencePreview>();
    final more = container.read(provider.notifier).loadMore();
    repository.revision = 2;
    container.invalidate(provider);
    await container.read(provider.future);
    repository.pendingPage!.complete(
      repository.preview(_audience(1), cursor: 'old'),
    );
    await more;
    expect(container.read(provider).requireValue.preview.audience.revision, 2);
    expect(
      container.read(provider).requireValue.members.map((m) => m.contactId),
      ['member-2'],
    );
  });
}

class _UnusedFunctions extends Fake implements FirebaseFunctions {}

HostSavedAudience _audience(int revision, {String organizerId = 'org-1'}) =>
    HostSavedAudience(
      organizerId: organizerId,
      audienceId: 'audience-1',
      name: 'Group $revision',
      status: 'active',
      definition: HostSavedAudienceDefinition(
        join: HostSavedAudienceJoin.all,
        predicates: [HostSavedAudienceLastSeenWithinDays(revision)],
      ),
      definitionHash: 'hash-$revision',
      definitionVersion: 1,
      revision: revision,
      lastPreviewMatchCount: null,
      lastPreviewAt: null,
      createdAt: DateTime(2026),
      updatedAt: DateTime(2026),
    );

class _RetryRepository extends HostSavedAudienceRepository {
  _RetryRepository() : super(_UnusedFunctions());
  int revision = 1;
  int definitionReads = 0;
  bool failPreview = false;
  bool failDefinition = false;
  bool editAfterDefinition = false;
  bool missingDefinition = false;
  Completer<HostSavedAudiencePage>? pendingDefinition;
  int? savedRevision;
  String? savedName;
  final expectedRevisions = <int>[];
  Completer<HostSavedAudiencePreview>? pendingPage;
  HostSavedAudience get audience => _audience(revision);
  final contacts = _ContactsRepository();
  @override
  Future<HostSavedAudiencePage> listSavedAudiences(
    String organizerId, {
    String status = 'active',
    String? cursor,
    int limit = 25,
  }) async {
    definitionReads++;
    if (pendingDefinition != null) return pendingDefinition!.future;
    if (failDefinition) throw StateError('Definition unavailable');
    final definition = _audience(revision, organizerId: organizerId);
    if (editAfterDefinition) revision++;
    return HostSavedAudiencePage(
      audiences: missingDefinition ? [] : [definition],
      nextCursor: null,
    );
  }

  @override
  Future<HostSavedAudienceFilterOptions> savedAudienceFilterOptions(
    String organizerId,
  ) async => const HostSavedAudienceFilterOptions.empty();
  @override
  Future<HostSavedAudiencePreview> previewSavedAudience({
    required String organizerId,
    required HostSavedAudience audience,
    int sampleLimit = 10,
    String? cursor,
  }) async {
    expectedRevisions.add(audience.revision);
    if (cursor != null && pendingPage != null) return pendingPage!.future;
    if (failPreview || audience.revision != revision) {
      throw FirebaseFunctionsException(
        code: 'failed-precondition',
        message: 'Saved group changed.',
      );
    }
    return preview(audience);
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
    savedRevision = expectedRevision;
    savedName = name;
    throw FirebaseFunctionsException(
      code: 'failed-precondition',
      message: 'Saved group changed.',
    );
  }

  HostSavedAudiencePreview preview(
    HostSavedAudience audience, {
    String? cursor,
  }) => HostSavedAudiencePreview(
    audience: audience,
    nextCursor: cursor ?? 'page-2',
    matchCount: 2,
    reachSummary: const HostAudienceReachSummary(
      inCatch: 2,
      automatic: 0,
      byHand: 0,
      unavailable: 0,
    ),
    sample: [
      HostSavedAudiencePreviewContact(
        contactId: 'member-${audience.revision}',
        displayName: 'Member ${audience.revision}',
      ),
    ],
    evaluatedAt: DateTime(2026),
  );
}

class _ContactsRepository extends Fake implements HostContactsRepository {}

Future<void> _pump(
  WidgetTester tester,
  _RetryRepository repository, {
  ValueNotifier<HostSavedAudience>? selection,
}) async {
  await tester.binding.setSurfaceSize(const Size(1000, 1100));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  final router = GoRouter(
    routes: [
      GoRoute(
        path: '/',
        builder: (_, _) => selection == null
            ? HostSavedAudienceEditorScreen(
                organizerId: 'org-1',
                initialAudience: repository.audience,
              )
            : ValueListenableBuilder<HostSavedAudience>(
                valueListenable: selection,
                builder: (_, audience, _) => HostSavedAudienceEditorScreen(
                  organizerId: audience.organizerId,
                  initialAudience: audience,
                ),
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

class _CallableFunctions extends Fake implements FirebaseFunctions {
  final calls = <(String, Map<Object?, Object?>)>[];
  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _Callable(name, this);
}

class _Callable extends Fake implements HttpsCallable {
  _Callable(this.name, this.owner);
  final String name;
  final _CallableFunctions owner;
  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async {
    final payload = parameters as Map<Object?, Object?>;
    owner.calls.add((name, payload));
    final audience = <String, Object?>{
      'organizerId': 'org-1',
      'audienceId': 'audience-1',
      'scope': 'organizerCrm',
      'name': 'Group 2',
      'status': 'active',
      'definition': {
        'join': 'all',
        'predicates': [
          {'kind': 'computedSegment', 'segmentId': 'regular'},
        ],
      },
      'definitionHash': 'hash-2',
      'definitionVersion': 1,
      'revision': 2,
      'lastPreviewMatchCount': null,
      'lastPreviewAtMillis': null,
      'createdAtMillis': 1788067200000,
      'updatedAtMillis': 1788067200000,
    };
    final data = name == 'listOrganizerSavedAudiences'
        ? {
            'organizerId': 'org-1',
            'audiences': payload['cursor'] == null ? [] : [audience],
            'nextCursor': payload['cursor'] == null
                ? 'definitions-page-2'
                : null,
          }
        : {
            'coverage': 'exact',
            'audience': audience,
            'matchCount': 0,
            'reachSummary': {
              'inCatch': 0,
              'automatic': 0,
              'byHand': 0,
              'unavailable': 0,
            },
            'sample': [],
            'evaluatedAtMillis': 1788067200000,
            'nextCursor': null,
          };
    return _CallableResult<T>(data as T);
  }
}

class _CallableResult<T> extends Fake implements HttpsCallableResult<T> {
  _CallableResult(this.data);
  @override
  final T data;
}
