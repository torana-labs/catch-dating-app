import 'dart:async';

import 'package:catch_dating_app/chats/presentation/inbox/event_chat_directory_controller.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_directory.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'event_chat_controller_test.dart' show roomAccess;

class DirectoryRepository extends Fake implements EventChatRepository {
  final requests = <Map<String, Object?>?>[];
  Future<EventChatDirectoryPage> Function(Map<String, Object?>?) respond =
      (_) async => EventChatDirectoryPage(items: const [], nextCursor: null);
  @override
  Future<EventChatDirectoryPage> directory({Map<String, Object?>? cursor}) {
    requests.add(cursor);
    return respond(cursor);
  }
}

const cursor = {'source': 'attendees', 'after': null, 'accountUid': 'person'};
void main() {
  late DirectoryRepository repository;
  late ProviderContainer container;
  final provider = eventChatDirectoryControllerProvider;
  setUp(() {
    repository = DirectoryRepository();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((_) => Stream.value('person')),
        eventChatRepositoryProvider.overrideWithValue(repository),
      ],
    );
    container.listen(provider, (_, _) {});
  });
  tearDown(() => container.dispose());
  test(
    'empty candidate pages continue and duplicates resolve by event ID',
    () async {
      repository.respond = (after) async => EventChatDirectoryPage(
        items: after == null ? [] : [roomAccess(), roomAccess()],
        nextCursor: after == null ? cursor : null,
      );
      final first = await container.read(provider.future);
      expect(first.items, isEmpty);
      expect(first.nextCursor, cursor);
      await container.read(provider.notifier).loadMore();
      expect(container.read(provider).requireValue.items, hasLength(1));
      expect(container.read(provider).requireValue.nextCursor, isNull);
      expect(repository.requests, [null, null, cursor]);
    },
  );
  test(
    'load more revalidates earlier entries and fences duplicate clicks',
    () async {
      repository.respond = (_) async =>
          EventChatDirectoryPage(items: [roomAccess()], nextCursor: cursor);
      await container.read(provider.future);
      final pending = Completer<EventChatDirectoryPage>();
      repository.respond = (after) async => after == null
          ? pending.future
          : EventChatDirectoryPage(items: const [], nextCursor: null);
      final controller = container.read(provider.notifier);
      final loading = controller.loadMore();
      await controller.loadMore();
      expect(repository.requests, hasLength(2));
      expect(container.read(provider).asData, isNull);
      pending.complete(
        EventChatDirectoryPage(items: const [], nextCursor: cursor),
      );
      await loading;
      expect(container.read(provider).requireValue.items, isEmpty);
    },
  );
  test(
    'failed refresh removes old directory entries and retries from source',
    () async {
      repository.respond = (_) async =>
          EventChatDirectoryPage(items: [roomAccess()], nextCursor: null);
      await container.read(provider.future);
      repository.respond = (_) async =>
          throw StateError('temporarily unavailable');
      await container.read(provider.notifier).refresh();
      expect(container.read(provider).hasError, true);
      expect(container.read(provider).asData, isNull);
      repository.respond = (_) async =>
          EventChatDirectoryPage(items: const [], nextCursor: null);
      await container.read(provider.notifier).refresh();
      expect(container.read(provider).requireValue.items, isEmpty);
    },
  );
  test('a late page cannot restore the previous account directory', () async {
    container.dispose();
    final accounts = StreamController<String?>();
    addTearDown(accounts.close);
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((_) => accounts.stream),
        eventChatRepositoryProvider.overrideWithValue(repository),
      ],
    );
    container.listen(provider, (_, _) {});
    accounts.add('person');
    await flushTestEventQueue();
    await container.read(provider.future);
    final pending = Completer<EventChatDirectoryPage>();
    repository.respond = (_) => pending.future;
    final old = container.read(provider.notifier).refresh();
    repository.respond = (_) async =>
        EventChatDirectoryPage(items: const [], nextCursor: null);
    accounts.add('other');
    await flushTestEventQueue();
    await container.read(provider.future);
    pending.complete(
      EventChatDirectoryPage(items: [roomAccess()], nextCursor: null),
    );
    await old;
    expect(container.read(provider).requireValue.items, isEmpty);
  });
}
