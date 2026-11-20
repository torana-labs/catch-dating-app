import 'dart:async';

import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_operations.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_runtime_operation_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Every rehearsal command the practice screens run. Each one is the
/// rehearsal's own command (its virtual clock, made-up guests, reveal and
/// recap); none reads or writes a real event. A failed command shows
/// through the mutation listener on the screen that ran it.
class HostRehearsalPracticeActions {
  const HostRehearsalPracticeActions({
    required this.context,
    required this.ref,
    required this.organizerId,
    required this.sessionId,
  });

  final BuildContext context;
  final WidgetRef ref;
  final String organizerId;
  final String sessionId;

  /// The rehearsal mutations the practice screens show errors for.
  static final List<Mutation<dynamic>> mutations = [
    EventRehearsalController.setupMutation,
    EventRehearsalController.controlMutation,
    EventRehearsalController.behaviorMutation,
    EventRehearsalController.resetMutation,
    EventRehearsalController.forkMutation,
    EventRehearsalController.guestLinkMutation,
    EventRehearsalController.exportMutation,
    EventRehearsalController.shareMutation,
  ];

  /// A practice command is on its way.
  static bool busy(WidgetRef ref, String sessionId) =>
      ref.watch(EventRehearsalController.setupMutation).isPending ||
      ref.watch(EventRehearsalController.controlMutation).isPending ||
      ref.watch(EventRehearsalController.behaviorMutation).isPending ||
      ref.watch(EventRehearsalController.resetMutation).isPending ||
      ref.watch(EventRehearsalController.forkMutation).isPending ||
      ref.watch(EventRehearsalController.guestLinkMutation).isPending ||
      ref.watch(EventRehearsalController.exportMutation).isPending ||
      ref.watch(EventRehearsalController.shareMutation).isPending ||
      ref
          .watch(eventRehearsalRuntimeOperationControllerProvider(sessionId))
          .isSubmitting;

  /// Moves the rehearsal's run: start, pause, resume, a step on or back,
  /// the virtual clock forward [minutes], or complete.
  void control(
    EventRehearsalSession session,
    EventRehearsalControlAction action, {
    int? minutes,
  }) => _quietly(
    EventRehearsalController.controlMutation.run(
      ref,
      (tx) => tx
          .get(eventRehearsalControllerProvider.notifier)
          .control(session: session, action: action, minutes: minutes),
    ),
  );

  /// The next step, or the start when the rehearsal has not started.
  void next(EventRehearsalSession session) => control(
    session,
    session.hasStarted
        ? EventRehearsalControlAction.advance
        : EventRehearsalControlAction.start,
  );

  /// Makes one made-up guest do [behavior].
  void behave(
    EventRehearsalSession session,
    String actorId,
    EventRehearsalBehavior behavior,
  ) => _quietly(
    EventRehearsalController.behaviorMutation.run(
      ref,
      (tx) => tx
          .get(eventRehearsalControllerProvider.notifier)
          .inject(
            session: session,
            actorId: actorId,
            behavior: behavior,
            fault: session.fault,
          ),
    ),
  );

  /// Turns on a practice fault, or none.
  void fault(EventRehearsalSession session, EventRehearsalFault fault) =>
      _quietly(
        EventRehearsalController.behaviorMutation.run(
          ref,
          (tx) => tx
              .get(eventRehearsalControllerProvider.notifier)
              .inject(session: session, fault: fault),
        ),
      );

  void saveSetup(
    EventRehearsalSession session,
    EventRehearsalSetup setup,
    EventRehearsalScenario scenario,
    int actorCount,
  ) => _quietly(
    EventRehearsalController.setupMutation.run(
      ref,
      (tx) => tx
          .get(eventRehearsalControllerProvider.notifier)
          .updateSetup(
            session: session,
            setup: setup,
            scenario: scenario,
            actorCount: actorCount,
          ),
    ),
  );

  /// Records one round's outcomes through the rehearsal's runtime
  /// operation, which owns its retry.
  Future<bool> recordOutcomes(
    EventRehearsalBootstrap rehearsal, {
    required int expectedRevision,
    required int roundIndex,
    required List<EventSuccessUnitOutcomeEntryInput> entries,
  }) async {
    try {
      await _runtime.recordOutcomes(
        snapshot: rehearsal,
        expectedRevision: expectedRevision,
        roundIndex: roundIndex,
        entries: entries,
      );
      return true;
    } on Object {
      return false;
    }
  }

