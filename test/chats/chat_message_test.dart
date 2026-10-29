import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('deserializes a chat message from Firestore json', () {
    final sentAt = DateTime(2026, 4, 23, 10, 15);

    final message = ChatMessage.fromJson({
      'id': 'msg-1',
      'senderId': 'runner-1',
      'text': 'Morning event?',
      'sentAt': Timestamp.fromDate(sentAt),
    });

    expect(message.id, 'msg-1');
    expect(message.senderId, 'runner-1');
    expect(message.text, 'Morning event?');
    expect(message.sentAt, sentAt);
  });

  test('allows pending local server timestamp while sending', () {
    final message = ChatMessage.fromJson({
      'id': 'msg-1',
      'senderId': 'runner-1',
      'text': 'Morning event?',
      'sentAt': null,
    });

    expect(message.sentAt, isNull);
  });
}
