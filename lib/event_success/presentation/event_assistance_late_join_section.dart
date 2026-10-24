import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_late_join_destination.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_late_join_draft.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_late_join_rules.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_late_join_setup.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_copy.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_rules_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

enum EventAssistanceLateJoinPhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
  readOnly,
}

/// The configuration form is shared; its caller supplies live or practice authority.
class EventAssistanceLateJoinSection extends StatefulWidget {
  const EventAssistanceLateJoinSection({
    super.key,
    required this.reviewIdentity,
    required this.initialDraft,
    required this.groupId,
    required this.groupLabel,
    required this.setup,
    required this.serverTime,
    required this.status,
    required this.origin,
    required this.phase,
    required this.onSave,
    required this.onRetry,
    required this.onReload,
    required this.onDone,
    this.runtimeTiming = LateJoinRuntimeTiming.notReviewed,
    this.suggestedRules,
    this.submittedDraft,
    this.error,
  });
  final Object reviewIdentity;
  final LateJoinSettingDraft initialDraft;
  final String groupId, groupLabel;
  final LateJoinSettingSetup? setup;
  final int serverTime;
  final LateJoinRuntimeTiming runtimeTiming;
  final AssistanceSettingStatus status;
  final AssistanceSettingOrigin origin;
  final EventAssistanceLateJoinPhase phase;
  final AssistanceLateJoinRules? suggestedRules;
  final LateJoinSettingDraft? submittedDraft;
  final Object? error;
  final ValueChanged<LateJoinSettingDraft> onSave;
  final VoidCallback onRetry, onReload, onDone;
  @override
  State<EventAssistanceLateJoinSection> createState() =>
      _EventAssistanceLateJoinSectionState();
}

