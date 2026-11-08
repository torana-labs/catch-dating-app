import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/bookings/parts/host_event_close_out_row.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Close out the night in board order: how many came of how many booked,
/// why it matters, each booked guest nobody checked in with Came and
/// Didn't come, and the after-closing switches.
class HostEventCloseOutBody extends StatelessWidget {
  const HostEventCloseOutBody({
    super.key,
    required this.state,
    required this.marks,
    required this.onMark,
    required this.onRetry,
    this.options = const <HostEventCloseOutOption, bool>{},
    this.onOption,
  });

  final HostEventCloseOutState state;

  /// What the host marked on this visit: true for Came, false for Didn't
  /// come. A guest marked Came stays in the list once checked in.
  final Map<String, bool> marks;
  final void Function(EventAttendee attendee, bool came) onMark;
  final VoidCallback onRetry;

  /// The after-closing switches as the host has them now, saved or not.
  final Map<HostEventCloseOutOption, bool> options;

  /// Flips an after-closing switch; null hides the switches.
  final void Function(HostEventCloseOutOption option, bool on)? onOption;

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
          if (onOption case final onOption?)
            CatchSection(
              title: l10n.hostEventsCloseOutAfterTitle,
              children: [
                for (final option in HostEventCloseOutOption.values)
                  _HostEventCloseOutOptionRow(
                    key: ValueKey<String>(
                      'host-event-close-out-${option.name}',
                    ),
                    option: option,
                    on: options[option] ?? false,
                    onChanged: (on) => onOption(option, on),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

/// One after-closing switch as a row.
class _HostEventCloseOutOptionRow extends StatelessWidget {
  const _HostEventCloseOutOptionRow({
    super.key,
    required this.option,
    required this.on,
    required this.onChanged,
  });

  final HostEventCloseOutOption option;
  final bool on;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final (title, subtitle) = switch (option) {
      HostEventCloseOutOption.thankYou => (
        l10n.hostEventsCloseOutThankYou,
        l10n.hostEventsCloseOutThankYouBody,
      ),
      HostEventCloseOutOption.stayInTouchPicks => (
        l10n.hostEventsCloseOutPicks,
        l10n.hostEventsCloseOutPicksBody,
      ),
      HostEventCloseOutOption.noShowNote => (
        l10n.hostEventsCloseOutNoShows,
        l10n.hostEventsCloseOutNoShowsBody,
      ),
    };
    return CatchIndexRow(
      title: title,
      subtitle: subtitle,
      onTap: null,
      trailing: CatchToggleInput(
        value: on,
        semanticLabel: title,
        contractExemption:
            'An after-closing choice saved with close-out, not a form field.',
        onChanged: onChanged,
      ),
    );
  }
}
