import 'dart:convert';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_draft.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_template.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_automation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_runtime_configuration.dart';

sealed class RehearsalSettingsDecision {
  const RehearsalSettingsDecision();
  String get kind;
  Map<String, Object?> toJson();
}

final class RehearsalSetRule extends RehearsalSettingsDecision {
  const RehearsalSetRule(this.groupId, this.preference);
  final String groupId;
  final LateJoinPreference preference;
  @override
  String get kind => 'setRule';
  @override
  Map<String, Object?> toJson() => {
    'kind': kind,
    'groupId': groupId,
    'preference': preference.toJson(),
  };
}

final class RehearsalConfigureUpdates extends RehearsalSettingsDecision {
  const RehearsalConfigureUpdates(this.configuration);
  final RehearsalRuntimeConfiguration configuration;
  @override
  String get kind => 'configure';
  @override
  Map<String, Object?> toJson() => {
    'kind': kind,
    'configuration': configuration.toJson(),
  };
}

final class RehearsalPauseUpdates extends RehearsalSettingsDecision {
  const RehearsalPauseUpdates();
  @override
  String get kind => 'pause';
  @override
  Map<String, Object?> toJson() => {'kind': kind};
}

/// An immutable, review-bound event settings decision, including exact retry.
final class RehearsalSettingsChange {
  RehearsalSettingsChange({
    required this.snapshot,
    required this.decision,
    required this.clientActionId,
  }) {
    final view = snapshot.settingsReview;
    final session = snapshot.session;
    if (view == null ||
        !view.canConfigure ||
        !view.staff.isManager ||
        session.actionCount >= 500 ||
        session.runtimeRevision >= 2147483647 ||
        !RegExp(r'^[A-Za-z0-9_-]{8,120}$').hasMatch(clientActionId)) {
      throw const FormatException('Review settings as the rehearsal Host.');
    }
    switch (decision) {
      case RehearsalPauseUpdates():
        if (view.runtime == null) {
          throw const FormatException('Configure practice updates first.');
        }
      case RehearsalSetRule(:final groupId, :final preference):
        assistanceText(groupId, 180);
        final group = view.groups[groupId];
        if (group == null ||
            LateJoinSettingDraft.fromPreference(preference).issueForSetup(
                  groupId: groupId,
                  serverTime: view.serverTime,
                  setup: group.setup,
                  runtimeTiming: view.runtimeTiming,
                ) !=
                null) {
          throw const FormatException(
            'Review the practice group and joining rule.',
          );
        }
      case RehearsalConfigureUpdates(:final configuration):
        final deadline = configuration.responseDeadline;
        if (deadline != null &&
                (deadline <= view.serverTime || deadline > view.eventEnd) ||
            deadline == null &&
                view.groups.values.any(
                  (g) =>
                      g.status == AssistanceSettingStatus.configured &&
                      g.effective?.rules.unanswered ==
                          LateJoinUnansweredRule.hostReviewAtDeadline,
                )) {
          throw const FormatException('Review the practice response deadline.');
        }
        final targets = view.groups.values
            .expand((g) => g.setup.destinations)
            .map((d) => d.target)
            .toSet();
        if (configuration.laterChoices?.any(
              (c) => !targets.contains(c.target) || c.label.trim().isEmpty,
            ) ??
            false) {
          throw const FormatException('Review the practice joining choices.');
        }
        for (final actor in snapshot.actors) {
          final recipe = actor.assistanceAutomation;
          if (recipe == null || !recipe.inheritsEventSettings) continue;
          if (recipe.nextOutcomeIndex > configuration.outcomes.length ||
              Iterable.generate(recipe.nextOutcomeIndex).any(
                (i) =>
                    jsonEncode(recipe.outcomes[i].toJson()) !=
                    jsonEncode(configuration.outcomes[i].toJson()),
              )) {
            throw const FormatException(
              'Consumed practice outcomes cannot change.',
            );
          }
        }
    }
  }
  final EventRehearsalBootstrap snapshot;
  final RehearsalSettingsDecision decision;
  final String clientActionId;
  Map<String, Object?> toJson() => {
    'sessionId': snapshot.session.id,
    'expectedRevision': snapshot.session.runtimeRevision,
    'expectedSetupRevision': snapshot.session.setupRevision,
    'clientActionId': clientActionId,
    'action': 'settings',
    'settings': {
      'expectedSourceHash': snapshot.settingsReview!.sourceHash,
      ...decision.toJson(),
    },
  };

  void requireResult(EventRehearsalBootstrap result) {
    final before = snapshot.session;
    final view = snapshot.settingsReview!;
    final next = result.settingsReview;
    view.staff.requireSameRole(result.staffReview);
    final receipts = result.actions.where(
      (r) => r.clientActionId == clientActionId,
    );
    final immediate =
        result.session.runtimeRevision == before.runtimeRevision + 1;
    if (next == null ||
        next.clockId != view.clockId ||
        result.session.id != before.id ||
        result.session.organizerId != before.organizerId ||
        result.session.setupRevision != before.setupRevision ||
        result.session.runtimeRevision <= before.runtimeRevision ||
        result.session.actionCount <= before.actionCount ||
        result.session.virtualNow.isBefore(before.virtualNow) ||
        receipts.length != 1 ||
        receipts.single.actorId != null ||
        receipts.single.kind != 'control' ||
        receipts.single.name != 'settings:${decision.kind}' ||
        receipts.single.runtimeRevision != before.runtimeRevision + 1 ||
        receipts.single.virtualNow != before.virtualNow ||
        immediate &&
            (result.session.status != before.status ||
                result.session.virtualNow != before.virtualNow ||
                result.session.actionCount != before.actionCount + 1)) {
      throw const FormatException(
        'Practice response does not confirm these settings.',
      );
    }
    if (!immediate) return; // A replay returns newer current settings.
    final changedGroup = decision is RehearsalSetRule
        ? (decision as RehearsalSetRule).groupId
        : null;
    if (view.groups.length != next.groups.length ||
        view.groups.entries.any(
          (g) =>
              !next.groups.containsKey(g.key) ||
              g.key != changedGroup &&
                  jsonEncode(g.value.preference.toJson()) !=
                      jsonEncode(next.groups[g.key]!.preference.toJson()),
        )) {
      throw const FormatException(
        'Practice response changed another preference.',
      );
    }
    final matches = switch (decision) {
      RehearsalSetRule(:final groupId, :final preference) =>
        jsonEncode(next.groups[groupId]?.preference.toJson()) ==
                jsonEncode(preference.toJson()) &&
            jsonEncode(next.runtime?.toJson()) ==
                jsonEncode(view.runtime?.toJson()),
      RehearsalConfigureUpdates(:final configuration) =>
        next.runtime?.status == RehearsalAutomationStatus.enabled &&
            jsonEncode(next.runtime?.configuration.toJson()) ==
                jsonEncode(configuration.toJson()),
      RehearsalPauseUpdates() =>
        next.runtime?.status == RehearsalAutomationStatus.paused &&
            jsonEncode(next.runtime?.configuration.toJson()) ==
                jsonEncode(view.runtime?.configuration.toJson()),
    };
    if (!matches) {
      throw const FormatException(
        'Practice confirmation changed the decision.',
      );
    }
  }
}
