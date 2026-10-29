import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/core/data/read_limit_policy.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _UnusedFunctions extends Fake implements FirebaseFunctions {}

HostSavedAudienceSummary row(String id) => HostSavedAudienceSummary(
  organizerId: 'org',
  audienceId: id,
  name: id,
  status: 'active',
  isStatic: false,
  revision: 1,
  lastPreviewMatchCount: null,
  lastPreviewAt: null,
  updatedAt: DateTime(2026),
);

class _PagedGroups extends HostSavedAudienceRepository {
  _PagedGroups() : super(_UnusedFunctions());
  int calls = 0;
  final continuation = Completer<HostSavedAudienceSummaryPage>();
  @override
  Future<HostSavedAudienceSummaryPage> listGroupSummaries(
    String organizerId, {
    String? cursor,
    int limit = ReadLimitPolicy.historyPage,
    bool byName = true,
    bool? isStatic,
    bool Function()? isCurrent,
  }) async {
    calls++;
    if (cursor != null) return continuation.future;
    return HostSavedAudienceSummaryPage(
      audiences: [row('a')],
      nextCursor: 'next',
    );
  }
}

void main() {
  test('Groups publish the first page without awaiting later pages', () async {
    final repo = _PagedGroups();
    final container = ProviderContainer.test(
      overrides: [hostSavedAudienceRepositoryProvider.overrideWithValue(repo)],
    );
    final provider = hostGroupDirectoryControllerProvider('org');
    container.listen(provider, (_, _) {});
    final initial = await container.read(provider.future);
    expect(initial.page.audiences.map((item) => item.audienceId), ['a']);
    expect(repo.calls, 1);
    final pending = container.read(provider.notifier).loadMore();
    expect(container.read(provider).requireValue.loadingMore, isTrue);
    repo.continuation.complete(
      HostSavedAudienceSummaryPage(
        audiences: [row('a'), row('b')],
        nextCursor: null,
      ),
    );
    await pending;
    expect(
      container
          .read(provider)
          .requireValue
          .page
          .audiences
          .map((item) => item.audienceId),
      ['a', 'b'],
    );
    expect(container.read(provider).requireValue.page.nextCursor, isNull);
  });

  test(
    'Disposed Group continuations cannot update or restart the directory',
    () async {
      final repo = _PagedGroups();
      final container = ProviderContainer.test(
        overrides: [
          hostSavedAudienceRepositoryProvider.overrideWithValue(repo),
        ],
      );
      final provider = hostGroupDirectoryControllerProvider('org');
      final subscription = container.listen(provider, (_, _) {});
      await container.read(provider.future);
      final pending = container.read(provider.notifier).loadMore();
      subscription.close();
      await container.pump();
      repo.continuation.complete(
        HostSavedAudienceSummaryPage(
          audiences: [row('stale')],
          nextCursor: 'unused',
        ),
      );
      await pending;
      expect(repo.calls, 2);
    },
  );

  test('refreshing Groups cannot page a retained old cursor', () async {
    final repo = _RefreshingGroups();
    final container = ProviderContainer.test(
      overrides: [hostSavedAudienceRepositoryProvider.overrideWithValue(repo)],
    );
    final provider = hostGroupDirectoryControllerProvider('org');
    container.listen(provider, (_, _) {});
    await container.read(provider.future);
    container.invalidate(provider);
    final refreshed = container.read(provider.future);
    await repo.refreshRequested.future;
    expect(container.read(provider).isLoading, isTrue);
    expect(
      container.read(provider).asData?.value.page.nextCursor,
      'old-cursor',
    );

    final pending = container.read(provider.notifier).loadMore();
    final requestedWhileRefreshing = List<String?>.of(repo.requests);
    repo.refresh.complete(
      HostSavedAudienceSummaryPage(
        audiences: [row('fresh')],
        nextCursor: 'fresh-cursor',
      ),
    );
    await refreshed;
    await container.pump();
    repo.oldContinuation.complete(
      HostSavedAudienceSummaryPage(audiences: [row('stale')], nextCursor: null),
    );
    await pending;
    expect(requestedWhileRefreshing, [null, null]);
    expect(
      container
          .read(provider)
          .requireValue
          .page
          .audiences
          .map((item) => item.audienceId),
      ['fresh'],
    );
    await container.read(provider.notifier).loadMore();
    expect(repo.requests, [null, null, 'fresh-cursor']);
    expect(
      container
          .read(provider)
          .requireValue
          .page
          .audiences
          .map((item) => item.audienceId),
      ['fresh', 'fresh-more'],
    );
  });
}

class _RefreshingGroups extends HostSavedAudienceRepository {
  _RefreshingGroups() : super(_UnusedFunctions());

  final requests = <String?>[];
  final refreshRequested = Completer<void>();
  final refresh = Completer<HostSavedAudienceSummaryPage>();
  final oldContinuation = Completer<HostSavedAudienceSummaryPage>();

  @override
  Future<HostSavedAudienceSummaryPage> listGroupSummaries(
    String organizerId, {
    String? cursor,
    int limit = ReadLimitPolicy.historyPage,
    bool byName = true,
    bool? isStatic,
    bool Function()? isCurrent,
  }) {
    requests.add(cursor);
    if (requests.length == 1) {
      return Future.value(
        HostSavedAudienceSummaryPage(
          audiences: [row('old')],
          nextCursor: 'old-cursor',
        ),
      );
    }
    if (cursor == null) {
      refreshRequested.complete();
      return refresh.future;
    }
    if (cursor == 'old-cursor') return oldContinuation.future;
    expect(cursor, 'fresh-cursor');
    return Future.value(
      HostSavedAudienceSummaryPage(
        audiences: [row('fresh-more')],
        nextCursor: null,
      ),
    );
  }
}
