part of '../host_operations_screen.dart';

class HostOrganizerPaymentsScreen extends StatelessWidget {
  const HostOrganizerPaymentsScreen({super.key, required this.organizerId});

  final String organizerId;

  @override
  Widget build(BuildContext context) {
    return HostOrganizerSpokeAsyncBoundary._(
      organizerId: organizerId,
      title: context.l10n.hostsHostOrganizerEditTabLabelPayments,
      builder: (context, organizer, _, isOwner) => isOwner
          ? CatchSectionList(
              emptyStateOmitted: true,
              children: [
                // Route's Catch-collected payout (KYC) card stays hidden
                // (#1125); only the organizer's own Razorpay is set up here.
                HostRazorpayConnectionCard(organizerId: organizer.id),
                HostOrganizerBillsSection(organizerId: organizer.id),
              ],
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
