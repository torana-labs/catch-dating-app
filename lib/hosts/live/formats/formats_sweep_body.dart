import 'package:catch_dating_app/hosts/events/event_close_out_body.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The return sweep in board order: how many are back of everyone checked
/// in, who is still out (each with Back or Home, and Call when they gave a
/// number), then the after-the-night switches close-out saves.
///
/// Not drawn, because nothing stores them: a note per guest, where they
/// were last seen, "regulars hear next month's route first" and messaging
/// one arrival group (the event broadcast reaches everyone booked).
class HostFormatsSweepBody extends StatelessWidget {
  const HostFormatsSweepBody({
    super.key,
    required this.state,
    required this.onAccounted,
    required this.onCall,
    required this.onRetry,
    this.marking = const <String>{},
    this.options = const <HostEventCloseOutOption, bool>{},
    this.onOption,
  });

  final HostFormatsSweepState state;

  /// Marks a guest back (a run) or home (a crawl).
  final ValueChanged<HostFormatsOut> onAccounted;

  /// Calls a guest on the number they gave.
  final ValueChanged<String> onCall;
  final VoidCallback onRetry;

  /// Guests whose mark is on its way, by attendee.
  final Set<String> marking;

  /// The after-the-night switches as the host has them now, saved or not.
  final Map<HostEventCloseOutOption, bool> options;

  /// Flips a switch; null hides the switches.
  final void Function(HostEventCloseOutOption option, bool on)? onOption;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case HostFormatsSweepStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case HostFormatsSweepStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostFormatsErrorTitle,
            message: l10n.hostFormatsErrorBody,
            retryLabel: l10n.hostFormatsRetry,
            onRetry: onRetry,
          ),
        );
      case HostFormatsSweepStatus.ready:
        break;
    }
    final crawl = state.kind == HostFormatsSweepKind.crawl;
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
                    crawl
                        ? l10n.hostFormatsSweepHomeCount(count: state.accounted)
                        : l10n.hostFormatsSweepBackCount(
                            count: state.accounted,
                          ),
                    variant: CatchTextVariant.displayTitle,
                  ),
                  Flexible(
                    child: CatchText(
                      l10n.hostFormatsSweepOfTotal(
                        total: state.checkedIn,
                        out: state.out.length,
                      ),
                      tone: CatchTextTone.secondary,
                    ),
                  ),
                ],
              ),
              CatchText(
                state.finished
                    ? l10n.hostFormatsSweepAlreadyClosed
                    : crawl
                    ? l10n.hostFormatsSweepExplainCrawl
                    : l10n.hostFormatsSweepExplainRun,
                tone: CatchTextTone.secondary,
              ),
            ],
          ),
          CatchSection(
            title: l10n.hostFormatsSweepStillOut,
            empty: l10n.hostFormatsSweepAllAccounted,
            children: [
              for (final person in state.out)
                HostFormatsOutRow(
                  key: ValueKey<String>('formats-out-${person.attendeeId}'),
                  person: person,
                  crawl: crawl,
                  pending: marking.contains(person.attendeeId),
                  onAccounted: () => onAccounted(person),
                  onCall: onCall,
                ),
            ],
          ),
          if (onOption case final onOption?)
            CatchSection(
              title: l10n.hostFormatsSweepThen,
              children: [
                for (final option in HostEventCloseOutOption.values)
                  HostEventCloseOutOptionRow(
                    key: ValueKey<String>('formats-sweep-${option.name}'),
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

/// Someone still out: their name, their group, Back or Home, and Call when
/// they gave a number.
class HostFormatsOutRow extends StatelessWidget {
  const HostFormatsOutRow({
    super.key,
    required this.person,
    required this.crawl,
    required this.onAccounted,
    required this.onCall,
    this.pending = false,
  });

  final HostFormatsOut person;

  /// A crawl guest goes home; a runner comes back.
  final bool crawl;
  final VoidCallback onAccounted;
  final ValueChanged<String> onCall;

  /// Their mark is on its way.
  final bool pending;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final phone = person.phone;
    return CatchIndexRow(
      title: person.name,
      subtitle: person.group,
      onTap: null,
      marker: CatchIndexRowTone.warning,
      density: CatchIndexRowSize.roomy,
      trailing: CatchStack(
        direction: CatchStackDirection.row,
        gap: CatchStackGap.g8,
        children: [
          CatchButton(
            key: ValueKey<String>('formats-out-mark-${person.attendeeId}'),
            label: crawl
                ? l10n.hostFormatsSweepMarkHome
                : l10n.hostFormatsSweepMarkBack,
            size: CatchButtonSize.sm,
            variant: CatchButtonVariant.secondary,
            onPressed: pending ? null : onAccounted,
          ),
          if (phone != null)
            CatchButton(
              key: ValueKey<String>('formats-out-call-${person.attendeeId}'),
              label: l10n.hostFormatsSweepCall,
              size: CatchButtonSize.sm,
              variant: CatchButtonVariant.secondary,
              onPressed: () => onCall(phone),
            ),
        ],
      ),
    );
  }
}
