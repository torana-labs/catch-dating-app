import 'dart:async';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_screen_state.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_room_setup_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_setup_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_activity_field_lanes.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_tab_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_plan_field_lanes.dart';
import 'package:catch_dating_app/event_success/presentation/host_setup/event_success_readiness_field.dart';
import 'package:catch_dating_app/event_success/presentation/host_setup/event_success_target_attendees_field.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessHostSetupPageBody extends StatefulWidget {
  const EventSuccessHostSetupPageBody({
    super.key,
    required this.event,
    required this.plan,
    required this.planIsPersisted,
    required this.organizerLayoutsState,
    required this.layoutSavePending,
    required this.layoutSaveError,
    required this.onSaveLayout,
    required this.actionState,
    required this.onSaveSetup,
    required this.embedded,
    this.referenceNow,
    this.assistanceSettingsSection,
    this.assignmentFeaturesSection,
  });

  final Event event;
  final EventSuccessPlan plan;
  final bool planIsPersisted;
  final CatchAsyncState<List<EventSuccessLayout>> organizerLayoutsState;
  final bool layoutSavePending;
  final Object? layoutSaveError;
  final Future<EventSuccessLayout> Function(EventSuccessLayout layout)?
  onSaveLayout;
  final EventSuccessSetupActionState actionState;
  final Future<void> Function(EventSuccessSetupSaveRequest request)?
  onSaveSetup;
  final bool embedded;
  final DateTime? referenceNow;
  final Widget? assistanceSettingsSection;
  final Widget? assignmentFeaturesSection;

  @override
  State<EventSuccessHostSetupPageBody> createState() =>
      _EventSuccessHostSetupPageBodyState();
}

