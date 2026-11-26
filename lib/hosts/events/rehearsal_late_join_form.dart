import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_rules.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_delivery_outcome.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_runtime_draft.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_runtime_preview_section.dart'
    show rehearsalOutcomeLabel;
import 'package:catch_dating_app/event_success/event_success.dart'
    show runtimeRouteLabel;
import 'package:catch_dating_app/hosts/events/rehearsal_late_join_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One made-up late joiner, in reading order: where their automatic
/// updates stand and the latest directions, then the choices (the pace
/// group they follow, where they join, places to choose later, how Catch
/// helps, the late arrival rule and channels, the response deadline and
/// the practice delivery outcomes), what they will be told, and the
/// commands: Publish directions, Save update settings, Pause or Resume.
///
/// It reads only [view] and writes nothing; every change and command is a
/// callback the late joiner sheet runs through the assistance editor.
class HostRehearsalLateJoinForm extends StatelessWidget {
  const HostRehearsalLateJoinForm({
    super.key,
    required this.view,
    required this.onGroup,
    required this.onPoint,
    required this.onLater,
    required this.onLaterLabel,
    required this.onMode,
    required this.onRules,
    required this.onChannels,
    required this.onDeadline,
    required this.onClearDeadline,
    required this.onOutcomes,
    required this.onRetry,
    required this.onReload,
    this.onPublish,
    this.onSave,
    this.onPause,
    this.onResume,
  });

  final HostRehearsalLateJoinView view;
  final ValueChanged<String> onGroup;
  final ValueChanged<String> onPoint;

  /// Adds or removes one place they can choose later.
  final ValueChanged<String> onLater;

  /// Sets the optional button label for one later place, by alternative id.
  final void Function(String pointId, String label) onLaterLabel;
  final ValueChanged<HostRehearsalLateJoinMode> onMode;

  /// Opens the group's late arrival rule.
  final VoidCallback onRules;

  /// Opens the rehearsal-wide practice channels and retries.
  final VoidCallback onChannels;
  final VoidCallback onDeadline;
  final VoidCallback onClearDeadline;
  final ValueChanged<List<RehearsalDeliveryOutcome>> onOutcomes;
  final VoidCallback onRetry;
  final VoidCallback onReload;

  /// Null when these choices cannot publish directions now.
  final VoidCallback? onPublish;

  /// Null when these choices cannot save automatic updates.
  final VoidCallback? onSave;
  final VoidCallback? onPause;
  final VoidCallback? onResume;

