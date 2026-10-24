import 'dart:async';

import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/responsive/component_breakpoints.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/event_success/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_control_room_state.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_screen_state.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_control_room_stage_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_run_of_show_copy.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_step_action_row.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessControlRoomPageBody extends StatelessWidget {
  const EventSuccessControlRoomPageBody({
    super.key,
    required this.plan,
    required this.event,
    required this.compactCopy,
    required this.currentStepControls,
    required this.onPrevious,
    required this.onNext,
    this.onComplete,
    this.onOpenGuests,
    this.operationalRosterSummary,
    this.syncState = EventSuccessControlRoomSyncState.synced,
    this.isPrimaryLoading = false,
    this.exclusionAlert,
  });

  final EventSuccessLivePlan plan;
  final Event event;
  final bool compactCopy;
  final List<Widget> currentStepControls;
  final VoidCallback? onPrevious;
  final VoidCallback? onNext;
  final VoidCallback? onComplete;
  final VoidCallback? onOpenGuests;
  final EventSuccessOperationalRosterSummary? operationalRosterSummary;
  final EventSuccessControlRoomSyncState syncState;
  final bool isPrimaryLoading;
  final Widget? exclusionAlert;

  @override
  Widget build(BuildContext context) {
    final total = plan.steps.length;
    final t = CatchTokens.of(context);
    final accent = ActivityPalette.resolve(context, event.activityKind).accent;
    final isFinalStep = plan.activeStepIndex >= total - 1;
    final nextStepTitle = isFinalStep
        ? context.l10n.eventSuccessEventSuccessHostLiveVisiblecopyFinalStep
        : eventSuccessRunOfShowStepLabel(
            context,
            plan,
            plan.activeStepIndex + 1,
          );
    final primaryLabel = isFinalStep
        ? context
              .l10n
              .eventSuccessEventSuccessHostLiveLabelMarkLiveGuideComplete
        : context.l10n.eventSuccessControlRoomContinueTo(title: nextStepTitle);
    final primaryAction = isFinalStep ? onComplete : onNext;
    final checkedInCount =
        operationalRosterSummary?.checkedInCount ?? plan.checkedInCount;
    final expectedCount = operationalRosterSummary == null
        ? plan.bookedCount
        : operationalRosterSummary!.expectedCount;
    final attendeeExperience = context.l10n
        .eventSuccessEventSuccessHostLiveVisiblecopyAttendeesAtLocationnameSee(
          locationName: event.locationName,
          attendeeExperience: plan.activeStep.attendeeExperience,
        );

    final guestSummary = expectedCount == null
        ? context.l10n.eventSuccessControlRoomGuestsCheckedInOnly(
            checkedIn: checkedInCount,
          )
        : context.l10n.eventSuccessControlRoomGuestsSummary(
            checkedIn: checkedInCount,
            expected: expectedCount,
          );
    final supportingFields = CatchSurface(
      duration: Duration.zero,
      radius: CatchRadius.none,
      backgroundColor: t.surface,
      child: CatchSection.fieldRows(
        children: [
          CatchField.nav(
            copy: catchFieldCopy(context.l10n),
            icon: CatchIcons.groupsOutlined,
            title: context.l10n.eventSuccessControlRoomGuests,
            body: guestSummary,
            onTap: onOpenGuests,
          ),
          CatchField.nav(
            copy: catchFieldCopy(context.l10n),
            icon: CatchIcons.helpOutlineRounded,
            title: context.l10n.eventSuccessControlRoomHelpFallback,
            body: context.l10n.eventSuccessControlRoomHelpFallbackSubtitle,
            onTap: () => unawaited(_showControlRoomFallback(context)),
          ),
        ],
      ),
    );
    final baseSupportingOperations = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [?exclusionAlert, supportingFields],
    );
    final compactSupportingOperations = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ?exclusionAlert,
        supportingFields,
        if (currentStepControls.isNotEmpty)
          Padding(
            padding: CatchInsets.pageBody.copyWith(bottom: CatchSpacing.s2),
            child: CatchSectionList(
              emptyStateOmitted: true,
              gap: CatchSpacing.s4,
              children: currentStepControls,
            ),
          ),
      ],
    );
    final wideSupportingOperations = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ?exclusionAlert,
        supportingFields,
        if (currentStepControls.isNotEmpty)
          Padding(
            padding: CatchInsets.pageBody.copyWith(bottom: CatchSpacing.s2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                CatchSectionHeader(
                  padding: EdgeInsets.zero,
                  title: context
                      .l10n
                      .eventSuccessEventSuccessHostLiveTitleControlsForThisStep,
                  subtitle: context
                      .l10n
                      .eventSuccessEventSuccessHostLiveSubtitleHandleTheseBeforeMoving,
                ),
                gapH10,
                CatchSectionList(
                  emptyStateOmitted: true,
                  gap: CatchSpacing.s4,
                  children: currentStepControls,
                ),
              ],
            ),
          ),
      ],
    );
    final Widget controlRoomBody = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        EventSuccessControlRoomStageSection(
          event: event,
          plan: plan,
          syncState: syncState,
          nextStepTitle: nextStepTitle,
          attendeeExperience: compactCopy ? null : attendeeExperience,
          showVenue: true,
        ),
        compactCopy ? compactSupportingOperations : baseSupportingOperations,
      ],
    );

    final previousAction = CatchIconAction.icon(
      key: ValueKey(
        context
            .l10n
            .eventSuccessEventSuccessHostLiveCatchbuttonEventsuccesspreviousstepbutton,
      ),
      icon: CatchIcons.arrowBackRounded,
      onPressed: onPrevious,
      tooltip: context.l10n.eventSuccessEventSuccessHostLiveLabelPrevious,
    );

    if (compactCopy) {
      final largeText = MediaQuery.textScalerOf(context).scale(1) >= 1.4;
      final compactLayout = ColoredBox(
        color: t.surface,
        child: largeText
            ? SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    controlRoomBody,
                    CatchDock.primary(
                      label: primaryLabel,
                      onPressed: primaryAction,
                      isLoading: isPrimaryLoading,
                      buttonAccentColor: accent,
                      buttonKey: ValueKey(
                        context
                            .l10n
                            .eventSuccessEventSuccessHostLiveCatchbuttonEventsuccessnextstepbutton,
                      ),
                      leading: previousAction,
                    ),
                  ],
                ),
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: SingleChildScrollView(child: controlRoomBody),
                  ),
                  CatchDock.primary(
                    label: primaryLabel,
                    onPressed: primaryAction,
                    isLoading: isPrimaryLoading,
                    buttonAccentColor: accent,
                    buttonKey: ValueKey(
                      context
                          .l10n
                          .eventSuccessEventSuccessHostLiveCatchbuttonEventsuccessnextstepbutton,
                    ),
                    leading: previousAction,
                  ),
                ],
              ),
      );

      final expandedLayout = ColoredBox(
        key: const ValueKey<String>('event_success.live.wide_workspace'),
        color: t.surface,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              key: const ValueKey<String>('event_success.live.command_pane'),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: EventSuccessControlRoomStageSection(
                      event: event,
                      plan: plan,
                      syncState: syncState,
                      nextStepTitle: nextStepTitle,
                      attendeeExperience: null,
                      showVenue: true,
                    ),
                  ),
                  CatchDock.primary(
                    label: primaryLabel,
                    onPressed: primaryAction,
                    isLoading: isPrimaryLoading,
                    buttonAccentColor: accent,
                    buttonKey: ValueKey(
                      context
                          .l10n
                          .eventSuccessEventSuccessHostLiveCatchbuttonEventsuccessnextstepbutton,
                    ),
                    leading: previousAction,
                  ),
                ],
              ),
            ),
            VerticalDivider(width: CatchStroke.hairline, color: t.line),
            SizedBox(
              key: const ValueKey<String>('event_success.live.supporting_pane'),
              width: CatchLayout.hostEventLiveSupportingPaneWidth,
              child: SingleChildScrollView(child: wideSupportingOperations),
            ),
          ],
        ),
      );

      if (largeText) {
        return compactLayout;
      }
      return CatchViewport.atWidth(
        breakpoint: ComponentBreakpoints.hostEventLiveSupportingPaneBreakpoint,
        compactBuilder: (_) => compactLayout,
        expandedBuilder: (_) => expandedLayout,
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        controlRoomBody,
        EventSuccessStepActionRow(
          plan: plan,
          onPrevious: onPrevious,
          onNext: primaryAction,
          primaryLabel: primaryLabel,
          accentColor: accent,
          isLoading: isPrimaryLoading,
        ),
        if (currentStepControls.isNotEmpty) ...[
          gapH14,
          Padding(
            padding: CatchInsets.pageHorizontal,
            child: CatchSectionHeader(
              padding: EdgeInsets.zero,
              title: context
                  .l10n
                  .eventSuccessEventSuccessHostLiveTitleControlsForThisStep,
              subtitle: context
                  .l10n
                  .eventSuccessEventSuccessHostLiveSubtitleHandleTheseBeforeMoving,
            ),
          ),
          gapH10,
          Padding(
            padding: CatchInsets.pageHorizontal,
            child: CatchSectionList(
              emptyStateOmitted: true,
              gap: CatchSpacing.s4,
              children: currentStepControls,
            ),
          ),
        ],
      ],
    );
  }
}

