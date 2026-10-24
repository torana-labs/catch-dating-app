import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_assistance_automation.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_runtime_configuration.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_runtime_draft.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_settings_change.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_settings_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_runtime_preview_section.dart';
import 'package:catch_dating_app/event_success/event_success.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// A compact simulation form; advanced timing and receipt scripts open on demand.
class EventRehearsalRuntimeSection extends StatefulWidget {
  const EventRehearsalRuntimeSection({
    super.key,
    required this.reviewIdentity,
    required this.snapshot,
    required this.phase,
    required this.onConfigure,
    required this.onPause,
    required this.onRetry,
    required this.onReload,
    required this.onDone,
    this.submitted,
    this.error,
  });
  final Object reviewIdentity;
  final EventRehearsalBootstrap snapshot;
  final RehearsalSettingsPhase phase;
  final RehearsalSettingsDecision? submitted;
  final Object? error;
  final ValueChanged<RehearsalRuntimeConfiguration> onConfigure;
  final VoidCallback onPause, onRetry, onReload, onDone;
  @override
  State<EventRehearsalRuntimeSection> createState() =>
      _EventRehearsalRuntimeSectionState();
}

class _EventRehearsalRuntimeSectionState
    extends State<EventRehearsalRuntimeSection> {
  late RehearsalRuntimeDraft _draft = RehearsalRuntimeDraft.fromConfiguration(
    widget.snapshot.settingsReview!.runtime?.configuration,
  );
  bool _advanced = false;
  bool get _editable =>
      widget.phase == RehearsalSettingsPhase.ready &&
      widget.snapshot.settingsReview!.canConfigure;
  @override
  void didUpdateWidget(covariant EventRehearsalRuntimeSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.reviewIdentity, widget.reviewIdentity) &&
        _editable) {
      _draft = RehearsalRuntimeDraft.fromConfiguration(
        widget.snapshot.settingsReview!.runtime?.configuration,
      );
      _advanced = false;
    }
  }

  void _change(RehearsalRuntimeDraft value) {
    if (_editable) setState(() => _draft = value);
  }

  Future<void> _chooseTime(bool _) async {
    if (!_editable) return;
    final identity = widget.reviewIdentity;
    final before = _draft;
    final view = widget.snapshot.settingsReview!;
    final at = await chooseRuntimeTime(
      context,
      serverTime: view.serverTime,
      eventEnd: view.eventEnd,
      initial: _draft.responseDeadline ?? view.eventEnd,
    );
    if (!mounted ||
        !_editable ||
        !identical(identity, widget.reviewIdentity) ||
        !identical(before, _draft) ||
        at == null) {
      return;
    }
    _change(_draft.withDeadline(at));
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final view = widget.snapshot.settingsReview!;
    final busy = widget.phase == RehearsalSettingsPhase.submitting;
    final saved = widget.phase == RehearsalSettingsPhase.saved;
    final value = saved
        ? RehearsalRuntimeDraft.fromConfiguration(view.runtime?.configuration)
        : switch (widget.submitted) {
            RehearsalConfigureUpdates(:final configuration) =>
              RehearsalRuntimeDraft.fromConfiguration(configuration),
            _ => _draft,
          };
    final valid = value.canConfigure(widget.snapshot);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          widget.phase == RehearsalSettingsPhase.retryRequired
              ? l.eventAssistanceRuntimePending
              : busy
              ? l.eventAssistanceRuntimeSaving
              : !view.canConfigure
              ? l.eventAssistanceRuntimeClosed
              : view.runtime == null
              ? l.eventAssistanceRuntimeUnconfigured
              : view.runtime!.status == RehearsalAutomationStatus.paused
              ? l.eventAssistanceRuntimePaused
              : l.eventAssistanceRuntimeConfigured,
          style: Theme.of(context).textTheme.titleLarge,
        ),
        gapH12,
        CatchText(
          l.hostEventRehearsalUpdatesBody,
          variant: CatchTextVariant.supporting,
        ),
        if (saved) ...[
          gapH12,
          CatchText(
            l.hostEventRehearsalUpdatesSaved,
            variant: CatchTextVariant.supporting,
          ),
        ],
        gapH16,
        EventRehearsalRuntimePreviewSection(
          draft: value,
          enabled: _editable,
          consumedPrefix: RehearsalRuntimeDraft.consumedPrefix(widget.snapshot),
          onChanged: _change,
          showOutcomes: false,
        ),
        gapH12,
        CatchText(
          '${l.hostEventRehearsalUpdatesScript}: ${value.outcomes.map((o) => rehearsalOutcomeLabel(l, o)).join(' → ')}',
          variant: CatchTextVariant.supporting,
        ),
        if (value.laterChoices?.isNotEmpty ?? false) ...[
          gapH8,
          CatchText(
            l.eventAssistanceRuntimeRetainedChoices,
            variant: CatchTextVariant.supporting,
          ),
        ],
        CatchButton(
          key: const ValueKey('practice.customize'),
          label: _advanced
              ? l.eventAssistanceRuntimeHide
              : l.eventAssistanceRuntimeCustomize,
          variant: CatchButtonVariant.ghost,
          onPressed: () => setState(() => _advanced = !_advanced),
        ),
        if (_advanced || !_editable) ...[
          EventAssistanceRuntimeLimitsSection.values(
            expiresAt: view.eventEnd,
            responseDeadline: value.responseDeadline,
            deliveryPolicy: value.deliveryPolicy,
            eventEnd: view.eventEnd,
            enabled: _editable,
            onDeliveryChanged: (v) => _change(_draft.copy(deliveryPolicy: v)),
            onClearDeadline: () => _change(_draft.withDeadline(null)),
            onChooseTime: _chooseTime,
          ),
          gapH12,
          EventRehearsalRuntimePreviewSection(
            draft: value,
            enabled: _editable,
            consumedPrefix: RehearsalRuntimeDraft.consumedPrefix(
              widget.snapshot,
            ),
            onChanged: _change,
            showOutcomes: true,
          ),
        ],
        if (!valid && _editable) ...[
          gapH12,
          CatchText(
            l.hostEventRehearsalUpdatesIssue,
            variant: CatchTextVariant.supporting,
          ),
        ],
        if (widget.error != null) ...[
          gapH12,
          CatchLocalizedErrorBanner(widget.error!),
        ],
        if (widget.phase == RehearsalSettingsPhase.retryRequired) ...[
          gapH12,
          CatchText(
            l.eventAssistanceRuntimeRetryBody,
            variant: CatchTextVariant.supporting,
          ),
          CatchButton(
            key: const ValueKey('practice.retry'),
            label: l.eventAssistanceLateJoinRetry,
            onPressed: widget.onRetry,
          ),
        ],
        if (widget.phase == RehearsalSettingsPhase.refreshRequired) ...[
          gapH12,
          CatchText(
            l.eventAssistanceRuntimeReloadBody,
            variant: CatchTextVariant.supporting,
          ),
          CatchButton(
            label: l.eventAssistanceLateJoinReload,
            onPressed: widget.onReload,
          ),
        ],
        if (_editable || busy)
          CatchButton(
            key: const ValueKey('practice.save'),
            label: l.eventAssistanceRuntimeSave,
            status: busy ? CatchButtonStatus.loading : CatchButtonStatus.idle,
            onPressed: _editable && valid
                ? () => widget.onConfigure(_draft.configuration())
                : null,
          ),
        if (_editable &&
            view.runtime?.status == RehearsalAutomationStatus.enabled)
          CatchButton(
            key: const ValueKey('practice.pause'),
            label: l.eventAssistanceRuntimePause,
            variant: CatchButtonVariant.ghost,
            onPressed: widget.onPause,
          ),
        gapH12,
        CatchButton(
          key: const ValueKey('practice.runtime.done'),
          label: l.eventAssistanceLateJoinDone,
          variant: CatchButtonVariant.secondary,
          onPressed: busy ? null : widget.onDone,
        ),
      ],
    );
  }
}
