import 'dart:async';
import 'dart:math' as math;

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_preference.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_assignment_reason_notice.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_rotation_override_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_screen_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessHostRotationSection extends StatelessWidget {
  const EventSuccessHostRotationSection({
    super.key,
    required this.event,
    required this.rotationIntervalMinutes,
    required this.assignments,
    required this.participantProfiles,
    required this.preferences,
    required this.actionState,
    required this.nextRoundIndex,
    this.onGenerate,
    this.onOverride,
    this.onPublish,
  });

  final Event event;
  final int rotationIntervalMinutes;
  final List<EventSuccessAssignment> assignments;
  final List<PublicProfile> participantProfiles;
  final List<EventSuccessPreference> preferences;
  final EventSuccessAssignmentGenerationActionState actionState;
  final int nextRoundIndex;
  final Future<void> Function()? onGenerate;
  final Future<void> Function(List<EventSuccessRotationOverrideRound> rounds)?
  onOverride;
  final Future<void> Function(int roundIndex)? onPublish;

  @override
  Widget build(BuildContext context) {
    final optedOutUids = preferences
        .where((preference) => preference.guidedRotationsOptedOut)
        .map((preference) => preference.uid)
        .toSet();
    final activeAssignments = assignments
        .where((assignment) => !optedOutUids.contains(assignment.uid))
        .toList(growable: false);
    final roundCount = _maxRotationRoundCount(activeAssignments);
    final fairness = _rotationFairnessTotals(activeAssignments);
    final optedOutCount = optedOutUids.length;
    final staleAssignmentCount = assignments.length - activeAssignments.length;
    final hostEdited = activeAssignments.any(
      (assignment) =>
          assignment.source ==
          context
              .l10n
              .eventSuccessEventSuccessHostOverridesVisiblecopyHostOverrideV1,
    );
    return CatchSection.contained(
      title: context
          .l10n
          .eventSuccessEventSuccessHostOverridesTextTimedPartnerRotations,
      subtitle: staleAssignmentCount > 0
          ? context
                .l10n
                .eventSuccessEventSuccessHostOverridesTextRegenerateToRemoveOpted4eddde
          : context
                .l10n
                .eventSuccessEventSuccessHostOverridesTextGeneratePairingsFromEvent,
      trailing: CatchBadge(
        label: context.l10n
            .eventSuccessEventSuccessHostOverridesLabelRoundcountRounds(
              roundCount: roundCount,
            ),
        tone: roundCount == 0 ? CatchBadgeTone.warning : CatchBadgeTone.success,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (optedOutCount > 0 || hostEdited)
            Wrap(
              spacing: CatchSpacing.s2,
              runSpacing: CatchSpacing.s2,
              children: [
                if (optedOutCount > 0)
                  CatchBadge(
                    label: context.l10n
                        .eventSuccessEventSuccessHostOverridesLabelOptedoutcountOptedOut(
                          optedOutCount: optedOutCount,
                        ),
                    icon: CatchIcons.hide,
                  ),
                if (hostEdited)
                  CatchBadge(
                    label: context
                        .l10n
                        .eventSuccessEventSuccessHostOverridesLabelHostEdited,
                    icon: CatchIcons.edit,
                  ),
              ],
            ),
          if (activeAssignments.isNotEmpty) ...[
            if (optedOutCount > 0 || hostEdited) gapH12,
            Wrap(
              spacing: CatchSpacing.s2,
              runSpacing: CatchSpacing.s2,
              children: [
                CatchBadge(
                  label: context.l10n
                      .eventSuccessEventSuccessHostOverridesLabelLengthAssigned(
                        length: activeAssignments.length,
                      ),
                  icon: CatchIcons.people,
                ),
                CatchBadge(
                  label: context.l10n
                      .eventSuccessEventSuccessHostOverridesLabelEventrotationcapacityPossible(
                        eventRotationCapacity: _eventRotationCapacity(
                          event,
                          rotationIntervalMinutes,
                        ),
                      ),
                  icon: CatchIcons.time,
                ),
                if (fairness.sitOutRoundCount > 0)
                  CatchBadge(
                    label: context.l10n
                        .eventSuccessEventSuccessHostOverridesLabelSitoutroundcountPlannedBreaks(
                          sitOutRoundCount: fairness.sitOutRoundCount,
                        ),
                    icon: CatchIcons.recurring,
                  ),
                if (fairness.repeatPeerCount > 0)
                  CatchBadge(
                    label: context.l10n
                        .eventSuccessEventSuccessHostOverridesLabelRepeatpeercountRepeatedPeers(
                          repeatPeerCount: fairness.repeatPeerCount,
                        ),
                    tone: CatchBadgeTone.warning,
                    icon: CatchIcons.info,
                  ),
              ],
            ),
            gapH10,
            EventSuccessAssignmentReasonNotice(assignments: activeAssignments),
          ],
          if (actionState.error != null) ...[
            gapH8,
            CatchLocalizedErrorBanner(
              actionState.error!,
              context: AppErrorContext.event,
            ),
          ],
          gapH12,
          if (activeAssignments.isEmpty)
            CatchButton(
              key: ValueKey(
                context
                    .l10n
                    .eventSuccessEventSuccessHostOverridesCatchbuttonEventsuccessgeneraterotationsbutton,
              ),
              label: context
                  .l10n
                  .eventSuccessEventSuccessHostOverridesLabelGenerateRotations,
              leading: Icon(CatchIcons.magic),
              status: (actionState.isGenerating)
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              onPressed: actionState.isGenerating || onGenerate == null
                  ? null
                  : () => unawaited(onGenerate!()),
              fullWidth: true,
            )
          else
            Row(
              children: [
                Expanded(
                  child: CatchButton(
                    key: ValueKey(
                      context
                          .l10n
                          .eventSuccessEventSuccessHostOverridesCatchbuttonEventsuccessgeneraterotationsbutton,
                    ),
                    label: context
                        .l10n
                        .eventSuccessEventSuccessHostOverridesLabelRegenerate,
                    leading: Icon(CatchIcons.magic),
                    variant: CatchButtonVariant.secondary,
                    status: (actionState.isGenerating)
                        ? CatchButtonStatus.loading
                        : CatchButtonStatus.idle,
                    onPressed: actionState.isGenerating || onGenerate == null
                        ? null
                        : () => unawaited(onGenerate!()),
                    fullWidth: true,
                  ),
                ),
                gapW10,
                Expanded(
                  child: CatchButton(
                    label: context
                        .l10n
                        .eventSuccessEventSuccessHostOverridesLabelEditRotations,
                    leading: Icon(CatchIcons.edit),
                    onPressed: () => _showRotationOverrideSheet(
                      context: context,
                      event: event,
                      assignments: activeAssignments,
                      participantProfiles: participantProfiles,
                      onOverride: onOverride,
                    ),
                    fullWidth: true,
                  ),
                ),
              ],
            ),
          if (activeAssignments.isNotEmpty && roundCount > nextRoundIndex) ...[
            gapH10,
            CatchButton(
              label: context.l10n
                  .eventSuccessLiveControlPublishRotationRoundLabel(
                    roundNumber: nextRoundIndex + 1,
                  ),
              leading: Icon(CatchIcons.send),
              status: (actionState.isGenerating)
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              onPressed: actionState.isGenerating || onPublish == null
                  ? null
                  : () => unawaited(
                      _confirmAndPublishRotationRound(context, nextRoundIndex),
                    ),
              fullWidth: true,
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _confirmAndPublishRotationRound(
    BuildContext context,
    int roundIndex,
  ) async {
    final confirmed = await showCatchConfirmDialog(
      copy: catchDialogCopy(context.l10n),
      context: context,
      title: context.l10n.eventSuccessLiveControlPublishRotationTitle,
      message: context.l10n.eventSuccessLiveControlPublishRotationMessage(
        roundNumber: roundIndex + 1,
      ),
      confirmLabel:
          context.l10n.eventSuccessLiveControlPublishRotationConfirmLabel,
      danger: true,
    );
    if (confirmed == true && context.mounted) {
      await onPublish?.call(roundIndex);
    }
  }
}

Future<void> _showRotationOverrideSheet({
  required BuildContext context,
  required Event event,
  required List<EventSuccessAssignment> assignments,
  required List<PublicProfile> participantProfiles,
  Future<void> Function(List<EventSuccessRotationOverrideRound> rounds)?
  onOverride,
}) {
  return showCatchBottomSheet<void>(
    context: context,
    builder: (context) => EventSuccessRotationOverrideSheet(
      event: event,
      assignments: assignments,
      participantProfiles: participantProfiles,
      onOverride: onOverride,
    ),
  );
}

final class _RotationFairnessTotals {
  const _RotationFairnessTotals({
    required this.sitOutRoundCount,
    required this.repeatPeerCount,
  });

  final int sitOutRoundCount;
  final int repeatPeerCount;
}

_RotationFairnessTotals _rotationFairnessTotals(
  List<EventSuccessAssignment> assignments,
) {
  var sitOutRoundCount = 0;
  var repeatPeerCount = 0;
  for (final assignment in assignments) {
    final fairness = assignment.rotationFairness;
    if (fairness == null) continue;
    sitOutRoundCount += fairness.sitOutRoundCount;
    repeatPeerCount += fairness.repeatPeerCount;
  }
  return _RotationFairnessTotals(
    sitOutRoundCount: sitOutRoundCount,
    repeatPeerCount: repeatPeerCount,
  );
}

int _maxRotationRoundCount(List<EventSuccessAssignment> assignments) {
  var maxRounds = 0;
  for (final assignment in assignments) {
    maxRounds = math.max(maxRounds, assignment.rotationSlots.length);
  }
  return maxRounds;
}

int _eventRotationCapacity(Event event, int rotationIntervalMinutes) {
  final durationMinutes = event.endTime.difference(event.startTime).inMinutes;
  return math.max(0, durationMinutes ~/ rotationIntervalMinutes);
}
