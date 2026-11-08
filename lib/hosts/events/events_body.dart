import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/private_event_setup_inventory.dart';
import 'package:catch_dating_app/contexts/events/parts/host_events_draft_row.dart';
import 'package:catch_dating_app/contexts/events/parts/host_events_event_row.dart';
import 'package:catch_dating_app/contexts/events/parts/host_events_programme_tile.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/events/events_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The Events tab in board order: Upcoming, Drafts and Past with their
/// counts, then on Upcoming the event tonight, the programmes (only when the
/// organizer has one), this week and each later month; on Drafts and Past
/// one list each.
class HostEventsBody extends StatelessWidget {
  const HostEventsBody({
    super.key,
    required this.state,
    required this.now,
    required this.tab,
    required this.onTab,
    required this.onOpenEvent,
    required this.onOpenDraft,
    required this.onOpenProgramme,
    required this.onNewProgramme,
    required this.onRetry,
  });

  final HostEventsState state;

  /// The clock that decides tonight, this week and later.
  final DateTime now;
  final HostEventsTab tab;
  final ValueChanged<HostEventsTab> onTab;
  final ValueChanged<Event> onOpenEvent;
  final ValueChanged<PrivateEventSetupInventoryItem> onOpenDraft;
  final ValueChanged<OrganizerProgramListRow> onOpenProgramme;
  final VoidCallback onNewProgramme;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case HostEventsStatus.loading:
        return const CatchPageBody.screen(child: _HostEventsLoading());
      case HostEventsStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostEventsErrorTitle,
            message: l10n.hostEventsErrorBody,
            retryLabel: l10n.hostEventsRetry,
            onRetry: onRetry,
          ),
        );
      case HostEventsStatus.ready:
        break;
    }
    final tabs = CatchPageTabBar<HostEventsTab>.segmented(
      selected: tab,
      label: l10n.hostEventsTabsLabel,
      onChanged: onTab,
      options: [
        for (final value in HostEventsTab.values)
          CatchOption<HostEventsTab>(
            value: value,
            label: switch (value) {
              HostEventsTab.upcoming => l10n.hostEventsTabUpcoming,
              HostEventsTab.drafts => l10n.hostEventsTabDrafts,
              HostEventsTab.past => l10n.hostEventsTabPast,
            },
            count: state.countFor(value),
          ),
      ],
    );
    return CatchPageBody.screen(
      child: CatchStack(
        gap: CatchStackGap.section,
        children: [
          tabs,
          ...switch (tab) {
            HostEventsTab.upcoming => _upcoming(context),
            HostEventsTab.drafts => [_drafts(context)],
            HostEventsTab.past => [_past(context)],
          },
        ],
      ),
    );
  }

  List<Widget> _upcoming(BuildContext context) {
    final l10n = context.l10n;
    final tonight = state.tonight(now);
    final week = state.thisWeek(now);
    final later = state.later(now);
    return [
      if (tonight != null)
        CatchSection(
          title: l10n.hostEventsTonightTitle,
          children: [
            HostEventsEventRow(
              key: ValueKey<String>('host-events-tonight-${tonight.id}'),
              event: tonight,
              kind: HostEventsRowKind.tonight,
              onTap: () => onOpenEvent(tonight),
            ),
          ],
        ),
      if (state.programmes.isNotEmpty)
        CatchSection(
          title: l10n.hostEventsProgrammesTitle,
          action: CatchSectionAction(
            label: l10n.hostEventsNewProgramme,
            onPressed: onNewProgramme,
          ),
          dividers: CatchSectionPlacement.none,
          children: [
            for (final programme in state.programmes)
              HostEventsProgrammeTile(
                key: ValueKey<String>(
                  'host-events-programme-${programme.programId}',
                ),
                programme: programme,
                onTap: () => onOpenProgramme(programme),
              ),
          ],
        ),
      CatchSection(
        title: l10n.hostEventsThisWeekTitle,
        empty: later.isEmpty && tonight == null
            ? l10n.hostEventsUpcomingEmpty
            : l10n.hostEventsThisWeekEmpty,
        children: [
          for (final event in week)
            HostEventsEventRow(
              key: ValueKey<String>('host-events-week-${event.id}'),
              event: event,
              kind: HostEventsRowKind.coming,
              onTap: () => onOpenEvent(event),
            ),
        ],
      ),
      for (final group in later)
        CatchSection(
          title: l10n.hostEventsLaterIn(
            month: EventFormatters.longMonth(group.month),
          ),
          children: [
            for (final event in group.events)
              HostEventsEventRow(
                key: ValueKey<String>('host-events-later-${event.id}'),
                event: event,
                kind: HostEventsRowKind.coming,
                onTap: () => onOpenEvent(event),
              ),
          ],
        ),
    ];
  }

  Widget _drafts(BuildContext context) {
    final l10n = context.l10n;
    return CatchSection(
      title: l10n.hostEventsTabDrafts,
      note: state.historyLoading ? l10n.hostEventsStillLoading : null,
      action: state.historyFailed
          ? CatchSectionAction(label: l10n.hostEventsRetry, onPressed: onRetry)
          : null,
      empty: state.historyLoading
          ? null
          : state.historyFailed
          ? l10n.hostEventsHistoryFailed
          : l10n.hostEventsDraftsEmpty,
      children: [
        for (final item in state.drafts)
          HostEventsDraftRow(
            key: ValueKey<String>('host-events-draft-${item.eventId}'),
            item: item,
            onTap: () => onOpenDraft(item),
          ),
      ],
    );
  }

  Widget _past(BuildContext context) {
    final l10n = context.l10n;
    return CatchSection(
      title: l10n.hostEventsTabPast,
      note: state.historyLoading ? l10n.hostEventsStillLoading : null,
      action: state.historyFailed
          ? CatchSectionAction(label: l10n.hostEventsRetry, onPressed: onRetry)
          : null,
      empty: state.historyLoading
          ? null
          : state.historyFailed
          ? l10n.hostEventsHistoryFailed
          : l10n.hostEventsPastEmpty,
      children: [
        for (final event in state.past)
          HostEventsEventRow(
            key: ValueKey<String>('host-events-past-${event.id}'),
            event: event,
            kind: HostEventsRowKind.past,
            onTap: () => onOpenEvent(event),
          ),
      ],
    );
  }
}

/// The loading shape: the tabs and two event rows, drawn from the real
/// components.
class _HostEventsLoading extends StatelessWidget {
  const _HostEventsLoading();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final row = CatchIndexRow(
      title: l10n.hostEventsThisWeekTitle,
      meta: l10n.hostEventsStillLoading,
      onTap: null,
    );
    return CatchSkeleton.content(
      child: CatchStack(
        gap: CatchStackGap.section,
        children: [
          CatchSection(title: l10n.hostEventsTonightTitle, children: [row]),
          CatchSection(
            title: l10n.hostEventsThisWeekTitle,
            children: [row, row],
          ),
        ],
      ),
    );
  }
}
