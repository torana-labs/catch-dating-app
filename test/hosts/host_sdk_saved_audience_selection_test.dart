import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

class _UnusedFunctions extends Fake implements FirebaseFunctions {}

HostAudiencePage _peoplePage(int count, String? cursor) => HostAudiencePage(
  organizerId: 'org',
  contacts: const [],
  nextCursor: cursor,
  matchCount: count,
  matchCountCoverage: HostAudienceMatchCountCoverage.exact,
  sourceCoverage: HostAudienceSourceCoverage.exact,
  projectionVersion: 1,
);

class _PeopleRefreshRepository extends HostContactsRepository {
  _PeopleRefreshRepository() : super(_UnusedFunctions());
  final pending = Completer<HostAudiencePage>();
  int loads = 0;

  @override
  Future<HostAudiencePage> listContacts(
    String organizerId, {
    HostAudienceQuery query = const HostAudienceQuery(),
    int limit = ReadLimitPolicy.directoryPage,
  }) async {
    if (query.cursor != null) return pending.future;
    ++loads;
    return _peoplePage(loads == 1 ? 1 : 7, loads == 1 ? 'next' : null);
  }
}

HostSavedAudience _audience(String id) => HostSavedAudience(
  organizerId: 'org',
  audienceId: id,
  name: id,
  status: 'active',
  definition: const HostSavedAudienceDefinition(
    join: HostSavedAudienceJoin.all,
    predicates: [HostSavedAudienceStaticMembers([])],
  ),
  definitionHash: 'a' * 64,
  definitionVersion: 1,
  revision: 1,
  lastPreviewMatchCount: null,
  lastPreviewAt: null,
  createdAt: DateTime(2026),
  updatedAt: DateTime(2026),
);

class _SelectionRepository extends HostSavedAudienceRepository {
  _SelectionRepository() : super(_UnusedFunctions());
  final pending = {
    for (final id in ['a', 'b']) id: Completer<HostSavedAudience>(),
  };
  @override
  Future<HostSavedAudienceSummaryPage> listGroupSummaries(
    String organizerId, {
    String? cursor,
    int limit = ReadLimitPolicy.historyPage,
    bool byName = true,
    bool? isStatic,
    bool Function()? isCurrent,
  }) async => HostSavedAudienceSummaryPage(
    audiences: ['a', 'b']
        .map((id) => HostSavedAudienceSummary.fromAudience(_audience(id)))
        .toList(),
    nextCursor: null,
  );
  @override
  Future<HostSavedAudience> reloadSavedAudience({
    required String organizerId,
    required String audienceId,
    required bool Function() isCurrent,
  }) async {
    final value = await pending[audienceId]!.future;
    if (!isCurrent()) throw StateError('Superseded selection');
    return value;
  }
}

Future<void> _pump(
  WidgetTester tester,
  _SelectionRepository repository,
  List<String> opened, {
  String organizerId = 'org',
  String? query,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: CustomScrollView(
            slivers: [
              HostSavedAudiencesList(
                organizerId: organizerId,
                query: query,
                onOpen: (audience) => opened.add(audience.audienceId),
              ),
            ],
          ),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

void main() {
  test(
    'a stale People continuation cannot overwrite a refreshed list',
    () async {
      final repo = _PeopleRefreshRepository();
      final container = ProviderContainer(
        overrides: [hostContactsRepositoryProvider.overrideWithValue(repo)],
      );
      addTearDown(container.dispose);
      final provider = hostCustomersDirectoryControllerProvider(
        const HostCustomersDirectoryRequest(organizerId: 'org'),
      );
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      await container.read(provider.future);
      final pending = container.read(provider.notifier).loadMore();
      expect(container.read(provider).requireValue.loadingMore, isTrue);
      container.invalidate(provider);
      expect((await container.read(provider.future)).matchCount, 7);
      repo.pending.complete(_peoplePage(99, 'late'));
      await pending;
      expect(container.read(provider).requireValue.matchCount, 7);
      expect(container.read(provider).requireValue.nextCursor, isNull);
    },
  );

  testWidgets(
    'latest Group selection wins when details complete out of order',
    (tester) async {
      final repo = _SelectionRepository();
      final opened = <String>[];
      await _pump(tester, repo, opened);
      await tester.tap(find.byKey(const ValueKey('host-saved-audience-a')));
      await tester.tap(find.byKey(const ValueKey('host-saved-audience-b')));
      repo.pending['b']!.complete(_audience('b'));
      await pumpFeatureUi(tester);
      repo.pending['a']!.complete(_audience('a'));
      await pumpFeatureUi(tester);
      expect(opened, ['b']);
      expect(tester.takeException(), isNull);
    },
  );

  for (final contextChange in ['organizer', 'query', 'dispose']) {
    testWidgets(
      '$contextChange cancels a pending Group selection and stale error',
      (tester) async {
        final repo = _SelectionRepository();
        final opened = <String>[];
        await _pump(tester, repo, opened);
        await tester.tap(find.byKey(const ValueKey('host-saved-audience-a')));
        if (contextChange == 'dispose') {
          await tester.pumpWidget(const SizedBox.shrink());
        } else {
          await _pump(
            tester,
            repo,
            opened,
            organizerId: contextChange == 'organizer' ? 'other' : 'org',
            query: contextChange == 'query' ? 'different' : null,
          );
        }
        repo.pending['a']!.completeError(StateError('Stale Group error'));
        await pumpFeatureUi(tester);
        expect(opened, isEmpty);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
