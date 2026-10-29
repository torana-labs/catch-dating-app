import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_directory.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_chat_directory_controller.g.dart';

@riverpod
class EventChatDirectoryController extends _$EventChatDirectoryController {
  int _generation = 0, _epoch = 0, _pages = 1;
  bool _reading = false;
  @override
  Future<EventChatDirectoryPage> build() async {
    _generation++;
    _epoch++;
    _pages = 1;
    _reading = false;
    final uid = await ref.watch(uidProvider.future);
    if (uid == null) throw const SignInRequiredException('view event chats');
    return _read(ref.watch(eventChatRepositoryProvider), 1);
  }

  Future<EventChatDirectoryPage> _read(
    EventChatRepository repository,
    int pages,
  ) async {
    Map<String, Object?>? cursor;
    final items = <String, EventChatAccess>{};
    for (var page = 0; page < pages; page++) {
      final result = await repository.directory(cursor: cursor);
      for (final item in result.items) {
        items[item.eventId] = item;
      }
      cursor = result.nextCursor;
      if (cursor == null) break;
    }
    return EventChatDirectoryPage(items: items.values, nextCursor: cursor);
  }

  Future<void> refresh() => _reload(_pages);
  Future<void> loadMore() async {
    if (state.asData?.value.nextCursor == null) return;
    await _reload(_pages + 1);
  }

  Future<void> _reload(int pages) async {
    if (!ref.mounted || _reading) return;
    final uid = ref.read(uidProvider).asData?.value;
    if (uid == null) return;
    final generation = _generation, epoch = ++_epoch;
    _reading = true;
    // Re-read existing windows too: cancelled entries are never appended back
    // from an old snapshot when loading the next candidate source.
    state = const AsyncLoading();
    try {
      final page = await _read(ref.read(eventChatRepositoryProvider), pages);
      if (!_current(uid, generation, epoch)) return;
      _pages = pages;
      state = AsyncData(page);
    } on Object catch (error, stack) {
      if (_current(uid, generation, epoch)) state = AsyncError(error, stack);
    } finally {
      if (_current(uid, generation, epoch)) _reading = false;
    }
  }

  bool _current(String uid, int generation, int epoch) =>
      ref.mounted &&
      generation == _generation &&
      epoch == _epoch &&
      ref.read(uidProvider).asData?.value == uid;
}
