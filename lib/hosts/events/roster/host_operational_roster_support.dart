part of 'host_operational_roster_section.dart';

List<HostRosterInsightSignal> _displayInsightSignals(
  HostEventRosterInsight? insight,
) {
  final member =
      insight?.signals.contains(HostRosterInsightSignal.member) ?? false;
  if (insight?.availability != HostRosterInsightAvailability.ready) {
    return member ? const [HostRosterInsightSignal.member] : const [];
  }
  const priority = [
    HostRosterInsightSignal.member,
    HostRosterInsightSignal.highImpactAdvocate,
    HostRosterInsightSignal.topCatchSpender,
    HostRosterInsightSignal.firstTime,
    HostRosterInsightSignal.reEngaging,
    HostRosterInsightSignal.needsConfirmation,
    HostRosterInsightSignal.regular,
    HostRosterInsightSignal.reliable,
    HostRosterInsightSignal.advocate,
    HostRosterInsightSignal.returning,
    HostRosterInsightSignal.knownCatchSpender,
  ];
  return priority
      .where(insight!.signals.contains)
      .take(3)
      .toList(growable: false);
}

String _insightFilterLabel(
  BuildContext context,
  HostRosterInsightFilter filter,
  int count,
) => context.l10n.hostsOperationalRosterInsightsFilterCount(
  label: switch (filter) {
    HostRosterInsightFilter.all =>
      context.l10n.hostsOperationalRosterInsightsFilterAll,
    HostRosterInsightFilter.firstTime =>
      context.l10n.hostsOperationalRosterInsightFirstTime,
    HostRosterInsightFilter.returning =>
      context.l10n.hostsOperationalRosterInsightReturning,
    HostRosterInsightFilter.regular =>
      context.l10n.hostsOperationalRosterInsightRegular,
    HostRosterInsightFilter.reEngaging =>
      context.l10n.hostsOperationalRosterInsightReEngaging,
    HostRosterInsightFilter.reliable =>
      context.l10n.hostsOperationalRosterInsightReliable,
    HostRosterInsightFilter.needsConfirmation =>
      context.l10n.hostsOperationalRosterInsightNeedsConfirmation,
    HostRosterInsightFilter.advocate =>
      context.l10n.hostsOperationalRosterInsightAdvocate,
    HostRosterInsightFilter.topCatchSpender =>
      context.l10n.hostsOperationalRosterInsightTopCatchSpender,
    HostRosterInsightFilter.member => context.l10n.hostMembershipsRosterMembers,
  },
  count: count,
);

String _insightSignalLabel(
  BuildContext context,
  HostRosterInsightSignal signal,
) => switch (signal) {
  HostRosterInsightSignal.firstTime =>
    context.l10n.hostsOperationalRosterInsightFirstTime,
  HostRosterInsightSignal.returning =>
    context.l10n.hostsOperationalRosterInsightReturning,
  HostRosterInsightSignal.regular =>
    context.l10n.hostsOperationalRosterInsightRegular,
  HostRosterInsightSignal.reEngaging =>
    context.l10n.hostsOperationalRosterInsightReEngaging,
  HostRosterInsightSignal.reliable =>
    context.l10n.hostsOperationalRosterInsightReliable,
  HostRosterInsightSignal.needsConfirmation =>
    context.l10n.hostsOperationalRosterInsightNeedsConfirmation,
  HostRosterInsightSignal.advocate =>
    context.l10n.hostsOperationalRosterInsightAdvocate,
  HostRosterInsightSignal.highImpactAdvocate =>
    context.l10n.hostsOperationalRosterInsightHighImpactAdvocate,
  HostRosterInsightSignal.knownCatchSpender =>
    context.l10n.hostsOperationalRosterInsightCatchSpender,
  HostRosterInsightSignal.topCatchSpender =>
    context.l10n.hostsOperationalRosterInsightTopCatchSpender,
  HostRosterInsightSignal.member => context.l10n.membershipsBadgeMember,
};

