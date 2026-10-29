import 'package:catch_dating_app/contexts/live/data/event_participant_context_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_participant_context.dart';
import 'package:catch_dating_app/contexts/live/domain/event_sender_preference.dart';
import 'package:flutter_test/flutter_test.dart';
import 'event_sender_preference_fixtures.dart';

class MessageIdentityRepository extends Fake
    implements EventParticipantContextRepository {
  String resolution = 'linked';
  int reads = 0;
  @override
  Future<EventParticipantContext> fetch({
    required String eventId,
    required String subjectUid,
  }) async {
    reads++;
    return EventParticipantContext.fromCallableData(
      {
        'eventId': eventId,
        'subjectUid': subjectUid,
        'serverTime': 1000,
        'resolution': {
          'kind': resolution,
          if (resolution == 'linked') ...{
            'organizerId': 'organizer-1',
            'attendeeId': 'attendee-1',
            'sourceHash': 'a' * 64,
          },
        },
      },
      eventId: eventId,
      subjectUid: subjectUid,
    );
  }
}

class MessageSenderRepository extends SenderTestRepository {
  int pageCount = 0;
  final List<String> viewedSenders = [];
  int smsReadCount = 0;
  bool history = false;
  bool hidden = false;
  @override
  Future<EventSenderPreferencePage> list(
    EventSenderPreferenceScope scope, {
    String? cursor,
  }) async {
    pageCount++;
    return senderPage(
      scope,
      configured: hidden ? null : 'sender-1',
      previous: history ? ['sender-prior'] : [],
    );
  }

  @override
  Future<EventSenderPreferenceView> fetch(
    EventSenderPreferenceScope scope,
    String senderId,
  ) async {
    viewedSenders.add(senderId);
    if (scope.channel == EventSenderChannel.sms) smsReadCount++;
    final earlier = senderId == 'sender-prior';
    return senderView(
      scope,
      senderId: senderId,
      patch: {
        if (earlier) ...{
          'revision': 1,
          'preference': 'enabled',
          'expiresAt': 3000,
        },
        if (scope.channel == EventSenderChannel.whatsapp)
          'sender': {
            'displayName': earlier ? 'Previous Organizer' : 'Current Organizer',
            'displayPhoneNumber': '+919000000001',
            'bindingHash': 'b' * 64,
          },
      },
    );
  }
}
