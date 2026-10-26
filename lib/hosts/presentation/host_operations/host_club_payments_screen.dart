part of '../host_operations_screen.dart';

class HostClubPaymentsScreen extends StatelessWidget {
  const HostClubPaymentsScreen({super.key, required this.clubId});

  final String clubId;

  @override
  Widget build(BuildContext context) {
    return HostClubSpokeAsyncBoundary._(
      clubId: clubId,
      title: context.l10n.hostsHostClubEditTabLabelPayments,
      builder: (context, club, _, isOwner) => isOwner
          ? HostPaymentAccountControllerCard(club: club)
          : CatchSection.fieldRows(
              first: true,
              child: CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: context.l10n.hostsHostClubEditTabLabelPayments,
                valueText: context.l10n.hostsHostClubsScaffoldVisiblecopyOwner,
                icon: CatchIcons.locked,
              ),
            ),
    );
  }
}
