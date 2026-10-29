import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/host_memberships/domain/host_membership.dart';
import 'package:catch_dating_app/host_memberships/domain/host_membership_plan.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';

/// Memberships are INR-only (Razorpay Subscriptions), the default currency.
String hostMembershipPrice(int paise) => EventFormatters.priceInPaise(paise);

String hostMembershipIntervalPrice(
  AppLocalizations l10n,
  int paise,
  HostMembershipInterval interval,
) => switch (interval) {
  HostMembershipInterval.monthly => l10n.membershipsPricePerMonth(
    price: hostMembershipPrice(paise),
  ),
  HostMembershipInterval.annual => l10n.membershipsPricePerYear(
    price: hostMembershipPrice(paise),
  ),
};

String hostMembershipStatusLabel(
  AppLocalizations l10n,
  HostMembership membership,
) => hostMembershipStatusLabelFor(
  l10n,
  membership.status,
  pausedByHost: membership.pausedByHost,
);

String hostMembershipStatusLabelFor(
  AppLocalizations l10n,
  HostMembershipStatus status, {
  bool pausedByHost = false,
}) => switch (status) {
  HostMembershipStatus.trialing => l10n.membershipsStatusTrialing,
  HostMembershipStatus.active => l10n.membershipsStatusActive,
  HostMembershipStatus.pastDue => l10n.membershipsStatusPastDue,
  HostMembershipStatus.paused =>
    pausedByHost
        ? l10n.membershipsStatusPausedByHost
        : l10n.membershipsStatusPaused,
  HostMembershipStatus.canceling => l10n.membershipsStatusCanceling,
  HostMembershipStatus.expired => l10n.membershipsStatusExpired,
};

CatchBadgeTone hostMembershipStatusTone(HostMembershipStatus status) =>
    switch (status) {
      HostMembershipStatus.trialing ||
      HostMembershipStatus.active => CatchBadgeTone.success,
      HostMembershipStatus.pastDue => CatchBadgeTone.warning,
      HostMembershipStatus.paused ||
      HostMembershipStatus.canceling => CatchBadgeTone.neutral,
      HostMembershipStatus.expired => CatchBadgeTone.neutral,
    };

String hostMembershipBenefitLabel(
  AppLocalizations l10n,
  HostMembershipBenefit benefit,
) => switch (benefit) {
  HostMembershipEventDiscount(:final percentOff) =>
    percentOff == 100
        ? l10n.membershipsBenefitEventsIncluded
        : l10n.membershipsBenefitEventDiscount(percent: percentOff),
  HostMembershipEarlyAccess() => l10n.membershipsBenefitEarlyAccess,
  HostMembershipMembersOnlyAccess() => l10n.membershipsBenefitMembersOnly,
};

/// The plan's cheapest billing option, as shown on a plan row.
String? hostMembershipPlanPriceSummary(
  AppLocalizations l10n,
  HostMembershipPlan plan,
) {
  for (final interval in plan.intervals) {
    final price = plan.priceFor(interval);
    if (price != null) {
      return hostMembershipIntervalPrice(l10n, price, interval);
    }
  }
  return null;
}
