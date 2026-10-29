import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:meta/meta.dart';

@immutable
class EventChatDirectoryPage {
  EventChatDirectoryPage({
    required Iterable<EventChatAccess> items,
    required Map<String, Object?>? nextCursor,
  }) : items = List.unmodifiable(items),
       nextCursor = nextCursor == null ? null : Map.unmodifiable(nextCursor);
  factory EventChatDirectoryPage.fromMap(Map<Object?, Object?> json) =>
      EventChatDirectoryPage(
        items: (json['items']! as List).map(
          (value) => EventChatAccess.fromMap(value as Map),
        ),
        nextCursor: (json['nextCursor'] as Map?)?.cast<String, Object?>(),
      );
  final List<EventChatAccess> items;
  final Map<String, Object?>? nextCursor;
}
