import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_organizer_selection_controller.g.dart';

// keepalive: organizer identity is Host-shell state and must survive branch
// changes while remaining isolated to the authenticated user.
@Riverpod(keepAlive: true)
class HostOrganizerSelection extends _$HostOrganizerSelection {
  @override
  String? build(String uid) => null;

  void select(String organizerId) {
    final normalized = organizerId.trim();
    if (normalized.isEmpty || normalized == state) return;
    state = normalized;
  }

  void clear() {
    if (state == null) return;
    state = null;
  }
}

Club? resolveSelectedHostOrganizer(
  List<Club> clubs, {
  String? selectedOrganizerId,
  String? preferredOrganizerId,
}) {
  if (clubs.isEmpty) return null;
  final preferredId = preferredOrganizerId?.trim();
  if (preferredId != null && preferredId.isNotEmpty) {
    final preferred = clubs.where((club) => club.id == preferredId).firstOrNull;
    if (preferred != null) return preferred;
  }
  final selectedId = selectedOrganizerId?.trim();
  if (selectedId != null && selectedId.isNotEmpty) {
    final selected = clubs.where((club) => club.id == selectedId).firstOrNull;
    if (selected != null) return selected;
  }
  return clubs.first;
}
