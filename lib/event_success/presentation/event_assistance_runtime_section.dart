import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_runtime_draft.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_runtime_sender.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_runtime_setting.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_copy.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_channels_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_copy.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_limits_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

enum EventAssistanceRuntimePhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

/// Event-scoped configuration with progressive limits and a frozen pending decision.
class EventAssistanceRuntimeSection extends StatefulWidget {
  const EventAssistanceRuntimeSection({
    super.key,
    required this.reviewIdentity,
    required this.view,
    required this.choices,
    required this.moreRoutes,
    required this.phase,
    required this.canChooseSenders,
    required this.onConfigure,
    required this.onPause,
    required this.onMore,
    required this.onRetry,
    required this.onReload,
    required this.onDone,
    this.loadingRoute,
    this.submitted,
    this.error,
  });
  final Object reviewIdentity;
  final AssistanceRuntimeView view;
  final List<AssistanceRuntimeSenderChoice> choices;
  final Set<AssistanceMessageRoute> moreRoutes;
  final AssistanceMessageRoute? loadingRoute;
  final EventAssistanceRuntimePhase phase;
  final bool canChooseSenders;
  final AssistanceRuntimeCommand? submitted;
  final Object? error;
  final ValueChanged<AssistanceRuntimeDraft> onConfigure;
  final VoidCallback onPause, onRetry, onReload, onDone;
  final ValueChanged<AssistanceMessageRoute> onMore;
  @override
  State<EventAssistanceRuntimeSection> createState() =>
      _EventAssistanceRuntimeSectionState();
}

