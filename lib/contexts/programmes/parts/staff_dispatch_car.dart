import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One party in a suggested car, named from the greeter's roster.
@immutable
class StaffDispatchParty {
  const StaffDispatchParty({
    required this.title,
    required this.passengers,
    required this.ready,
  });

  final String title;
  final int passengers;

  /// Out at the curb; otherwise landed or landing and not out yet.
  final bool ready;
}

/// A car the plan suggests: the vehicle and its seats, where it goes, how
/// full it is, the parties in it and Dispatch, or Waiting for N more while
/// someone in it is still inside the terminal.
class StaffDispatchCar extends StatelessWidget {
  const StaffDispatchCar({
    super.key,
    required this.group,
    required this.parties,
    required this.onDispatch,
    this.seats,
  });

  final TransportGroupSuggestion group;
  final List<StaffDispatchParty> parties;

  /// The vehicle's passenger seats, when the class is known.
  final int? seats;

  /// Null disables Dispatch: the car is waiting, already sent or the
  /// phone is busy.
  final VoidCallback? onDispatch;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final waiting = [
      for (final party in parties)
        if (!party.ready) party.passengers,
    ].fold(0, (sum, count) => sum + count);
    final ready = group.readiness == TransportGroupReadiness.ready;
    final dispatchBy = group.dispatchBy;
    return CatchSurface(
      key: ValueKey<String>('staff-dispatch-car-${group.legIds.join('-')}'),
      child: CatchStack(
        children: [
          CatchStack(
            direction: CatchStackDirection.row,
            justify: CatchStackJustify.between,
            align: CatchStackAlign.start,
            gap: CatchStackGap.g8,
            children: [
              Flexible(
                child: CatchStack(
                  gap: CatchStackGap.g2,
                  children: [
                    CatchText(
                      seats == null
                          ? group.vehicleClassLabel
                          : l10n.hostStaffDispatchCarTitle(
                              vehicle: group.vehicleClassLabel,
                              seats: seats!,
                            ),
                      variant: CatchTextVariant.titleBar,
                    ),
                    CatchText(
                      [
                        l10n.hostStaffDispatchTo(
                          destination: group.destinationLabel,
                        ),
                        if (dispatchBy != null)
                          group.waitOverdue
                              ? l10n.hostStaffDispatchOverdue(
                                  time: AppTimeFormatters.time(
                                    dispatchBy.toLocal(),
                                  ),
                                )
                              : l10n.hostStaffDispatchBy(
                                  time: AppTimeFormatters.time(
                                    dispatchBy.toLocal(),
                                  ),
                                ),
                      ].join(' · '),
                      variant: CatchTextVariant.bodySmall,
                      tone: group.waitOverdue
                          ? CatchTextTone.warning
                          : CatchTextTone.secondary,
                    ),
                  ],
                ),
              ),
              CatchText(
                seats == null
                    ? '${group.passengers}'
                    : l10n.hostStaffDispatchSeats(
                        taken: group.passengers,
                        seats: seats!,
                      ),
                variant: CatchTextVariant.displaySm,
                numeric: true,
              ),
            ],
          ),
          CatchStack(
            gap: CatchStackGap.none,
            children: [
              for (final party in parties)
                CatchIndexRow(
                  title: l10n.hostStaffDispatchParty(
                    party: party.title,
                    count: party.passengers,
                  ),
                  status: party.ready
                      ? l10n.hostStaffDispatchAtCurb
                      : l10n.hostStaffDispatchNotOut,
                  statusTone: party.ready
                      ? CatchIndexRowTone.success
                      : CatchIndexRowTone.warning,
                  density: CatchIndexRowSize.compact,
                  onTap: null,
                ),
            ],
          ),
          CatchButton(
            label: ready || waiting == 0
                ? l10n.hostStaffDispatchAction
                : l10n.hostStaffDispatchWaiting(count: waiting),
            variant: CatchButtonVariant.secondary,
            size: CatchButtonSize.md,
            fullWidth: true,
            onPressed: ready ? onDispatch : null,
          ),
        ],
      ),
    );
  }
}
