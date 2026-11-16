import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

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
      hostAllSavedAudienceSummariesProvider('a'),
      (_, _) {},
    );
    expect(repository.requests, ['a:null']);
    subscription.close();
    await container.pump();
    repository.pages.first.complete(
      const HostSavedAudienceSummaryPage(audiences: [], nextCursor: 'next'),
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
        hostAllSavedAudienceSummariesProvider('a'),
        (_, _) {},
      );
      addTearDown(subscription.close);
      final result = container.read(
        hostAllSavedAudienceSummariesProvider('a').future,
      );
      repository.pages.first.complete(
        const HostSavedAudienceSummaryPage(audiences: [], nextCursor: 'next'),
      );
      await container.pump();
      expect(repository.requests, ['a:null', 'a:next']);
      repository.pages.last.complete(
        const HostSavedAudienceSummaryPage(audiences: [], nextCursor: null),
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
        hostAllSavedAudienceSummariesProvider('a'),
        (_, _) {},
      );
      old.close();
      await container.pump();
      final current = container.listen(
        hostAllSavedAudienceSummariesProvider('b'),
        (_, _) {},
      );
      addTearDown(current.close);
      repository.pages.first.complete(
        const HostSavedAudienceSummaryPage(
          audiences: [],
          nextCursor: 'old-next',
        ),
      );
      await container.pump();
      expect(repository.requests, ['a:null', 'b:null']);
      repository.pages.last.complete(
        const HostSavedAudienceSummaryPage(audiences: [], nextCursor: null),
      );
      await container.read(hostAllSavedAudienceSummariesProvider('b').future);
    },
  );
}

class _Functions extends Fake implements FirebaseFunctions {}

class _Pages extends HostSavedAudienceRepository {
  _Pages()
    : super(
        _Functions(),
        summaries: HostSummaryReader(
          FakeFirebaseFirestore(),
          actorId: () => 'host',
        ),
      );
  final requests = <String>[];
  final pages = <Completer<HostSavedAudienceSummaryPage>>[];
  @override
  Future<HostSavedAudienceSummaryPage> listGroupSummaries(
    String organizerId, {
    String? cursor,
    int limit = 25,
    bool byName = true,
    bool? isStatic,
    bool Function()? isCurrent,
  }) {
    requests.add('$organizerId:$cursor');
    final page = Completer<HostSavedAudienceSummaryPage>();
    pages.add(page);
    return page.future;
  }
}
