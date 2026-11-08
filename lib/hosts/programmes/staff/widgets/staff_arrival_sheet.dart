import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/parts/staff_arrival_row.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Every move a party allows, in a sheet over the curb: the party and its
/// summary, one button per move and Close.
class StaffArrivalSheet extends StatelessWidget {
  const StaffArrivalSheet({
    super.key,
    required this.row,
    required this.blocked,
    required this.onMove,
    required this.onClose,
  });

  final ArrivalsRosterRow row;

  /// The party takes no new move until its saved change is sorted.
  final bool blocked;
  final ValueChanged<StaffArrivalMove> onMove;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final flight = staffArrivalFlight(l10n, row);
    return CatchSheet.contained(
      key: const ValueKey<String>('staff-arrival-sheet'),
      kicker: [?flight, staffArrivalSummary(l10n, row)].join(' · '),
      title: row.partyTitle,
      footer: CatchButton(
        label: l10n.hostStaffClose,
        variant: CatchButtonVariant.quiet,
        fullWidth: true,
        onPressed: onClose,
      ),
      child: CatchStack(
        gap: CatchStackGap.g8,
        children: [
          for (final move in staffArrivalMoves(row))
            CatchButton(
              key: ValueKey<String>('staff-arrival-move-${move.name}'),
              label: staffArrivalMoveLabel(l10n, move),
              variant: move == StaffArrivalMove.disrupted
                  ? CatchButtonVariant.danger
                  : CatchButtonVariant.secondary,
              fullWidth: true,
              onPressed: blocked ? null : () => onMove(move),
            ),
        ],
      ),
    );
  }
}
