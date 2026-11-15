import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:flutter_test/flutter_test.dart';

/// An event chat repository that must not be called.
class EmptyEventChatRepository extends Fake implements EventChatRepository {}
