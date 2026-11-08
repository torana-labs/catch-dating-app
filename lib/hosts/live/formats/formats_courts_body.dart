import 'package:catch_dating_app/contexts/live/parts/formats_court_row.dart';
import 'package:catch_dating_app/contexts/live/parts/formats_person_row.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_clock.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The court board in board order. On a phone one column: the round in the
/// courts colour with its clock and Rotate now, On court, Sitting out and
/// Fair so far. On an expanded window the operations layout: the stage
/// (the round, its meter, Rotate now and the courts two by two) beside the
/// side pane (Sitting out and Coming up).
///
/// There is no Pause: the plan has no paused state to record (GAP-Z3).
class HostFormatsCourtsBody extends StatelessWidget {
  const HostFormatsCourtsBody({
    super.key,
    required this.state,
    required this.now,
    required this.onRotate,
    required this.onSetUp,
    required this.onRetry,
    this.rotating = false,
  });

  final HostFormatsCourtsState state;

  /// The clock the time left reads from.
  final DateTime now;
  final VoidCallback onRotate;
  final VoidCallback onSetUp;
  final VoidCallback onRetry;

  /// A rotate command is on its way.
  final bool rotating;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final expanded =
        CatchRootScope.sizeClassOf(context) == CatchWindowSize.expanded;
    switch (state.status) {
      case HostFormatsCourtsStatus.loading:
        return const CatchPageBody(child: CatchLoadingIndicator());
      case HostFormatsCourtsStatus.error:
        return CatchPageBody(
          child: CatchErrorState(
            title: l10n.hostFormatsErrorTitle,
            message: l10n.hostFormatsErrorBody,
            retryLabel: l10n.hostFormatsRetry,
            onRetry: onRetry,
          ),
        );
      case HostFormatsCourtsStatus.noPlan ||
          HostFormatsCourtsStatus.noRotations:
        return CatchPageBody(
          child: CatchEmptyState(
            icon: CatchIcons.rules,
            title: l10n.hostFormatsCourtsEmptyTitle,
            message: l10n.hostFormatsCourtsEmptyBody,
            actions: [
              CatchButton(
                label: l10n.hostFormatsCourtsSetUp,
                variant: CatchButtonVariant.secondary,
                onPressed: onSetUp,
              ),
            ],
          ),
        );
      case HostFormatsCourtsStatus.running:
        break;
    }
    final left = state.endsAt?.difference(now);
    final clock = left == null
        ? null
        : left.isNegative
        ? l10n.hostFormatsOver(time: formatsClock(-left))
        : l10n.hostFormatsLeft(time: formatsClock(left));
    final rotate = _RotateButton(
      state: state,
      rotating: rotating,
      onRotate: onRotate,
      size: expanded ? CatchButtonSize.sm : CatchButtonSize.md,
    );
    final sitting = CatchSection(
      title: l10n.hostFormatsSittingOut,
      note: expanded
          ? '${state.sitters.length}'
          : l10n.hostFormatsSittingOutNote(count: state.sitters.length),
      empty: l10n.hostFormatsSittingOutNone,
      children: [
        for (final sitter in state.sitters)
          FormatsPersonRow(
            key: ValueKey<String>('formats-sitter-${sitter.name}'),
            name: sitter.name,
            subtitle: l10n.hostFormatsCourtMinutes(
              on: sitter.minutesOn,
              off: sitter.minutesOff,
            ),
            status: expanded
                ? null
                : switch (sitter.next) {
                    HostFormatsSitOutNext.plays => l10n.hostFormatsPlaysNext,
                    HostFormatsSitOutNext.outAgain => l10n.hostFormatsOutAgain,
                  },
            statusTone: switch (sitter.next) {
              HostFormatsSitOutNext.plays => CatchIndexRowTone.success,
              HostFormatsSitOutNext.outAgain => CatchIndexRowTone.warning,
            },
          ),
      ],
    );
    final roundLabel = state.roundIndex < 0
        ? l10n.hostFormatsRoundFirst(total: state.rounds)
        : l10n.hostFormatsRound(
            number: state.roundIndex + 1,
            total: state.rounds,
          );
    final progress = _progress(left);

