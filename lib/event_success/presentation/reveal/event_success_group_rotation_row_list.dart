import 'package:catch_dating_app/event_success/domain/event_success_assignment.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_assignment_surface.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessGroupRotationRowList extends StatelessWidget {
  const EventSuccessGroupRotationRowList({
    super.key,
    required this.slots,
    required this.profilesByUid,
    required this.peersLoading,
  });

  final List<EventSuccessGroupRotationSlot> slots;
  final Map<String, PublicProfile> profilesByUid;
  final bool peersLoading;

  @override
  Widget build(BuildContext context) {
    if (peersLoading) {
      return CatchBadge(
        label: context
            .l10n
            .eventSuccessEventSuccessLiveRevealWidgetsLabelLoadingGroupMembers,
        icon: CatchIcons.hourglassEmptyRounded,
      );
    }
    return EventSuccessAssignmentSurface(
      title: context
          .l10n
          .eventSuccessEventSuccessLiveRevealWidgetsTitleUnlockedTogether,
      child: Column(
        children: [
          for (final slot in slots)
            EventSuccessGroupRotationRow(
              slot: slot,
              profilesByUid: profilesByUid,
            ),
        ],
      ),
    );
  }
}

class EventSuccessGroupRotationRow extends StatelessWidget {
  const EventSuccessGroupRotationRow({
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
        .eventSuccessEventSuccessLiveRevealWidgetsVisiblecopyFormatFormat2(
          format: TimeOfDay.fromDateTime(slot.startsAt).format(context),
          format2: TimeOfDay.fromDateTime(slot.endsAt).format(context),
        );
    final peerNames = slot.peerUids
        .map((uid) => profilesByUid[uid]?.name)
        .whereType<String>()
        .toList(growable: false);
    return Padding(
      padding: eventSuccessRevealAssignmentRowGap,
      child: CatchSurface(
        tone: CatchSurfaceTone.raised,
        borderRole: CatchBorderRole.separator,
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
                  tone:
                      eventSuccessRevealIsStrongCompatibilitySignal(
                        slot.compatibility,
                      )
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
            CatchText(timeRange, variant: CatchTextVariant.sectionTitle),
            gapH4,
            CatchText(
              eventSuccessRevealCompatibilityExplanation(slot.compatibility),
              variant: CatchTextVariant.supporting,
              color: t.ink2,
            ),
            gapH10,
            Wrap(
              spacing: CatchSpacing.s2,
              runSpacing: CatchSpacing.s2,
              children: [
                CatchBadge(
                  label: context.l10n
                      .eventSuccessEventSuccessLiveRevealWidgetsLabelValue1People(
                        value1: slot.peerUids.length + 1,
                      ),
                  icon: CatchIcons.groupOutlined,
                ),
                for (final name in peerNames)
                  CatchBadge(
                    label: name,
                    icon: CatchIcons.personOutlineRounded,
                  ),
                if (peerNames.isEmpty)
                  CatchBadge(
                    label: context
                        .l10n
                        .eventSuccessEventSuccessLiveRevealWidgetsLabelNamesLoading,
                    icon: CatchIcons.hourglassEmptyRounded,
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
