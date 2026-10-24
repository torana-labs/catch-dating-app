import 'dart:async';

import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/responsive/component_breakpoints.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/event_policies/domain/event_policy.dart'
    show EventAdmissionFormat, EventPrivateAccessMode;
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_formatters.dart';
import 'package:catch_dating_app/events/domain/event_participation_roster.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_invite_link_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';

class HostCapacitySection extends StatelessWidget {
  const HostCapacitySection({
    super.key,
    required this.event,
    required this.roster,
  });

  final Event event;
  final EventParticipationRoster? roster;

  @override
  Widget build(BuildContext context) {
    final booked = hostManageBookedCount(event, roster);
    final waitlisted = hostManageWaitlistedCount(event, roster);
    final open = (event.capacityLimit - booked).clamp(0, event.capacityLimit);
    final revenueEstimate = booked * event.priceInPaise;
    final revenueLabel = event.isFree
        ? context.l10n.hostsHostEventManageScreenVisiblecopyFree
        : EventFormatters.priceInPaise(
            revenueEstimate,
            currencyCode: event.currency,
          );
    final refundPolicy = event.effectiveEventPolicy.cancellationPolicy.title;

    return CatchSection.fieldRows(
      first: true,
      children: [
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          icon: CatchIcons.groupsRounded,
          title: context.l10n.hostsHostEventManageScreenLabelBooked,
          body: context.l10n.hostsHostEventManageScreenDetailOpenOpen(
            open: open,
          ),
          valueText:
              '${context.l10n.hostsHostEventManageScreenVisiblecopyBooked(booked: booked)}'
              '${context.l10n.hostsHostEventManageScreenVisiblecopyCapacitylimit(capacityLimit: event.capacityLimit)}',
        ),
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          icon: CatchIcons.waitlisted,
          title: context.l10n.hostsHostEventManageScreenLabelWaitlist,
          body: waitlisted == 1
              ? context.l10n.hostsHostEventManageScreenDetail1ToReview
              : context.l10n.hostsHostEventManageScreenDetailWaitlistedToReview(
                  waitlisted: waitlisted,
                ),
          valueText: context.l10n
              .hostsHostEventManageScreenVisiblecopyWaitlisted(
                waitlisted: waitlisted,
              ),
        ),
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          icon: CatchIcons.paymentsOutlined,
          title: context.l10n.hostsHostEventManageScreenLabelRevenueEst,
          valueText: revenueLabel,
        ),
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          icon: CatchIcons.receiptLongOutlined,
          title: context.l10n.hostsHostEventManageScreenLabelRefundPolicy,
          valueText: refundPolicy,
        ),
      ],
    );
  }
}

class HostFullCapacityBanner extends StatelessWidget {
  const HostFullCapacityBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchSurface(
      padding: CatchInsets.listBody,
      backgroundColor: t.ink,
      radius: CatchRadius.md,
      child: Row(
        children: [
          Icon(CatchIcons.lockRounded, color: t.surface, size: CatchIcon.md),
          gapW10,
          Expanded(
            child: Text(
              context.l10n.hostsHostEventManageScreenTextFullCapacityReached,
              style: CatchTextStyles.monoLabel(context, color: t.surface),
            ),
          ),
          Text(
            context.l10n.hostsHostEventManageScreenTextWaitlistOpen,
            style: CatchTextStyles.badge(context, color: t.ink3),
          ),
        ],
      ),
    );
  }
}

class HostEventActionsSection extends StatelessWidget {
  const HostEventActionsSection({
    super.key,
    required this.club,
    required this.event,
    required this.actionState,
    required this.actionError,
    required this.privateLinkActionState,
    required this.onEditEvent,
    this.onManagePublication,
    required this.onCancelEvent,
    required this.onDeleteEvent,
    required this.onSharePrivateLink,
  });

  final Club club;
  final Event event;
  final HostEventActionDisplayState actionState;
  final Object? actionError;
  final HostPrivateLinkActionState? privateLinkActionState;
  final VoidCallback onEditEvent;
  final VoidCallback? onManagePublication;
  final Future<void> Function() onCancelEvent;
  final Future<void> Function() onDeleteEvent;
  final ValueChanged<String> onSharePrivateLink;

