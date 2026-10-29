import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  test('disposed exhaustive directory never requests the next page', () async {
    final repository = _Pages();
    final container = ProviderContainer(
      overrides: [
        hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);
    final subscription = container.listen(
      hostAllSavedAudiencesProvider('a'),
      (_, _) {},
    );
    expect(repository.requests, ['a:null']);
    subscription.close();
    await container.pump();
    repository.pages.first.complete(
      const HostSavedAudiencePage(audiences: [], nextCursor: 'next'),
    );
    await container.pump();
    expect(repository.requests, ['a:null']);
  });

  test(
    'active directory follows cursors and produces exhaustive data',
    () async {
      final repository = _Pages();
      final container = ProviderContainer(
        overrides: [
          hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(container.dispose);
      final subscription = container.listen(
        hostAllSavedAudiencesProvider('a'),
        (_, _) {},
      );
      addTearDown(subscription.close);
      final result = container.read(hostAllSavedAudiencesProvider('a').future);
      repository.pages.first.complete(
        const HostSavedAudiencePage(audiences: [], nextCursor: 'next'),
      );
      await container.pump();
      expect(repository.requests, ['a:null', 'a:next']);
      repository.pages.last.complete(
        const HostSavedAudiencePage(audiences: [], nextCursor: null),
      );
      expect((await result).nextCursor, isNull);
    },
  );

  test(
    'organizer switch disposes old pagination while new scope loads',
    () async {
      final repository = _Pages();
      final container = ProviderContainer(
        overrides: [
          hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(container.dispose);
      final old = container.listen(
        hostAllSavedAudiencesProvider('a'),
        (_, _) {},
      );
      old.close();
      await container.pump();
      final current = container.listen(
        hostAllSavedAudiencesProvider('b'),
        (_, _) {},
      );
      addTearDown(current.close);
      repository.pages.first.complete(
        const HostSavedAudiencePage(audiences: [], nextCursor: 'old-next'),
      );
      await container.pump();
      expect(repository.requests, ['a:null', 'b:null']);
      repository.pages.last.complete(
        const HostSavedAudiencePage(audiences: [], nextCursor: null),
      );
      await container.read(hostAllSavedAudiencesProvider('b').future);
    },
  );

  test(
    'active summary search exhausts real legacy pages before publishing',
    () async {
      final repository = _LegacySummaryPages();
      final container = ProviderContainer.test(
        overrides: [
          hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
        ],
      );
      final provider = hostAllSavedAudienceSummariesProvider('org');
      container.listen(provider, (_, _) {});
      final result = container.read(provider.future);
      await repository.firstRequested.future;
      expect(container.read(provider).isLoading, isTrue);
      repository.releaseFirst();
      final page = await result;
      expect(repository.requests, [null, 'next']);
      expect(page.audiences.map((row) => row.audienceId), ['alpha', 'zulu']);
      expect(page.nextCursor, isNull);
    },
  );

  test(
    'disposed summary search stops the real nested legacy cursor chain',
    () async {
      final repository = _LegacySummaryPages();
      final container = ProviderContainer.test(
        overrides: [
          hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
        ],
      );
      final subscription = container.listen(
        hostAllSavedAudienceSummariesProvider('org'),
        (_, _) {},
      );
      await repository.firstRequested.future;
      subscription.close();
      await container.pump();
      repository.releaseFirst();
      await flushTestEventQueue();
      await container.pump();
      expect(repository.requests, [null]);
    },
  );

  test(
    'active Group controller preserves exhaustive legacy fallback data',
    () async {
      final repository = _LegacySummaryPages();
      final container = ProviderContainer.test(
        overrides: [
          hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
        ],
      );
      final provider = hostGroupDirectoryControllerProvider('org');
      container.listen(provider, (_, _) {});
      final result = container.read(provider.future);
      await repository.firstRequested.future;
      expect(container.read(provider).isLoading, isTrue);
      repository.releaseFirst();
      final state = await result;
      expect(repository.requests, [null, 'next']);
      expect(state.page.audiences.map((row) => row.audienceId), [
        'alpha',
        'zulu',
      ]);
      expect(state.page.nextCursor, isNull);
    },
  );

  test(
    'disposed Group controller stops the real nested legacy cursor chain',
    () async {
      final repository = _LegacySummaryPages();
      final container = ProviderContainer.test(
        overrides: [
          hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
        ],
      );
      final subscription = container.listen(
        hostGroupDirectoryControllerProvider('org'),
        (_, _) {},
      );
      await repository.firstRequested.future;
      subscription.close();
      await container.pump();
      repository.releaseFirst();
      await flushTestEventQueue();
      await container.pump();
      expect(repository.requests, [null]);
    },
  );
}

class _Functions extends Fake implements FirebaseFunctions {}

class _Pages extends HostSavedAudienceRepository {
  _Pages() : super(_Functions());
  final requests = <String>[];
  final pages = <Completer<HostSavedAudiencePage>>[];
  @override
  Future<HostSavedAudiencePage> listSavedAudiences(
    String organizerId, {
    String status = 'active',
    String? cursor,
    int limit = 25,
  }) {
    requests.add('$organizerId:$cursor');
    final page = Completer<HostSavedAudiencePage>();
    pages.add(page);
    return page.future;
  }
}

// Only the callable leaf is replaced. The production summary projection,
// sorting and nested fallback loop run through the real generated providers.
class _LegacySummaryPages extends HostSavedAudienceRepository {
  _LegacySummaryPages() : super(_Functions());

  final requests = <String?>[];
  final firstRequested = Completer<void>();
  final firstPage = Completer<HostSavedAudiencePage>();

  void releaseFirst() => firstPage.complete(
    HostSavedAudiencePage(audiences: [_audience('zulu')], nextCursor: 'next'),
  );

  @override
  Future<HostSavedAudiencePage> listSavedAudiences(
    String organizerId, {
    String status = 'active',
    String? cursor,
    int limit = 25,
  }) {
    expect(organizerId, 'org');
    expect(status, 'active');
    expect(limit, 50);
    requests.add(cursor);
    if (cursor == null) {
      firstRequested.complete();
      return firstPage.future;
    }
    // A finite terminal page lets the buggy baseline settle without hanging.
    expect(cursor, 'next');
    return Future.value(
      HostSavedAudiencePage(audiences: [_audience('alpha')], nextCursor: null),
    );
  }
}

HostSavedAudience _audience(String id) => HostSavedAudience(
  organizerId: 'org',
  audienceId: id,
  name: id,
  status: 'active',
  definition: const HostSavedAudienceDefinition(
    join: HostSavedAudienceJoin.all,
    predicates: [
      HostSavedAudienceStaticMembers(['person']),
    ],
  ),
  definitionHash: 'fixture-hash',
  definitionVersion: 1,
  revision: 1,
  lastPreviewMatchCount: null,
  lastPreviewAt: null,
  createdAt: DateTime(2026),
  updatedAt: DateTime(2026),
);
