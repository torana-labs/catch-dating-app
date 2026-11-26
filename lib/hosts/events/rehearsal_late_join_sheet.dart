import 'dart:async';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_publication.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_editor.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_movement_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_settings_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_settings_sheet.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show chooseRuntimeTime;
import 'package:catch_dating_app/hosts/events/rehearsal_late_join_form.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_late_join_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Opens the late joiner sheet for one made-up guest, over practice tools.
///
/// The sheet reads the host's rehearsal assistance review
/// ([eventRehearsalAssistanceProvider]) and the chosen group's movement
/// review ([eventRehearsalMovementProvider]). It writes through the
/// assistance editor ([EventRehearsalAssistanceEditor]), which sends
/// `controlEventRehearsal` assistance commands: `publish` (Publish
/// directions), `configureAutomation` (Save update settings),
/// `pauseAutomation` and `resumeAutomation`. The editor keeps one
/// unresolved command per rehearsal and retries it unchanged.
void showHostRehearsalLateJoinSheet(
  BuildContext context,
  WidgetRef ref, {
  required String sessionId,
  required String actorId,
}) {
  final editor = ref.read(eventRehearsalAssistanceEditorProvider(sessionId));
  final query = eventRehearsalAssistanceProvider(sessionId);
  // A fresh review, unless a command is still unresolved.
  if ((editor is! RehearsalAssistanceForm || editor.canReload) &&
      ref.read(query.exists)) {
    ref.read(query.notifier).reload();
  }
  unawaited(
    showCatchBottomSheet<void>(
      context: context,
      builder: (_) =>
          HostRehearsalLateJoinSheet(sessionId: sessionId, actorId: actorId),
    ),
  );
}

/// The late joiner sheet for one made-up guest; see
/// [showHostRehearsalLateJoinSheet] for what it reads and writes.
class HostRehearsalLateJoinSheet extends ConsumerStatefulWidget {
  const HostRehearsalLateJoinSheet({
    super.key,
    required this.sessionId,
    required this.actorId,
  });

  final String sessionId;
  final String actorId;

  @override
  ConsumerState<HostRehearsalLateJoinSheet> createState() =>
      _HostRehearsalLateJoinSheetState();
}