    if (expanded) {
      final courtRows = <Widget>[];
      for (var i = 0; i < state.courts.length; i += 2) {
        courtRows.add(
          CatchStack(
            direction: CatchStackDirection.row,
            equal: true,
            children: [
              for (final court in state.courts.skip(i).take(2))
                FormatsCourtTile(
                  key: ValueKey<String>('formats-court-${court.index}'),
                  index: court.index,
                  players: court.players,
                  opponents: court.opponents,
                  status: clock,
                ),
            ],
          ),
        );
      }
      return CatchPageBody(
        child: CatchPaneLayout(
          pattern: CatchPaneLayoutMode.operations,
          children: [
            CatchScrollView(
              primary: false,
              child: CatchStack(
                gap: CatchStackGap.g16,
                children: [
                  CatchStack(
                    direction: CatchStackDirection.row,
                    gap: CatchStackGap.g24,
                    align: CatchStackAlign.end,
                    justify: CatchStackJustify.between,
                    children: [
                      Expanded(
                        child: CatchStack(
                          children: [
                            CatchText(
                              clock == null
                                  ? roundLabel
                                  : l10n.hostFormatsRoundRotateIn(
                                      round: roundLabel,
                                      time: formatsClock(
                                        left!.isNegative ? Duration.zero : left,
                                      ),
                                    ),
                              variant: CatchTextVariant.displaySection,
                            ),
                            CatchMeter(
                              value: progress * 100,
                              label: l10n.hostFormatsTimeInGame,
                            ),
                          ],
                        ),
                      ),
                      rotate,
                    ],
                  ),
                  ...courtRows,
                ],
              ),
            ),
            CatchScrollView(
              primary: false,
              child: CatchStack(
                gap: CatchStackGap.g20,
                children: [
                  sitting,
                  CatchSection(
                    title: l10n.hostFormatsComingUp,
                    children: [
                      CatchIndexRow(
                        title: l10n.hostFormatsNextRound,
                        subtitle: _nextRound(context),
                        titleMaxLines: 2,
                        onTap: null,
                        density: CatchIndexRowSize.compact,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }
    return CatchPageBody(
      child: CatchStack(
        gap: CatchStackGap.section,
        children: [
          CatchSurface(
            block: CatchSurfaceBlock.spotlight,
            color: CatchSurfaceColor.courts,
            child: CatchStack(
              children: [
                CatchStack(
                  direction: CatchStackDirection.row,
                  justify: CatchStackJustify.between,
                  gap: CatchStackGap.g8,
                  children: [
                    Flexible(
                      child: CatchText(
                        roundLabel,
                        variant: CatchTextVariant.labelKicker,
                        maxLines: 1,
                      ),
                    ),
                    if (clock != null)
                      CatchText(
                        clock,
                        variant: CatchTextVariant.labelKicker,
                        numeric: true,
                      ),
                  ],
                ),
                CatchText(
                  state.roundIndex < 0
                      ? l10n.hostFormatsFirstRoundReady
                      : state.lastRound
                      ? l10n.hostFormatsLastRound
                      : l10n.hostFormatsRotateIn(
                          time: formatsClock(
                            left == null || left.isNegative
                                ? Duration.zero
                                : left,
                          ),
                        ),
                  variant: CatchTextVariant.displayLg,
                ),
                CatchMeter(
                  value: progress * 100,
                  label: l10n.hostFormatsTimeInGame,
                ),
                rotate,
              ],
            ),
          ),
          CatchSection(
            title: l10n.hostFormatsOnCourt,
            children: [
              for (final court in state.courts)
                FormatsCourtRow(
                  key: ValueKey<String>('formats-court-${court.index}'),
                  index: court.index,
                  players: court.players,
                  opponents: court.opponents,
                  status: clock,
                ),
            ],
          ),
          sitting,
          CatchSection(
            title: l10n.hostFormatsFairSoFar,
            dividers: CatchSectionPlacement.none,
            children: [
              CatchStack(
                direction: CatchStackDirection.row,
                equal: true,
                children: [
                  CatchMetricTile.stat(
                    label: l10n.hostFormatsStatNewPartners,
                    value: '${state.newPartners}',
                    mode: CatchMetricTileMode.plain,
                  ),
                  CatchMetricTile.stat(
                    label: l10n.hostFormatsStatRepeats,
                    value: '${state.repeatPartners}',
                    mode: CatchMetricTileMode.plain,
                  ),
                  CatchMetricTile.stat(
                    label: l10n.hostFormatsStatCourtTimeApart,
                    value: l10n.hostFormatsMinutesShort(
                      minutes: state.courtTimeApartMinutes,
                    ),
                    mode: CatchMetricTileMode.plain,
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  double _progress(Duration? left) {
    if (left == null || state.roundIndex < 0) return 0;
    final length = state.intervalMinutes * 60;
    if (length <= 0) return 1;
    return (1 - left.inSeconds / length).clamp(0, 1).toDouble();
  }

  String _nextRound(BuildContext context) {
    final l10n = context.l10n;
    if (state.lastRound) return l10n.hostFormatsNextRoundNone;
    final on = formatsFirstNames(context, state.comingOn);
    final off = formatsFirstNames(context, state.goingOff);
    if (on.isEmpty && off.isEmpty) return l10n.hostFormatsNextRoundSame;
    if (off.isEmpty) return l10n.hostFormatsNextRoundOn(names: on);
    if (on.isEmpty) return l10n.hostFormatsNextRoundOff(names: off);
    return l10n.hostFormatsNextRoundSwap(on: on, off: off);
  }
}

/// Rotate now: sends the next round to every phone, or Start round 1
/// before the first. Off on the last round and until the next is made.
class _RotateButton extends StatelessWidget {
  const _RotateButton({
    required this.state,
    required this.rotating,
    required this.onRotate,
    required this.size,
  });

  final HostFormatsCourtsState state;
  final bool rotating;
  final VoidCallback onRotate;
  final CatchButtonSize size;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final ready = state.nextReady && !state.lastRound;
    return CatchButton(
      key: const ValueKey<String>('formats-courts-rotate'),
      label: state.roundIndex < 0
          ? l10n.hostFormatsStartFirstRound
          : l10n.hostFormatsRotateNow,
      size: size,
      fullWidth: size == CatchButtonSize.md,
      status: rotating ? CatchButtonStatus.loading : CatchButtonStatus.idle,
      onPressed: ready && !rotating ? onRotate : null,
    );
  }
}