class _EventSuccessHostSetupPageBodyState
    extends State<EventSuccessHostSetupPageBody> {
  late EventSuccessHostDraft _draft = widget.plan.hostDraft.normalizeForFormat(
    widget.event.eventFormat,
  );
  late int _targetAttendeeCount = widget.plan.targetAttendeeCount;
  late String _attendeePromptText = widget.plan.attendeePrompt ?? '';
  late String? _layoutId = widget.plan.layoutId;
  bool _remotePlanChanged = false;

  @override
  void didUpdateWidget(covariant EventSuccessHostSetupPageBody oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.plan != widget.plan) {
      if (_hasLocalChangesAgainst(oldWidget.plan)) {
        _remotePlanChanged = true;
      } else {
        _syncFromPlan(widget.plan);
      }
    }
  }

  void _syncFromPlan(EventSuccessPlan plan) {
    _draft = plan.hostDraft.normalizeForFormat(widget.event.eventFormat);
    _targetAttendeeCount = plan.targetAttendeeCount;
    _attendeePromptText = plan.attendeePrompt ?? '';
    _layoutId = plan.layoutId;
    _remotePlanChanged = false;
  }

  /// Draft as actually presented to the body and used on save: target-attendee
  /// override applied and structure normalized for that target.
  EventSuccessHostDraft get _resolvedDraft => _draft.copyWith(
    targetAttendeeCount: _targetAttendeeCount,
    structureConfig: _draft.structureConfig.normalizedForTarget(
      _targetAttendeeCount,
    ),
  );

  /// True when the in-memory draft differs from the saved plan. Only meaningful
  /// once the plan has been persisted — pre-persistence, the save button
  /// itself already communicates "you haven't saved yet."
  bool get _isDirty {
    if (!widget.planIsPersisted) return false;
    return _hasLocalChangesAgainst(widget.plan);
  }

  bool _hasLocalChangesAgainst(EventSuccessPlan plan) {
    final saved = plan.hostDraft.normalizeForFormat(widget.event.eventFormat);
    final resolved = _resolvedDraft;
    if (_targetAttendeeCount != plan.targetAttendeeCount) return true;
    if (_attendeePromptText.trim() != (plan.attendeePrompt ?? '').trim()) {
      return true;
    }
    if (_layoutId != plan.layoutId) return true;
    if (resolved.playbook.id != saved.playbook.id) return true;
    if (resolved.hostGoal != saved.hostGoal) return true;
    if (resolved.compatibilityAffectsRanking !=
        saved.compatibilityAffectsRanking) {
      return true;
    }
    if (resolved.questionnaireConfig != saved.questionnaireConfig) return true;
    if (resolved.structureConfig != saved.structureConfig) return true;
    if (resolved.selectedModuleIds.length != saved.selectedModuleIds.length ||
        !resolved.selectedModuleIds.containsAll(saved.selectedModuleIds)) {
      return true;
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final hasParticipantActivity =
        widget.event.signedUpCount > 0 ||
        widget.event.waitlistCount > 0 ||
        widget.event.attendedCount > 0;
    final eventHasStarted = !widget.event.startTime.isAfter(
      widget.referenceNow ?? DateTime.now(),
    );
    final planFrozen =
        widget.plan.status != EventSuccessPlanStatus.setup ||
        widget.plan.frozenAt != null;
    final setupFrozen = hasParticipantActivity || eventHasStarted || planFrozen;
    final unsavedFrozen = !widget.planIsPersisted && setupFrozen;
    final profile = EventSuccessActivityProfile.forFormat(
      widget.event.eventFormat,
      targetAttendeeCount: _targetAttendeeCount,
    );
    final presentedDraft = _resolvedDraft;

    return EventSuccessHostTabPageBody(
      embedded: widget.embedded,
      children: [
        if (unsavedFrozen) ...[
          CatchBanner(
            icon: CatchIcons.lockedUntil,
            title: eventHasStarted
                ? context
                      .l10n
                      .eventSuccessEventSuccessHostSetupTitleEventStartedWithoutA
                : context
                      .l10n
                      .eventSuccessEventSuccessHostSetupTitleLiveGuideCanNo,
            message: eventHasStarted
                ? context
                      .l10n
                      .eventSuccessEventSuccessHostSetupBodyThisEventBeganBefore
                : context
                      .l10n
                      .eventSuccessEventSuccessHostSetupBodyBookingsHaveAlreadyStarted,
          ),
          gapH16,
        ] else if (!widget.planIsPersisted) ...[
          CatchBanner(
            icon: CatchIcons.upload,
            title: context
                .l10n
                .eventSuccessEventSuccessHostSetupTitleSetupNotSavedYet,
            message: context
                .l10n
                .eventSuccessEventSuccessHostSetupBodyThisDefaultPlanIs,
          ),
          gapH16,
        ],
        if (setupFrozen && widget.planIsPersisted) ...[
          CatchBanner(
            icon: CatchIcons.lockedUntil,
            tone: CatchBannerTone.warning,
            title: context
                .l10n
                .eventSuccessEventSuccessHostSetupTitleSettingsAreLocked,
            message: hasParticipantActivity
                ? context
                      .l10n
                      .eventSuccessEventSuccessHostSetupBodyBookingsHaveStartedSo
                : context
                      .l10n
                      .eventSuccessEventSuccessHostSetupBodyTheEventHasStarted,
          ),
          gapH16,
        ],
        if (widget.actionState.hasError) ...[
          CatchLocalizedErrorBanner(
            widget.actionState.error!,
            context: AppErrorContext.event,
          ),
          gapH16,
        ],
        if (_remotePlanChanged) ...[
          CatchBanner(
            title: context
                .l10n
                .eventSuccessEventSuccessHostSetupTitleSettingsAreLocked,
            message: context
                .l10n
                .eventSuccessEventSuccessHostSetupBodyThisDefaultPlanIs,
            icon: CatchIcons.error,
            tone: CatchBannerTone.warning,
          ),
          gapH16,
        ],
        if (setupFrozen)
          CatchSection.fieldRows(
            first: true,
            title: context.l10n.eventSuccessEventSuccessHostSetupTitleYourPlan,
            children: [
              EventSuccessActivityFieldLanes(
                profile: profile,
                draft: presentedDraft,
              ),
              EventSuccessPlanFieldLanes(
                plan: widget.plan,
                draft: presentedDraft,
                planIsPersisted: widget.planIsPersisted,
              ),
              if (presentedDraft.readinessIssues.isNotEmpty)
                EventSuccessReadinessField(
                  issues: presentedDraft.readinessIssues,
                ),
            ],
          )
        else
          EventSuccessSetupBody(
            draft: presentedDraft,
            eventFormat: widget.event.eventFormat,
            targetAttendeeCount: _targetAttendeeCount,
            attendeePrompt: _attendeePromptText,
            planLeadingRows: [
              EventSuccessPlanFieldLanes(
                plan: widget.plan,
                draft: presentedDraft,
                planIsPersisted: widget.planIsPersisted,
              ),
              if (presentedDraft.readinessIssues.isNotEmpty)
                EventSuccessReadinessField(
                  issues: presentedDraft.readinessIssues,
                ),
              EventSuccessTargetAttendeesField(
                value: _targetAttendeeCount,
                recommendedMin: _draft.playbook.capacity.min,
                recommendedMax: _draft.playbook.capacity.max,
                enabled: true,
                onChanged: (value) =>
                    setState(() => _targetAttendeeCount = value),
              ),
            ],
            onChanged: (update) {
              setState(() => _draft = update(_draft));
            },
            onAttendeePromptChanged: (value) {
              setState(() => _attendeePromptText = value);
            },
          ),
        gapH16,
        EventSuccessRoomSetupSection(
          layoutsState: widget.organizerLayoutsState,
          selectedLayoutId: _layoutId,
          usesWholeGroup:
              presentedDraft.structureConfig.unitKind ==
              EventSuccessUnitKind.wholeGroup,
          enabled: !setupFrozen && widget.onSaveLayout != null,
          isSavingLayout: widget.layoutSavePending,
          saveError: widget.layoutSaveError,
          onSelected: (layoutId) => setState(() => _layoutId = layoutId),
          onSaveLayout:
              widget.onSaveLayout ??
              (_) => throw StateError('Room layout saving is unavailable.'),
        ),
        if (_isDirty && !setupFrozen) ...[
          gapH16,
          CatchStatusRow(
            label: context
                .l10n
                .eventSuccessEventSuccessHostSetupTextUnsavedChanges,
            tone: CatchStatusRowTone.warning,
          ),
          gapH8,
        ],
        if (!setupFrozen) ...[
          gapH16,
          CatchButton(
            label: widget.planIsPersisted
                ? (_isDirty
                      ? context
                            .l10n
                            .eventSuccessEventSuccessHostSetupLabelSaveChanges
                      : context
                            .l10n
                            .eventSuccessEventSuccessHostSetupLabelSaveSetup)
                : context
                      .l10n
                      .eventSuccessEventSuccessHostSetupLabelSaveLiveGuide,
            status: (widget.actionState.isSaving)
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed:
                widget.actionState.isSaving ||
                    _remotePlanChanged ||
                    widget.onSaveSetup == null
                ? null
                : () => unawaited(
                    widget.onSaveSetup!(
                      EventSuccessSetupSaveRequest(
                        event: widget.event,
                        plan: widget.plan,
                        planIsPersisted: widget.planIsPersisted,
                        draft: _resolvedDraft,
                        attendeePrompt: _attendeePromptText,
                        layoutId:
                            _resolvedDraft.structureConfig.unitKind ==
                                EventSuccessUnitKind.wholeGroup
                            ? null
                            : _layoutId,
                      ),
                    ),
                  ),
            fullWidth: true,
          ),
        ],
        ?widget.assistanceSettingsSection,
        ?widget.assignmentFeaturesSection,
      ],
    );
  }
}
