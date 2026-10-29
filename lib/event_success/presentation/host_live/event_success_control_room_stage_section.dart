import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_control_room_state.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_control_room_sync_badge.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_run_of_show_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessControlRoomStageSection extends StatelessWidget {
  const EventSuccessControlRoomStageSection({
    super.key,
    required this.event,
    required this.plan,
    required this.syncState,
    required this.nextStepTitle,
    required this.attendeeExperience,
    required this.showVenue,
  });

  final Event event;
  final EventSuccessLivePlan plan;
  final EventSuccessControlRoomSyncState syncState;
  final String nextStepTitle;
  final String? attendeeExperience;
  final bool showVenue;

  @override
  Widget build(BuildContext context) {
    final dark = CatchTokens.editorialDark;
    final textScale = MediaQuery.textScalerOf(context).scale(1);
    final eventIdentity = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchText(
          event.title,
          variant: CatchTextVariant.titleL,
          color: dark.ink,
          maxLines: 2,
        ),
        if (showVenue) ...[
          gapH4,
          CatchMetadataText(event.locationName, color: dark.ink2),
        ],
      ],
    );
    final syncPill = EventSuccessControlRoomSyncBadge(state: syncState);
    return CatchSurface(
      duration: Duration.zero,
      radius: CatchRadius.none,
      backgroundColor: CatchTokens.editorialBlack,
      child: SafeArea(
        top: false,
        bottom: false,
        child: Padding(
          padding: CatchInsets.eventSuccessControlRoomStage,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              eventIdentity,
              gapH12,
              Align(alignment: Alignment.centerLeft, child: syncPill),
              gapH24,
              Text(
                context.l10n.eventSuccessControlRoomStepProgress(
                  current: plan.activeStepIndex + 1,
                  total: plan.steps.length,
                  stage:
                      '${eventSuccessRunOfShowBeatLabel(context, plan.durationShape, plan.activeStepIndex)} · ${plan.activeStep.stage.label}',
                ),
                style: CatchTextStyles.monoLabel(context, color: dark.ink2),
              ),
              gapH12,
              Text(
                plan.activeStep.title,
                maxLines: textScale >= 1.4 ? null : 2,
                overflow: textScale >= 1.4 ? null : TextOverflow.ellipsis,
                style: textScale >= 1.4
                    ? CatchTextStyles.displayXs(context, color: dark.ink)
                    : CatchTextStyles.displayL(context, color: dark.ink),
              ),
              gapH14,
              CatchText(
                plan.activeStep.hostInstruction,
                variant: CatchTextVariant.bodyL,
                color: dark.ink2,
              ),
              if (attendeeExperience case final copy?) ...[
                gapH12,
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      CatchIcons.mobile,
                      size: CatchIconSize.md,
                      color: dark.ink2,
                    ),
                    gapW8,
                    Expanded(
                      child: CatchText(
                        copy,
                        variant: CatchTextVariant.supporting,
                        color: dark.ink2,
                      ),
                    ),
                  ],
                ),
              ],
              gapH24,
              Text(
                context.l10n.eventSuccessControlRoomUpNext,
                style: CatchTextStyles.monoLabel(context, color: dark.ink2),
              ),
              gapH6,
              CatchText(
                nextStepTitle,
                variant: CatchTextVariant.bodyLead,
                color: dark.ink,
                maxLines: 2,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
