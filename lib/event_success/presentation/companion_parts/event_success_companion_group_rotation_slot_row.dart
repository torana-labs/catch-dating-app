part of '../event_success_companion_screen.dart';

class GroupRotationSlotRow extends StatelessWidget {
  const GroupRotationSlotRow({
    super.key,
    required this.slot,
    required this.profilesByUid,
  });

  final EventSuccessGroupRotationSlot slot;
  final Map<String, PublicProfile> profilesByUid;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final timeRange = context.l10n
        .eventSuccessEventSuccessCompanionLiveCardsVisiblecopyFormatFormat2(
          format: TimeOfDay.fromDateTime(slot.startsAt).format(context),
          format2: TimeOfDay.fromDateTime(slot.endsAt).format(context),
        );
    final peerNames = slot.peerUids
        .map((uid) => profilesByUid[uid]?.name)
        .whereType<String>()
        .toList(growable: false);
    return Padding(
      padding: _companionRotationSlotGap,
      child: CatchSurface(
        backgroundColor: t.primarySoft,
        radius: CatchRadius.sm,
        padding: CatchInsets.contentDense,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: CatchSpacing.s2,
              runSpacing: CatchSpacing.s2,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                CatchBadge(
                  label: slot.label,
                  tone: _isStrongRotationSignal(slot.compatibility)
                      ? CatchBadgeTone.success
                      : CatchBadgeTone.neutral,
                ),
                CatchBadge(
                  label: slot.unitLabel,
                  icon: CatchIcons.tableRestaurantOutlined,
                ),
              ],
            ),
            gapH8,
            CatchText(timeRange, variant: CatchTextVariant.supporting),
            gapH8,
            Wrap(
              spacing: CatchSpacing.s2,
              runSpacing: CatchSpacing.s2,
              children: [
                CatchBadge(
                  label: context.l10n
                      .eventSuccessEventSuccessCompanionLiveCardsLabelValue1People(
                        value1: slot.peerUids.length + 1,
                      ),
                  icon: CatchIcons.groupOutlined,
                ),
                for (final name in peerNames)
                  CatchBadge(
                    label: name,
                    icon: CatchIcons.personOutlineRounded,
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