  @override
  Widget build(BuildContext context) {
    final privateLinkState = privateLinkActionState;
    final hostActions = <Widget>[
      if (onManagePublication != null)
        HostActionRow(
          label: context.l10n.hostsPrivateEventPublicListing,
          detail: context.l10n.hostsPublicationPublishedBody,
          onTap: actionState.isMutating ? null : onManagePublication,
        ),
      if (actionState.showEditAction)
        HostActionRow(
          label: context.l10n.hostsHostEventManageScreenLabelEditEventDetails,
          detail: context.l10n.hostsHostEventManageScreenDetailScheduleLocation,
          onTap: actionState.isMutating ? null : onEditEvent,
        ),
      if (privateLinkState != null)
        HostActionRow(
          label: context.l10n.hostsHostEventManageScreenLabelSharePrivateLink,
          detail: privateLinkState.shareDetail,
          onTap: !privateLinkState.canShare
              ? null
              : () => onSharePrivateLink(privateLinkState.inviteLink!),
        ),
    ];
    final dangerActions = <Widget>[
      if (actionState.showCancelledState)
        HostActionRow(
          label: context.l10n.hostsHostEventManageScreenLabelEventCancelled,
          detail:
              context.l10n.hostsHostEventManageScreenDetailRecordsAreRetained,
          destructive: true,
        )
      else ...[
        if (actionState.showCancelAction)
          HostActionRow(
            label: context.l10n.hostsHostEventManageScreenLabelCancelEvent,
            detail: actionState.cancelDetail,
            destructive: true,
            onTap: actionState.isMutating
                ? null
                : () => unawaited(onCancelEvent()),
          ),
        if (actionState.showDeleteAction)
          HostActionRow(
            label:
                context.l10n.hostsHostEventManageScreenLabelDeleteUnusedEvent,
            detail: actionState.deleteDetail,
            destructive: true,
            onTap: actionState.isMutating
                ? null
                : () => unawaited(onDeleteEvent()),
          ),
      ],
    ];

    return CatchSectionList(
      emptyStateOmitted: true,
      gap: 0,
      children: [
        CatchSection.fieldRows(
          first: true,
          title: context.l10n.hostsHostEventManageScreenTextHostActions,
          children: hostActions,
        ),
        if (actionError != null) ...[
          gapH12,
          CatchLocalizedErrorBanner(
            actionError!,
            context: AppErrorContext.event,
          ),
          gapH4,
        ],
        CatchSection.fieldRows(
          title: context.l10n.hostsHostEventManageScreenTextDangerZone,
          children: dangerActions,
        ),
      ],
    );
  }
}

class HostActionRow extends StatelessWidget {
  const HostActionRow({
    super.key,
    required this.label,
    required this.detail,
    this.onTap,
    this.destructive = false,
  });

  final String label;
  final String detail;
  final VoidCallback? onTap;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    return CatchFieldLanes.single(
      child: CatchField.action(
        copy: catchFieldCopy(context.l10n),
        title: label,
        body: detail,
        titleMaxLines: 2,
        tone: destructive ? CatchFieldTone.danger : CatchFieldTone.normal,
        onTap: onTap,
      ),
    );
  }
}

class HostPublicRegistrationField extends StatelessWidget {
  const HostPublicRegistrationField({
    super.key,
    required this.club,
    required this.event,
    required this.mutation,
    required this.onChanged,
  });

  final Club club;
  final Event event;
  final MutationState<dynamic> mutation;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final organizerPublished =
        club.appVisibility == ClubAppVisibility.discoverable &&
        club.publicPage?.allowsPublicWebRead == true;
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
        icon: CatchIcons.languageOutlined,
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
              variant: CatchTextVariant.supporting,
              color: CatchTokens.of(context).ink2,
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

class HostEventSummarySection extends StatelessWidget {
  const HostEventSummarySection({
    super.key,
    required this.club,
    required this.event,
    this.title,
  });

  final Club club;
  final Event event;
  final String? title;

  @override
  Widget build(BuildContext context) {
    final price = event.isFree
        ? context.l10n.hostsHostEventManageScreenVisiblecopyFree
        : EventFormatters.priceInPaise(
            event.priceInPaise,
            currencyCode: event.currency,
          );

    return CatchSection.fieldRows(
      first: true,
      title: title,
      children: [
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          icon: CatchIcons.groupsRounded,
          title: context.l10n.hostsHostEventManageScreenLabelClub,
          body: club.name,
        ),
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          icon: CatchIcons.locationOnOutlined,
          title: context.l10n.hostsHostEventManageScreenLabelMeet,
          body: event.locationName,
        ),
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          icon: CatchIcons.routeRounded,
          title: context.l10n.hostsHostEventManageScreenLabelEvent,
          body: event.activitySummaryLabel,
        ),
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          icon: CatchIcons.paymentsOutlined,
          title: context.l10n.hostsHostEventManageScreenLabelPrice,
          body: price,
        ),
      ],
    );
  }
}

class HostEventSummaryRow extends StatelessWidget {
  const HostEventSummaryRow({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.showDivider = true,
  });

  final IconData icon;
  final String label;
  final String value;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final iconWidget = Icon(icon, color: t.ink2, size: CatchIcon.md);
    final labelText = CatchText(
      label,
      maxLines: 1,

      variant: CatchTextVariant.supporting,
      color: t.ink2,
    );

    return Column(
      children: [
        CatchViewport.atWidth(
          breakpoint: ComponentBreakpoints.hostEventSummaryRowStackBreakpoint,
          compactBuilder: (context) => Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              iconWidget,
              gapW10,
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    labelText,
                    gapH2,
                    Text(
                      value,
                      maxLines: 1,
                      style: CatchTextStyles.labelL(context),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          expandedBuilder: (context) => Row(
            children: [
              iconWidget,
              gapW10,
              Expanded(child: labelText),
              gapW10,
              Expanded(
                flex: 3,
                child: Text(
                  value,
                  maxLines: 1,
                  style: CatchTextStyles.labelL(context),
                  textAlign: TextAlign.right,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
        if (showDivider) ...[
          gapH12,
          const CatchDivider.fieldRow(indent: 0),
          gapH12,
        ],
      ],
    );
  }
}
