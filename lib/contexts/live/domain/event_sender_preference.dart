import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

enum EventSenderChannel { sms, whatsapp, rcs }

/// Channel is part of the cache identity; consent never transfers between them.
final class EventSenderPreferenceScope {
  EventSenderPreferenceScope({
    required this.channel,
    required this.eventId,
    required this.attendeeId,
  }) {
    assistanceId(eventId);
    assistanceId(attendeeId);
  }
  final EventSenderChannel channel;
  final String eventId;
  final String attendeeId;

  @override
  bool operator ==(Object other) =>
      other is EventSenderPreferenceScope &&
      other.channel == channel &&
      other.eventId == eventId &&
      other.attendeeId == attendeeId;
  @override
  int get hashCode => Object.hash(channel, eventId, attendeeId);
}

enum EventSenderPreference { notSet, enabled, disabled, expired }

enum EventSenderAvailability {
  ready,
  verifyPhone,
  notAdmitted,
  eventClosed,
  senderUnavailable,
  subscriptionUnavailable,
}

enum EventSenderPreferenceOutcome { read, applied, replayed, conflict }

enum EventSenderPreferenceDecision { grant, revoke }

/// One bounded discovery page. Empty filtered pages may still have a cursor.
final class EventSenderPreferencePage {
  EventSenderPreferencePage._({
    required this.scope,
    required this.serverTime,
    required this.configuredSenderId,
    required List<String> previousSenderIds,
    required this.nextCursor,
  }) : previousSenderIds = List.unmodifiable(previousSenderIds);
  final EventSenderPreferenceScope scope;
  final int serverTime;
  final String? configuredSenderId;
  final List<String> previousSenderIds;
  final String? nextCursor;

  static void requireCursor(EventSenderChannel channel, String? cursor) {
    final prefix = switch (channel) {
      EventSenderChannel.sms => 'sms',
      EventSenderChannel.whatsapp => 'wa',
      EventSenderChannel.rcs => 'rcs',
    };
    if (cursor != null &&
        !RegExp('^$prefix-permission:[a-f0-9]{64}\$').hasMatch(cursor)) {
      throw const FormatException('Invalid sender history cursor.');
    }
  }

  factory EventSenderPreferencePage.fromCallableData(
    Object? data, {
    required EventSenderPreferenceScope expectedScope,
    required String? after,
  }) {
    requireCursor(expectedScope.channel, after);
    final raw = assistanceObject(data, {
      'eventId',
      'attendeeId',
      'serverTime',
      'configuredSenderId',
      'previousSenderIds',
      'nextCursor',
    });
    if (raw['eventId'] != expectedScope.eventId ||
        raw['attendeeId'] != expectedScope.attendeeId) {
      throw const FormatException('Sender discovery scope mismatch.');
    }
    final configured = raw['configuredSenderId'] == null
        ? null
        : assistanceId(raw['configuredSenderId']);
    final ids = raw['previousSenderIds'];
    final cursor = raw['nextCursor'];
    if (ids is! List ||
        ids.length > 50 ||
        cursor != null && cursor is! String) {
      throw const FormatException('Invalid sender discovery page.');
    }
    final previous = ids.map(assistanceId).toList();
    requireCursor(expectedScope.channel, cursor as String?);
    if (previous.toSet().length != previous.length ||
        previous.contains(configured) ||
        cursor != null && after != null && cursor.compareTo(after) <= 0) {
      throw const FormatException('Non-advancing sender discovery page.');
    }
    return EventSenderPreferencePage._(
      scope: expectedScope,
      serverTime: assistanceInteger(raw['serverTime']),
      configuredSenderId: configured,
      previousSenderIds: previous,
      nextCursor: cursor,
    );
  }
}

typedef _PreferenceFacts = ({
  EventSenderPreferenceScope scope,
  String senderId,
  int serverTime,
  int? revision,
  String reviewHash,
  EventSenderPreference preference,
  EventSenderAvailability availability,
  String? phoneLastFour,
  int? expiresAt,
  String consentVersion,
  String consentText,
});

sealed class EventSenderPreferenceView {
  const EventSenderPreferenceView._(this._facts);
  final _PreferenceFacts _facts;
  EventSenderPreferenceScope get scope => _facts.scope;
  String get senderId => _facts.senderId;
  int get serverTime => _facts.serverTime;
  int? get revision => _facts.revision;
  String get reviewHash => _facts.reviewHash;
  EventSenderPreference get preference => _facts.preference;
  EventSenderAvailability get availability => _facts.availability;
  String? get phoneLastFour => _facts.phoneLastFour;
  int? get expiresAt => _facts.expiresAt;
  String get consentVersion => _facts.consentVersion;
  String get consentText => _facts.consentText;
  String? get senderDisplayName;