class _EventAssistanceRuntimeSectionState
    extends State<EventAssistanceRuntimeSection> {
  late AssistanceRuntimeDraft _draft = AssistanceRuntimeDraft.fromView(
    widget.view,
  );
  bool _customizing = false;
  bool get _editable => widget.phase == EventAssistanceRuntimePhase.ready;
  bool get _canConfigure =>
      _editable && widget.canChooseSenders && widget.view.canConfigure;
  @override
  void didUpdateWidget(covariant EventAssistanceRuntimeSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.reviewIdentity, widget.reviewIdentity) &&
        _editable) {
      _draft = AssistanceRuntimeDraft.fromView(widget.view);
      _customizing = false;
    }
  }

  void _change(AssistanceRuntimeDraft draft) {
    if (_canConfigure) setState(() => _draft = draft);
  }

  Future<void> _chooseTime(bool deadline) async {
    if (!_canConfigure) return;
    final identity = widget.reviewIdentity;
    final before = _draft;
    final at = await chooseRuntimeTime(
      context,
      serverTime: widget.view.serverTime,
      eventEnd: widget.view.eventEnd,
      initial: deadline
          ? _draft.responseDeadline ?? _draft.expiresAt
          : _draft.expiresAt,
    );
    if (!mounted ||
        !_canConfigure ||
        !identical(identity, widget.reviewIdentity) ||
        !identical(before, _draft) ||
        at == null) {
      return;
    }
    _change(deadline ? _draft.withDeadline(at) : _draft.withExpiry(at));
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final busy = widget.phase == EventAssistanceRuntimePhase.submitting;
    final saved = widget.phase == EventAssistanceRuntimePhase.saved;
    final value = saved
        ? AssistanceRuntimeDraft.fromView(widget.view)
        : switch (widget.submitted) {
            AssistanceRuntimeConfigure(:final configuration) =>
              AssistanceRuntimeDraft(
                routes: configuration.routes,
                expiresAt: configuration.expiresAt,
                responseDeadline: configuration.responseDeadline,
                deliveryPolicy: configuration.deliveryPolicy,
                maxEvaluations: configuration.maxEvaluations,
                laterChoices: configuration.laterChoices,
              ),
            _ => _draft,
          };
    final issue = value.issueFor(widget.view, widget.choices);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          widget.phase == EventAssistanceRuntimePhase.retryRequired
              ? l.eventAssistanceRuntimePending
              : busy
              ? l.eventAssistanceRuntimeSaving
              : runtimeStatusLabel(l, widget.view.status),
          style: Theme.of(context).textTheme.titleLarge,
        ),
        gapH12,
        CatchText(
          l.eventAssistanceRuntimeBody,
          variant: CatchTextVariant.supporting,
        ),
        if (saved) ...[
          gapH12,
          CatchText(
            widget.view.runtime?.status == AssistanceRuntimeRecordStatus.paused
                ? l.eventAssistanceRuntimePauseSaved
                : l.eventAssistanceRuntimeSaved,
            variant: CatchTextVariant.supporting,
          ),
        ],
        gapH16,
        if (_editable)
          EventAssistanceRuntimeChannelsSection(
            draft: value,
            choices: widget.choices,
            moreRoutes: widget.moreRoutes,
            loadingRoute: widget.loadingRoute,
            enabled: _canConfigure,
            onChanged: _change,
            onMore: widget.onMore,
          ),
        if (!_editable)
          for (final entry in value.routes.indexed) ...[
            Text(
              [
                l.eventAssistanceRuntimeFirst,
                l.eventAssistanceRuntimeSecond,
                l.eventAssistanceRuntimeThird,
              ][entry.$1],
              style: Theme.of(context).textTheme.titleMedium,
            ),
            CatchText(
              _senderSummary(entry.$2),
              variant: CatchTextVariant.supporting,
            ),
            gapH12,
          ],
        gapH12,
        CatchText(
          '${l.eventAssistanceRuntimeUntil}: ${lateJoinTimeLabel(context, value.expiresAt)}',
          variant: CatchTextVariant.supporting,
        ),
        CatchText(
          value.responseDeadline == null
              ? l.eventAssistanceRuntimeNoDeadline
              : '${l.eventAssistanceRuntimeDeadline}: ${lateJoinTimeLabel(context, value.responseDeadline!)}',
          variant: CatchTextVariant.supporting,
        ),
        if (value.laterChoices?.isNotEmpty ?? false) ...[
          gapH8,
          CatchText(
            l.eventAssistanceRuntimeRetainedChoices,
            variant: CatchTextVariant.supporting,
          ),
        ],
        if (_canConfigure) ...[
          CatchButton(
            key: const ValueKey('runtime.customize'),
            label: _customizing
                ? l.eventAssistanceRuntimeHide
                : l.eventAssistanceRuntimeCustomize,
            variant: CatchButtonVariant.ghost,
            onPressed: () => setState(() => _customizing = !_customizing),
          ),
          if (_customizing)
            EventAssistanceRuntimeLimitsSection(
              draft: value,
              eventEnd: widget.view.eventEnd,
              enabled: _canConfigure,
              onChanged: _change,
              onChooseTime: _chooseTime,
            ),
        ],
        if (issue != null && _canConfigure) ...[
          gapH12,
          CatchText(
            runtimeIssueLabel(l, issue),
            variant: CatchTextVariant.supporting,
          ),
        ],
        if (widget.error != null) ...[
          gapH12,
          CatchLocalizedErrorBanner(widget.error!),
        ],
        if (widget.phase == EventAssistanceRuntimePhase.retryRequired) ...[
          gapH12,
          CatchText(
            l.eventAssistanceRuntimeRetryBody,
            variant: CatchTextVariant.supporting,
          ),
          CatchButton(
            key: const ValueKey('runtime.retry'),
            label: l.eventAssistanceLateJoinRetry,
            onPressed: widget.onRetry,
          ),
        ],
        if (widget.phase == EventAssistanceRuntimePhase.refreshRequired ||
            _editable &&
                !widget.canChooseSenders &&
                widget.loadingRoute == null) ...[
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
            key: const ValueKey('runtime.save'),
            label: l.eventAssistanceRuntimeSave,
            status: busy ? CatchButtonStatus.loading : CatchButtonStatus.idle,
            onPressed: _canConfigure && issue == null
                ? () => widget.onConfigure(_draft)
                : null,
          ),
        if (_editable &&
            widget.view.runtime?.status ==
                AssistanceRuntimeRecordStatus.enabled)
          CatchButton(
            key: const ValueKey('runtime.pause'),
            label: l.eventAssistanceRuntimePause,
            variant: CatchButtonVariant.ghost,
            onPressed: widget.onPause,
          ),
        gapH12,
        CatchButton(
          key: const ValueKey('runtime.done'),
          label: l.eventAssistanceLateJoinDone,
          variant: CatchButtonVariant.secondary,
          onPressed: busy ? null : widget.onDone,
        ),
      ],
    );
  }

  String _senderSummary(AssistanceRuntimeRoute route) {
    final choice = widget.choices
        .where((c) => c.route == route.route && c.senderId == route.senderId)
        .firstOrNull;
    final l = context.l10n;
    return choice == null
        ? '${runtimeRouteLabel(l, route.route)} · ${l.eventAssistanceRuntimeSenderMissing}'
        : runtimeSenderLabel(l, choice);
  }
}
