import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

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
}
