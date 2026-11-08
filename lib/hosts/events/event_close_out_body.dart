import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/parts/host_event_close_out_row.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Close out the night in board order: how many came of how many booked,
/// why it matters, and each booked guest nobody checked in with Came and
/// Didn't come.
class HostEventCloseOutBody extends StatelessWidget {
  const HostEventCloseOutBody({
    super.key,
    required this.state,
    required this.marks,
    required this.onMark,
    required this.onRetry,
  });

  final HostEventCloseOutState state;

  /// What the host marked on this visit: true for Came, false for Didn't
  /// come. A guest marked Came stays in the list once checked in.
  final Map<String, bool> marks;
  final void Function(EventAttendee attendee, bool came) onMark;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case HostEventCloseOutStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case HostEventCloseOutStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostEventsWorkspaceErrorTitle,
            message: l10n.hostEventsErrorBody,
            retryLabel: l10n.hostEventsRetry,
            onRetry: onRetry,
          ),
        );
      case HostEventCloseOutStatus.ready:
        break;
    }
    final rows = <EventAttendee>[
      ...state.unchecked,
      ...state.checked.where((attendee) => marks.containsKey(attendee.id)),
    ]..sort((a, b) => a.searchName.compareTo(b.searchName));
    final open = state.unchecked
        .where((attendee) => !marks.containsKey(attendee.id))
        .length;
    return CatchPageBody.screen(
      child: CatchStack(
        gap: CatchStackGap.section,
        children: [
          CatchStack(
            gap: CatchStackGap.g8,
            children: [
              CatchStack(
                direction: CatchStackDirection.row,
                gap: CatchStackGap.g8,
                align: CatchStackAlign.baseline,
                children: [
                  CatchText(
                    l10n.hostEventsCloseOutCameCount(count: state.came),
                    variant: CatchTextVariant.displayTitle,
                  ),
                  CatchText(
                    l10n.hostEventsCloseOutOfBooked(count: state.booked),
                    tone: CatchTextTone.secondary,
                  ),
                ],
              ),
              CatchText(
                open == 0
                    ? l10n.hostEventsCloseOutAllDone
                    : l10n.hostEventsCloseOutWhy(count: open),
                tone: CatchTextTone.secondary,
              ),
            ],
          ),
          CatchSection(
            title: l10n.hostEventsCloseOutNotCheckedIn,
            empty: l10n.hostEventsCloseOutEmpty,
            children: [
              for (final attendee in rows)
                HostEventCloseOutRow(
                  key: ValueKey<String>('host-event-close-out-${attendee.id}'),
                  attendee: attendee,
                  came: attendee.status == EventAttendeeStatus.checkedIn
                      ? true
                      : marks[attendee.id],
                  onCame: () => onMark(attendee, true),
                  onNoShow: () => onMark(attendee, false),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
