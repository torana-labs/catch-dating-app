import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_whatsapp_pages_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'host_inbox_test_fixtures.dart';

class _Repository extends Fake implements HostWhatsappRepository {
  final requested = <String?>[];
  final pending = <Completer<HostWhatsappThreadPage>>[];
  @override
  Future<HostWhatsappThreadPage> listWhatsappThreads(
    String organizerId, {
    String? cursor,
    int limit = 50,
  }) {
    requested.add(cursor);
    final response = Completer<HostWhatsappThreadPage>();
    pending.add(response);
    return response.future;
  }
}

void main() {
  for (final failure in ['scope', 'cursor', 'network']) {
    test(
      'pagination retains authorized rows after $failure failure and retries',
      () async {
        final repository = _Repository();
        final first = HostWhatsappThreadPage(
          organizerId: 'org',
          threads: [wa('one', 'person')],
          nextCursor: 'next',
        );
        final container = ProviderContainer(
          overrides: [
            hostWhatsappRepositoryProvider.overrideWithValue(repository),
            hostWhatsappThreadsProvider(
              'org',
            ).overrideWith((ref) async => first),
          ],
        );
        addTearDown(container.dispose);
        final provider = hostInboxWhatsappPagesProvider('org');
        final subscription = container.listen(provider, (_, _) {});
        addTearDown(subscription.close);
        await container.read(provider.future);
        final notifier = container.read(provider.notifier);
        final loading = notifier.loadMore();
        await notifier
            .loadMore(); // A second click cannot issue another request.
        expect(repository.requested, ['next']);
        if (failure == 'network') {
          repository.pending.last.completeError(StateError('offline'));
        } else {
          repository.pending.last.complete(
            HostWhatsappThreadPage(
              organizerId: failure == 'scope' ? 'other' : 'org',
              threads: [wa('unauthorized', 'other')],
              nextCursor: failure == 'cursor' ? 'next' : null,
            ),
          );
        }
        await loading;
        var state = await container.read(provider.future);
        expect(state.threads.map((thread) => thread.threadId), ['one']);
        expect(state.error, isNotNull);
        expect(state.nextCursor, 'next');
        final retry = notifier.loadMore();
        repository.pending.last.complete(
          HostWhatsappThreadPage(
            organizerId: 'org',
            threads: [wa('one', 'person'), wa('two', 'second')],
            nextCursor: null,
          ),
        );
        await retry;
        state = await container.read(provider.future);
        expect(state.threads.map((thread) => thread.threadId), ['one', 'two']);
        expect(state.error, isNull);
        expect(state.nextCursor, isNull);
      },
    );
  }

  test('refresh invalidates an in-flight older page', () async {
    final repository = _Repository();
    var first = HostWhatsappThreadPage(
      organizerId: 'org',
      threads: [wa('old', 'person')],
      nextCursor: 'next',
    );
    final container = ProviderContainer(
      overrides: [
        hostWhatsappRepositoryProvider.overrideWithValue(repository),
        hostWhatsappThreadsProvider('org').overrideWith((ref) async => first),
      ],
    );
    addTearDown(container.dispose);
    final provider = hostInboxWhatsappPagesProvider('org');
    final subscription = container.listen(provider, (_, _) {});
    addTearDown(subscription.close);
    await container.read(provider.future);
    final request = container.read(provider.notifier).loadMore();
    first = HostWhatsappThreadPage(
      organizerId: 'org',
      threads: [wa('new', 'person')],
      nextCursor: null,
    );
    container.invalidate(hostWhatsappThreadsProvider('org'));
    await container.read(provider.future);
    repository.pending.single.complete(
      HostWhatsappThreadPage(
        organizerId: 'org',
        threads: [wa('stale', 'person')],
        nextCursor: null,
      ),
    );
    await request;
    final state = await container.read(provider.future);
    expect(state.threads.map((thread) => thread.threadId), ['new']);
  });
}