  bool get canEnable =>
      revision != 9007199254740991 &&
      availability == EventSenderAvailability.ready &&
      preference != EventSenderPreference.enabled;
  bool get canDisable =>
      revision != 9007199254740991 &&
      preference == EventSenderPreference.enabled;

  EventSenderPreferenceChange prepareChange({
    required String requestId,
    required EventSenderPreferenceDecision decision,
  }) {
    assistanceId(requestId);
    if (decision == EventSenderPreferenceDecision.grant
        ? !canEnable
        : !canDisable) {
      throw StateError('Review the current event message preference.');
    }
    return EventSenderPreferenceChange._(this, requestId, decision);
  }
}

/// SMS always represents the Catch platform brand; selection identifies the
/// configured delivery channel, not a new marketing or organizer permission.
final class EventSmsSenderPreferenceView extends EventSenderPreferenceView {
  const EventSmsSenderPreferenceView._(super.facts) : super._();
  @override
  String get senderDisplayName => 'Catch';
}

final class EventWhatsappPreferenceSender {
  const EventWhatsappPreferenceSender._(
    this.displayName,
    this.displayPhoneNumber,
    this.bindingHash,
  );
  final String displayName;
  final String displayPhoneNumber;
  final String bindingHash;
}

final class EventWhatsappPreferenceView extends EventSenderPreferenceView {
  const EventWhatsappPreferenceView._(
    super.facts,
    this.sender,
    this.stopRecordHash,
  ) : super._();
  final EventWhatsappPreferenceSender? sender;
  final String? stopRecordHash;
  @override
  String? get senderDisplayName => sender?.displayName;
}

final class EventRcsPreferenceView extends EventSenderPreferenceView {
  const EventRcsPreferenceView._(
    super.facts,
    this.eventTitle,
    this.senderDisplayName,
  ) : super._();
  final String eventTitle;
  @override
  final String? senderDisplayName;
}

/// Immutable request including the exact reviewed terms, reused on uncertainty.
final class EventSenderPreferenceChange {
  const EventSenderPreferenceChange._(
    this.snapshot,
    this.requestId,
    this.decision,
  );
  final EventSenderPreferenceView snapshot;
  final String requestId;
  final EventSenderPreferenceDecision decision;

  // The generator does not emit nested decision unions. Contract tests verify
  // each closed channel payload against its canonical schema.
  Map<String, Object?> toJson() => {
    'eventId': snapshot.scope.eventId,
    'attendeeId': snapshot.scope.attendeeId,
    'senderId': snapshot.senderId,
    'requestId': requestId,
    'expectedRevision': snapshot.revision,
    if (snapshot is EventSmsSenderPreferenceView)
      'expectedReviewHash': snapshot.reviewHash,
    'decision': switch (decision) {
      EventSenderPreferenceDecision.revoke => {'kind': 'revoke'},
      EventSenderPreferenceDecision.grant => {
        'kind': 'grant',
        'copyVersion': snapshot.consentVersion,
        if (snapshot is! EventSmsSenderPreferenceView)
          'reviewHash': snapshot.reviewHash,
        if (snapshot case final EventWhatsappPreferenceView whatsapp) ...{
          'senderHash': whatsapp.sender!.bindingHash,
          'stopRecordHash': whatsapp.stopRecordHash,
        },
      },
    },
  };
}

final class EventSenderPreferenceResult {
  const EventSenderPreferenceResult._(this.outcome, this.view);
  final EventSenderPreferenceOutcome outcome;
  final EventSenderPreferenceView view;

