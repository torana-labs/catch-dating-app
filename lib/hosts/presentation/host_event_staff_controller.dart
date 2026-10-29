import 'package:catch_dating_app/contexts/organizers/data/host_event_staff_repository.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_event_staff_controller.g.dart';

@riverpod
HostEventStaffController hostEventStaffController(Ref ref) =>
    HostEventStaffController(ref);

class HostEventStaffController {
  const HostEventStaffController(this._ref);

  final Ref _ref;

  Future<HostEventStaffList> list(String eventId) =>
      _ref.read(hostEventStaffRepositoryProvider).listStaff(eventId);

  Future<HostEventStaffList> grant({
    required String eventId,
    required String phoneNumber,
    required HostEventStaffGrantWindow window,
  }) => _ref
      .read(hostEventStaffRepositoryProvider)
      .grant(
        eventId: eventId,
        phoneNumber: phoneNumber,
        expiresAt: window.expiresFrom(DateTime.now()),
      );

  Future<HostEventStaffList> revoke({
    required String eventId,
    required HostEventStaffMember member,
  }) => _ref
      .read(hostEventStaffRepositoryProvider)
      .revoke(eventId: eventId, member: member);
}