CatchBadgeTone _insightSignalTone(HostRosterInsightSignal signal) =>
    switch (signal) {
      HostRosterInsightSignal.firstTime => CatchBadgeTone.brand,
      HostRosterInsightSignal.returning => CatchBadgeTone.neutral,
      HostRosterInsightSignal.regular ||
      HostRosterInsightSignal.reliable => CatchBadgeTone.success,
      HostRosterInsightSignal.reEngaging ||
      HostRosterInsightSignal.needsConfirmation => CatchBadgeTone.warning,
      HostRosterInsightSignal.advocate ||
      HostRosterInsightSignal.highImpactAdvocate ||
      HostRosterInsightSignal.topCatchSpender => CatchBadgeTone.gold,
      HostRosterInsightSignal.knownCatchSpender => CatchBadgeTone.neutral,
      HostRosterInsightSignal.member => CatchBadgeTone.gold,
    };

String? _nullableText(String value) {
  final normalized = value.trim();
  return normalized.isEmpty ? null : normalized;
}

String _newImportKey() =>
    'host-${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}';

String _newAttendanceOperationId(String attendeeId) =>
    'attendance_${attendeeId.hashCode.abs().toRadixString(36)}_'
    '${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}';

String _newProviderSyncOperationId() =>
    'provider_sync_${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}';

String _attendeeMeta(BuildContext context, EventAttendee attendee) => [
  _sourceCopy(context, attendee.source),
  attendee.phoneE164,
  attendee.email,
].whereType<String>().join(' · ');

String _sourceCopy(BuildContext context, EventAttendeeSource source) =>
    switch (source) {
      EventAttendeeSource.catchBooking =>
        context.l10n.hostsOperationalRosterSourceCatchBooking,
      EventAttendeeSource.hostImport =>
        context.l10n.hostsOperationalRosterSourceHostImport,
      EventAttendeeSource.hostManual =>
        context.l10n.hostsOperationalRosterSourceHostManual,
      EventAttendeeSource.webOtp =>
        context.l10n.hostsOperationalRosterSourceWebOtp,
      EventAttendeeSource.providerSync =>
        context.l10n.hostsOperationalRosterSourceProviderSync,
    };

String _providerDisplayName(
  BuildContext context,
  ExternalBookingProvider provider,
) => switch (provider) {
  ExternalBookingProvider.catchPlatform =>
    context.l10n.hostsEventDetailsStepExternalProviderCatch,
  ExternalBookingProvider.generic =>
    context.l10n.hostsEventDetailsStepExternalProviderOther,
  ExternalBookingProvider.luma =>
    context.l10n.hostsEventDetailsStepExternalProviderLuma,
  ExternalBookingProvider.eventbrite =>
    context.l10n.hostsEventDetailsStepExternalProviderEventbrite,
  ExternalBookingProvider.partiful =>
    context.l10n.hostsEventDetailsStepExternalProviderPartiful,
  ExternalBookingProvider.posh =>
    context.l10n.hostsEventDetailsStepExternalProviderPosh,
  ExternalBookingProvider.bookmyshow =>
    context.l10n.hostsEventDetailsStepExternalProviderBookMyShow,
  ExternalBookingProvider.district =>
    context.l10n.hostsEventDetailsStepExternalProviderDistrict,
  ExternalBookingProvider.sortmyscene =>
    context.l10n.hostsEventDetailsStepExternalProviderSortMyScene,
  ExternalBookingProvider.airbnb =>
    context.l10n.hostsEventDetailsStepExternalProviderAirbnbExperiences,
};

String _statusCopy(BuildContext context, EventAttendeeStatus status) =>
    switch (status) {
      EventAttendeeStatus.invited =>
        context.l10n.hostsOperationalRosterStatusInvited,
      EventAttendeeStatus.registered =>
        context.l10n.hostsOperationalRosterStatusRegistered,
      EventAttendeeStatus.waitlisted =>
        context.l10n.hostsOperationalRosterStatusWaitlisted,
      EventAttendeeStatus.checkedIn =>
        context.l10n.hostsOperationalRosterStatusCheckedIn,
      EventAttendeeStatus.cancelled =>
        context.l10n.hostsOperationalRosterStatusRegistered,
    };
