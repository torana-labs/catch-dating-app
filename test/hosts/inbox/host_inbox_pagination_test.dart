import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'host_inbox_test_fixtures.dart';

final _now = DateTime(2026, 9, 12);

class _Pager implements LivePager<HostWhatsappThreadSummary> {
  // ignore: close_sinks, closed when the provider container disposes.
  final controller = StreamController<LivePages<HostWhatsappThreadSummary>>();
  var loadMoreCalls = 0;

  @override
  Stream<LivePages<HostWhatsappThreadSummary>> get pages => controller.stream;

  @override
  void loadMore() => loadMoreCalls++;
}

class _Repository extends Fake implements HostWhatsappRepository {
  final pager = _Pager();
  final organizers = <String>[];

  @override
  LivePager<HostWhatsappThreadSummary> watchWhatsappThreads(
    String organizerId, {
    int pageSize = 50,
  }) {
    organizers.add(organizerId);
    return pager;
  }
}

HostWhatsappThreadSummary _retained(String id, DateTime until) =>
    HostWhatsappThreadSummary(
      threadId: id,
      contactId: 'contact-$id',
      displayName: 'Person $id',
      eventIds: const [],
      lastMessageBody: 'Hello',
      lastMessageDirection: HostWhatsappMessageDirection.inbound,
      lastMessageAt: _now,
      lastInboundAt: _now,
      serviceWindowExpiresAt: _now.add(hostWhatsappServiceWindow),
      serviceWindowOpen: true,
      retainedUntil: until,
    );

void main() {
  late _Repository repository;
  late ProviderContainer container;

  setUp(() {
    repository = _Repository();
    container = ProviderContainer(
      overrides: [
        hostWhatsappRepositoryProvider.overrideWithValue(repository),
        appClockProvider.overrideWithValue(AppClock.custom(() => _now)),
      ],
    );
    addTearDown(container.dispose);
  });

  test('the inbox hides threads past retention and keeps rows on a failed '
      'next page', () async {
    final provider = hostWhatsappThreadPagesProvider('org');
    final subscription = container.listen(provider, (_, _) {});
    addTearDown(subscription.close);
    expect(repository.organizers, ['org']);

    repository.pager.controller.add(
      LivePages(
        items: [
          wa('one', 'person'),
          _retained('expired', _now),
          _retained('kept', _now.add(const Duration(days: 1))),
        ],
        hasMore: true,
      ),
    );
    await flushTestEventQueue();
    var pages = container.read(provider).requireValue;
    expect(pages.items.map((thread) => thread.threadId), ['one', 'kept']);
    expect(pages.hasMore, isTrue);

    container.read(provider.notifier).loadMore();
    expect(repository.pager.loadMoreCalls, 1);
    repository.pager.controller.add(
      LivePages(
        items: [wa('one', 'person')],
        hasMore: true,
        nextPageError: StateError('offline'),
      ),
    );
    await flushTestEventQueue();
    pages = container.read(provider).requireValue;
    expect(pages.items.map((thread) => thread.threadId), ['one']);
    expect(pages.nextPageError, isA<StateError>());
    expect(pages.hasMore, isTrue);
  });

  test('Messages reads the threads opened so far', () async {
    final subscription = container.listen(
      hostWhatsappThreadsProvider('org'),
      (_, _) {},
    );
    addTearDown(subscription.close);
    repository.pager.controller.add(
      LivePages(items: [wa('one', 'person')], hasMore: false),
    );
    await flushTestEventQueue();
    expect(
      container
          .read(hostWhatsappThreadsProvider('org'))
          .requireValue
          .map((thread) => thread.threadId),
      ['one'],
    );
  });
}