  /// Choices and commands are open: nothing is on its way or unresolved.
  bool get _editing =>
      view.phase == HostRehearsalLateJoinPhase.editing ||
      view.phase == HostRehearsalLateJoinPhase.applied;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final points = view.points;
    final choices = {
      for (final o in rehearsalOutcomeChoices) rehearsalOutcomeKey(o): o,
    };
    return CatchStack(
      gap: CatchStackGap.g24,
      children: [
        CatchSection(
          dividers: CatchSectionPlacement.none,
          children: [
            CatchField.read(
              key: const ValueKey<String>('host-rehearsal-late-join-status'),
              copy: copy,
              title: l10n.eventAssistanceRuntimeTitle,
              body: [
                hostRehearsalLateJoinStatusLabel(l10n, view.status),
                if (view.remainingOutcomes case final count?)
                  l10n.hostRehearsalLateJoinOutcomesLeft(count: count),
              ].join(' · '),
              bodyMaxLines: 4,
            ),
            if (view.latestText case final text?)
              CatchField.read(
                key: const ValueKey<String>('host-rehearsal-late-join-latest'),
                copy: copy,
                title: l10n.hostRehearsalLateJoinLatest,
                body: [
                  text,
                  if (view.latestReply case final reply?)
                    l10n.hostRehearsalLateJoinReplied(choice: reply),
                ].join('\n'),
                bodyMaxLines: 8,
              ),
          ],
        ),
        if (view.groups.length > 1)
          CatchRail(
            wrap: CatchRailMode.always,
            label: l10n.eventAssistanceMovementGroup,
            children: [
              for (final group in view.groups)
                CatchChip.choice(
                  key: ValueKey<String>(
                    'host-rehearsal-late-join-group-${group.groupId}',
                  ),
                  label: group.label,
                  selected: group.groupId == view.groupId,
                  mode: CatchChipMode.single,
                  onPressed: _editing ? () => onGroup(group.groupId) : null,
                ),
            ],
          ),
        if (points == null)
          const CatchLoadingIndicator()
        else ...[
          CatchStack(
            gap: CatchStackGap.g8,
            children: [
              CatchText(
                l10n.eventAssistanceLateJoinWhere,
                variant: CatchTextVariant.sectionTitle,
              ),
              CatchRail(
                wrap: CatchRailMode.always,
                label: l10n.eventAssistanceLateJoinWhere,
                children: [
                  for (final point in points)
                    CatchChip.choice(
                      key: ValueKey<String>(
                        'host-rehearsal-late-join-point-${point.alternativeId}',
                      ),
                      label: point.label,
                      selected: point.alternativeId == view.pointId,
                      mode: CatchChipMode.single,
                      onPressed: _editing
                          ? () => onPoint(point.alternativeId)
                          : null,
                    ),
                ],
              ),
            ],
          ),
          if (points.length > 1)
            CatchStack(
              gap: CatchStackGap.g8,
              children: [
                CatchText(
                  l10n.hostRehearsalLateJoinLaterChoices,
                  variant: CatchTextVariant.sectionTitle,
                ),
                CatchRail(
                  wrap: CatchRailMode.always,
                  label: l10n.hostRehearsalLateJoinLaterChoices,
                  children: [
                    for (final point in points)
                      CatchChip.choice(
                        key: ValueKey<String>(
                          'host-rehearsal-late-join-later-${point.alternativeId}',
                        ),
                        label: point.label,
                        selected: view.laterPointIds.contains(
                          point.alternativeId,
                        ),
                        mode: CatchChipMode.multiple,
                        onPressed: _editing
                            ? () => onLater(point.alternativeId)
                            : null,
                      ),
                  ],
                ),
                for (final point in points)
                  if (view.laterPointIds.contains(point.alternativeId))
                    CatchField.input(
                      key: ValueKey<String>(
                        'host-rehearsal-late-join-label-${point.alternativeId}',
                      ),
                      copy: copy,
                      title: l10n.hostRehearsalLateJoinChoiceLabel(
                        place: point.label,
                      ),
                      contractExemption:
                          'Optional button label for one later joining choice; the practice plan bounds it at 80 characters.',
                      placeholder: point.label,
                      initialValue: view.laterLabels[point.alternativeId],
                      maxLength: 80,
                      inputMode: _editing
                          ? CatchTextInputMode.editable
                          : CatchTextInputMode.inactive,
                      onChanged: (value) =>
                          onLaterLabel(point.alternativeId, value),
                    ),
              ],
            ),
        ],
        CatchStack(
          gap: CatchStackGap.g8,
          children: [
            CatchText(
              l10n.eventAssistanceLateJoinMode,
              variant: CatchTextVariant.sectionTitle,
            ),
            CatchRail(
              wrap: CatchRailMode.always,
              label: l10n.eventAssistanceLateJoinMode,
              children: [
                for (final mode in HostRehearsalLateJoinMode.values)
                  CatchChip.choice(
                    key: ValueKey<String>(
                      'host-rehearsal-late-join-mode-${mode.name}',
                    ),
                    label: _modeLabel(l10n, mode),
                    selected: mode == view.mode,
                    mode: CatchChipMode.single,
                    onPressed: _editing ? () => onMode(mode) : null,
                  ),
              ],
            ),
          ],
        ),
        CatchSection(
          children: [
            CatchField.nav(
              key: const ValueKey<String>('host-rehearsal-late-join-rules'),
              copy: copy,
              title: l10n.eventAssistanceLateJoinTitle,
              body: _rulesSummary(l10n, view.rules),
              bodyMaxLines: 4,
              onTap: _editing ? onRules : null,
            ),
            CatchField.nav(
              key: const ValueKey<String>('host-rehearsal-late-join-channels'),
              copy: copy,
              title: l10n.eventAssistanceRuntimeChannels,
              body: view.routes
                  .map((r) => runtimeRouteLabel(l10n, r))
                  .join(', '),
              onTap: _editing ? onChannels : null,
            ),
            CatchField.action(
              key: const ValueKey<String>('host-rehearsal-late-join-deadline'),
              copy: copy,
              title: l10n.eventAssistanceRuntimeDeadline,
              valueText: view.responseDeadline == null
                  ? l10n.eventAssistanceRuntimeNoDeadline
                  : AppTimeFormatters.time(
                      DateTime.fromMillisecondsSinceEpoch(
                        view.responseDeadline!,
                      ),
                    ),
              errorText: view.deadlineRequired && view.responseDeadline == null
                  ? l10n.eventAssistanceLateJoinUnansweredBody
                  : null,
              onTap: _editing ? onDeadline : null,
            ),
          ],
        ),
        if (view.responseDeadline != null && _editing)
          CatchButton(
            key: const ValueKey<String>(
              'host-rehearsal-late-join-clear-deadline',
            ),
            label: l10n.eventAssistanceRuntimeNoDeadline,
            variant: CatchButtonVariant.quiet,
            size: CatchButtonSize.sm,
            onPressed: onClearDeadline,
          ),
        CatchStack(
          gap: CatchStackGap.g8,
          children: [
            CatchText(
              l10n.hostEventRehearsalUpdatesScript,
              variant: CatchTextVariant.sectionTitle,
            ),
            CatchText(
              l10n.hostEventRehearsalUpdatesScriptBody,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
            CatchSection(
              children: [
                for (final (index, outcome) in view.outcomes.indexed)
                  CatchField<String>.select(
                    key: ValueKey<String>(
                      'host-rehearsal-late-join-outcome-$index',
                    ),
                    copy: copy,
                    title: l10n.hostEventRehearsalUpdatesAttempt(
                      number: index + 1,
                    ),
                    contractExemption:
                        'Closed synthetic receipt union, bounded to six entries.',
                    values: choices.keys.toList(),
                    value: rehearsalOutcomeKey(outcome),
                    itemLabelBuilder: (key) =>
                        rehearsalOutcomeLabel(l10n, choices[key]!),
                    onChanged: _editing
                        ? (key) {
                            if (key == null) return;
                            onOutcomes(
                              [...view.outcomes]..[index] = choices[key]!,
                            );
                          }
                        : null,
                  ),
              ],
            ),
            if (_editing)
              CatchStack(
                direction: CatchStackDirection.row,
                wrap: true,
                gap: CatchStackGap.g8,
                children: [
                  if (view.outcomes.length < 6)
                    CatchButton(
                      key: const ValueKey<String>(
                        'host-rehearsal-late-join-add-outcome',
                      ),
                      label: l10n.hostEventRehearsalUpdatesAddOutcome,
                      variant: CatchButtonVariant.quiet,
                      size: CatchButtonSize.sm,
                      onPressed: () => onOutcomes([
                        ...view.outcomes,
                        rehearsalOutcomeChoices.first,
                      ]),
                    ),
                  if (view.outcomes.length > 1)
                    CatchButton(
                      key: const ValueKey<String>(
                        'host-rehearsal-late-join-remove-outcome',
                      ),
                      label: l10n.hostEventRehearsalUpdatesRemoveOutcome,
                      variant: CatchButtonVariant.quiet,
                      size: CatchButtonSize.sm,
                      onPressed: () => onOutcomes(
                        view.outcomes.sublist(0, view.outcomes.length - 1),
                      ),
                    ),
                ],
              ),
          ],
        ),
        if (view.previewKind case final kind?)
          CatchNotice.inline(
            key: const ValueKey<String>('host-rehearsal-late-join-preview'),
            title: l10n.hostRehearsalLateJoinPreview,
            tone: kind == HostRehearsalLateJoinPreviewKind.confirmed
                ? CatchNoticeTone.status
                : CatchNoticeTone.warning,
            icon: CatchIcons.info,
            body: switch (kind) {
              HostRehearsalLateJoinPreviewKind.awaitingDeparture =>
                l10n.hostRehearsalLateJoinAwaitingDeparture,
              HostRehearsalLateJoinPreviewKind.outsidePolicy =>
                l10n.hostRehearsalLateJoinOutsidePolicy(
                  place: view.previewText ?? '',
                ),
              HostRehearsalLateJoinPreviewKind.confirmed =>
                view.previewText ?? '',
              HostRehearsalLateJoinPreviewKind.entryClosed =>
                '${view.previewText ?? ''}\n${l10n.hostRehearsalLateJoinEntryClosed}',
            },
          ),
        if (view.error case final error?) CatchLocalizedErrorBanner(error),
        ...switch (view.phase) {
          HostRehearsalLateJoinPhase.retry => [
            CatchNotice.inline(
              tone: CatchNoticeTone.warning,
              body: l10n.eventAssistanceRuntimeRetryBody,
              action: CatchNoticeAction(
                label: l10n.eventAssistanceLateJoinRetry,
                onPressed: onRetry,
              ),
            ),
          ],
          HostRehearsalLateJoinPhase.refresh => [
            CatchNotice.inline(
              tone: CatchNoticeTone.warning,
              body: l10n.eventAssistanceLateJoinRefreshBody,
              action: CatchNoticeAction(
                label: l10n.eventAssistanceLateJoinReload,
                onPressed: onReload,
              ),
            ),
          ],
          HostRehearsalLateJoinPhase.applied => [
            CatchNotice.inline(
              tone: CatchNoticeTone.success,
              body: l10n.hostEventRehearsalUpdatesSaved,
            ),
          ],
          HostRehearsalLateJoinPhase.editing ||
          HostRehearsalLateJoinPhase.submitting => const <Widget>[],
        },
        CatchStack(
          gap: CatchStackGap.g8,
          children: [
            if (view.mode != HostRehearsalLateJoinMode.automatic && _editing)
              CatchText(
                l10n.hostRehearsalLateJoinPublishNeedsAutomatic,
                variant: CatchTextVariant.bodySmall,
                tone: CatchTextTone.secondary,
              ),
            CatchButton(
              key: const ValueKey<String>('host-rehearsal-late-join-publish'),
              label: l10n.hostRehearsalLateJoinPublish,
              fullWidth: true,
              status: view.phase == HostRehearsalLateJoinPhase.submitting
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              onPressed: _editing ? onPublish : null,
            ),
            CatchButton(
              key: const ValueKey<String>('host-rehearsal-late-join-save'),
              label: l10n.eventAssistanceRuntimeSave,
              variant: CatchButtonVariant.secondary,
              fullWidth: true,
              onPressed: _editing ? onSave : null,
            ),
            if (view.status == HostRehearsalLateJoinStatus.automatic)
              CatchButton(
                key: const ValueKey<String>('host-rehearsal-late-join-pause'),
                label: l10n.eventAssistanceRuntimePause,
                variant: CatchButtonVariant.quiet,
                fullWidth: true,
                onPressed: _editing ? onPause : null,
              ),
            if (view.status == HostRehearsalLateJoinStatus.paused)
              CatchButton(
                key: const ValueKey<String>('host-rehearsal-late-join-resume'),
                label: l10n.hostRehearsalLateJoinResume,
                variant: CatchButtonVariant.quiet,
                fullWidth: true,
                onPressed: _editing ? onResume : null,
              ),
          ],
        ),
      ],
    );
  }
}

