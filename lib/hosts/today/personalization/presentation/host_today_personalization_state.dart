import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_state.dart';
import 'package:meta/meta.dart';

enum HostTodayMilestone { audience, rehearsal, organizerPage, payouts }

/// Unknown is distinct from incomplete: missing/error/loading data is never
/// evidence that an organizer needs to do setup.
enum HostTodayMilestoneProgress { unknown, incomplete, complete }

enum HostTodaySuggestedAction {
  addCustomer,
  openAudience,
  startDressRehearsal,
  openOrganizerPage,
  managePayouts,
}

/// Supply authoritative completion facts from each owning feature. A route
/// visit or a button press is not completion evidence.
@immutable
class HostTodayRoadmapEvidence {
  const HostTodayRoadmapEvidence({
    this.audience = HostTodayMilestoneProgress.unknown,
    this.rehearsal = HostTodayMilestoneProgress.unknown,
    this.organizerPage = HostTodayMilestoneProgress.unknown,
    this.payouts = HostTodayMilestoneProgress.unknown,
    this.canManagePayouts = false,
  });

  final HostTodayMilestoneProgress audience;
  final HostTodayMilestoneProgress rehearsal;
  final HostTodayMilestoneProgress organizerPage;
  final HostTodayMilestoneProgress payouts;
  final bool canManagePayouts;

  HostTodayMilestoneProgress progressFor(HostTodayMilestone milestone) =>
      switch (milestone) {
        HostTodayMilestone.audience => audience,
        HostTodayMilestone.rehearsal => rehearsal,
        HostTodayMilestone.organizerPage => organizerPage,
        HostTodayMilestone.payouts => payouts,
      };
}

@immutable
class HostTodayRoadmapStep {
  const HostTodayRoadmapStep({
    required this.milestone,
    required this.progress,
    required this.action,
    this.enabled = true,
  });

  final HostTodayMilestone milestone;
  final HostTodayMilestoneProgress progress;
  final HostTodaySuggestedAction action;
  final bool enabled;
}

@immutable
class HostTodayPersonalizationState {
  HostTodayPersonalizationState({
    required this.showOrientation,
    required this.focus,
    required this.primaryAction,
    required List<HostTodayRoadmapStep> roadmap,
  }) : roadmap = List.unmodifiable(roadmap);

  final bool showOrientation;
  final HostTodayFocus? focus;

  /// Null while operational work/uncertainty or first-run orientation owns the
  /// main surface. Optional adoption work never becomes an attention item.
  final HostTodaySuggestedAction? primaryAction;
  final List<HostTodayRoadmapStep> roadmap;

  int get completedMilestones => roadmap
      .where((step) => step.progress == HostTodayMilestoneProgress.complete)
      .length;
}

HostTodayPersonalizationState buildHostTodayPersonalizationState({
  required HostTodayState today,
  required HostTodayPreference preference,
  required HostTodayRoadmapEvidence evidence,
}) {
  // Defer even first-run orientation until the existing operational projection
  // has positively established quiet. Never obstruct a live event or retry UI.
  final quiet = isHostTodayQuiet(today);
  final order = switch (preference.focus) {
    HostTodayFocus.audience => const [
      HostTodayMilestone.audience,
      HostTodayMilestone.organizerPage,
      HostTodayMilestone.rehearsal,
      HostTodayMilestone.payouts,
    ],
    HostTodayFocus.organizerPresence => const [
      HostTodayMilestone.organizerPage,
      HostTodayMilestone.audience,
      HostTodayMilestone.rehearsal,
      HostTodayMilestone.payouts,
    ],
    HostTodayFocus.rehearsal || null => const [
      HostTodayMilestone.rehearsal,
      HostTodayMilestone.audience,
      HostTodayMilestone.organizerPage,
      HostTodayMilestone.payouts,
    ],
  };
  HostTodaySuggestedAction actionFor(HostTodayMilestone milestone) =>
      switch (milestone) {
        HostTodayMilestone.audience =>
          evidence.audience == HostTodayMilestoneProgress.incomplete
              ? HostTodaySuggestedAction.addCustomer
              : HostTodaySuggestedAction.openAudience,
        HostTodayMilestone.rehearsal =>
          HostTodaySuggestedAction.startDressRehearsal,
        HostTodayMilestone.organizerPage =>
          HostTodaySuggestedAction.openOrganizerPage,
        HostTodayMilestone.payouts => HostTodaySuggestedAction.managePayouts,
      };

  return HostTodayPersonalizationState(
    showOrientation: quiet && !preference.answered,
    focus: preference.focus,
    primaryAction: quiet && preference.answered ? actionFor(order.first) : null,
    roadmap: [
      for (final milestone in order)
        HostTodayRoadmapStep(
          milestone: milestone,
          progress: evidence.progressFor(milestone),
          action: actionFor(milestone),
          enabled:
              milestone != HostTodayMilestone.payouts ||
              evidence.canManagePayouts,
        ),
    ],
  );
}

bool isHostTodayQuiet(HostTodayState today) =>
    today.status == HostTodayStatus.empty &&
    today.featuredEvent == null &&
    today.attentionItems.isEmpty &&
    today.attentionIssues.isEmpty &&
    today.laterEvents.isEmpty;
