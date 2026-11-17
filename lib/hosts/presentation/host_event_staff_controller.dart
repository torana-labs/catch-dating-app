import 'package:catch_dating_app/contexts/organizers/data/host_event_staff_repository.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_event_staff_controller.g.dart';

@riverpod
HostEventStaffController hostEventStaffController(Ref ref) =>
    HostEventStaffController(ref);

/// Each action reads the repository before its request starts and touches
/// the Ref no more once it waits, so an auto-disposed provider read without a
/// listener can go away mid-request safely.
class HostEventStaffController {
  const HostEventStaffController(this._ref);

  final Ref _ref;

  Future<HostEventStaffList> list({
    required String organizerId,
    required String eventId,
  }) => _ref
      .read(hostEventStaffRepositoryProvider)
      .listStaff(organizerId: organizerId, eventId: eventId);

  Future<HostEventStaffList> grant({
    required String eventId,
    required String phoneNumber,
    required HostEventStaffGrantWindow window,
  }) => _ref
      .read(hostEventStaffRepositoryProvider)
      .grant(
        eventId: eventId,
        phoneNumber: phoneNumber,
        expiresAt: window.expiresFrom(_ref.read(appClockProvider).now()),
      );

  Future<HostEventStaffList> revoke({
    required String eventId,
    required HostEventStaffMember member,
  }) => _ref
      .read(hostEventStaffRepositoryProvider)
      .revoke(eventId: eventId, member: member);
}
