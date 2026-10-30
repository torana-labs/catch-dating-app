import 'package:catch_dating_app/contexts/events/domain/organizer_moment.dart';
import 'package:catch_dating_app/hosts/events/presentation/moments/organizer_moments_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

part 'organizer_moment_edit_screen.dart';

/// Moments for one event or program scope: the organizer's send rules with
/// their approve-the-rule-once lifecycle (draft → armed → paused/done).
class OrganizerMomentsScreen extends ConsumerStatefulWidget {
  const OrganizerMomentsScreen({
    super.key,
    required this.scope,
    this.scopeTitle,
  });

  final OrganizerMomentScope scope;
  final String? scopeTitle;

  @override
  ConsumerState<OrganizerMomentsScreen> createState() =>
      _OrganizerMomentsScreenState();
}

enum _MomentMenuAction { arm, pause, resume, run, edit }

class _OrganizerMomentsScreenState
    extends ConsumerState<OrganizerMomentsScreen> {
  bool _editing = false;
  OrganizerMoment? _selected;

  OrganizerMomentsControllerProvider get _provider =>
      organizerMomentsControllerProvider(widget.scope);

  void _startEdit(OrganizerMoment? moment) => setState(() {
    _selected = moment;
    _editing = true;
  });

  @override
  Widget build(BuildContext context) {
    if (_editing) {
      return OrganizerMomentEditScreen(
        scope: widget.scope,
        initialMoment: _selected,
        onCancel: () => setState(() => _editing = false),
        onSaved: () => setState(() => _editing = false),
      );
    }
    final momentsAsync = ref.watch(_provider);
    final l = context.l10n;
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: l.hostMomentsTitle,
        subtitle: widget.scopeTitle,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
        actions: [
          CatchIconAction.toolbar(
            key: const ValueKey('moment-create'),
            icon: CatchIcons.add,
            tooltip: l.hostMomentsNew,
            onPressed: () => _startEdit(null),
          ),
        ],
      ),
      body: CatchRouteBody.standardConstrained(
        child: CatchAsyncBoundary<OrganizerMomentsState>(
          value: momentsAsync,
          onRetry: () => ref.invalidate(_provider),
          initialLoadTimeout: null,
          loadingBuilder: (_) => CatchSection.containedLoadingRows(
            title: l.hostMomentsTitle,
            layouts: List.generate(
              4,
              (_) => CatchRecordLayout.placeholder(
                icon: CatchIcons.magic,
                hasMetadata: true,
                hasDescription: true,
              ),
            ),
          ),
          errorBuilder: (_, error, _, onBoundaryRetry) =>
              CatchLocalizedErrorState(
                error,
                context: AppErrorContext.event,
                onRetry: onBoundaryRetry,
              ),
          builder: (context, state) {
            if (state.moments.isEmpty) {
              return CatchEmptyState(
                icon: CatchIcons.magic,
                title: l.hostMomentsEmptyTitle,
                message: l.hostMomentsEmptyBody,
              );
            }
            return CatchSection.containedRows(
              title: l.hostMomentsTitle,
              children: [
                for (final moment in state.moments)
                  CatchField.navigate(
                    key: ValueKey('moment-${moment.momentId}'),
                    onActivate: () => _startEdit(moment),
                    secondaryAction: _momentMenu(context, state, moment),
                    content: CatchRecordLayout(
                      title: moment.name,
                      icon: CatchIcons.magic,
                      metadata: _momentMetadata(context, moment),
                      description: _momentSummary(context, moment),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  CatchFieldSecondaryAction _momentMenu(
    BuildContext context,
    OrganizerMomentsState state,
    OrganizerMoment moment,
  ) {
    final l = context.l10n;
    final mutating = state.mutatingMomentIds.contains(moment.momentId);
    return CatchFieldSecondaryAction.menu(
      label: l.hostMomentActions,
      items: [
        if (moment.canArm)
          CatchActionMenuItem(
            value: _MomentMenuAction.arm,
            label: l.hostMomentArm,
            icon: CatchIcons.play,
            enabled: !mutating,
          ),
        if (moment.canPause)
          CatchActionMenuItem(
            value: _MomentMenuAction.pause,
            label: l.hostMomentPause,
            icon: CatchIcons.pause,
            enabled: !mutating,
          ),
        if (moment.canResume)
          CatchActionMenuItem(
            value: _MomentMenuAction.resume,
            label: l.hostMomentResume,
            icon: CatchIcons.play,
            enabled: !mutating,
          ),
        if (moment.canRun)
          CatchActionMenuItem(
            value: _MomentMenuAction.run,
            label: l.hostMomentRun,
            icon: CatchIcons.send,
            enabled: !mutating,
          ),
        if (moment.canRevise)
          CatchActionMenuItem(
            value: _MomentMenuAction.edit,
            label: l.hostMomentEdit,
            icon: CatchIcons.edit,
          ),
      ],
      onSelected: (action) => _applyMenuAction(action, moment),
    );
  }

  Future<void> _applyMenuAction(
    _MomentMenuAction action,
    OrganizerMoment moment,
  ) async {
    if (action == _MomentMenuAction.edit) {
      _startEdit(moment);
      return;
    }
    final controller = ref.read(_provider.notifier);
    try {
      switch (action) {
        case _MomentMenuAction.arm:
          await controller.arm(moment.momentId);
        case _MomentMenuAction.pause:
          await controller.pause(moment.momentId);
        case _MomentMenuAction.resume:
          await controller.resume(moment.momentId);
        case _MomentMenuAction.run:
          await controller.run(
            moment.momentId,
            requestKey: 'moment_run_${DateTime.now().microsecondsSinceEpoch}',
          );
        case _MomentMenuAction.edit:
          break;
      }
    } on Object catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    }
  }

  String _momentMetadata(BuildContext context, OrganizerMoment moment) {
    final l = context.l10n;
    return [
      _momentStatusLabel(l, moment.status),
      _momentSenseLabel(l, moment.sense),
      if (moment.origin == OrganizerMomentOrigin.systemDefault)
        l.hostMomentOriginDefault,
    ].join(' · ');
  }

  String _momentSummary(BuildContext context, OrganizerMoment moment) {
    final l = context.l10n;
    return [
      _initiationSummary(l, moment.initiation),
      _audienceLabel(l, moment.audience.kind),
      _actionLabel(l, moment.action.kind),
    ].join(' · ');
  }
}

String _momentStatusLabel(AppLocalizations l, OrganizerMomentStatus status) =>
    switch (status) {
      OrganizerMomentStatus.draft => l.hostMomentStatusDraft,
      OrganizerMomentStatus.armed => l.hostMomentStatusArmed,
      OrganizerMomentStatus.paused => l.hostMomentStatusPaused,
      OrganizerMomentStatus.done => l.hostMomentStatusDone,
    };

String _momentSenseLabel(AppLocalizations l, OrganizerMomentSense sense) =>
    switch (sense) {
      OrganizerMomentSense.individual => l.hostMomentSenseIndividual,
      OrganizerMomentSense.audience => l.hostMomentSenseAudience,
    };

String _initiationLabel(
  AppLocalizations l,
  OrganizerMomentInitiationKind kind,
) => switch (kind) {
  OrganizerMomentInitiationKind.manual => l.hostMomentKindManual,
  OrganizerMomentInitiationKind.scheduled => l.hostMomentKindScheduled,
  OrganizerMomentInitiationKind.anchored => l.hostMomentKindAnchored,
  OrganizerMomentInitiationKind.triggered => l.hostMomentKindTriggered,
};

String _initiationSummary(
  AppLocalizations l,
  OrganizerMomentInitiation initiation,
) => switch (initiation.kind) {
  OrganizerMomentInitiationKind.manual => l.hostMomentInitiationManual,
  OrganizerMomentInitiationKind.scheduled => l.hostMomentInitiationScheduled(
    time: initiation.atMillis == null
        ? '—'
        : AppTimeFormatters.dateTime(
            DateTime.fromMillisecondsSinceEpoch(initiation.atMillis!),
          ),
  ),
  OrganizerMomentInitiationKind.anchored =>
    '${_offsetSummary(l, initiation.offsetMinutes)} '
        '${_anchorLabel(l, initiation.anchorKind)}',
  OrganizerMomentInitiationKind.triggered => l.hostMomentInitiationTriggered(
    trigger: _triggerLabel(l, initiation.triggerKind),
  ),
};

String _offsetSummary(AppLocalizations l, int? offsetMinutes) {
  final offset = offsetMinutes ?? 0;
  if (offset < 0) return l.hostMomentOffsetBefore(minutes: -offset);
  if (offset > 0) return l.hostMomentOffsetAfter(minutes: offset);
  return l.hostMomentOffsetAt;
}

String _anchorLabel(AppLocalizations l, OrganizerMomentAnchorKind? anchor) =>
    switch (anchor) {
      OrganizerMomentAnchorKind.scopeStart => l.hostMomentAnchorScopeStart,
      OrganizerMomentAnchorKind.scopeEnd => l.hostMomentAnchorScopeEnd,
      OrganizerMomentAnchorKind.functionStart =>
        l.hostMomentAnchorFunctionStart,
      OrganizerMomentAnchorKind.functionEnd => l.hostMomentAnchorFunctionEnd,
      OrganizerMomentAnchorKind.rsvpDeadline => l.hostMomentAnchorRsvpDeadline,
      OrganizerMomentAnchorKind.travelLegTime => l.hostMomentAnchorTravelLeg,
      null => '—',
    };

String _triggerLabel(AppLocalizations l, OrganizerMomentTriggerKind? trigger) =>
    switch (trigger) {
      OrganizerMomentTriggerKind.lateArrivalAtHotel =>
        l.hostMomentTriggerLateArrival,
      OrganizerMomentTriggerKind.flightDisrupted =>
        l.hostMomentTriggerFlightDisrupted,
      null => '—',
    };

String _audienceLabel(AppLocalizations l, OrganizerMomentAudienceKind kind) =>
    switch (kind) {
      OrganizerMomentAudienceKind.subject => l.hostMomentAudienceSubject,
      OrganizerMomentAudienceKind.eventParticipants =>
        l.hostMomentAudienceParticipants,
      OrganizerMomentAudienceKind.functionGuests =>
        l.hostMomentAudienceFunctionGuests,
      OrganizerMomentAudienceKind.households => l.hostMomentAudienceHouseholds,
      OrganizerMomentAudienceKind.staffDuty => l.hostMomentAudienceStaffDuty,
    };

String _actionLabel(AppLocalizations l, OrganizerMomentActionKind kind) =>
    switch (kind) {
      OrganizerMomentActionKind.sendTemplate => l.hostMomentActionTemplate,
      OrganizerMomentActionKind.push => l.hostMomentActionPush,
      OrganizerMomentActionKind.staffAttention => l.hostMomentActionStaffAlert,
    };
