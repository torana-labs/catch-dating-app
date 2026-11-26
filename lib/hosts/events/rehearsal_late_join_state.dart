import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_template.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_automation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_delivery_outcome.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_publication.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_runtime_draft.dart';
import 'package:flutter/foundation.dart';

/// How Catch helps one made-up late joiner: the template authority the
/// practice recipe carries. Only [automatic] may publish directions.
enum HostRehearsalLateJoinMode { automatic, prepare, observe, off }

/// The template setting a [HostRehearsalLateJoinMode] saves.
AssistanceTemplateSetting hostRehearsalLateJoinSetting(
  HostRehearsalLateJoinMode mode,
) => switch (mode) {
  HostRehearsalLateJoinMode.automatic => const AssistanceTemplateEnabled(
    AssistanceTemplateAuthority.executeWithinPolicy,
  ),
  HostRehearsalLateJoinMode.prepare => const AssistanceTemplateEnabled(
    AssistanceTemplateAuthority.prepare,
  ),
  HostRehearsalLateJoinMode.observe => const AssistanceTemplateEnabled(
    AssistanceTemplateAuthority.observe,
  ),
  HostRehearsalLateJoinMode.off => const AssistanceTemplateDisabled(
    AssistanceTemplateDisabledReason.hostChoice,
  ),
};

HostRehearsalLateJoinMode _modeOf(
  AssistanceTemplateSetting? setting,
) => switch (setting) {
  AssistanceTemplateEnabled(:final authority) => switch (authority) {
    AssistanceTemplateAuthority.executeWithinPolicy =>
      HostRehearsalLateJoinMode.automatic,
    AssistanceTemplateAuthority.prepare => HostRehearsalLateJoinMode.prepare,
    AssistanceTemplateAuthority.observe => HostRehearsalLateJoinMode.observe,
  },
  AssistanceTemplateDisabled() => HostRehearsalLateJoinMode.off,
  null => HostRehearsalLateJoinMode.automatic,
};

/// What the host has chosen for one made-up late joiner, before any save:
/// the pace group whose movement they follow, where they join, the other
/// places they may pick later, how Catch helps, the response deadline and
/// the practice delivery outcomes automation plays through.
@immutable
class HostRehearsalLateJoinChoices {
  const HostRehearsalLateJoinChoices({
    required this.groupId,
    required this.mode,
    required this.outcomes,
    this.joiningPointId,
    this.laterPointIds = const <String>{},
    this.laterLabels = const <String, String>{},
    this.responseDeadline,
  });

  /// Starting choices for [actor]: their saved automation recipe when they
  /// have one, otherwise the rehearsal-wide update settings and the
  /// group's late arrival rule.
  factory HostRehearsalLateJoinChoices.initial(
    EventRehearsalBootstrap rehearsal,
    EventRehearsalActor actor,
  ) {
    final groupId = rehearsal.movementReview?.scope.groupId ?? 'event:whole';
    final settings = rehearsal.settingsReview;
    final runtime = RehearsalRuntimeDraft.fromConfiguration(
      settings?.runtime?.configuration,
    );
    final saved = actor.assistanceAutomation;
    return HostRehearsalLateJoinChoices(
      groupId: groupId,
      mode: _modeOf(
        saved?.plan.setting ?? settings?.groups[groupId]?.effective?.setting,
      ),
      outcomes: saved?.outcomes ?? runtime.outcomes,
      responseDeadline: saved == null
          ? runtime.responseDeadline
          : saved.plan.responseDeadline,
    );
  }

  final String groupId;

  /// The chosen destination's alternative id in the group's movement
  /// review; null is the review's default joining point.
  final String? joiningPointId;

  /// Alternative ids of the places the guest may choose between later.
  final Set<String> laterPointIds;

  /// Optional short button labels for later places, by alternative id; a
  /// place without one uses its own label.
  final Map<String, String> laterLabels;
  final HostRehearsalLateJoinMode mode;

  /// Epoch milliseconds of the response deadline, or null for none.
  final int? responseDeadline;
  final List<RehearsalDeliveryOutcome> outcomes;

  HostRehearsalLateJoinChoices copyWith({
    String? groupId,
    String? joiningPointId,
    Set<String>? laterPointIds,
    Map<String, String>? laterLabels,
    HostRehearsalLateJoinMode? mode,
    List<RehearsalDeliveryOutcome>? outcomes,
  }) => HostRehearsalLateJoinChoices(
    groupId: groupId ?? this.groupId,
    // A new group has its own destinations.
    joiningPointId: groupId != null && groupId != this.groupId
        ? null
        : joiningPointId ?? this.joiningPointId,
    laterPointIds: groupId != null && groupId != this.groupId
        ? const <String>{}
        : laterPointIds ?? this.laterPointIds,
    laterLabels: groupId != null && groupId != this.groupId
        ? const <String, String>{}
        : laterLabels ?? this.laterLabels,
    mode: mode ?? this.mode,
    responseDeadline: responseDeadline,
    outcomes: outcomes ?? this.outcomes,
  );

  HostRehearsalLateJoinChoices withDeadline(int? at) =>
      HostRehearsalLateJoinChoices(
        groupId: groupId,
        joiningPointId: joiningPointId,
        laterPointIds: laterPointIds,
        laterLabels: laterLabels,
        mode: mode,
        responseDeadline: at,
        outcomes: outcomes,
      );

  /// The joining point these choices name in [movement], or its default.
  RehearsalJoiningPoint? joiningPoint(RehearsalMovementReview movement) =>
      rehearsalJoiningPoints(movement)
          .where((p) => p.destination.alternativeId == joiningPointId)
          .firstOrNull ??
      rehearsalDefaultJoiningPoint(movement);

