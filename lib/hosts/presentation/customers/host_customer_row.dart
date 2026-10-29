import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// CRM facts only; interaction and collection geometry belong to Field/Section.
CatchPersonLayout hostCustomerPersonLayout(
  BuildContext context,
  HostCustomerDirectoryContact contact,
) {
  final lifecycle = contact.hasAmbiguousIdentity
      ? (
          label: context.l10n.hostCustomersNeedsReview,
          tone: CatchBadgeTone.warning,
        )
      : contact.tags.contains(HostCustomerTag.atRisk)
      ? (
          label: context.l10n.hostCustomersFilterAtRisk,
          tone: CatchBadgeTone.warning,
        )
      : contact.tags.contains(HostCustomerTag.regular)
      ? (
          label: context.l10n.hostsOperationalRosterInsightRegular,
          tone: CatchBadgeTone.affinity,
        )
      : contact.tags.contains(HostCustomerTag.newToOrganizer)
      ? (
          label: context.l10n.hostsHostEventManageScreenStateLabelNew,
          tone: CatchBadgeTone.success,
        )
      : null;
  final activity = [
    context.l10n.hostCustomersCompactEventCount(
      count: contact.attendedEventCount,
    ),
    if (contact.lastAttendedAt != null)
      context.l10n.hostsHostAudienceLastSeen(
        date: AppTimeFormatters.shortDate(contact.lastAttendedAt!),
      ),
  ].join(' · ');
  return CatchPersonLayout(
    name: contact.displayName,
    supportingText: activity,
    context: contact.whatsappAdminSuppressed
        ? context.l10n.hostsHostAudienceContactConsentPaused
        : null,
    badges: [
      if (lifecycle != null)
        CatchRowBadge(label: lifecycle.label, tone: lifecycle.tone),
    ],
  );
}