  /// Starts, publishes or stops the practice reveal.
  void changeReveal(
    EventRehearsalBootstrap rehearsal,
    RehearsalRevealAction decision, {
    int? expectedRound,
    int? countdownSeconds,
  }) => _quietly(
    _runtime.changeReveal(
      snapshot: rehearsal,
      decision: decision,
      expectedRound: expectedRound,
      countdownSeconds: countdownSeconds,
    ),
  );

  /// Resends the runtime operation the server has not confirmed.
  void retryRuntime() => _quietly(_runtime.retry());

  Future<void> copyGuestLink(String guestUrl) async {
    final copied = context.l10n.hostEventRehearsalLinkCopied;
    try {
      await EventRehearsalController.shareMutation.run(
        ref,
        (tx) => tx
            .get(eventRehearsalControllerProvider.notifier)
            .copyGuestLink(guestUrl),
      );
    } on Object {
      return;
    }
    if (context.mounted) {
      showCatchNotice(context, copied, tone: CatchNoticeTone.success);
    }
  }

  void shareGuestLink(String guestUrl) => _quietly(
    EventRehearsalController.shareMutation.run(
      ref,
      (tx) => tx
          .get(eventRehearsalControllerProvider.notifier)
          .shareGuestLink(guestUrl),
    ),
  );

  Future<void> rotateGuestLink() async {
    final l10n = context.l10n;
    final confirmed = await showCatchConfirmDialog(
      copy: catchDialogCopy(l10n),
      context: context,
      title: l10n.hostEventRehearsalRotateLink,
      message: l10n.hostEventRehearsalRotateLinkBody,
      confirmLabel: l10n.hostEventRehearsalRotateLink,
    );
    if (confirmed != true || !context.mounted) return;
    _quietly(
      EventRehearsalController.guestLinkMutation.run(
        ref,
        (tx) => tx
            .get(eventRehearsalControllerProvider.notifier)
            .rotateGuestLink(sessionId),
      ),
    );
  }

  Future<void> reset() async {
    final l10n = context.l10n;
    final confirmed = await showCatchConfirmDialog(
      copy: catchDialogCopy(l10n),
      context: context,
      title: l10n.hostEventRehearsalReset,
      message: l10n.hostEventRehearsalResetBody,
      confirmLabel: l10n.hostEventRehearsalReset,
    );
    if (confirmed != true || !context.mounted) return;
    _quietly(
      EventRehearsalController.resetMutation.run(
        ref,
        (tx) =>
            tx.get(eventRehearsalControllerProvider.notifier).reset(sessionId),
      ),
    );
  }

  /// Copies the rehearsal into a new one and opens it.
  Future<void> fork() async {
    final EventRehearsalCreated created;
    try {
      created = await EventRehearsalController.forkMutation.run(
        ref,
        (tx) =>
            tx.get(eventRehearsalControllerProvider.notifier).fork(sessionId),
      );
    } on Object {
      return;
    }
    if (!context.mounted) return;
    context.goNamed(
      Routes.hostEventRehearsalScreen.name,
      pathParameters: {
        'organizerId': organizerId,
        'sessionId': created.sessionId,
      },
    );
  }

  /// Copies the rehearsal's reproduction: its setup and actions, no
  /// production ids.
  Future<void> export() async {
    final copied = context.l10n.hostEventRehearsalReproductionCopied;
    try {
      await EventRehearsalController.exportMutation.run(
        ref,
        (tx) => tx
            .get(eventRehearsalControllerProvider.notifier)
            .exportReproduction(sessionId),
      );
    } on Object {
      return;
    }
    if (context.mounted) {
      showCatchNotice(context, copied, tone: CatchNoticeTone.success);
    }
  }

  /// Says that practice sends nothing, for a console button that would
  /// message real guests on the night.
  void nothingSent() =>
      showCatchNotice(context, context.l10n.hostEventsRehearsalNothingSent);

  EventRehearsalRuntimeOperationController get _runtime => ref.read(
    eventRehearsalRuntimeOperationControllerProvider(sessionId).notifier,
  );
}

/// Runs a practice command and lets it fail quietly here: its mutation or
/// runtime operation is watched for errors, which the screen shows.
void _quietly(Future<Object?> command) =>
    unawaited(command.then<void>((_) {}, onError: (Object _) {}));
