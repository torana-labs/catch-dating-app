import 'package:catch_dating_app/hosts/domain/crm/host_event_roster_insights.dart';

enum HostRosterInsightFilter {
  all,
  firstTime,
  returning,
  regular,
  reEngaging,
  reliable,
  needsConfirmation,
  advocate,
  topCatchSpender,
  member,
}

bool hostRosterInsightMatches(
  HostRosterInsightFilter filter,
  HostEventRosterInsight? insight,
) {
  if (filter == HostRosterInsightFilter.all) return true;
  // Paid members are labeled even before attendance history is available.
  if (filter == HostRosterInsightFilter.member) {
    return insight?.signals.contains(HostRosterInsightSignal.member) ?? false;
  }
  if (insight?.availability != HostRosterInsightAvailability.ready) {
    return false;
  }
  final signals = insight!.signals;
  return switch (filter) {
    HostRosterInsightFilter.all => true,
    HostRosterInsightFilter.firstTime => signals.contains(
      HostRosterInsightSignal.firstTime,
    ),
    HostRosterInsightFilter.returning => signals.contains(
      HostRosterInsightSignal.returning,
    ),
    HostRosterInsightFilter.regular => signals.contains(
      HostRosterInsightSignal.regular,
    ),
    HostRosterInsightFilter.reEngaging => signals.contains(
      HostRosterInsightSignal.reEngaging,
    ),
    HostRosterInsightFilter.reliable => signals.contains(
      HostRosterInsightSignal.reliable,
    ),
    HostRosterInsightFilter.needsConfirmation => signals.contains(
      HostRosterInsightSignal.needsConfirmation,
    ),
    HostRosterInsightFilter.advocate =>
      signals.contains(HostRosterInsightSignal.advocate) ||
          signals.contains(HostRosterInsightSignal.highImpactAdvocate),
    HostRosterInsightFilter.topCatchSpender => signals.contains(
      HostRosterInsightSignal.topCatchSpender,
    ),
    HostRosterInsightFilter.member => signals.contains(
      HostRosterInsightSignal.member,
    ),
  };
}

int hostRosterInsightFilterCount(
  HostRosterInsightFilter filter,
  Iterable<HostEventRosterInsight> insights,
) => insights
    .where((insight) => hostRosterInsightMatches(filter, insight))
    .length;
