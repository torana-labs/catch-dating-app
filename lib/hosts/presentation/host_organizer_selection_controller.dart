import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
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

Organizer? resolveSelectedHostOrganizer(
  List<Organizer> organizers, {
  String? selectedOrganizerId,
  String? preferredOrganizerId,
}) {
  if (organizers.isEmpty) return null;
  final preferredId = preferredOrganizerId?.trim();
  if (preferredId != null && preferredId.isNotEmpty) {
    final preferred = organizers
        .where((organizer) => organizer.id == preferredId)
        .firstOrNull;
    if (preferred != null) return preferred;
  }
  final selectedId = selectedOrganizerId?.trim();
  if (selectedId != null && selectedId.isNotEmpty) {
    final selected = organizers
        .where((organizer) => organizer.id == selectedId)
        .firstOrNull;
    if (selected != null) return selected;
  }
  return organizers.first;
}
