import 'package:catch_dating_app/l10n/l10n.dart';

import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

enum EventSuccessRevealAssignmentKind {
  microPods,
  rotations,
  standings;

  String label(AppLocalizations l10n) => switch (this) {
    EventSuccessRevealAssignmentKind.microPods =>
      l10n.eventSuccessEventSuccessLiveRevealCardLabelPodReveal,
    EventSuccessRevealAssignmentKind.rotations =>
      l10n.eventSuccessEventSuccessLiveRevealCardLabelRotationReveal,
    EventSuccessRevealAssignmentKind.standings =>
      l10n.eventSuccessLiveControlStandingsRevealLabel,
  };

  String get assignmentNoun => switch (this) {
    EventSuccessRevealAssignmentKind.microPods => 'pod',
    EventSuccessRevealAssignmentKind.rotations => 'rotation',
    EventSuccessRevealAssignmentKind.standings => 'standing',
  };

  String get assignmentNounPlural => switch (this) {
    EventSuccessRevealAssignmentKind.microPods => 'pods',
    EventSuccessRevealAssignmentKind.rotations => 'rotations',
    EventSuccessRevealAssignmentKind.standings => 'standings',
  };

  IconData get icon => switch (this) {
    EventSuccessRevealAssignmentKind.microPods => CatchIcons.people,
    EventSuccessRevealAssignmentKind.rotations => CatchIcons.swap,
    EventSuccessRevealAssignmentKind.standings => CatchIcons.insights,
  };
}
