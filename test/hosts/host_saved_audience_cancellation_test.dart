import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

HostSavedAudienceSummary _group(String id) => HostSavedAudienceSummary(
  organizerId: 'a',
  audienceId: id,
  name: id,
  status: 'active',
  isStatic: false,
  revision: 1,
  lastPreviewMatchCount: null,
  lastPreviewAt: null,
  updatedAt: DateTime(2026),
);

void main() {
  test('the exhaustive directory listens to every group at once', () async {
    final repository = _Windows();
    addTearDown(repository.close);
    final container = ProviderContainer(
      overrides: [
        hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);
    final subscription = container.listen(
      hostAllSavedAudienceSummariesProvider('a'),
      (_, _) {},
    );
    addTearDown(subscription.close);
    expect(repository.limits, [hostAllGroupsLimit]);
    repository.windows.add(
      HostGroupSummaryWindow(audiences: [_group('one')], hasMore: false),
    );
    await container.pump();
    expect(
      container
          .read(hostAllSavedAudienceSummariesProvider('a'))
          .requireValue
          .audiences
          .map((group) => group.audienceId),
      ['one'],
    );
    repository.windows.add(
      HostGroupSummaryWindow(
        audiences: [_group('one'), _group('two')],
        hasMore: false,
      ),
    );
    await container.pump();
    expect(
      container
          .read(hostAllSavedAudienceSummariesProvider('a'))
          .requireValue
          .audiences
          .map((group) => group.audienceId),
      ['one', 'two'],
    );
  });

  test('a directory larger than the cap fails safely', () async {
    final repository = _Windows();
    addTearDown(repository.close);
    final container = ProviderContainer(
      overrides: [
        hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);
    final subscription = container.listen(
      hostAllSavedAudienceSummariesProvider('a'),
      (_, _) {},
    );
    addTearDown(subscription.close);
    repository.windows.add(
      HostGroupSummaryWindow(audiences: [_group('one')], hasMore: true),
    );
    await container.pump();
    expect(
      container.read(hostAllSavedAudienceSummariesProvider('a')).error,
      isA<StateError>(),
    );
  });

  test('a closed directory stops listening', () async {
    final repository = _Windows();
    addTearDown(repository.close);
    final container = ProviderContainer(
      overrides: [
        hostSavedAudienceRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);
    final subscription = container.listen(
      hostAllSavedAudienceSummariesProvider('a'),
      (_, _) {},
    );
    await container.pump();
    expect(repository.windows.hasListener, isTrue);
    subscription.close();
    await container.pump();
    expect(repository.windows.hasListener, isFalse);
  });
}

class _Functions extends Fake implements FirebaseFunctions {}

class _Windows extends HostSavedAudienceRepository {
  _Windows()
    : super(
        _Functions(),
        summaries: HostSummaryReader(
          FakeFirebaseFirestore(),
          actorId: () => 'host',
        ),
      );
  final limits = <int>[];
  final windows = StreamController<HostGroupSummaryWindow>();

  void close() => unawaited(windows.close());

  @override
  Stream<HostGroupSummaryWindow> watchGroupSummaries(
    String organizerId, {
    required int limit,
    bool byName = true,
    bool? isStatic,
  }) {
    limits.add(limit);
    return windows.stream;
  }
}
