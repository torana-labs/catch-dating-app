import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/connections/data/cross_paths_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_event_consent.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/events/presentation/event_detail_screen.dart';
import 'package:catch_dating_app/events/presentation/event_detail_view_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import '../organizers/organizers_test_helpers.dart'
    show FakeOrganizersRepository;

void main() {
  group('Cross Paths Event Detail integration', () {
    testWidgets('renders route-owned consent when eligible', (tester) async {
      final event = buildEvent(
        startTime: DateTime.now().add(const Duration(days: 1)),
        endTime: DateTime.now().add(const Duration(days: 1, hours: 2)),
        crossPathsDiscoveryEnabled: true,
      );
      final profile = buildUser().copyWith(prefsShowInCrossPaths: true);

      await pumpEventsTestApp(
        tester,
        EventDetailScreen(
          enableMapNetworkTiles: false,
          organizerId: event.organizerId,
          eventId: event.id,
        ),
        overrides: [
          organizersRepositoryProvider.overrideWithValue(
            FakeOrganizersRepository(),
          ),
          eventDetailViewModelProvider(event.id).overrideWith(
            (ref) => AsyncData(
              EventDetailViewModel(
                event: event,
                userProfile: profile,
                reviews: const [],
                isAuthenticated: true,
                isHost: false,
                isSaved: false,
                participation: _participation(
                  eventId: event.id,
                  uid: profile.uid,
                ),
              ),
            ),
          ),
          watchCrossPathsEventConsentProvider(
            event.id,
            profile.uid,
          ).overrideWith((ref) => Stream.value(null)),
          watchEventSuccessPlanProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(null)),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
        ],
      );
      await tester.pump();

      await _scrollUntilVisible(tester, find.text('Meet people at this event'));
      expect(find.textContaining('not a public attendee list'), findsOneWidget);
    });

    testWidgets('keeps an existing consent revocable', (tester) async {
      final event = buildEvent(
        startTime: DateTime.now().add(const Duration(days: 1)),
        endTime: DateTime.now().add(const Duration(days: 1, hours: 2)),
        crossPathsDiscoveryEnabled: true,
      );
      final profile = buildUser().copyWith(prefsShowInCrossPaths: false);
      final now = DateTime.now();

      await pumpEventsTestApp(
        tester,
        EventDetailScreen(
          enableMapNetworkTiles: false,
          organizerId: event.organizerId,
          eventId: event.id,
        ),
        overrides: [
          organizersRepositoryProvider.overrideWithValue(
            FakeOrganizersRepository(),
          ),
          eventDetailViewModelProvider(event.id).overrideWith(
            (ref) => AsyncData(
              EventDetailViewModel(
                event: event,
                userProfile: profile,
                reviews: const [],
                isAuthenticated: true,
                isHost: false,
                isSaved: false,
                participation: null,
              ),
            ),
          ),
          watchCrossPathsEventConsentProvider(
            event.id,
            profile.uid,
          ).overrideWith(
            (ref) => Stream.value(
              CrossPathsEventConsent(
                eventId: event.id,
                uid: profile.uid,
                enabled: true,
                termsVersion: currentCrossPathsTermsVersion,
                consentedAt: now,
                updatedAt: now,
                revokedAt: null,
                source: CrossPathsConsentSource.eventDetail.wireValue,
              ),
            ),
          ),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
        ],
      );
      await tester.pump();

      await _scrollUntilVisible(tester, find.text('Meet people at this event'));
      expect(
        find.byKey(const ValueKey('cross_paths.event_consent.toggle')),
        findsOneWidget,
      );
    });
  });
}

Future<void> _scrollUntilVisible(WidgetTester tester, Finder finder) async {
  final scrollView = find.byKey(
    const ValueKey<String>('event_detail.scroll_view'),
  );
  for (var attempt = 0; attempt < 40; attempt += 1) {
    if (finder.evaluate().isNotEmpty) {
      await tester.ensureVisible(finder.first);
      await tester.pump();
      return;
    }
    await tester.drag(scrollView, const Offset(0, -240));
    await tester.pump();
  }
  throw TestFailure('Could not reveal $finder.');
}

EventParticipation _participation({
  required String eventId,
  required String uid,
}) {
  final now = DateTime(2026);
  return EventParticipation(
    id: eventParticipationId(eventId: eventId, uid: uid),
    eventId: eventId,
    organizerId: 'club-1',
    uid: uid,
    status: EventParticipationStatus.signedUp,
    createdAt: now,
    updatedAt: now,
  );
}