  factory EventSenderPreferenceResult.fromCallableData(
    Object? data, {
    required EventSenderPreferenceScope expectedScope,
    required String expectedSenderId,
  }) {
    assistanceId(expectedSenderId);
    final result = assistanceObject(data, {'outcome', 'view'});
    final whatsapp = expectedScope.channel == EventSenderChannel.whatsapp;
    final sms = expectedScope.channel == EventSenderChannel.sms;
    final raw = assistanceObject(result['view'], {
      'eventId',
      'attendeeId',
      'senderId',
      'serverTime',
      'revision',
      'reviewHash',
      'preference',
      'canEnable',
      'availability',
      'phoneLastFour',
      'expiresAt',
      'consent',
      if (!sms) 'sender',
      if (whatsapp) 'stopRecordHash',
      if (expectedScope.channel == EventSenderChannel.rcs) 'eventTitle',
    });
    if (raw['eventId'] != expectedScope.eventId ||
        raw['attendeeId'] != expectedScope.attendeeId ||
        raw['senderId'] != expectedSenderId) {
      throw const FormatException('Event message preference scope mismatch.');
    }
    final now = assistanceInteger(raw['serverTime']);
    final revision = assistanceNullableInteger(raw['revision']);
    final expiresAt = assistanceNullableInteger(raw['expiresAt']);
    final preference = assistanceEnum(
      EventSenderPreference.values,
      raw['preference'],
    );
    final availability = assistanceEnum(
      EventSenderAvailability.values,
      raw['availability'],
    );
    final suffix = raw['phoneLastFour'];
    final consent = assistanceObject(raw['consent'], {'version', 'text'});
    if (revision == 0 ||
        suffix != null &&
            (suffix is! String || !RegExp(r'^[0-9]{4}$').hasMatch(suffix)) ||
        availability == EventSenderAvailability.ready &&
            (suffix == null || !sms && raw['sender'] == null) ||
        (whatsapp || sms) &&
            availability == EventSenderAvailability.subscriptionUnavailable ||
        assistanceBoolean(raw['canEnable']) !=
            (availability == EventSenderAvailability.ready) ||
        consent['version'] !=
            'catch-event-service-${expectedScope.channel.name}-v1' ||
        revision == null &&
            (preference != EventSenderPreference.notSet || expiresAt != null) ||
        preference != EventSenderPreference.notSet &&
            (revision == null || expiresAt == null || suffix == null) ||
        preference == EventSenderPreference.enabled && expiresAt! <= now ||
        (whatsapp || sms) &&
            preference == EventSenderPreference.expired &&
            expiresAt! > now) {
      throw const FormatException('Inconsistent event message preference.');
    }
    final facts = (
      scope: expectedScope,
      senderId: expectedSenderId,
      serverTime: now,
      revision: revision,
      reviewHash: assistanceHash(raw['reviewHash']),
      preference: preference,
      availability: availability,
      phoneLastFour: suffix as String?,
      expiresAt: expiresAt,
      consentVersion: consent['version']! as String,
      consentText: assistanceText(consent['text'], 500),
    );
    final EventSenderPreferenceView view;
    if (sms) {
      view = EventSmsSenderPreferenceView._(facts);
    } else if (whatsapp) {
      EventWhatsappPreferenceSender? sender;
      if (raw['sender'] case final Object value) {
        final fields = assistanceObject(value, {
          'displayName',
          'displayPhoneNumber',
          'bindingHash',
        });
        final number = assistanceText(fields['displayPhoneNumber'], 32);
        if (number.length < 7) {
          throw const FormatException('Invalid sender number.');
        }
        sender = EventWhatsappPreferenceSender._(
          assistanceText(fields['displayName'], 160),
          number,
          assistanceHash(fields['bindingHash']),
        );
      }
      view = EventWhatsappPreferenceView._(
        facts,
        sender,
        raw['stopRecordHash'] == null
            ? null
            : assistanceHash(raw['stopRecordHash']),
      );
    } else {
      final sender = raw['sender'] == null
          ? null
          : assistanceObject(raw['sender'], {'displayName'});
      view = EventRcsPreferenceView._(
        facts,
        assistanceText(raw['eventTitle'], 160),
        sender == null ? null : assistanceText(sender['displayName'], 160),
      );
    }
    return EventSenderPreferenceResult._(
      assistanceEnum(EventSenderPreferenceOutcome.values, result['outcome']),
      view,
    );
  }

  void requireChange(EventSenderPreferenceChange change) {
    final reviewed = change.snapshot;
    if (view.scope != reviewed.scope ||
        view.senderId != reviewed.senderId ||
        outcome == EventSenderPreferenceOutcome.read) {
      throw const FormatException('Event message change response mismatch.');
    }
    if (outcome == EventSenderPreferenceOutcome.applied) {
      final validDecision = switch (change.decision) {
        EventSenderPreferenceDecision.grant =>
          view.preference == EventSenderPreference.enabled &&
              view.phoneLastFour == reviewed.phoneLastFour &&
              (reviewed is EventSmsSenderPreferenceView ||
                  view.reviewHash == reviewed.reviewHash),
        // Withdrawal keeps the old binding. A replaced recipient can see
        // notSet while the original grant was successfully revoked.
        EventSenderPreferenceDecision.revoke =>
          view.preference == EventSenderPreference.disabled ||
              view.preference == EventSenderPreference.notSet,
      };
      if (view.revision != (reviewed.revision ?? 0) + 1 || !validDecision) {
        throw const FormatException(
          'Event message decision was not confirmed.',
        );
      }
    }
    // Exact replay returns current state, never an optimistic old decision.
  }
}
