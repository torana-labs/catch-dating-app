import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/saved_event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/events/presentation/event_detail_view_model.dart';
import 'package:catch_dating_app/platform/riverpod_ui/failed_reads.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'events_test_helpers.dart';

void main() {
  test('Retry re-runs the organizer read keyed by the loaded event', () async {
    final event = buildEvent(id: 'event-9');
    final user = buildUser(uid: 'runner-9');
    var uidBuilds = 0;
    var organizerAttempts = 0;
    final container = ProviderContainer(
      observers: const [FailedReadRecorder()],
      // Only the user's Retry may re-run a read in this test.
      retry: (_, _) => null,
      overrides: [
        uidProvider.overrideWith((ref) {
          uidBuilds += 1;
          return Stream.value(user.uid);
        }),
        watchEventProvider(event.id).overrideWith((ref) => Stream.value(event)),
        watchUserProfileProvider.overrideWith((ref) => Stream.value(user)),
        fetchOrganizerProvider(event.organizerId).overrideWith((ref) async {
          organizerAttempts += 1;
          if (organizerAttempts == 1) {
            throw StateError('organizer read unavailable');
          }
          return buildOrganizer(hostUserId: 'host-9');
        }),
        watchReviewsForEventProvider(
          event.id,
        ).overrideWith((ref) => Stream.value(const <Review>[])),
        watchSavedEventProvider(
          user.uid,
          event.id,
        ).overrideWith((ref) => Stream.value(null)),
        watchEventParticipationProvider(
          event.id,
          user.uid,
        ).overrideWith((ref) => Stream.value(null)),
        watchOrganizerMembershipProvider(
          event.organizerId,
          user.uid,
        ).overrideWith((ref) => Stream.value(null)),
      ],
    );
    addTearDown(container.dispose);
    final subscription = container.listen(
      eventDetailViewModelProvider(event.id),
      (_, _) {},
    );
    addTearDown(subscription.close);

    Future<void> settle() async {
      await flushTestEventQueue();
      await container.pump();
    }

    await settle();
    final error = subscription.read().error!;
    expect(readsThatFailedWith(error), [
      fetchOrganizerProvider(event.organizerId),
    ]);

    container.invalidate(eventDetailViewModelProvider(event.id));
    await settle();
    expect(subscription.read().hasError, isTrue);
    expect(organizerAttempts, 1);

    readsThatFailedWith(error).forEach(container.invalidate);
    await settle();
    expect(subscription.read().requireValue?.event, event);
    expect(organizerAttempts, 2);
    expect(uidBuilds, 1);
  });
}
