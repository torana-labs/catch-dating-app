import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_formatters.dart';
import 'package:catch_dating_app/hosts/today/domain/host_attention_item.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_state.dart';
import 'package:catch_dating_app/hosts/today/presentation/widgets/host_today_event_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

export 'host_today_event_section.dart';

class HostTodayOverview extends StatelessWidget {
  const HostTodayOverview({
    super.key,
    required this.state,
    required this.now,
    required this.onRetry,
    required this.onOpenEvent,
    required this.onOpenAttention,
    required this.onViewEvents,
    required this.onStartRehearsal,
    this.onStartEventRehearsal,
  });

  final HostTodayState state;
  final DateTime now;
  final VoidCallback onRetry;
  final ValueChanged<Event> onOpenEvent;
  final ValueChanged<HostAttentionItem> onOpenAttention;
  final VoidCallback onViewEvents;
  final VoidCallback onStartRehearsal;
  final ValueChanged<Event>? onStartEventRehearsal;

  @override
  Widget build(BuildContext context) {
    final event = state.featuredEvent;
    final attentionVisible =
        state.attentionItems.isNotEmpty || state.attentionIssues.isNotEmpty;
    final taskCount = state.attentionItems
        .where((data) => data.item.eventId == event?.id)
        .length;
    final attention = HostTodayAttentionSection(
      state: state,
      onRetry: onRetry,
      onOpenAttention: onOpenAttention,
    );

    return Column(
      key: const ValueKey<String>('host-today-overview'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (event != null)
          CatchSection.content(
            child: HostTodayEventSection(
              event: event,
              now: now,
              taskCount: taskCount,
              taskCountIsComplete: state.attentionCountIsComplete,
              onPressed: () => onOpenEvent(event),
              onRehearse:
                  event.startTime.isAfter(now) && onStartEventRehearsal != null
                  ? () => onStartEventRehearsal!(event)
                  : null,
            ),
          ),
        if (state.hasPendingSources) ...[
          gapH12,
          CatchSection.content(child: const CatchLoadingIndicator()),
        ],
        if (state.historyError case final error?) ...[
          gapH12,
          CatchSection.content(
            child: CatchLocalizedErrorState(
              error,
              context: AppErrorContext.event,
              onRetry: onRetry,
              mode: CatchErrorStateMode.inline,
            ),
          ),
        ],
        if (event != null && attentionVisible) gapH28,
        if (attentionVisible) attention,
        if (event != null || attentionVisible) gapH28,
        _HostTodayHorizonAndActions(
          state: state,
          onOpenEvent: onOpenEvent,
          onViewEvents: onViewEvents,
          onStartRehearsal:
              event != null &&
                  event.startTime.isAfter(now) &&
                  onStartEventRehearsal != null
              ? null
              : onStartRehearsal,
        ),
      ],
    );
  }
}

class _HostTodayHorizonAndActions extends StatelessWidget {
  const _HostTodayHorizonAndActions({
    required this.state,
    required this.onOpenEvent,
    required this.onViewEvents,
    required this.onStartRehearsal,
  });

  final HostTodayState state;
  final ValueChanged<Event> onOpenEvent;
  final VoidCallback onViewEvents;
  final VoidCallback? onStartRehearsal;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (state.laterEvents.isNotEmpty)
          CatchSection.rows(
            title: context.l10n.hostTodayLater,
            children: [
              for (final data in state.laterEvents)
                CatchField.navigate(
                  key: ValueKey<String>('host-today-event-${data.event.id}'),
                  content: hostTodayEventLayout(context, data),
                  onActivate: () => onOpenEvent(data.event),
                ),
            ],
          ),
        if (state.laterEvents.isNotEmpty) gapH16,
        CatchSection.content(
          child: Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s2,
            children: [
              CatchButton(
                key: const ValueKey<String>('host-today-view-events'),
                label: context.l10n.hostTodayViewAllEvents,
                variant: CatchButtonVariant.ghost,
                size: CatchButtonSize.md,
                onPressed: onViewEvents,
              ),
              if (onStartRehearsal != null)
                CatchButton(
                  key: const ValueKey<String>(
                    'host-today-start-dress-rehearsal',
                  ),
                  label: context.l10n.hostEventRehearsalEntryTitle,
                  leading: Icon(CatchIcons.scienceOutlined, size: CatchIcon.sm),
                  variant: CatchButtonVariant.ghost,
                  size: CatchButtonSize.md,
                  onPressed: onStartRehearsal,
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class HostTodayAttentionSection extends StatelessWidget {
  const HostTodayAttentionSection({
    super.key,
    required this.state,
    required this.onRetry,
    required this.onOpenAttention,
  });

  final HostTodayState state;
  final VoidCallback onRetry;
  final ValueChanged<HostAttentionItem> onOpenAttention;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final issue in state.attentionIssues) ...[
          CatchSection.content(
            child: CatchLocalizedErrorState(
              issue.error,
              context: AppErrorContext.event,
              onRetry: onRetry,
              mode: CatchErrorStateMode.inline,
            ),
          ),
          gapH12,
        ],
        if (state.attentionItems.isNotEmpty)
          CatchSection.rows(
            title: context.l10n.hostsHostTodayTitleNeedsYou,
            count: state.attentionCountIsComplete
                ? state.attentionItems.length
                : null,
            children: [
              for (final data in state.attentionItems)
                CatchField.navigate(
                  key: ValueKey<String>('host-today-attention-${data.item.id}'),
                  content: CatchRecordLayout(
                    title: data.title,
                    icon: data.icon,
                    description: data.body,
                  ),
                  onActivate: () => onOpenAttention(data.item),
                ),
            ],
          ),
      ],
    );
  }
}

CatchRecordLayout hostTodayEventLayout(
  BuildContext context,
  HostTodayEventRowData data,
) {
  final activity = ActivityPalette.resolve(context, data.event.activityKind);
  return CatchRecordLayout(
    title: data.event.title,
    icon: activity.glyph,
    color: activity.deep,
    metadata:
        '${MaterialLocalizations.of(context).formatMediumDate(data.event.startTime)} · ${EventFormatters.time(data.event.startTime)}',
    description: data.event.locationName,
  );
}
