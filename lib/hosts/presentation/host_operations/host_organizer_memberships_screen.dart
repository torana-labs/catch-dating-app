part of '../host_operations_screen.dart';

/// Organizer settings spoke for paid memberships: program, payouts, billing
/// pause and plans. Managers edit plans; only the owner sets up payouts.
class HostOrganizerMembershipsScreen extends StatelessWidget {
  const HostOrganizerMembershipsScreen({super.key, required this.organizerId});

  final String organizerId;

  @override
  Widget build(BuildContext context) {
    return HostOrganizerSpokeAsyncBoundary._(
      organizerId: organizerId,
      title: context.l10n.hostMembershipsScreenTitle,
      builder: (context, organizer, _, isOwner) =>
          HostMembershipsCard(organizer: organizer, isOwner: isOwner),
    );
  }
}
