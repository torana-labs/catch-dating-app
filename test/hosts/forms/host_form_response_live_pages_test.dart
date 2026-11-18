import 'dart:async';

import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

class _Pager implements LivePager<HostFormInboxEntry> {
  // ignore: close_sinks, closed when the provider container disposes.
  final controller = StreamController<LivePages<HostFormInboxEntry>>();
  var loadMoreCalls = 0;

  @override
  Stream<LivePages<HostFormInboxEntry>> get pages => controller.stream;

  @override
  void loadMore() => loadMoreCalls++;
}

class _Repository extends Fake implements HostFormsRepository {
  final pager = _Pager();
  final pageRequests = <HostFormResponseListRequest>[];
  final scopeKeys = <HostFormResponseScopeKey>[];

  @override
  LivePager<HostFormInboxEntry> watchResponsePages(
    HostFormResponseListRequest request, {
    required int pageSize,
  }) {
    pageRequests.add(request);
    return pager;
  }

  @override
  Future<HostFormResponseScope?> responseScope(HostFormResponseScopeKey key) {
    scopeKeys.add(key);
    return Future.value(
      const HostFormResponseScope(
        HostFormResponseVersionScope(
          activeVersionId: 'version',
          publishedVersion: 1,
        ),
        [],
      ),
    );
  }
}

HostFormInboxEntry _entry(String id) => HostFormInboxEntry.fromResponse(
  HostFormResponseSummary(
    responseId: id,
    formId: 'form',
    formTitle: 'Form',
    versionId: 'version',
    version: 1,
    status: HostFormResponseStatus.submitted,
    identityKind: HostFormResponseIdentityKind.anonymous,
    identity: const HostFormResponseIdentity(
      displayName: null,
      email: null,
      phoneE164: null,
      origin: HostFormDataOrigin.anonymous,
    ),
    sourceLinkId: null,
    sourceLabel: null,
    submittedAt: DateTime.utc(2026, 10),
    withdrawnAt: null,
    highlights: const [],
    conversionKinds: const {},
  ),
);

void main() {
  const request = HostFormResponseListRequest(
    organizerId: 'org',
    formId: 'form',
    includeApplications: true,
  );
  late _Repository repository;
  late ProviderContainer container;

  setUp(() {
    repository = _Repository();
    container = ProviderContainer(
      overrides: [hostFormsRepositoryProvider.overrideWithValue(repository)],
    );
    addTearDown(container.dispose);
  });

  test(
    'a page shows its rows, whether more follow, and the form scope',
    () async {
      final provider = hostFormResponsesControllerProvider(request);
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      repository.pager.controller.add(
        LivePages(items: [_entry('a'), _entry('b')], hasMore: true),
      );
      await flushTestEventQueue();

      final state = container.read(provider).requireValue;
      expect(state.responses.map((item) => item.responseId), ['a', 'b']);
      expect(state.canLoadMore, isTrue);
      expect(state.versionScope?.activeVersionId, 'version');

      await container.read(provider.notifier).loadMore();
      expect(repository.pager.loadMoreCalls, 1);

      repository.pager.controller.add(
        LivePages(items: [_entry('a'), _entry('b')], hasMore: false),
      );
      await flushTestEventQueue();
      expect(container.read(provider).requireValue.canLoadMore, isFalse);
    },
  );

  test(
    'a page that fails keeps the rows above it and loads again on ask',
    () async {
      final provider = hostFormResponsesControllerProvider(request);
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      repository.pager.controller.add(
        LivePages(items: [_entry('a')], hasMore: true),
      );
      await flushTestEventQueue();

      final error = StateError('offline');
      repository.pager.controller.add(
        LivePages(items: [_entry('a')], hasMore: true, nextPageError: error),
      );
      await flushTestEventQueue();

      final state = container.read(provider).requireValue;
      expect(state.responses.map((item) => item.responseId), ['a']);
      expect(state.loadMoreError, same(error));
      expect(state.canLoadMore, isTrue);

      await container.read(provider.notifier).loadMore();
      expect(repository.pager.loadMoreCalls, 1);
    },
  );

  test('a new sort reads the form scope once, not again', () async {
    final newest = hostFormResponsesControllerProvider(request);
    final oldest = hostFormResponsesControllerProvider(
      const HostFormResponseListRequest(
        organizerId: 'org',
        formId: 'form',
        includeApplications: true,
        oldestFirst: true,
      ),
    );
    final first = container.listen(newest, (_, _) {});
    final second = container.listen(oldest, (_, _) {});
    addTearDown(first.close);
    addTearDown(second.close);
    await flushTestEventQueue();

    expect(repository.scopeKeys, hasLength(1));
  });
}