Future<void> _showControlRoomFallback(BuildContext context) {
  return showCatchBottomSheet<void>(
    context: context,
    builder: (sheetContext) => CatchSheet.standard(
      title: context.l10n.eventSuccessControlRoomFallbackTitle,
      subtitle: context.l10n.eventSuccessControlRoomFallbackSubtitle,
      glyph: CatchIcons.helpOutlineRounded,
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.dismiss,
        label: context.l10n.eventSuccessControlRoomFallbackDone,
        onPressed: () => Navigator.of(sheetContext).pop(),
      ),
      child: CatchSection.fieldRows(
        first: true,
        children: [
          CatchField.content(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.eventSuccessControlRoomFallbackStayTitle,
            body: context.l10n.eventSuccessControlRoomFallbackStayBody,
            icon: CatchIcons.checklistRounded,
          ),
          CatchField.content(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.eventSuccessControlRoomFallbackGuestsTitle,
            body: context.l10n.eventSuccessControlRoomFallbackGuestsBody,
            icon: CatchIcons.groupsOutlined,
          ),
          CatchField.content(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.eventSuccessControlRoomFallbackContinueTitle,
            body: context.l10n.eventSuccessControlRoomFallbackContinueBody,
            icon: CatchIcons.arrowForwardRounded,
          ),
        ],
      ),
    ),
  );
}
