import 'package:catch_dating_app/contexts/bookings/actions/event_booking_controller.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class DashboardEventFocusController {
  const DashboardEventFocusController({required this.ref});

  final WidgetRef ref;

  static final Mutation<void> selfCheckInMutation =
      EventBookingController.selfCheckInMutation;

  Future<void> selfCheckIn(
    MutationTransaction tx,
    String eventId,
    String venueSessionToken,
  ) {
    return tx
        .get(eventBookingControllerProvider.notifier)
        .selfCheckIn(eventId: eventId, venueSessionToken: venueSessionToken);
  }

  /// The whole event just checked in to, for the companion and the
  /// celebration. The check-in has already succeeded, so a failed read
  /// returns null and skips the celebration instead of failing the check-in.
  Future<Event?> readCheckedInEvent(
    MutationTransaction tx,
    String eventId,
  ) async {
    try {
      return await tx.get(eventRepositoryProvider).fetchEvent(eventId);
    } on Object {
      return null;
    }
  }

  void resetSelfCheckInError() {
    selfCheckInMutation.reset(ref);
  }
}
