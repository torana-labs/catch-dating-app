import 'package:catch_dating_app/contexts/connections/data/cross_paths_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_event_consent.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_invitation.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_pair_hold.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_suggestion.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('event consent ids and timestamps decode deterministically', () {
    final updatedAt = Timestamp.fromDate(DateTime.utc(2026, 8, 5));
    final consent = crossPathsEventConsentFromFirestore({
      'eventId': 'event-1',
      'uid': 'runner-1',
      'enabled': true,
      'termsVersion': 1,
      'consentedAt': updatedAt,
      'updatedAt': updatedAt,
      'revokedAt': null,
      'source': 'event_detail',
    });

    expect(consent.enabled, isTrue);
    expect(consent.updatedAt, updatedAt.toDate());
    expect(
      crossPathsEventConsentId(eventId: 'event-1', uid: 'runner-1'),
      'event-1_runner-1',
    );
  });

  test(
    'sanitized suggestion response decodes without private roster fields',
    () {
      final response = CrossPathsSuggestionsResponse.fromCallableData({
        'schemaVersion': 1,
        'rankingVersion': 1,
        'suggestions': [_suggestionJson()],
      });

      expect(response.suggestions, hasLength(1));
      final suggestion = response.suggestions.single;
      expect(suggestion.profile.uid, 'candidate-1');
      expect(suggestion.profile.profilePhotos, hasLength(3));
      expect(suggestion.profile.profilePrompts, hasLength(3));
      expect(suggestion.event.eventId, 'event-1');
      expect(suggestion.viewerIsBooked, isFalse);
      expect(
        suggestion.reasonCodes,
        contains(CrossPathsSuggestionReason.mutualPreferences),
      );
    },
  );

  test('suggestion response fails closed on an unsupported wire value', () {
    final suggestion = _suggestionJson();
    (suggestion['event']! as Map<String, Object?>)['viewerBookingStatus'] =
        'waitlisted';

    expect(
      () => CrossPathsSuggestionsResponse.fromCallableData({
        'schemaVersion': 1,
        'rankingVersion': 1,
        'suggestions': [suggestion],
      }),
      throwsFormatException,
    );
  });

  test('suggestion response fails closed on an underspecified profile', () {
    final suggestion = _suggestionJson();
    (suggestion['person']! as Map<String, Object?>)['photoUrls'] = [
      'https://example.com/one.jpg',
      'https://example.com/two.jpg',
    ];

    expect(
      () => CrossPathsSuggestionsResponse.fromCallableData({
        'schemaVersion': 1,
        'rankingVersion': 1,
        'suggestions': [suggestion],
      }),
      throwsFormatException,
    );
  });

  test('invitation documents and callable receipts decode typed states', () {
    final now = DateTime.utc(2026, 8, 5);
    final invitation = CrossPathsInvitation.fromMap('invitation-1', {
      'eventId': 'event-1',
      'senderUid': 'runner-1',
      'recipientUid': 'runner-2',
      'participantIds': ['runner-1', 'runner-2'],
      'status': 'invalidated',
      'createdAt': now,
      'updatedAt': now,
      'expiresAt': now,
      'respondedAt': null,
      'cancelledAt': null,
      'invalidatedAt': now,
      'invalidationReason': 'consent_revoked',
      'conversationId': null,
    });
    final receipt = CrossPathsInvitationReceipt.fromCallableData({
      'invitationId': 'invitation-1',
      'status': 'accepted',
      'conversationId': 'plan-1',
    });

    expect(invitation.status, CrossPathsInvitationStatus.invalidated);
    expect(
      invitation.invalidationReason,
      CrossPathsInvitationInvalidationReason.consentRevoked,
    );
    expect(receipt.status, CrossPathsInvitationStatus.accepted);
    expect(receipt.conversationId, 'plan-1');
  });

  test(
    'pair hold documents decode held inventory without implying booking',
    () {
      final expiresAt = DateTime.utc(2026, 8, 6, 12, 15);
      final hold = CrossPathsPairHold.fromMap('hold-1', {
        'eventId': 'event-1',
        'invitationId': 'invitation-1',
        'requesterUid': 'runner-1',
        'attendeeUid': 'runner-2',
        'participantIds': ['runner-1', 'runner-2'],
        'status': 'active',
        'requesterBookingStatus': 'held',
        'attendeeBookingStatus': 'signedUp',
        'requesterPriceInPaise': 2500,
        'currency': 'INR',
        'expiresAt': expiresAt,
        'conversationId': null,
      });

      expect(hold.status, CrossPathsPairHoldStatus.active);
      expect(hold.requesterBookingStatus, 'held');
      expect(hold.attendeeBookingStatus, 'signedUp');
      expect(hold.expiresAt, expiresAt);
      expect(hold.conversationId, isNull);
    },
  );
}

Map<String, Object?> _suggestionJson() => {
  'person': <String, Object?>{
    'uid': 'candidate-1',
    'name': 'Rhea Kapoor',
    'age': 29,
    'gender': 'woman',
    'city': 'in-mh-mumbai',
    'photoUrls': [
      'https://example.com/one.jpg',
      'https://example.com/two.jpg',
      'https://example.com/three.jpg',
    ],
    'promptAnswers': [
      {'prompt': 'A perfect event', 'answer': 'A sunset walk'},
      {'prompt': 'Typical Sunday', 'answer': 'Coffee and a long read'},
      {'prompt': 'Together we could', 'answer': 'Try every new place'},
    ],
    'relationshipGoal': 'relationship',
  },
  'event': <String, Object?>{
    'eventId': 'event-1',
    'organizerId': 'organizer-1',
    'startTime': '2026-08-08T12:00:00.000Z',
    'endTime': '2026-08-08T13:00:00.000Z',
    'meetingPoint': 'Carter Road',
    'activityKind': 'socialRun',
    'photoUrl': null,
    'viewerBookingStatus': 'canBookNow',
  },
  'reasonCodes': [
    'attending_event',
    'booking_available',
    'mutual_preferences',
    'showcase_ready',
  ],
  'suggestionToken': 'tttttttttttttttttttttttttttttttttttttttt.token',
  'tokenExpiresAt': '2026-08-08T11:00:00.000Z',
};
