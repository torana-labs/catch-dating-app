import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_directory.dart';
import 'package:flutter_test/flutter_test.dart';

class EmptyEventChatRepository extends Fake implements EventChatRepository {
  @override
  Future<EventChatDirectoryPage> directory({
    Map<String, Object?>? cursor,
  }) async => EventChatDirectoryPage(items: const [], nextCursor: null);
}
