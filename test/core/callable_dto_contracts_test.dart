import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/connections/data/swipe_candidate_callable_response.dart';
import 'package:catch_dating_app/contexts/discovery/data/explore_search_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_callable_responses.dart';
import 'package:catch_dating_app/contexts/events/data/places_callable_requests.dart';
import 'package:catch_dating_app/contexts/events/data/places_callable_responses.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';
import 'package:catch_dating_app/contexts/insights/data/user_analytics_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_callable_responses.dart';
import 'package:catch_dating_app/contexts/messaging/data/suvbot_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/suvbot_action_item.dart';
import 'package:catch_dating_app/contexts/organizers/data/club_callable_responses.dart';
import 'package:catch_dating_app/contexts/organizers/domain/update_club_patch.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_callable_requests.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_callable_responses.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show
        BlockUserCallableRequest,
        CancelEventCallableRequest,
        ClubMembershipCallableRequest,
        CreateClubCallableRequest,
        CreateEventCallableRequest,
        CreateEventPrivateAccess,
        CreateEventReviewCallableRequest,
        DeleteClubCallableRequest,
        DeleteEventReviewCallableRequest,
        EventIdCallableRequest,
        MarkEventAttendanceCallableRequest,
        ReportUserCallableRequest,
        RequestSuvbotDemoOperationCallableRequest,
        SetClubNotificationPreferenceCallableRequest,
        SelfCheckInAttendanceCallableRequest,
        StartOrganizerConversationCallableRequest,
        UnblockUserCallableRequest,
        UpdateEventCallableRequest,
        UpdateEventReviewCallableRequest,
        UpdateUserProfilePatch;
import 'package:catch_dating_app/core/schema_contracts/generated/schema_contracts.g.dart'
    as schema_contracts;
import 'package:catch_dating_app/locations/domain/location_coordinate.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

