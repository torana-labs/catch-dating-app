import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/material.dart';

String eventSuccessRunOfShowStepLabel(
  BuildContext context,
  EventSuccessLivePlan plan,
  int index,
) =>
    '${eventSuccessRunOfShowBeatLabel(context, plan.durationShape, index)} · ${plan.steps[index].title}';

String eventSuccessRunOfShowBeatLabel(
  BuildContext context,
  EventSuccessDurationShape shape,
  int index,
) {
  final number = index + 1;
  return switch (shape) {
    EventSuccessDurationShape.continuous =>
      context.l10n.eventSuccessEventSuccessHostLiveLabelBeatNumber(
        number: number,
      ),
    EventSuccessDurationShape.rounds =>
      context.l10n.eventSuccessEventSuccessHostLiveLabelRoundNumber(
        number: number,
      ),
    EventSuccessDurationShape.courses => switch (number) {
      1 => context.l10n.eventSuccessEventSuccessHostLiveLabelFirstCourse,
      2 => context.l10n.eventSuccessEventSuccessHostLiveLabelSecondCourse,
      3 => context.l10n.eventSuccessEventSuccessHostLiveLabelThirdCourse,
      4 => context.l10n.eventSuccessEventSuccessHostLiveLabelFourthCourse,
      _ => context.l10n.eventSuccessEventSuccessHostLiveLabelCourseNumber(
        number: number,
      ),
    },
    EventSuccessDurationShape.segments =>
      context.l10n.eventSuccessEventSuccessHostLiveLabelLegNumber(
        number: number,
      ),
  };
}
