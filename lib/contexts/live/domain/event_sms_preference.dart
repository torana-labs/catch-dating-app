import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

/// A participant's live event preference. Rehearsals have no SMS enrollment.
final class EventSmsPreferenceScope {
  EventSmsPreferenceScope({
    required this.eventId,
    required this.attendeeId,
    this.senderId = 'catch-event-sms',
  }) {
    assistanceId(eventId);
    assistanceId(attendeeId);
    assistanceId(senderId);
  }
  final String eventId;
  final String attendeeId;
  final String senderId;

  @override
  bool operator ==(Object other) =>
      other is EventSmsPreferenceScope &&
      other.eventId == eventId &&
      other.attendeeId == attendeeId &&
      other.senderId == senderId;
  @override
  int get hashCode => Object.hash(eventId, attendeeId, senderId);
}

enum EventSmsPreference { notSet, enabled, disabled, expired }

enum EventSmsAvailability {
  ready,
  verifyPhone,
  notAdmitted,
  eventClosed,
  senderUnavailable,
}

enum EventSmsPreferenceOutcome { read, applied, replayed, conflict }

enum EventSmsPreferenceDecision { grant, revoke }

/// Parsed server terms and current state, never locally inferred permission.
final class EventSmsPreferenceView {
  const EventSmsPreferenceView._({
    required this.scope,
    required this.serverTime,
    required this.revision,
    required this.reviewHash,
    required this.preference,
    required this.availability,
    required this.phoneLastFour,
    required this.expiresAt,
    required this.consentVersion,
    required this.consentText,
  });
  final EventSmsPreferenceScope scope;
  final int serverTime;
  final int? revision;
  final String reviewHash;
  final EventSmsPreference preference;
  final EventSmsAvailability availability;
  final String? phoneLastFour;
  final int? expiresAt;
  final String consentVersion;
  final String consentText;
  bool get canEnable =>
      revision != 9007199254740991 &&
      availability == EventSmsAvailability.ready &&
      preference != EventSmsPreference.enabled;
  bool get canDisable =>
      revision != 9007199254740991 && preference == EventSmsPreference.enabled;
  bool get isOptionalOfferHidden =>
      preference == EventSmsPreference.notSet &&
      availability != EventSmsAvailability.ready;

  EventSmsPreferenceChange prepareChange({
    required String requestId,
    required EventSmsPreferenceDecision decision,
  }) {
    assistanceId(requestId);
    if ((decision == EventSmsPreferenceDecision.grant
            ? !canEnable
            : !canDisable) ||
        revision == 9007199254740991) {
      throw StateError(
        'Review the current text preference before changing it.',
      );
    }
    return EventSmsPreferenceChange._(this, requestId, decision);
  }
}

/// The immutable review owns every retry field, including consent-copy version.
final class EventSmsPreferenceChange {
  const EventSmsPreferenceChange._(
    this.snapshot,
    this.requestId,
    this.decision,
  );
  final EventSmsPreferenceView snapshot;
  final String requestId;
  final EventSmsPreferenceDecision decision;

  // The schema generator does not yet emit this nested decision union.
  // Contract tests validate this closed payload against the canonical schema.
  Map<String, Object?> toJson() => {
    'eventId': snapshot.scope.eventId,
    'attendeeId': snapshot.scope.attendeeId,
    if (snapshot.scope.senderId != 'catch-event-sms')
      'senderId': snapshot.scope.senderId,
    'requestId': requestId,
    'expectedRevision': snapshot.revision,
    'expectedReviewHash': snapshot.reviewHash,
    'decision': switch (decision) {
      EventSmsPreferenceDecision.grant => {
        'kind': 'grant',
        'copyVersion': snapshot.consentVersion,
      },
      EventSmsPreferenceDecision.revoke => {'kind': 'revoke'},
    },
  };
}

final class EventSmsPreferenceResult {
  const EventSmsPreferenceResult._(this.outcome, this.view);
  final EventSmsPreferenceOutcome outcome;
  final EventSmsPreferenceView view;

  factory EventSmsPreferenceResult.fromCallableData(
    Object? data, {
    required EventSmsPreferenceScope expectedScope,
  }) {
    final result = assistanceObject(data, {'outcome', 'view'});
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
    });
    final scope = EventSmsPreferenceScope(
      eventId: assistanceId(raw['eventId']),
      attendeeId: assistanceId(raw['attendeeId']),
      senderId: assistanceId(raw['senderId']),
    );
    if (scope != expectedScope) {
      throw const FormatException('Event text preference scope mismatch.');
    }
    final now = assistanceInteger(raw['serverTime']);
    final revision = assistanceNullableInteger(raw['revision']);
    final expiresAt = assistanceNullableInteger(raw['expiresAt']);
    final preference = assistanceEnum(
      EventSmsPreference.values,
      raw['preference'],
    );
    final availability = assistanceEnum(
      EventSmsAvailability.values,
      raw['availability'],
    );
    final suffix = raw['phoneLastFour'];
    final consent = assistanceObject(raw['consent'], {'version', 'text'});
    if (revision == 0 ||
        (suffix != null &&
            (suffix is! String || !RegExp(r'^[0-9]{4}$').hasMatch(suffix))) ||
        (availability == EventSmsAvailability.ready && suffix == null) ||
        assistanceBoolean(raw['canEnable']) !=
            (availability == EventSmsAvailability.ready) ||
        consent['version'] != 'catch-event-service-sms-v1' ||
        (revision == null &&
            (preference != EventSmsPreference.notSet || expiresAt != null)) ||
        (preference != EventSmsPreference.notSet &&
            (revision == null || suffix == null || expiresAt == null)) ||
        (preference == EventSmsPreference.enabled && expiresAt! <= now) ||
        (preference == EventSmsPreference.expired && expiresAt! > now)) {
      throw const FormatException('Inconsistent event text preference.');
    }
    return EventSmsPreferenceResult._(
      assistanceEnum(EventSmsPreferenceOutcome.values, result['outcome']),
      EventSmsPreferenceView._(
        scope: scope,
        serverTime: now,
        revision: revision,
        reviewHash: assistanceHash(raw['reviewHash']),
        preference: preference,
        availability: availability,
        phoneLastFour: suffix as String?,
        expiresAt: expiresAt,
        consentVersion: consent['version']! as String,
        consentText: assistanceText(consent['text'], 500),
      ),
    );
  }

  void requireChange(EventSmsPreferenceChange change) {
    if (view.scope != change.snapshot.scope ||
        outcome == EventSmsPreferenceOutcome.read) {
      throw const FormatException('Event text change response mismatch.');
    }
    if (outcome == EventSmsPreferenceOutcome.applied &&
        (view.revision != (change.snapshot.revision ?? 0) + 1 ||
            !switch (change.decision) {
              EventSmsPreferenceDecision.grant =>
                view.preference == EventSmsPreference.enabled,
              EventSmsPreferenceDecision.revoke =>
                view.preference == EventSmsPreference.disabled ||
                    view.preference == EventSmsPreference.notSet,
            })) {
      throw const FormatException('Event text decision was not confirmed.');
    }
    // A withdrawal preserves the original endpoint. A corrected recipient
    // therefore has no permission instead of inheriting the prior opt-out.
    // Exact replays return current state, including a subsequent withdrawal
    // or replaced recipient. Never replace that state with the old decision.
  }
}
