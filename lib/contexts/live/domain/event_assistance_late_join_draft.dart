import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_destination.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setup.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_template.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';

enum LateJoinDraftMode { inherit, disabled, observe, prepare, automatic }

/// Timing evidence is separate from the joining-rule review. Live callers that
/// have not loaded runtime timing do not pretend that a deadline is missing.
enum LateJoinRuntimeTiming {
  notReviewed,
  notConfigured,
  noResponseDeadline,
  responseDeadline,
}

enum LateJoinDraftIssue {
  missingRules,
  setupUnavailable,
  destinationChanged,
  invalidCutoff,
  eventInheritance,
  missingResponseDeadline,
}

/// Local editing state. Only an explicit save turns defaults into a preference.
final class LateJoinSettingDraft {
  const LateJoinSettingDraft({required this.mode, required this.rules});
  final LateJoinDraftMode mode;
  final AssistanceLateJoinRules? rules;

  factory LateJoinSettingDraft.fromView(LateJoinSettingView view) {
    final own = view.own?.preference;
    final saved = own is LateJoinConfigured ? own.template : null;
    final suggested = view.suggested;
    final rules = saved?.rules ?? view.effective?.rules ?? suggested?.rules;
    final mode = switch (own) {
      LateJoinDisabled() => LateJoinDraftMode.disabled,
      LateJoinConfigured(:final template) => _mode(template.setting),
      LateJoinInherit() || null =>
        view.scope.groupId != 'event:whole'
            ? LateJoinDraftMode.inherit
            : suggested == null
            ? LateJoinDraftMode.disabled
            : _mode(suggested.setting),
    };
    return LateJoinSettingDraft(mode: mode, rules: rules);
  }

  factory LateJoinSettingDraft.fromPreference(
    LateJoinPreference preference, {
    AssistanceLateJoinRules? fallbackRules,
  }) => switch (preference) {
    LateJoinInherit() => LateJoinSettingDraft(
      mode: LateJoinDraftMode.inherit,
      rules: fallbackRules,
    ),
    LateJoinDisabled() => LateJoinSettingDraft(
      mode: LateJoinDraftMode.disabled,
      rules: fallbackRules,
    ),
    LateJoinConfigured(:final template) => LateJoinSettingDraft(
      mode: _mode(template.setting),
      rules: template.rules,
    ),
  };

  LateJoinSettingDraft withMode(LateJoinDraftMode value) =>
      LateJoinSettingDraft(mode: value, rules: rules);
  LateJoinSettingDraft withRules(AssistanceLateJoinRules value) =>
      LateJoinSettingDraft(mode: mode, rules: value);

  LateJoinDraftIssue? issueFor(LateJoinSettingView view) => issueForSetup(
    groupId: view.scope.groupId,
    serverTime: view.serverTime,
    setup: view.setup,
  );

  LateJoinDraftIssue? issueForSetup({
    required String groupId,
    required int serverTime,
    required LateJoinSettingSetup? setup,
    LateJoinRuntimeTiming runtimeTiming = LateJoinRuntimeTiming.notReviewed,
  }) {
    if (mode == LateJoinDraftMode.inherit) {
      return groupId == 'event:whole'
          ? LateJoinDraftIssue.eventInheritance
          : null;
    }
    if (mode == LateJoinDraftMode.disabled) return null;
    final currentRules = rules;
    if (currentRules == null) return LateJoinDraftIssue.missingRules;
    if (setup == null) return LateJoinDraftIssue.setupUnavailable;
    if (!_available(currentRules.destination, setup)) {
      return LateJoinDraftIssue.destinationChanged;
    }
    if (currentRules.cutoff case LateJoinAtTime(
      :final at,
    ) when at <= serverTime || at > setup.eventEnd) {
      return LateJoinDraftIssue.invalidCutoff;
    }
    if (runtimeTiming == LateJoinRuntimeTiming.noResponseDeadline &&
        currentRules.unanswered ==
            LateJoinUnansweredRule.hostReviewAtDeadline) {
      return LateJoinDraftIssue.missingResponseDeadline;
    }
    return null;
  }

  LateJoinPreference preferenceFor(LateJoinSettingView view) =>
      preferenceForSetup(
        groupId: view.scope.groupId,
        serverTime: view.serverTime,
        setup: view.setup,
      );

  LateJoinPreference preferenceForSetup({
    required String groupId,
    required int serverTime,
    required LateJoinSettingSetup? setup,
    LateJoinRuntimeTiming runtimeTiming = LateJoinRuntimeTiming.notReviewed,
  }) {
    if (issueForSetup(
          groupId: groupId,
          serverTime: serverTime,
          setup: setup,
          runtimeTiming: runtimeTiming,
        ) !=
        null) {
      throw StateError('Review the late arrival rules.');
    }
    if (mode == LateJoinDraftMode.inherit) return const LateJoinInherit();
    final currentRules = rules;
    if (mode == LateJoinDraftMode.disabled && currentRules == null) {
      return const LateJoinDisabled();
    }
    final setting = switch (mode) {
      LateJoinDraftMode.disabled => const AssistanceTemplateDisabled(
        AssistanceTemplateDisabledReason.hostChoice,
      ),
      LateJoinDraftMode.observe => const AssistanceTemplateEnabled(
        AssistanceTemplateAuthority.observe,
      ),
      LateJoinDraftMode.prepare => const AssistanceTemplateEnabled(
        AssistanceTemplateAuthority.prepare,
      ),
      LateJoinDraftMode.automatic => const AssistanceTemplateEnabled(
        AssistanceTemplateAuthority.executeWithinPolicy,
      ),
      LateJoinDraftMode.inherit => throw StateError(
        'Inheritance has no local template.',
      ),
    };
    return LateJoinConfigured(
      AssistanceLateJoinTemplate.withRules(
        setting: setting,
        rules: currentRules!,
      ),
    );
  }
}

LateJoinDraftMode _mode(AssistanceTemplateSetting setting) => switch (setting) {
  AssistanceTemplateDisabled() => LateJoinDraftMode.disabled,
  AssistanceTemplateEnabled(:final authority) => switch (authority) {
    AssistanceTemplateAuthority.observe => LateJoinDraftMode.observe,
    AssistanceTemplateAuthority.prepare => LateJoinDraftMode.prepare,
    AssistanceTemplateAuthority.executeWithinPolicy =>
      LateJoinDraftMode.automatic,
  },
};

bool _available(LateJoinDestination destination, LateJoinSettingSetup setup) {
  final targets = setup.destinations.map((d) => d.target);
  return switch (destination) {
    LateJoinConfirmedProgress() => true,
    LateJoinFixedPlace(:final placeId) =>
      targets.whereType<AssistanceFixedPlace>().any(
        (d) => d.placeId == placeId,
      ),
    LateJoinItinerary(:final itineraryId, :final permittedStopIds) =>
      permittedStopIds.every(
        (id) => targets.whereType<AssistanceItineraryStop>().any(
          (d) => d.itineraryId == itineraryId && d.stopId == id,
        ),
      ),
    LateJoinGroupCheckpoints(
      :final routeId,
      :final groupId,
      :final permittedCheckpointIds,
    ) =>
      permittedCheckpointIds.every(
        (id) => targets.whereType<AssistanceGroupCheckpoint>().any(
          (d) =>
              d.routeId == routeId &&
              d.groupId == groupId &&
              d.checkpointId == id,
        ),
      ),
  };
}
