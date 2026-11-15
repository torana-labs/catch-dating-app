import 'dart:async';

import 'package:catch_dating_app/contexts/messaging/data/event_chat_signals.dart';

/// Stands in for `eventChatSignals/{eventId}`: tests move the counters.
class FakeEventChatSignals implements EventChatSignalSource {
  final _signals = StreamController<EventChatSignal>.broadcast();

  @override
  Stream<EventChatSignal> watch(String eventId) => _signals.stream;

  void emit({int message = 0, int typing = 0, int access = 0}) => _signals.add(
    EventChatSignal(
      messageRevision: message,
      typingRevision: typing,
      accessRevision: access,
    ),
  );
}
