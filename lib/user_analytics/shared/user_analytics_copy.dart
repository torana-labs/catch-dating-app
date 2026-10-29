import 'package:catch_dating_app/contexts/insights/data/user_analytics_repository.dart';
import 'package:catch_dating_app/l10n/l10n.dart';

class UserAnalyticsTipCopy {
  const UserAnalyticsTipCopy({required this.title, required this.body});

  final String title;
  final String body;
}

abstract final class UserAnalyticsCopy {
  static String sectionTitle(AppLocalizations l10n) =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyProfileInsights;
  static String loadingLabel(AppLocalizations l10n) =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyLoadingProfileInsights;
  static String emptyTitle(AppLocalizations l10n) =>
      l10n.userAnalyticsUserAnalyticsCopyEmptytitleInsightsAreWarmingUp;
  static String emptyBody(AppLocalizations l10n) =>
      l10n.userAnalyticsUserAnalyticsCopyEmptybodyYouWillSeeTrends;
  static String rangeTitle(AppLocalizations l10n) =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyRange;
  static String trendTitle(AppLocalizations l10n) =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyTrend;
  static String tipsTitle(AppLocalizations l10n) =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopySuggestions;
  static String dataQualityTitle(AppLocalizations l10n) =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyDataCoverage;
  static String partialBadge(AppLocalizations l10n) =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyPartial;
  static String missingBadge(AppLocalizations l10n) =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyMissing;

  static String dataQualityLabel(
    AppLocalizations l10n,
    String id, {
    required UserAnalyticsDataQualityState state,
  }) => switch (id) {
    'participant-signals' =>
      l10n.userAnalyticsUserAnalyticsCopyDataqualityParticipantSignals,
    'profile-exposure' =>
      l10n.userAnalyticsUserAnalyticsCopyDataqualityProfileExposure,
    'app-engagement' =>
      l10n.userAnalyticsUserAnalyticsCopyDataqualityAppEngagement,
    'user-analytics-mart' =>
      l10n.userAnalyticsUserAnalyticsCopyDataqualityAnalyticsSource,
    _ => switch (state) {
      UserAnalyticsDataQualityState.ok =>
        l10n.userAnalyticsUserAnalyticsCopyVisiblecopyAvailable,
      UserAnalyticsDataQualityState.partial => partialBadge(l10n),
      UserAnalyticsDataQualityState.missing => missingBadge(l10n),
    },
  };

  static String rangeLabel(
    AppLocalizations l10n,
    UserAnalyticsRangePreset preset,
  ) => switch (preset) {
    UserAnalyticsRangePreset.sevenDays =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyLast7Days,
    UserAnalyticsRangePreset.thirtyDays =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyLast30Days,
    UserAnalyticsRangePreset.ninetyDays =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyLast90Days,
    UserAnalyticsRangePreset.month =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyThisMonth,
    UserAnalyticsRangePreset.custom => preset.wireValue,
  };

  static String metricLabel(
    AppLocalizations l10n,
    String id, {
    required String fallback,
  }) => switch (id) {
    'profileViews' =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyProfileViews,
    'caughtYou' => l10n.userAnalyticsUserAnalyticsCopyVisiblecopyCaughtYou,
    'mutualCatches' =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyMutualCatches,
    'chatsStarted' =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyChatsStarted,
    'eventsAttended' =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyEventsAttended,
    'followThroughRate' =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyFollowThrough,
    _ => fallback,
  };

  static String? metricCaption(
    AppLocalizations l10n,
    String id, {
    String? fallback,
  }) => switch (id) {
    'profileViews' =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyPostEventProfileAttention,
    'caughtYou' =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyPeopleWhoShowedInterest,
    'mutualCatches' =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyMatchesWhereInterestWas,
    'chatsStarted' =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyConversationsThatOpenedAfter,
    'eventsAttended' =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyEventsYouAttended,
    'followThroughRate' =>
      l10n.userAnalyticsUserAnalyticsCopyVisiblecopyChatsStartedFromMutual,
    _ => fallback,
  };

  static String trendMetricLabel(
    AppLocalizations l10n,
    String id,
  ) => switch (id) {
    'profileViews' => l10n.userAnalyticsUserAnalyticsCopyVisiblecopyViews,
    'caughtYou' => l10n.userAnalyticsUserAnalyticsCopyVisiblecopyInterest,
    'mutualCatches' => l10n.userAnalyticsUserAnalyticsCopyVisiblecopyMatches,
    'chatsStarted' => l10n.userAnalyticsUserAnalyticsCopyVisiblecopyChats,
    'eventsAttended' => l10n.userAnalyticsUserAnalyticsCopyVisiblecopyAttended,
    _ => id,
  };

  static UserAnalyticsTipCopy tip(
    AppLocalizations l10n,
    String copyKey,
  ) => switch (copyKey) {
    'refreshProfilePrompts' => UserAnalyticsTipCopy(
      title: l10n.userAnalyticsUserAnalyticsCopyTitleTuneYourProfile,
      body: l10n.userAnalyticsUserAnalyticsCopyBodyAFreshPromptOr,
    ),
    'startFirstChat' => UserAnalyticsTipCopy(
      title: l10n.userAnalyticsUserAnalyticsCopyTitleOpenTheLoop,
      body: l10n.userAnalyticsUserAnalyticsCopyBodyAShortMessageAfter,
    ),
    'showUpToEvents' => UserAnalyticsTipCopy(
      title: l10n.userAnalyticsUserAnalyticsCopyTitleShowUpInPerson,
      body: l10n.userAnalyticsUserAnalyticsCopyBodyTheStrongestProfileTrends,
    ),
    'keepShowingUp' => UserAnalyticsTipCopy(
      title: l10n.userAnalyticsUserAnalyticsCopyTitleKeepShowingUp,
      body: l10n.userAnalyticsUserAnalyticsCopyBodyRepeatedEventAttendanceGives,
    ),
    _ => UserAnalyticsTipCopy(
      title: l10n.userAnalyticsUserAnalyticsCopyTitleKeepBuildingSignal,
      body: l10n.userAnalyticsUserAnalyticsCopyBodyInsightsGetSharperAfter,
    ),
  };
}
