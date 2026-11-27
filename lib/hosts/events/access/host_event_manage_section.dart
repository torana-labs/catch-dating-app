import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart'
    show EventAdmissionFormat, EventPrivateAccessMode;
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';

/// Website registration for one event: whether guests can book on the
/// organiser's web page, and the switch that turns it on or off.
class HostPublicRegistrationField extends StatelessWidget {
  const HostPublicRegistrationField({
    super.key,
    required this.organizer,
    required this.event,
    required this.mutation,
    required this.onChanged,
  });

  final Organizer organizer;
  final Event event;
  final MutationState<dynamic> mutation;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final organizerPublished =
        organizer.appVisibility == OrganizerAppVisibility.discoverable &&
        organizer.publicPage?.allowsPublicWebRead == true;
    final policy = event.effectiveEventPolicy;
    final supportsStandaloneRegistration =
        event.currency == 'INR' &&
        policy.basePriceInPaise == event.priceInPaise &&
        (event.priceInPaise == 0 ||
            event.priceInPaise >= 100 && event.priceInPaise <= 100000000) &&
        policy.pricingPolicy.cohortAdjustments.isEmpty &&
        policy.pricingPolicy.demandPricingRules.isEmpty &&
        policy.admissionPolicy.privateAccessPolicy.mode ==
            EventPrivateAccessMode.none &&
        policy.admissionPolicy.cohortCapacityLimits.isEmpty &&
        policy.admissionPolicy.balancedRatioPolicy == null &&
        !policy.admissionPolicy.crossPathsPairInventory.enabled &&
        event.constraints.maxMen == null &&
        event.constraints.maxWomen == null &&
        event.crossPathsPairHeldCount == 0 &&
        event.crossPathsPairConfirmedCount == 0 &&
        event.crossPathsPairHeldCohortCounts.values.every(
          (count) => count == 0,
        ) &&
        policy.admissionPolicy.format == EventAdmissionFormat.open &&
        !policy.admissionPolicy.inviteRequired &&
        !policy.admissionPolicy.membershipRequired &&
        !policy.admissionPolicy.manualApprovalRequired;
    final enabled =
        event.publicRegistrationEnabled &&
        event.publicRegistrationMode != EventPublicRegistrationMode.closed;
    return CatchFieldLanes.single(
      child: CatchField.control(
        copy: catchFieldCopy(context.l10n),
        key: const ValueKey<String>('host_event_website_registration_field'),
        title: context.l10n.hostsHostPublicRegistrationTitle,
        body: enabled
            ? context.l10n.hostsHostPublicRegistrationSubtitleEnabled
            : context.l10n.hostsHostPublicRegistrationSubtitleDisabled,
        icon: CatchIcons.web,
        contractExemption:
            'Disclosure and mutation surface for server-owned public event '
            'registration; the field itself does not persist a scalar value.',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: CatchBadge.functional(
                label: enabled
                    ? context.l10n.hostsHostPublicRegistrationStatusOpen
                    : context.l10n.hostsHostPublicRegistrationStatusOff,
                tone: enabled ? CatchBadgeTone.success : CatchBadgeTone.neutral,
              ),
            ),
            gapH8,
            CatchText(
              !supportsStandaloneRegistration
                  ? context.l10n.hostsHostPublicRegistrationBodyUnsupported
                  : organizerPublished
                  ? event.priceInPaise > 0
                        ? context.l10n.hostsHostPublicRegistrationBodyPaid
                        : context.l10n.hostsHostPublicRegistrationBodyPublished
                  : context.l10n.hostsHostPublicRegistrationBodyNeedsPage,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
            gapH12,
            CatchButton(
              label: enabled
                  ? context.l10n.hostsHostPublicRegistrationActionDisable
                  : event.priceInPaise > 0
                  ? context.l10n.hostsHostPublicRegistrationActionEnablePaid
                  : context.l10n.hostsHostPublicRegistrationActionEnable,
              onPressed:
                  mutation.isPending ||
                      ((!organizerPublished ||
                              !supportsStandaloneRegistration) &&
                          !enabled)
                  ? null
                  : () => onChanged(!enabled),
              status: (mutation.isPending)
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              variant: enabled
                  ? CatchButtonVariant.secondary
                  : CatchButtonVariant.primary,
              fullWidth: true,
            ),
            if (mutation.hasError) ...[
              gapH8,
              CatchLocalizedErrorBanner(
                (mutation as MutationError).error,
                context: AppErrorContext.event,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
