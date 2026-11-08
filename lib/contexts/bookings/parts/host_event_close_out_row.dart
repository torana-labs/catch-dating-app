import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One booked guest nobody checked in, as a list row with Came and
/// Didn't come. It draws nothing of its own.
class HostEventCloseOutRow extends StatelessWidget {
  const HostEventCloseOutRow({
    super.key,
    required this.attendee,
    required this.came,
    required this.onCame,
    required this.onNoShow,
  });

  final EventAttendee attendee;

  /// True once marked as come, false once marked as not, null before.
  final bool? came;
  final VoidCallback? onCame;
  final VoidCallback? onNoShow;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchIndexRow(
      title: attendee.displayName,
      subtitle: l10n.hostEventsCloseOutRowNote,
      leading: CatchAvatar(
        size: GeneratedCatchSizeTokens.avatarMd,
        name: attendee.displayName,
      ),
      density: CatchIndexRowSize.compact,
      onTap: null,
      trailing: CatchStack(
        direction: CatchStackDirection.row,
        gap: CatchStackGap.g8,
        children: [
          CatchChip.choice(
            label: l10n.hostEventsCloseOutCame,
            selected: came == true,
            mode: CatchChipMode.single,
            size: CatchChipSize.sm,
            onPressed: onCame,
          ),
          CatchChip.choice(
            label: l10n.hostEventsCloseOutNoShow,
            selected: came == false,
            mode: CatchChipMode.single,
            size: CatchChipSize.sm,
            onPressed: onNoShow,
          ),
        ],
      ),
    );
  }
}
