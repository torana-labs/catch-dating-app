import 'package:catch_dating_app/event_success/domain/event_success_assignment.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_assignment_surface.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessRotationRowList extends StatelessWidget {
  const EventSuccessRotationRowList({
    super.key,
    required this.slots,
    required this.profilesByUid,
    required this.peersLoading,
  });

  final List<EventSuccessRotationSlot> slots;
  final Map<String, PublicProfile> profilesByUid;
  final bool peersLoading;

  @override
  Widget build(BuildContext context) {
    if (peersLoading) {
      return CatchBadge(
        label: context
            .l10n
            .eventSuccessEventSuccessLiveRevealWidgetsLabelLoadingPartners,
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
            EventSuccessRotationRow(
              slot: slot,
              peerName:
                  profilesByUid[slot.peerUid]?.name ??
                  context
                      .l10n
                      .eventSuccessEventSuccessLiveRevealWidgetsVisiblecopyPartner,
            ),
        ],
      ),
    );
  }
}

class EventSuccessRotationRow extends StatelessWidget {
  const EventSuccessRotationRow({
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
        .eventSuccessEventSuccessLiveRevealWidgetsVisiblecopyFormatFormat2(
          format: TimeOfDay.fromDateTime(slot.startsAt).format(context),
          format2: TimeOfDay.fromDateTime(slot.endsAt).format(context),
        );
    return Padding(
      padding: eventSuccessRevealAssignmentRowGap,
      child: CatchSurface(
        tone: CatchSurfaceTone.raised,
        borderRole: CatchBorderRole.separator,
        padding: CatchInsets.contentDense,
        child: Row(
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
            gapW8,
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CatchText(
                    context.l10n
                        .eventSuccessEventSuccessLiveRevealWidgetsTextTimerangePeername(
                          timeRange: timeRange,
                          peerName: peerName,
                        ),
                    variant: CatchTextVariant.sectionTitle,
                  ),
                  gapH2,
                  CatchText(
                    eventSuccessRevealCompatibilityExplanation(
                      slot.compatibility,
                    ),
                    variant: CatchTextVariant.supporting,
                    color: t.ink2,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
