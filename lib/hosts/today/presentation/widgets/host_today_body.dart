import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/hosts/today/domain/host_attention_item.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_state.dart';
import 'package:catch_dating_app/hosts/today/presentation/widgets/host_today_overview.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostTodayBody extends StatelessWidget {
  const HostTodayBody({
    super.key,
    required this.organizer,
    required this.state,
    required this.now,
    required this.onRetry,
    required this.onOpenEvent,
    required this.onOpenAttention,
    required this.onCreateEvent,
    required this.onViewEvents,
    required this.onStartRehearsal,
    this.onStartEventRehearsal,
  });

  final Club organizer;
  final HostTodayState state;
  final DateTime now;
  final VoidCallback onRetry;
  final ValueChanged<Event> onOpenEvent;
  final ValueChanged<HostAttentionItem> onOpenAttention;
  final VoidCallback onCreateEvent;
  final VoidCallback onViewEvents;
  final VoidCallback onStartRehearsal;
  final ValueChanged<Event>? onStartEventRehearsal;

  @override
  Widget build(BuildContext context) {
    return SliverMainAxisGroup(
      slivers: [
        switch (state.status) {
          HostTodayStatus.loading => const CatchStateViewport.sliverLoading(),
          HostTodayStatus.error => CatchLocalizedSliverErrorState(
            state.error!,
            context: AppErrorContext.event,
            onRetry: onRetry,
          ),
          HostTodayStatus.empty => SliverToBoxAdapter(
            child: CatchSection.content(
              child: HostTodayEmptyState(
                onCreateEvent: onCreateEvent,
                onViewEvents: onViewEvents,
                onStartRehearsal: onStartRehearsal,
              ),
            ),
          ),
          HostTodayStatus.content => SliverToBoxAdapter(
            child: HostTodayOverview(
              state: state,
              now: now,
              onRetry: onRetry,
              onOpenEvent: onOpenEvent,
              onOpenAttention: onOpenAttention,
              onViewEvents: onViewEvents,
              onStartRehearsal: onStartRehearsal,
              onStartEventRehearsal: onStartEventRehearsal,
            ),
          ),
        },
      ],
    );
  }
}

class HostTodayHeader extends StatelessWidget {
  const HostTodayHeader({super.key, this.now});

  final DateTime? now;

  @override
  Widget build(BuildContext context) {
    final date = now == null
        ? null
        : MaterialLocalizations.of(context).formatFullDate(now!);
    return CatchTopBar.primaryRail(
      title: context.l10n.hostNavigationToday,
      subtitle: date,
    );
  }
}

class HostTodayEmptyState extends StatelessWidget {
  const HostTodayEmptyState({
    super.key,
    required this.onCreateEvent,
    required this.onViewEvents,
    required this.onStartRehearsal,
  });

  final VoidCallback onCreateEvent;
  final VoidCallback onViewEvents;
  final VoidCallback onStartRehearsal;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: CatchLayout.maxContentWidth),
      child: Column(
        key: const ValueKey<String>('host-today-quiet-state'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchIconTile.empty(
            icon: CatchIcons.eventBusy,
            variant: CatchIconTileVariant.bubble,
            iconSize: CatchIcon.md,
            size: CatchSpacing.s12,
          ),
          gapH20,
          Text(
            context.l10n.hostTodayEmptyTitle,
            style: CatchTextStyles.headlineS(context, color: t.ink),
          ),
          gapH8,
          CatchText(
            context.l10n.hostTodayEmptyBody,
            variant: CatchTextVariant.supporting,
            color: t.ink2,
          ),
          gapH20,
          Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s2,
            children: [
              CatchButton(
                key: const ValueKey<String>('host-today-create-event'),
                label: context.l10n.hostsHostEventsListLabelNewEvent,
                leading: Icon(CatchIcons.addRounded, size: CatchIcon.sm),
                size: CatchButtonSize.sm,
                onPressed: onCreateEvent,
              ),
              CatchButton(
                key: const ValueKey<String>('host-today-view-events'),
                label: context.l10n.hostTodayViewAllEvents,
                variant: CatchButtonVariant.secondary,
                size: CatchButtonSize.sm,
                onPressed: onViewEvents,
              ),
              CatchButton(
                key: const ValueKey<String>('host-today-start-dress-rehearsal'),
                label: context.l10n.hostEventRehearsalEntryTitle,
                leading: Icon(CatchIcons.scienceOutlined, size: CatchIcon.sm),
                variant: CatchButtonVariant.ghost,
                size: CatchButtonSize.sm,
                onPressed: onStartRehearsal,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
