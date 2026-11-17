import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

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

/// One controllable listener per window size.
class _WindowedGroups extends HostSavedAudienceRepository {
  _WindowedGroups()
    : super(
        _UnusedFunctions(),
        summaries: HostSummaryReader(
          FakeFirebaseFirestore(),
          actorId: () => 'host',
        ),
      );

  final windows = <int, StreamController<HostGroupSummaryWindow>>{};

  StreamController<HostGroupSummaryWindow> window(int limit) =>
      windows.putIfAbsent(limit, StreamController.new);

  @override
  Stream<HostGroupSummaryWindow> watchGroupSummaries(
    String organizerId, {
    required int limit,
    bool byName = true,
    bool? isStatic,
  }) => window(limit).stream;
}

const _page = ReadLimitPolicy.directoryPage;

List<String> _ids(HostGroupDirectoryState state) =>
    state.audiences.map((item) => item.audienceId).toList();

void main() {
  late _WindowedGroups repo;
  late ProviderContainer container;
  final provider = hostGroupDirectoryControllerProvider('org');

  setUp(() {
    repo = _WindowedGroups();
    container = ProviderContainer.test(
      overrides: [hostSavedAudienceRepositoryProvider.overrideWithValue(repo)],
    );
    container.listen(provider, (_, _) {});
  });

  Future<HostGroupDirectoryState> current() async {
    await flushTestEventQueue();
    await container.pump();
    return container.read(provider).requireValue;
  }

  test('Groups publish the first page, then a larger window', () async {
    final initial = container.read(provider.future);
    repo
        .window(_page)
        .add(HostGroupSummaryWindow(audiences: [row('a')], hasMore: true));
    expect(_ids(await initial), ['a']);
    expect((await initial).canLoadMore, isTrue);

    container.read(provider.notifier).loadMore();
    expect(container.read(provider).value?.loadingMore, isTrue);
    expect(_ids(container.read(provider).value!), ['a']);
    repo
        .window(_page * 2)
        .add(
          HostGroupSummaryWindow(
            audiences: [row('a'), row('b')],
            hasMore: false,
          ),
        );
    final grown = await current();
    expect(_ids(grown), ['a', 'b']);
    expect(grown.canLoadMore, isFalse);
  });

  test('a group the server adds shows in the open window', () async {
    final initial = container.read(provider.future);
    repo
        .window(_page)
        .add(HostGroupSummaryWindow(audiences: [row('a')], hasMore: false));
    await initial;
    repo
        .window(_page)
        .add(
          HostGroupSummaryWindow(
            audiences: [row('a'), row('c')],
            hasMore: false,
          ),
        );
    expect(_ids(await current()), ['a', 'c']);
  });

  test('a larger window that fails keeps the rows already shown', () async {
    final initial = container.read(provider.future);
    repo
        .window(_page)
        .add(HostGroupSummaryWindow(audiences: [row('a')], hasMore: true));
    await initial;
    container.read(provider.notifier).loadMore();
    repo.window(_page * 2).addError(StateError('offline'));
    final failed = await current();
    expect(_ids(failed), ['a']);
    expect(failed.loadMoreError, isA<StateError>());
    expect(failed.canLoadMore, isTrue);
  });
}
