import 'package:catch_dating_app/contexts/bookings/data/host_requests_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/host_request.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_requests_controller.g.dart';

@riverpod
HostRequestsController hostRequestsController(Ref ref) =>
    HostRequestsController(ref);

/// The queue's decisions: the same callables the event guest list uses, then
/// a fresh read so the queue moves on to the next person.
class HostRequestsController {
  const HostRequestsController(this._ref);

  static final decideMutation = Mutation<void>();

  final Ref _ref;

  Future<void> letIn(String organizerId, HostRequest row) => _decide(
    organizerId,
    () => _booking.approveJoinRequest(eventId: row.eventId, userId: row.uid),
  );

  Future<void> decline(String organizerId, HostRequest row) => _decide(
    organizerId,
    () => _booking.declineJoinRequest(eventId: row.eventId, userId: row.uid),
  );

  Future<void> offer(String organizerId, HostRequest row) => _decide(
    organizerId,
    () => _booking.createWaitlistOffer(eventId: row.eventId, userId: row.uid),
  );

  HostEventBookingController get _booking =>
      _ref.read(hostEventBookingControllerProvider.notifier);

  Future<void> _decide(
    String organizerId,
    Future<void> Function() action,
  ) async {
    await action();
    _ref.invalidate(hostOrganizerRequestsProvider(organizerId));
  }
}
