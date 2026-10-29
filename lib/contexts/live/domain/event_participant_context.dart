import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';

sealed class EventParticipantIdentity {
  const EventParticipantIdentity();
}

final class EventParticipantUnlinked extends EventParticipantIdentity {
  const EventParticipantUnlinked();
}

final class EventParticipantAmbiguous extends EventParticipantIdentity {
  const EventParticipantAmbiguous();
}

final class EventParticipantLinked extends EventParticipantIdentity {
  const EventParticipantLinked._(this.scope, this.sourceHash);
  final EventAssistanceGuestScope scope;
  final String sourceHash;
}

/// A self-only identity projection, not consent, attendance or write authority.
final class EventParticipantContext {
  const EventParticipantContext._({
    required this.eventId,
    required this.subjectUid,
    required this.serverTime,
    required this.identity,
  });
  final String eventId, subjectUid;
  final int serverTime;
  final EventParticipantIdentity identity;
  factory EventParticipantContext.fromCallableData(
    Object? value, {
    required String eventId,
    required String subjectUid,
  }) {
    final map = assistanceObject(value, {
      'eventId',
      'subjectUid',
      'serverTime',
      'resolution',
    });
    assistanceId(eventId);
    assistanceText(subjectUid, 128);
    if (map['eventId'] != eventId || map['subjectUid'] != subjectUid) {
      throw const FormatException(
        'Event identity belongs to another participant.',
      );
    }
    final raw = assistanceObject(map['resolution']);
    final EventParticipantIdentity identity;
    switch (raw['kind']) {
      case 'linked':
        assistanceObject(raw, {
          'kind',
          'organizerId',
          'attendeeId',
          'sourceHash',
        });
        identity = EventParticipantLinked._(
          EventAssistanceGuestScope(
            organizerId: assistanceId(raw['organizerId']),
            eventId: eventId,
            attendeeId: assistanceId(raw['attendeeId']),
          ),
          assistanceHash(raw['sourceHash']),
        );
      case 'unlinked':
        assistanceObject(raw, {'kind'});
        identity = const EventParticipantUnlinked();
      case 'ambiguous':
        assistanceObject(raw, {'kind'});
        identity = const EventParticipantAmbiguous();
      default:
        throw const FormatException('Unknown event participant identity.');
    }
    return EventParticipantContext._(
      eventId: eventId,
      subjectUid: subjectUid,
      serverTime: assistanceInteger(map['serverTime']),
      identity: identity,
    );
  }
}