/// The status line for one made-up guest's automatic updates.
String hostRehearsalLateJoinStatusLabel(
  AppLocalizations l10n,
  HostRehearsalLateJoinStatus status,
) => switch (status) {
  HostRehearsalLateJoinStatus.none => l10n.eventAssistanceLateJoinUnconfigured,
  HostRehearsalLateJoinStatus.automatic => l10n.hostRehearsalLateJoinAutomatic,
  HostRehearsalLateJoinStatus.paused => l10n.eventAssistanceRuntimePaused,
};

String _modeLabel(AppLocalizations l10n, HostRehearsalLateJoinMode mode) =>
    switch (mode) {
      HostRehearsalLateJoinMode.automatic =>
        l10n.eventAssistanceLateJoinAutomatic,
      HostRehearsalLateJoinMode.prepare => l10n.eventAssistanceLateJoinPrepare,
      HostRehearsalLateJoinMode.observe => l10n.eventAssistanceLateJoinObserve,
      HostRehearsalLateJoinMode.off => l10n.eventAssistanceLateJoinOff,
    };

String? _rulesSummary(AppLocalizations l10n, AssistanceLateJoinRules? rules) {
  if (rules == null) return l10n.eventAssistanceLateJoinMissingRules;
  return [
    l10n.eventAssistanceLateJoinLimitSummary(
      count: rules.maxMessagesPerEpisode,
    ),
    l10n.eventAssistanceLateJoinGapSummary(
      minutes: rules.minimumMinutesBetweenMessages,
    ),
    switch (rules.unanswered) {
      LateJoinUnansweredRule.keepUnknownUntilCutoff =>
        l10n.eventAssistanceLateJoinKeepUnknown,
      LateJoinUnansweredRule.hostReviewAtDeadline =>
        l10n.eventAssistanceLateJoinHostReview,
    },
  ].join(' · ');
}