class _EventAssistanceLateJoinSectionState
    extends State<EventAssistanceLateJoinSection> {
  late LateJoinSettingDraft _draft = widget.initialDraft;
  bool _customizing = false;
  bool get _editable => widget.phase == EventAssistanceLateJoinPhase.ready;
  @override
  void didUpdateWidget(covariant EventAssistanceLateJoinSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.reviewIdentity, widget.reviewIdentity) &&
        _editable) {
      _draft = widget.initialDraft;
      _customizing = false;
    }
  }

  void _change(LateJoinSettingDraft value) {
    if (_editable) setState(() => _draft = value);
  }

  Future<void> _chooseCutoff() async {
    final setup = widget.setup;
    final rules = _draft.rules;
    if (!_editable ||
        setup == null ||
        rules == null ||
        setup.eventEnd <= widget.serverTime) {
      return;
    }
    final identity = widget.reviewIdentity;
    final first = DateTime.fromMillisecondsSinceEpoch(widget.serverTime);
    final last = DateTime.fromMillisecondsSinceEpoch(setup.eventEnd);
    final raw = rules.cutoff is LateJoinAtTime
        ? (rules.cutoff as LateJoinAtTime).at
        : setup.eventEnd;
    var chosen = DateTime.fromMillisecondsSinceEpoch(
      raw.clamp(widget.serverTime, setup.eventEnd).toInt(),
    );
    if (!DateUtils.isSameDay(first, last)) {
      final day = await showCatchDatePicker(
        context: context,
        initialDate: chosen,
        firstDate: first,
        lastDate: last,
        copy: catchDatePickerCopy(context.l10n),
      );
      if (!mounted ||
          !_editable ||
          !identical(identity, widget.reviewIdentity) ||
          day == null) {
        return;
      }
      chosen = DateTime(
        day.year,
        day.month,
        day.day,
        chosen.hour,
        chosen.minute,
      );
    }
    final time = await showCatchTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(chosen),
      copy: catchTimePickerCopy(context.l10n),
    );
    if (!mounted ||
        !_editable ||
        !identical(identity, widget.reviewIdentity) ||
        time == null) {
      return;
    }
    final at = DateTime(
      chosen.year,
      chosen.month,
      chosen.day,
      time.hour,
      time.minute,
    ).millisecondsSinceEpoch;
    _change(_draft.withRules(rules.copyWith(cutoff: LateJoinAtTime(at))));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final busy = widget.phase == EventAssistanceLateJoinPhase.submitting;
    final saved = widget.phase == EventAssistanceLateJoinPhase.saved;
    final value = saved ? widget.initialDraft : widget.submittedDraft ?? _draft;
    final rules = value.rules;
    final origin = lateJoinOriginLabel(l10n, widget.origin, widget.groupId);
    final issue = value.issueForSetup(
      groupId: widget.groupId,
      serverTime: widget.serverTime,
      setup: widget.setup,
      runtimeTiming: widget.runtimeTiming,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          widget.groupLabel,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        gapH8,
        CatchText(
          lateJoinStatusLabel(l10n, widget.status),
          variant: CatchTextVariant.supporting,
        ),
        if (origin != null)
          CatchText(origin, variant: CatchTextVariant.supporting),
        gapH12,
        CatchText(
          l10n.eventAssistanceLateJoinBody,
          variant: CatchTextVariant.supporting,
        ),
        if (saved) ...[
          gapH12,
          CatchText(
            l10n.eventAssistanceLateJoinSavedBody,
            variant: CatchTextVariant.supporting,
          ),
        ],
        CatchSection.fieldRows(
          first: true,
          children: [
            CatchField<LateJoinDraftMode>.select(
              copy: catchFieldCopy(l10n),
              key: const ValueKey('lateJoin.mode'),
              title: l10n.eventAssistanceLateJoinMode,
              contractExemption:
                  'Maps the host choice into the closed inherit, disabled, or configured preference and template authority unions.',
              values: [
                for (final mode in LateJoinDraftMode.values)
                  if (mode != LateJoinDraftMode.inherit ||
                      widget.groupId != 'event:whole')
                    mode,
              ],
              value: value.mode,
              itemLabelBuilder: (v) => lateJoinModeLabel(l10n, v),
              helperText: lateJoinModeBody(l10n, value.mode),
              onChanged: _editable
                  ? (v) {
                      if (v != null) _change(_draft.withMode(v));
                    }
                  : null,
              states: {if (!_editable) WidgetState.disabled},
            ),
          ],
        ),
        if (rules != null && value.mode != LateJoinDraftMode.inherit) ...[
          gapH12,
          CatchText(
            rules.destination is LateJoinConfirmedProgress
                ? l10n.eventAssistanceLateJoinConfirmed
                : l10n.eventAssistanceLateJoinDestinationSummary(
                    places: lateJoinDestinationLabel(
                      l10n,
                      rules.destination,
                      widget.setup,
                    ),
                  ),
            variant: CatchTextVariant.supporting,
          ),
          CatchText(switch (rules.cutoff) {
            LateJoinEventEnd() => l10n.eventAssistanceLateJoinEventEnd,
            LateJoinAtTime(:final at) =>
              l10n.eventAssistanceLateJoinCutoffSummary(
                time: lateJoinTimeLabel(context, at),
              ),
          }, variant: CatchTextVariant.supporting),
          CatchText(
            l10n.eventAssistanceLateJoinLimitSummary(
              count: rules.maxMessagesPerEpisode,
            ),
            variant: CatchTextVariant.supporting,
          ),
          CatchText(
            l10n.eventAssistanceLateJoinGapSummary(
              minutes: rules.minimumMinutesBetweenMessages,
            ),
            variant: CatchTextVariant.supporting,
          ),
          if (_editable && widget.setup != null) ...[
            CatchButton(
              key: const ValueKey('lateJoin.customize'),
              label: _customizing
                  ? l10n.eventAssistanceLateJoinHideRules
                  : l10n.eventAssistanceLateJoinCustomize,
              variant: CatchButtonVariant.ghost,
              onPressed: () => setState(() => _customizing = !_customizing),
            ),
            if (_customizing)
              CatchSection.fieldRows(
                child: EventAssistanceLateJoinRulesSection(
                  rules: rules,
                  setup: widget.setup!,
                  serverTime: widget.serverTime,
                  enabled: _editable,
                  onChanged: (v) => _change(_draft.withRules(v)),
                  onChooseCutoff: _chooseCutoff,
                ),
              ),
            if (_customizing && widget.suggestedRules != null)
              CatchButton(
                label: l10n.eventAssistanceLateJoinRestore,
                variant: CatchButtonVariant.ghost,
                onPressed: () =>
                    _change(_draft.withRules(widget.suggestedRules!)),
              ),
          ],
        ],
        if (issue != null && _editable) ...[
          gapH12,
          CatchText(
            lateJoinIssueLabel(l10n, issue),
            variant: CatchTextVariant.supporting,
          ),
        ],
        gapH12,
        CatchText(
          l10n.eventAssistanceLateJoinDeliveryRequired,
          variant: CatchTextVariant.supporting,
        ),
        if (widget.error != null) ...[
          gapH12,
          CatchLocalizedErrorBanner(widget.error!),
        ],
        gapH16,
        if (_editable || busy)
          CatchButton(
            key: const ValueKey('lateJoin.save'),
            label: l10n.eventAssistanceLateJoinSave,
            status: busy ? CatchButtonStatus.loading : CatchButtonStatus.idle,
            onPressed: _editable && issue == null
                ? () => widget.onSave(_draft)
                : null,
          ),
        if (widget.phase == EventAssistanceLateJoinPhase.retryRequired) ...[
          CatchText(
            l10n.eventAssistanceLateJoinRetryBody,
            variant: CatchTextVariant.supporting,
          ),
          gapH12,
          CatchButton(
            label: l10n.eventAssistanceLateJoinRetry,
            onPressed: widget.onRetry,
          ),
        ],
        if (widget.phase == EventAssistanceLateJoinPhase.refreshRequired) ...[
          CatchText(
            l10n.eventAssistanceLateJoinRefreshBody,
            variant: CatchTextVariant.supporting,
          ),
          gapH12,
          CatchButton(
            label: l10n.eventAssistanceLateJoinReload,
            onPressed: widget.onReload,
          ),
        ],
        gapH12,
        CatchButton(
          label: l10n.eventAssistanceLateJoinDone,
          variant: CatchButtonVariant.secondary,
          onPressed: busy ? null : widget.onDone,
        ),
      ],
    );
  }
}