  /// The publication recipe for [actorId] on [movement], with the group's
  /// late arrival rule and the rehearsal-wide channels and retry policy
  /// from [rehearsal]. Null when the rehearsal has no settings review
  /// (only the host reads one) or [movement] has no joining point.
  RehearsalPublicationDraft? draft(
    EventRehearsalBootstrap rehearsal,
    RehearsalMovementReview movement,
    String actorId,
  ) {
    final settings = rehearsal.settingsReview;
    final point = joiningPoint(movement);
    if (settings == null || point == null) return null;
    final runtime = RehearsalRuntimeDraft.fromConfiguration(
      settings.runtime?.configuration,
    );
    final rules =
        settings.groups[groupId]?.effective?.rules ?? settings.suggested.rules;
    return RehearsalPublicationDraft(
      actorId: actorId,
      joiningPoint: point,
      rules: rules,
      routes: runtime.routes,
      deliveryPolicy: runtime.deliveryPolicy,
      setting: hostRehearsalLateJoinSetting(mode),
      responseDeadline: responseDeadline == null
          ? null
          : DateTime.fromMillisecondsSinceEpoch(responseDeadline!),
      laterChoices: [
        for (final later in rehearsalJoiningPoints(movement))
          if (laterPointIds.contains(later.destination.alternativeId))
            RehearsalLaterJoiningOption(
              later,
              label: _label(laterLabels[later.destination.alternativeId]),
            ),
      ],
    );
  }

  /// The group's late arrival rule, as the draft uses it.
  AssistanceLateJoinRules? rules(EventRehearsalBootstrap rehearsal) {
    final settings = rehearsal.settingsReview;
    if (settings == null) return null;
    return settings.groups[groupId]?.effective?.rules ??
        settings.suggested.rules;
  }
}

/// Where one made-up guest's automatic updates stand.
enum HostRehearsalLateJoinStatus { none, automatic, paused }

HostRehearsalLateJoinStatus hostRehearsalLateJoinStatus(
  EventRehearsalActor actor,
) => switch (actor.assistanceAutomation?.status) {
  null => HostRehearsalLateJoinStatus.none,
  RehearsalAutomationStatus.enabled => HostRehearsalLateJoinStatus.automatic,
  RehearsalAutomationStatus.paused => HostRehearsalLateJoinStatus.paused,
};

/// Whether the rehearsal can take late joiner commands now: started and
/// running or paused, with a group movement review to direct guests from.
bool hostRehearsalLateJoinOpen(EventRehearsalBootstrap rehearsal) {
  final session = rehearsal.session;
  return session.virtualStartedAt != null &&
      rehearsal.movementReview != null &&
      (session.status == EventRehearsalStatus.running ||
          session.status == EventRehearsalStatus.paused);
}

/// What the late joiner's directions would say now, from the publication
/// draft's preview.
enum HostRehearsalLateJoinPreviewKind {
  /// The group has not left: no directions can be published yet.
  awaitingDeparture,

  /// The group is heading somewhere the rule does not allow joining.
  outsidePolicy,

  /// Confirmed directions the guest can follow.
  confirmed,

  /// Confirmed directions, but late entry is closed there.
  entryClosed,
}

/// Where the late joiner command stands, from the assistance editor.
enum HostRehearsalLateJoinPhase { editing, submitting, retry, refresh, applied }

/// Everything the late joiner form shows, as plain values.
@immutable
class HostRehearsalLateJoinView {
  const HostRehearsalLateJoinView({
    required this.status,
    required this.groups,
    required this.groupId,
    required this.points,
    required this.mode,
    required this.routes,
    required this.outcomes,
    this.phase = HostRehearsalLateJoinPhase.editing,
    this.pointId,
    this.laterPointIds = const <String>{},
    this.laterLabels = const <String, String>{},
    this.remainingOutcomes,
    this.latestText,
    this.latestReply,
    this.rules,
    this.responseDeadline,
    this.previewKind,
    this.previewText,
    this.error,
  });

  final HostRehearsalLateJoinStatus status;

  /// Practice outcomes automation has still to play, when it is set up.
  final int? remainingOutcomes;

  /// The latest directions the guest was sent and their reply, if any.
  final String? latestText;
  final String? latestReply;
  final List<RehearsalMovementGroup> groups;
  final String groupId;

  /// The places in the chosen group's movement; null while it loads.
  final List<RehearsalMovementDestination>? points;
  final String? pointId;
  final Set<String> laterPointIds;

  /// Custom button labels for later places, by alternative id.
  final Map<String, String> laterLabels;
  final HostRehearsalLateJoinMode mode;

  /// The group's late arrival rule; null when the host has none to read.
  final AssistanceLateJoinRules? rules;

  /// The rehearsal-wide practice channels, in fallback order.
  final List<AssistanceMessageRoute> routes;
  final int? responseDeadline;
  final List<RehearsalDeliveryOutcome> outcomes;
  final HostRehearsalLateJoinPreviewKind? previewKind;

  /// The directions text, or the place the group is heading.
  final String? previewText;
  final HostRehearsalLateJoinPhase phase;
  final Object? error;

  bool get deadlineRequired =>
      rules?.unanswered == LateJoinUnansweredRule.hostReviewAtDeadline;
}

/// A trimmed custom label, or null to use the place's own.
String? _label(String? value) {
  final trimmed = value?.trim();
  return trimmed == null || trimmed.isEmpty ? null : trimmed;
}
