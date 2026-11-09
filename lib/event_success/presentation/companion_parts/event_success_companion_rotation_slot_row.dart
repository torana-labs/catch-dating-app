part of '../event_success_companion_screen.dart';

/// One entry of a guest's rotation schedule, in round order: a game, or a
/// round sitting out on the bench.
sealed class RotationScheduleEntry {
  const RotationScheduleEntry(this.roundIndex);

  final int roundIndex;
}

final class RotationScheduleSlot extends RotationScheduleEntry {
  RotationScheduleSlot(this.slot) : super(slot.roundIndex);

  final EventSuccessRotationSlot slot;
}

final class RotationScheduleBench extends RotationScheduleEntry {
  RotationScheduleBench(this.slot) : super(slot.roundIndex);

  final EventSuccessSitOutSlot slot;
}

/// The schedule in round order. Bench rounds are listed only when the
/// server says where to go (doubles: the common area), so singles and pair
/// rotations look as before.
List<RotationScheduleEntry> rotationScheduleEntries(
  EventSuccessAssignment assignment,
) {
  final entries = <RotationScheduleEntry>[
    for (final slot in assignment.rotationSlots) RotationScheduleSlot(slot),
    for (final slot in assignment.sitOutSlots)
      if (slot.benchNote != null) RotationScheduleBench(slot),
  ]..sort((a, b) => a.roundIndex.compareTo(b.roundIndex));
  return entries;
}

class RotationSlotRow extends StatelessWidget {
  const RotationSlotRow({
    super.key,
    required this.slot,
    required this.peerName,
    this.opponentNames = const [],
  });

  final EventSuccessRotationSlot slot;
  final String peerName;

  /// Doubles: the two players across the net, by name.
  final List<String> opponentNames;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final timeRange = context.l10n
        .eventSuccessEventSuccessCompanionLiveCardsVisiblecopyFormatFormat2(
          format: TimeOfDay.fromDateTime(slot.startsAt).format(context),
          format2: TimeOfDay.fromDateTime(slot.endsAt).format(context),
        );
    return Padding(
      padding: _companionRotationSlotGap,
      child: CatchLegacySurface(
        backgroundColor: t.primarySoft,
        radius: CatchRadius.sm,
        padding: CatchInsets.contentDense,
        child: Row(
          children: [
            CatchBadge(
              label: slot.label,
              tone: _isStrongRotationSignal(slot.compatibility)
                  ? CatchBadgeTone.success
                  : CatchBadgeTone.neutral,
            ),
            gapW8,
            Expanded(
              child: CatchLegacyText(
                slot.isDoubles && opponentNames.length == 2
                    ? context.l10n.eventSuccessCompanionDoublesSlot(
                        timeRange: timeRange,
                        court: (slot.courtIndex ?? slot.unitIndex ?? 0) + 1,
                        partner: peerName,
                        opponentA: opponentNames[0],
                        opponentB: opponentNames[1],
                      )
                    : context.l10n
                          .eventSuccessEventSuccessCompanionLiveCardsTextTimerangePeername(
                            timeRange: timeRange,
                            peerName: peerName,
                          ),
                variant: CatchLegacyTextVariant.supporting,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A doubles round on the bench: "Sitting out · mix in the common area".
class BenchSlotRow extends StatelessWidget {
  const BenchSlotRow({super.key, required this.slot});

  final EventSuccessSitOutSlot slot;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final timeRange = context.l10n
        .eventSuccessEventSuccessCompanionLiveCardsVisiblecopyFormatFormat2(
          format: TimeOfDay.fromDateTime(slot.startsAt).format(context),
          format2: TimeOfDay.fromDateTime(slot.endsAt).format(context),
        );
    return Padding(
      padding: _companionRotationSlotGap,
      child: CatchLegacySurface(
        backgroundColor: t.surface,
        radius: CatchRadius.sm,
        padding: CatchInsets.contentDense,
        child: Row(
          children: [
            CatchBadge(label: slot.label),
            gapW8,
            Expanded(
              child: CatchLegacyText(
                context.l10n.eventSuccessCompanionBenchSlot(
                  timeRange: timeRange,
                ),
                variant: CatchLegacyTextVariant.supporting,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
