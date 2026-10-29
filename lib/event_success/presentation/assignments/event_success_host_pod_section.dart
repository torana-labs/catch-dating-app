import 'dart:async';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_preference.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_assignment_reason_notice.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_group_override_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_pod_summary_row.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_screen_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessHostPodSection extends StatelessWidget {
  const EventSuccessHostPodSection({
    super.key,
    required this.event,
    required this.assignments,
    required this.participantProfiles,
    required this.preferences,
    required this.actionState,
    this.onGenerate,
    this.onOverride,
  });

  final Event event;
  final List<EventSuccessAssignment> assignments;
  final List<PublicProfile> participantProfiles;
  final List<EventSuccessPreference> preferences;
  final EventSuccessAssignmentGenerationActionState actionState;
  final Future<void> Function()? onGenerate;
  final Future<void> Function(List<EventSuccessGroupOverrideRound> rounds)?
  onOverride;

  @override
  Widget build(BuildContext context) {
    final optedOutUids = preferences
        .where((preference) => preference.microPodsOptedOut)
        .map((preference) => preference.uid)
        .toSet();
    final optedOutCount = optedOutUids.length;
    final activeAssignments = assignments
        .where((assignment) => !optedOutUids.contains(assignment.uid))
        .toList(growable: false);
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
          .eventSuccessEventSuccessHostOverridesTextSmallStarterGroups,
      subtitle: staleAssignmentCount > 0
          ? context
                .l10n
                .eventSuccessEventSuccessHostOverridesTextRegenerateToRemoveOpted
          : optedOutCount > 0
          ? context
                .l10n
                .eventSuccessEventSuccessHostOverridesTextGenerateAttendeePodCards
          : context
                .l10n
                .eventSuccessEventSuccessHostOverridesTextGenerateAttendeePodCards4cbcdf,
      trailing: CatchBadge(
        label: context.l10n
            .eventSuccessEventSuccessHostOverridesLabelLengthAssigned(
              length: activeAssignments.length,
            ),
        tone: activeAssignments.isEmpty
            ? CatchBadgeTone.warning
            : CatchBadgeTone.success,
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
            EventSuccessPodSummaryRow(assignments: activeAssignments),
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
                    .eventSuccessEventSuccessHostOverridesCatchbuttonEventsuccessgeneratemicropodsbutton,
              ),
              label: context
                  .l10n
                  .eventSuccessEventSuccessHostOverridesLabelGenerateMicroPods,
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
                          .eventSuccessEventSuccessHostOverridesCatchbuttonEventsuccessgeneratemicropodsbutton,
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
                        .eventSuccessEventSuccessHostOverridesLabelEditGroups,
                    leading: Icon(CatchIcons.edit),
                    onPressed: () => _showGroupOverrideSheet(
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
        ],
      ),
    );
  }
}

Future<void> _showGroupOverrideSheet({
  required BuildContext context,
  required Event event,
  required List<EventSuccessAssignment> assignments,
  required List<PublicProfile> participantProfiles,
  Future<void> Function(List<EventSuccessGroupOverrideRound> rounds)?
  onOverride,
}) {
  return showCatchBottomSheet<void>(
    context: context,
    builder: (context) => EventSuccessGroupOverrideSheet(
      event: event,
      assignments: assignments,
      participantProfiles: participantProfiles,
      onOverride: onOverride,
    ),
  );
}
