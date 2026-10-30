part of '../host_operations_screen.dart';

class HostOrganizerPaymentsScreen extends StatelessWidget {
  const HostOrganizerPaymentsScreen({super.key, required this.clubId});

  final String clubId;

  @override
  Widget build(BuildContext context) {
    return HostOrganizerSpokeAsyncBoundary._(
      clubId: clubId,
      title: context.l10n.hostsHostOrganizerEditTabLabelPayments,
      builder: (context, organizer, _, isOwner) => isOwner
          ? HostRazorpayConnectionCard(
              organizerId: organizer.id,
              // Route's Catch-collected payout form appears only when the
              // routing policy explicitly selects razorpayRoute.
              routeAccountSetup: (_) =>
                  HostPaymentAccountControllerCard(organizer: organizer),
            )
          : CatchSection.fieldRows(
              first: true,
              child: CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: context.l10n.hostsHostOrganizerEditTabLabelPayments,
                valueText:
                    context.l10n.hostsHostOrganizersScaffoldVisiblecopyOwner,
                icon: CatchIcons.locked,
              ),
            ),
    );
  }
}
