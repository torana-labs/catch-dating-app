part of '../event_success_companion_screen.dart';

class RotationSlotRow extends StatelessWidget {
  const RotationSlotRow({
    super.key,
    required this.slot,
    required this.peerName,
  });

  final EventSuccessRotationSlot slot;
  final String peerName;

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
      child: CatchSurface(
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
              child: CatchText(
                context.l10n
                    .eventSuccessEventSuccessCompanionLiveCardsTextTimerangePeername(
                      timeRange: timeRange,
                      peerName: peerName,
                    ),
                variant: CatchTextVariant.supporting,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