class _HostRehearsalLateJoinSheetState
    extends ConsumerState<HostRehearsalLateJoinSheet> {
  HostRehearsalLateJoinChoices? _choices;

  EventRehearsalAssistanceEditorProvider get _editor =>
      eventRehearsalAssistanceEditorProvider(widget.sessionId);

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final pageState = catchAsyncStateFromAsyncValue(
      ref.watch(eventRehearsalAssistanceProvider(widget.sessionId)),
    );
    final editorState = ref.watch(_editor);
    final form = editorState is RehearsalAssistanceForm ? editorState : null;
    final fresh = pageState.value;
    final review = form?.review ?? fresh;
    final snapshot = _latest(fresh?.snapshot, form?.result ?? review?.snapshot);
    final actor = snapshot?.actors
        .where((a) => a.actorId == widget.actorId)
        .firstOrNull;
    // The host's fresh read carries the settings and movement reviews a
    // command result may omit; the guest's own state is the latest read.
    final reviewed = fresh?.snapshot ?? snapshot;
    final open =
        reviewed != null &&
        reviewed.settingsReview != null &&
        hostRehearsalLateJoinOpen(reviewed);
    final choices = open && actor != null
        ? _choices ??= HostRehearsalLateJoinChoices.initial(reviewed, actor)
        : null;
    final selection = choices == null
        ? null
        : RehearsalMovementSelection(
            scope: rehearsalMovementScope(reviewed!.session, choices.groupId),
          );
    final movementState = selection == null
        ? null
        : catchAsyncStateFromAsyncValue(
            ref.watch(eventRehearsalMovementProvider(selection)),
          );
    final plan = choices == null
        ? null
        : _plan(
            snapshot: snapshot!,
            reviewed: reviewed!,
            actor: actor!,
            choices: choices,
            fresh: fresh,
            form: form,
            movement: movementState?.value,
            movementError: movementState?.error,
          );
    final Widget body;
    if (snapshot == null || actor == null) {
      final error = pageState.error;
      body = error == null
          ? const CatchLoadingIndicator()
          : CatchLocalizedErrorBanner(error, onRetry: _reloadReview);
    } else if (plan == null || choices == null || selection == null) {
      body = CatchText(
        l10n.hostEventRehearsalStaffReadOnly,
        tone: CatchTextTone.secondary,
      );
    } else {
      final movement = movementState?.value;
      final draft = plan.draft;
      final settings = reviewed!.settingsReview!;
      void choose(HostRehearsalLateJoinChoices next) =>
          setState(() => _choices = next);
      body = HostRehearsalLateJoinForm(
        view: plan.view,
        onGroup: (id) => choose(choices.copyWith(groupId: id)),
        onPoint: (id) => choose(choices.copyWith(joiningPointId: id)),
        onLater: (id) => choose(
          choices.copyWith(
            laterPointIds: choices.laterPointIds.contains(id)
                ? ({...choices.laterPointIds}..remove(id))
                : {...choices.laterPointIds, id},
          ),
        ),
        onLaterLabel: (id, label) => choose(
          choices.copyWith(laterLabels: {...choices.laterLabels, id: label}),
        ),
        onMode: (mode) => choose(choices.copyWith(mode: mode)),
        onRules: () => _openSettings(choices.groupId),
        onChannels: () => _openSettings(null),
        onDeadline: () => unawaited(
          _chooseDeadline(
            serverTime: settings.serverTime,
            eventEnd: settings.eventEnd,
          ),
        ),
        onClearDeadline: () => choose(choices.withDeadline(null)),
        onOutcomes: (outcomes) => choose(choices.copyWith(outcomes: outcomes)),
        onRetry: _retry,
        onReload: () => _reload(selection),
        onPublish: plan.canPublish && movement != null && draft != null
            ? () => _command(
                fresh!,
                (editor) => editor.selectPublication(draft, movement),
              )
            : null,
        onSave: plan.canSave && movement != null && draft != null
            ? () => _command(
                fresh!,
                (editor) =>
                    editor.selectAutomation(draft, choices.outcomes, movement),
              )
            : null,
        onPause: fresh == null
            ? null
            : () => _command(
                fresh,
                (editor) => editor.select(
                  RehearsalPauseAutomation(actorId: actor.actorId),
                ),
              ),
        onResume: fresh == null
            ? null
            : () => _command(
                fresh,
                (editor) => editor.select(
                  RehearsalResumeAutomation(actorId: actor.actorId),
                ),
              ),
      );
    }
    return PopScope(
      canPop: editorState.canDismiss,
      child: CatchSheet.standard(
        title: actor?.displayName ?? l10n.hostRehearsalLateJoinTitle,
        subtitle: l10n.hostRehearsalLateJoinTitle,
        badge: l10n.hostEventRehearsalBadge,
        badgeTone: CatchBadgeTone.danger,
        footer: CatchButton.sheet(
          key: const ValueKey<String>('host-rehearsal-late-join-done'),
          label: l10n.eventAssistanceLateJoinDone,
          role: CatchButtonEmphasis.dismiss,
          onPressed: editorState.canDismiss
              ? () => Navigator.of(context).pop()
              : null,
        ),
        child: body,
      ),
    );
  }

  /// The publication draft for [choices], what it would tell the guest,
  /// whether it can publish or save, and the form's view.
  ({
    RehearsalPublicationDraft? draft,
    bool canPublish,
    bool canSave,
    HostRehearsalLateJoinView view,
  })
  _plan({
    required EventRehearsalBootstrap snapshot,
    required EventRehearsalBootstrap reviewed,
    required EventRehearsalActor actor,
    required HostRehearsalLateJoinChoices choices,
    required RehearsalAssistanceReview? fresh,
    required RehearsalAssistanceForm? form,
    required RehearsalMovementPage? movement,
    required Object? movementError,
  }) {
    RehearsalPublicationDraft? draft;
    HostRehearsalLateJoinPreviewKind? kind;
    String? previewText;
    var previewError = movementError;
    var canPublish = false;
    var canSave = false;
    if (movement != null && fresh != null) {
      try {
        draft = choices.draft(fresh.snapshot, movement.snapshot, actor.actorId);
        switch (draft?.preview(fresh.snapshot)) {
          case RehearsalJoiningAwaitingDeparture():
            kind = HostRehearsalLateJoinPreviewKind.awaitingDeparture;
          case RehearsalJoiningOutsidePolicy(:final currentDestination):
            kind = HostRehearsalLateJoinPreviewKind.outsidePolicy;
            previewText = currentDestination.label;
          case RehearsalJoiningConfirmed(
            :final guidance,
            :final entryPermitted,
          ):
            kind = entryPermitted
                ? HostRehearsalLateJoinPreviewKind.confirmed
                : HostRehearsalLateJoinPreviewKind.entryClosed;
            previewText = guidance.text;
          case null:
            break;
        }
      } on Object catch (error) {
        previewError = error;
      }
      if (draft case final ready?) {
        canPublish = _succeeds(() => ready.prepare(fresh.snapshot));
        canSave = _succeeds(
          () => ready.configure(fresh.snapshot, choices.outcomes),
        );
      }
    }
    final message = actor.assistanceMessage;
    return (
      draft: draft,
      canPublish: canPublish,
      canSave: canSave,
      view: HostRehearsalLateJoinView(
        status: hostRehearsalLateJoinStatus(actor),
        remainingOutcomes: actor.assistanceAutomation?.remainingOutcomes,
        latestText: message?.text,
        latestReply: message?.responseLabel,
        groups: reviewed.movementReview?.groups ?? const [],
        groupId: choices.groupId,
        points: movement?.snapshot.destinations,
        pointId: movement == null
            ? null
            : choices
                  .joiningPoint(movement.snapshot)
                  ?.destination
                  .alternativeId,
        laterPointIds: choices.laterPointIds,
        laterLabels: choices.laterLabels,
        mode: choices.mode,
        rules: choices.rules(reviewed),
        routes: draft?.routes ?? const <AssistanceMessageRoute>[],
        responseDeadline: choices.responseDeadline,
        outcomes: choices.outcomes,
        previewKind: kind,
        previewText: previewText,
        phase: switch (form?.phase) {
          null || RehearsalAssistancePhase.choosing =>
            HostRehearsalLateJoinPhase.editing,
          RehearsalAssistancePhase.submitting =>
            HostRehearsalLateJoinPhase.submitting,
          RehearsalAssistancePhase.retryRequired =>
            HostRehearsalLateJoinPhase.retry,
          RehearsalAssistancePhase.refreshRequired =>
            HostRehearsalLateJoinPhase.refresh,
          RehearsalAssistancePhase.applied =>
            HostRehearsalLateJoinPhase.applied,
        },
        error: form?.error ?? previewError,
      ),
    );
  }

  /// Opens [review] in the assistance editor, selects one command and
  /// sends it. A selection the editor refuses shows as the form's error.
  void _command(
    RehearsalAssistanceReview review,
    void Function(EventRehearsalAssistanceEditor editor) select,
  ) {
    final editor = ref.read(_editor.notifier);
    try {
      editor.open(review);
    } on Object catch (error) {
      showCatchNoticeError(context, error);
      return;
    }
    select(editor);
    final state = ref.read(_editor);
    if (state is RehearsalAssistanceForm && state.change != null) {
      unawaited(editor.submit().then<void>((_) {}, onError: (Object _) {}));
    }
  }

  void _retry() => unawaited(
    ref.read(_editor.notifier).submit().then<void>((_) {}, onError: (_) {}),
  );

  void _reload(RehearsalMovementSelection selection) {
    final state = ref.read(_editor);
    if (state is RehearsalAssistanceForm && state.canReload) {
      ref.read(_editor.notifier).reload();
    } else {
      _reloadReview();
    }
    final movement = eventRehearsalMovementProvider(selection);
    if (ref.read(movement.exists)) ref.read(movement.notifier).reload();
  }

  void _reloadReview() => ref
      .read(eventRehearsalAssistanceProvider(widget.sessionId).notifier)
      .reload();

  Future<void> _chooseDeadline({
    required int serverTime,
    required int eventEnd,
  }) async {
    final before = _choices;
    if (before == null) return;
    final at = await chooseRuntimeTime(
      context,
      serverTime: serverTime,
      eventEnd: eventEnd,
      initial: before.responseDeadline ?? eventEnd,
    );
    if (!mounted || at == null || !identical(before, _choices)) return;
    setState(() => _choices = before.withDeadline(at));
  }

  /// Opens the rehearsal settings sheet: the late arrival rule for
  /// [groupId], or the practice channels and retries when null.
  void _openSettings(String? groupId) {
    final settings = eventRehearsalSettingsControllerProvider(widget.sessionId);
    final state = ref.read(settings);
    final pending =
        state is RehearsalSettingsForm &&
        {
          RehearsalSettingsPhase.submitting,
          RehearsalSettingsPhase.retryRequired,
        }.contains(state.phase);
    if (!pending) {
      ref.read(settings.notifier).close();
      _reloadReview();
    }
    unawaited(
      showCatchBottomSheet<void>(
        context: context,
        builder: (_) => EventRehearsalSettingsSheet(
          sessionId: widget.sessionId,
          groupId: groupId,
        ),
      ),
    );
  }
}

/// The newer of two rehearsal reads, by runtime revision.
EventRehearsalBootstrap? _latest(
  EventRehearsalBootstrap? a,
  EventRehearsalBootstrap? b,
) {
  if (a == null) return b;
  if (b == null) return a;
  return a.session.runtimeRevision >= b.session.runtimeRevision ? a : b;
}

bool _succeeds(Object? Function() check) {
  try {
    check();
    return true;
  } on Object {
    return false;
  }
}