void main() {
  group('callable request DTO contracts', () {
    test('event request DTOs match generated payload schemas', () {
      final startTime = DateTime.utc(2026, 6, 1, 6);
      final endTime = DateTime.utc(2026, 6, 1, 7);
      const meetingLocation = EventMeetingLocation(
        name: 'Cubbon Park gate',
        address: 'Cubbon Park, Bengaluru',
        placeId: 'places/cubbon',
        latitude: 12.9763,
        longitude: 77.5929,
        notes: 'Meet beside the main entrance.',
      );
      const constraints = EventConstraints(minAge: 21, maxAge: 45);
      const eventFormat = EventFormatSnapshot.socialRun();

      _expectValid(
        'CreateEventCallablePayload',
        CreateEventCallableRequest(
          name: 'Cubbon Morning Social',
          eventId: 'event-1',
          organizerId: 'club-1',
          clubId: 'club-1',
          startTimeMillis: startTime.millisecondsSinceEpoch,
          endTimeMillis: endTime.millisecondsSinceEpoch,
          meetingPoint: meetingLocation.name,
          meetingLocation: meetingLocation,
          startingPointLat: meetingLocation.latitude,
          startingPointLng: meetingLocation.longitude,
          locationDetails: meetingLocation.notes,
          photoUrl: 'https://catchdates.com/events/cubbon.jpg',
          distanceKm: 5,
          pace: 'easy',
          capacityLimit: 24,
          description: 'Easy morning social run.',
          priceInPaise: 49900,
          currency: 'INR',
          constraints: constraints,
          eventFormat: eventFormat,
          eventSuccessDefaults: EventSuccessDefaults.recommendedForActivity(
            ActivityKind.socialRun,
            enabled: true,
            targetAttendeeCount: 24,
          ),
          privateAccess: const CreateEventPrivateAccess(
            inviteCode: 'CATCH_2026',
          ),
        ).toJson(),
      );
      _expectValid(
        'UpdateEventCallablePayload',
        UpdateEventCallableRequest(
          eventId: 'event-1',
          fields: {
            'startTimeMillis': startTime.millisecondsSinceEpoch,
            'endTimeMillis': endTime.millisecondsSinceEpoch,
            'meetingPoint': meetingLocation.name,
            'meetingLocation': meetingLocation.toJson(),
            'startingPointLat': meetingLocation.latitude,
            'startingPointLng': meetingLocation.longitude,
            'locationDetails': meetingLocation.notes,
            'photoUrl': 'https://catchdates.com/events/cubbon.jpg',
            'distanceKm': 5,
            'pace': 'easy',
            'description': 'Easy morning social run.',
          },
        ).toJson(),
      );
      _expectValid(
        'EventIdCallablePayload',
        const EventIdCallableRequest(
          eventId: 'event-1',
          inviteCode: 'CATCH_2026',
        ).toJson(),
      );
      _expectValid(
        'CancelEventCallablePayload',
        const CancelEventCallableRequest(
          eventId: 'event-1',
          reason: 'Unsafe weather.',
        ).toJson(),
      );
      _expectValid(
        'DeleteEventCallablePayload',
        const EventIdCallableRequest(eventId: 'event-1').toJson(),
      );
      _expectValid(
        'MarkEventAttendanceCallablePayload',
        const MarkEventAttendanceCallableRequest(
          eventId: 'event-1',
          userId: 'runner-1',
        ).toJson(),
      );
      _expectValid(
        'SelfCheckInAttendanceCallablePayload',
        const SelfCheckInAttendanceCallableRequest(
          eventId: 'event-1',
          venueSessionToken:
              'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        ).toJson(),
      );
    });

    test('organizer and legacy club request DTOs match schemas', () {
      _expectValid(
        'CreateClubCallablePayload',
        const CreateClubCallableRequest(
          clubId: 'AbCdEfGhIjKlMnOpQrSt',
          name: 'Cubbon Runners',
          description: 'Weekly social runs.',
          location: 'in-ka-bengaluru',
          area: 'Cubbon Park',
          organizerType: 'community',
          instagramHandle: 'cubbonrunners',
          email: 'hello@example.com',
        ).toJson(),
      );
      _expectValid(
        'UpdateOrganizerCallablePayload',
        UpdateClubPatch.raw({
          'name': 'Cubbon Morning Runners',
          'tags': ['social', 'beginner'],
        }).toCallableJson(clubId: 'club-1'),
      );
      _expectValid(
        'ClubMembershipCallablePayload',
        const ClubMembershipCallableRequest(clubId: 'club-1').toJson(),
      );
      _expectValid(
        'DeleteClubCallablePayload',
        const DeleteClubCallableRequest(clubId: 'club-1').toJson(),
      );
      _expectValid(
        'SetClubNotificationPreferenceCallablePayload',
        const SetClubNotificationPreferenceCallableRequest(
          clubId: 'club-1',
          enabled: true,
        ).toJson(),
      );
      _expectValid(
        'StartOrganizerConversationCallablePayload',
        const StartOrganizerConversationCallableRequest(
          organizerId: 'club-1',
          hostUid: 'host-1',
          eventId: 'event-1',
        ).toJson(),
      );
    });

    test('payment request DTOs match generated payload schemas', () {
      _expectValid(
        'EventBookingCallablePayload',
        const EventBookingCallableRequest(
          eventId: 'event-1',
          inviteCode: 'CATCH_2026',
        ).toJson(),
      );
      _expectValid(
        'CreateRazorpayOrderCallablePayload',
        const CreateRazorpayOrderCallableRequest(
          eventId: 'event-1',
          inviteCode: 'CATCH_2026',
        ).toJson(),
      );
      // Trim normalization round-trip: whitespace-padded inviteCode in →
      // trimmed value out, satisfying the schema's pattern.
      final trimmed = const EventBookingCallableRequest(
        eventId: 'event-1',
        inviteCode: '  CATCH_2026  ',
      ).toJson();
      _expectValid('EventBookingCallablePayload', trimmed);
      expect(trimmed['inviteCode'], 'CATCH_2026');

      _expectValid(
        'VerifyRazorpayPaymentCallablePayload',
        const VerifyRazorpayPaymentCallableRequest(
          paymentId: 'pay_9A33XWu170gUtm',
          orderId: 'order_9A33XWu170gUtm',
          signature: 'abc123',
        ).toJson(),
      );
    });

    test('places request DTOs match generated payload schemas', () {
      _expectValid(
        'PlacesAutocompleteCallablePayload',
        const PlacesAutocompleteCallableRequest(
          input: 'Cubbon Park',
          sessionToken: 'session-token-1',
          countryIsoCode: 'IN',
          bias: LocationCoordinate(12.9763, 77.5929),
        ).toJson(),
      );
      _expectValid(
        'PlaceDetailsCallablePayload',
        const PlaceDetailsCallableRequest(
          placeId: 'ChIJ2dGMjMMEdkgRqVqkuXQkj7c',
          sessionToken: 'session-token-1',
        ).toJson(),
      );
    });

    test(
      'review, safety, and profile DTOs match generated payload schemas',
      () {
        _expectValid(
          'CreateEventReviewCallablePayload',
          const CreateEventReviewCallableRequest(
            organizerId: 'organizer-1',
            eventId: 'event-1',
            rating: 5,
            comment: 'Thoughtful route and good pacing.',
          ).toJson(),
        );
        _expectValid(
          'UpdateEventReviewCallablePayload',
          const UpdateEventReviewCallableRequest(
            reviewId: 'review-1',
            rating: 4,
            comment: 'Updated after reflection.',
          ).toJson(),
        );
        _expectValid(
          'DeleteEventReviewCallablePayload',
          const DeleteEventReviewCallableRequest(reviewId: 'review-1').toJson(),
        );
        _expectValid(
          'BlockUserCallablePayload',
          const BlockUserCallableRequest(
            targetUserId: 'runner-2',
            source: 'profile',
          ).toJson(),
        );
        _expectValid(
          'UnblockUserCallablePayload',
          const UnblockUserCallableRequest(targetUserId: 'runner-2').toJson(),
        );
        _expectValid(
          'ReportUserCallablePayload',
          const ReportUserCallableRequest(
            targetUserId: 'runner-2',
            source: 'profile',
            reasonCode: 'spam',
            contextId: 'profile-runner-2',
            notes: 'Repeated spam messages.',
          ).toJson(),
        );

        final updateProfilePayload = UpdateUserProfilePatch(
          name: 'Runner One',
          dateOfBirth: DateTime.utc(1994, 5, 20),
          height: 176,
        ).toCallableJson();
        _expectValid('UpdateUserProfileCallablePayload', updateProfilePayload);
        expect(
          (updateProfilePayload['fields']!
              as Map<String, Object?>)['dateOfBirth'],
          isA<int>(),
        );

        _expectValid(
          'RequestSuvbotDemoOperationCallablePayload',
          const RequestSuvbotDemoOperationCallableRequest(
            action: 'checkDemoState',
          ).toJson(),
        );
        _expectValid(
          'RequestSuvbotDemoOperationCallablePayload',
          const RequestSuvbotDemoOperationCallableRequest(
            action: 'resetChats',
            text: 'Please wipe my chats.',
          ).toJson(),
        );
      },
    );
  });

  group('callable response DTO contracts', () {
    test('organizer creation response requires the canonical organizer id', () {
      const response = <String, Object?>{
        'organizerId': 'organizer-delhi-runners',
      };
      _expectValid('CreateOrganizerCallableResponse', response);
      expect(
        CreateOrganizerCallableResponse.fromCallableData(response).organizerId,
        'organizer-delhi-runners',
      );
      for (final malformed in <Map<String, Object?>>[
        {},
        {'organizerId': ''},
        {'clubId': 'club-delhi-runners'},
      ]) {
        expect(
          () => CreateOrganizerCallableResponse.fromCallableData(malformed),
          throwsStateError,
        );
      }
    });

    test('response parsers accept on-disk generated-schema fixtures', () {
      final attendanceResponse = _readValidFixtureMap(
        'mark_event_attendance_response.json',
      );
      final razorpayOrderResponse = _readValidFixtureMap(
        'razorpay_order_response.json',
      );
      final placesAutocompleteResponse = _readValidFixtureMap(
        'places_autocomplete_response.json',
      );
      final placeDetailsResponse = _readValidFixtureMap(
        'place_details_response.json',
      );
      final wingmanCandidatesResponse = _readValidFixtureMap(
        'fetch_event_success_wingman_candidates_response.json',
      );
      final suvbotActionsResponse = _readValidFixtureMap(
        'list_suvbot_demo_actions_response.json',
      );
      final stripeCheckoutResponse = _readValidFixtureMap(
        'stripe_checkout_session_response.json',
      );
      final stripeHostOnboardingResponse = _readValidFixtureMap(
        'stripe_host_onboarding_link_response.json',
      );
      final exploreSearchResponse = _readValidFixtureMap(
        'explore_search_response.json',
      );
      final userAnalyticsResponse = _readValidFixtureMap(
        'user_analytics_response.json',
      );

      _expectValid('MarkEventAttendanceCallableResponse', attendanceResponse);
      expect(
        MarkEventAttendanceCallableResponse.fromCallableData(
          attendanceResponse,
        ).attended,
        isTrue,
      );
      _expectValid('RazorpayOrderCallableResponse', razorpayOrderResponse);
      expect(
        RazorpayOrderCallableResponse.fromCallableData(
          razorpayOrderResponse,
        ).amountInPaise,
        49900,
      );
      expect(
        RazorpayOrderCallableResponse.fromCallableData(
          razorpayOrderResponse,
        ).keyId,
        'rzp_test_server_environment',
      );
      _expectValid(
        'PlacesAutocompleteCallableResponse',
        placesAutocompleteResponse,
      );
      expect(
        PlacesAutocompleteCallableResponse.fromCallableData(
          placesAutocompleteResponse,
        ).predictions.single.mainText,
        'Cubbon Park',
      );
      _expectValid('PlaceDetailsCallableResponse', placeDetailsResponse);
      expect(
        PlaceDetailsCallableResponse.fromCallableData(
          placeDetailsResponse,
        ).place.location,
        const LocationCoordinate(12.9763, 77.5929),
      );
      _expectValid(
        'FetchEventSuccessWingmanCandidatesCallableResponse',
        wingmanCandidatesResponse,
      );
      _expectWingmanProfilesExtendPublicProfile(wingmanCandidatesResponse);
      expect(
        FetchEventSuccessWingmanCandidatesCallableResponse.fromCallableData(
          wingmanCandidatesResponse,
        ).profiles.single.name,
        'Subrath',
      );
      _expectValid(
        'FetchSwipeCandidatesCallableResponse',
        wingmanCandidatesResponse,
      );
      expect(
        FetchSwipeCandidatesCallableResponse.fromCallableData(
          wingmanCandidatesResponse,
        ).profiles.single.name,
        'Subrath',
      );
      _expectValid(
        'ListSuvbotDemoActionsCallableResponse',
        suvbotActionsResponse,
      );
      expect(
        ListSuvbotDemoActionsCallableResponse.fromCallableData(
          suvbotActionsResponse,
        ).actions.length,
        2,
      );
      _expectValid(
        'StripeCheckoutSessionCallableResponse',
        stripeCheckoutResponse,
      );
      expect(
        StripeCheckoutSessionCallableResponse.fromCallableData(
          stripeCheckoutResponse,
        ).checkoutUrl.host,
        'checkout.stripe.com',
      );
      _expectValid(
        'StripeHostOnboardingLinkCallableResponse',
        stripeHostOnboardingResponse,
      );
      expect(
        StripeHostOnboardingLinkCallableResponse.fromCallableData(
          stripeHostOnboardingResponse,
        ).accountId,
        'acct_123456789',
      );
      _expectValid('ExploreSearchCallableResponse', exploreSearchResponse);
      expect(
        ExploreSearchResult.fromCallableData(
          exploreSearchResponse,
        ).eventIds.single,
        'event-cubbon-social-run',
      );
      _expectValid('UserAnalyticsCallableResponse', userAnalyticsResponse);
      expect(
        UserAnalyticsReport.fromCallableData(
          userAnalyticsResponse,
        ).summaryCards.first.status,
        UserAnalyticsMetricStatus.partial,
      );
    });

    test('response parsers throw on malformed input', () {
      // Wrong root shape (non-Map).
      expect(
        () => CreateOrganizerCallableResponse.fromCallableData('not-a-map'),
        throwsStateError,
      );
      expect(
        () => MarkEventAttendanceCallableResponse.fromCallableData(null),
        throwsStateError,
      );
      expect(
        () => StartClubHostConversationCallableResponse.fromCallableData(42),
        throwsStateError,
      );
      expect(
        () => PlaceDetailsCallableResponse.fromCallableData(<String, Object?>{
          // missing required `place` key
        }),
        throwsStateError,
      );
      expect(
        () =>
            FetchEventSuccessWingmanCandidatesCallableResponse.fromCallableData(
              <String, Object?>{},
            ),
        throwsStateError,
      );
      expect(
        () => FetchSwipeCandidatesCallableResponse.fromCallableData(
          <String, Object?>{},
        ),
        throwsStateError,
      );
      expect(
        () => ListSuvbotDemoActionsCallableResponse.fromCallableData(
          <String, Object?>{},
        ),
        throwsStateError,
      );
      expect(
        () => SuvbotActionItem.fromCallableData(<String, Object?>{
          'id': 'x',
          // missing label/description/icon
        }),
        throwsStateError,
      );
      // RazorpayOrderCallableResponse throws a typed exception (not a
      // StateError) — the public contract is "throws on malformed input".
      expect(
        () => RazorpayOrderCallableResponse.fromCallableData(<String, Object?>{
          'orderId': '',
          'amount': 0,
          'currency': '',
          'keyId': '',
        }),
        throwsA(isA<RazorpayOrderCallableResponseFormatException>()),
      );
      expect(
        () => StripeCheckoutSessionCallableResponse.fromCallableData(
          <String, Object?>{'provider': 'razorpay'},
        ),
        throwsA(isA<StripeCheckoutSessionCallableResponseFormatException>()),
      );
      expect(
        () => StripeHostOnboardingLinkCallableResponse.fromCallableData(
          <String, Object?>{},
        ),
        throwsA(isA<StripeHostOnboardingLinkCallableResponseFormatException>()),
      );

      // PlacesAutocompleteCallableResponse is intentionally permissive:
      // an empty / malformed predictions list returns an empty wrapper rather
      // than throwing, so dropdowns render gracefully when the upstream
      // returns no matches.
      final empty = PlacesAutocompleteCallableResponse.fromCallableData(
        <String, Object?>{},
      );
      expect(empty.predictions, isEmpty);
    });
  });
}

void _expectValid(String schemaName, Object? payload) {
  final schema = schema_contracts.schemaContractsByName[schemaName];
  expect(schema, isNotNull, reason: 'Missing generated schema $schemaName');
  final result = JsonSchema.create(schema!).validate(payload);
  expect(
    result.isValid,
    isTrue,
    reason: '$schemaName rejected $payload: ${result.errors}',
  );
}

Map<String, Object?> _readValidFixtureMap(String fileName) {
  final decoded =
      jsonDecode(File('contracts/fixtures/valid/$fileName').readAsStringSync())
          as Map<String, dynamic>;
  return Map<String, Object?>.from(decoded);
}

void _expectWingmanProfilesExtendPublicProfile(Map<String, Object?> response) {
  final profiles = response['profiles'];
  expect(profiles, isA<List<Object?>>());
  for (final profile in profiles! as List<Object?>) {
    expect(profile, isA<Map<Object?, Object?>>());
    final storedShape = Map<String, Object?>.from(
      profile! as Map<Object?, Object?>,
    )..remove('uid');
    _expectValid('PublicProfileDocument', storedShape);
  }
}
