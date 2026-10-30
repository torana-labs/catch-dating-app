part of '../host_operations_screen.dart';

/// Organizer settings spoke for paid memberships: program, payouts, billing
/// pause and plans. Managers edit plans; only the owner sets up payouts.
class HostClubMembershipsScreen extends StatelessWidget {
  const HostClubMembershipsScreen({super.key, required this.clubId});

  final String clubId;

  @override
  Widget build(BuildContext context) {
    return HostClubSpokeAsyncBoundary._(
      clubId: clubId,
      title: context.l10n.hostMembershipsScreenTitle,
      builder: (context, club, _, isOwner) =>
          HostMembershipsCard(club: club, isOwner: isOwner),
    );
  }
}
