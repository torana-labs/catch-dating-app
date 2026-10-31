part of 'host_event_rehearsal_screen.dart';

mixin _HostEventRehearsalScreenActions
    on ConsumerState<HostEventRehearsalScreen> {
  Future<void> _showGuests(EventRehearsalBootstrap rehearsal) =>
      showCatchBottomSheet<void>(
        context: context,
        builder: (_) => CatchSheet.standard(
          title: context.l10n.eventSuccessLiveWorkspaceGuests,
          badge: context.l10n.hostEventRehearsalBadge,
          badgeTone: CatchBadgeTone.danger,
          child: EventRehearsalRosterSection(rehearsal: rehearsal),
        ),
      );

  Future<void> _showCoachWhy(EventRehearsalBootstrap rehearsal) async {
    await showCatchAdaptiveDialog<void>(
      context: context,
      title: context.l10n.hostEventRehearsalCoachWhyTitle,
      message: context.l10n.hostEventRehearsalCoachWhyBody,
      actions: [
        CatchDialogAction(
          label: context.l10n.hostEventRehearsalCoachGotIt,
          value: null,
          isDefault: true,
        ),
      ],
    );
  }

  Future<void> _retryRuntimeOperation(String sessionId) async {
    try {
      await ref
          .read(
            eventRehearsalRuntimeOperationControllerProvider(
              sessionId,
            ).notifier,
          )
          .retry();
    } on Object {
      // The shared runtime surface renders the retained operation error.
    }
  }

  Future<void> _changeReveal(
    EventRehearsalBootstrap rehearsal,
    RehearsalRevealAction decision, {
    int? expectedRound,
    int? countdownSeconds,
  }) async {
    try {
      await ref
          .read(
            eventRehearsalRuntimeOperationControllerProvider(
              rehearsal.session.id,
            ).notifier,
          )
          .changeReveal(
            snapshot: rehearsal,
            decision: decision,
            expectedRound: expectedRound,
            countdownSeconds: countdownSeconds,
          );
    } on Object {
      // The shared reveal surface renders the controller's retained error.
    }
  }

  Future<void> _recordOutcomes(
    EventRehearsalBootstrap rehearsal, {
    required int expectedRevision,
    required int roundIndex,
    required List<EventSuccessUnitOutcomeEntryInput> entries,
  }) async {
    try {
      await ref
          .read(
            eventRehearsalRuntimeOperationControllerProvider(
              rehearsal.session.id,
            ).notifier,
          )
          .recordOutcomes(
            snapshot: rehearsal,
            expectedRevision: expectedRevision,
            roundIndex: roundIndex,
            entries: entries,
          );
    } on Object {
      // The shared outcome surface renders the controller's retained error.
    }
  }

  Future<List<EventSuccessSpatialDestination>> _previewSpatial(
    EventRehearsalRuntimeProjection runtime,
    EventRehearsalBootstrap rehearsal,
    EventSuccessAssignment assignment,
  ) async {
    final actor = rehearsal.actors
        .where((candidate) => candidate.actorId == assignment.uid)
        .firstOrNull;
    final assignmentsByUnit = <String, List<EventSuccessAssignment>>{};
    for (final candidate in runtime.assignments) {
      final unitId = candidate.layoutUnitId;
      if (unitId == null || candidate.uid == assignment.uid) continue;
      assignmentsByUnit.putIfAbsent(unitId, () => []).add(candidate);
    }
    return [
      for (final unit in runtime.layout.units)
        if (unit.id != assignment.layoutUnitId)
          () {
            final occupants = assignmentsByUnit[unit.id] ?? const [];
            final full = occupants.length >= unit.capacity;
            final conflicts =
                actor != null &&
                occupants.any(
                  (occupant) => actor.keepApartActorIds.contains(occupant.uid),
                );
            return EventSuccessSpatialDestination(
              unitId: unit.id,
              valid: !full && !conflicts,
              reason: full
                  ? EventSuccessSpatialDestinationReason.capacity
                  : conflicts
                  ? EventSuccessSpatialDestinationReason.safetyKeepApart
                  : null,
              recommendedScope: actor?.status == EventRehearsalActorStatus.late
                  ? EventSuccessSpatialScope.thisRound
                  : EventSuccessSpatialScope.pinned,
            );
          }(),
    ];
  }

  Future<void> _controlSpatial(
    EventRehearsalSession session,
    String actorId,
    EventRehearsalSpatialAction action, {
    String? destinationUnitId,
    EventRehearsalSpatialScope? scope,
  }) async {
    try {
      await EventRehearsalController.spatialMutation.run(
        ref,
        (tx) => tx
            .get(eventRehearsalControllerProvider.notifier)
            .controlSpatial(
              session: session,
              actorId: actorId,
              action: action,
              destinationUnitId: destinationUnitId,
              scope: scope,
            ),
      );
    } on Object {
      // The mutation listener owns user-visible action failure.
    }
  }

  Future<void> _copyGuestLink(String guestUrl) async {
    try {
      await EventRehearsalController.shareMutation.run(
        ref,
        (tx) => tx
            .get(eventRehearsalControllerProvider.notifier)
            .copyGuestLink(guestUrl),
      );
      if (mounted) {
        showCatchNotice(
          context,
          context.l10n.hostEventRehearsalLinkCopied,
          tone: CatchNoticeTone.success,
        );
      }
    } on Object {
      // The mutation listener owns user-visible action failure.
    }
  }

  Future<void> _shareGuestLink(String guestUrl) async {
    try {
      await EventRehearsalController.shareMutation.run(
        ref,
        (tx) => tx
            .get(eventRehearsalControllerProvider.notifier)
            .shareGuestLink(guestUrl),
      );
    } on Object {
      // The mutation listener owns user-visible action failure.
    }
  }

  Future<void> _rotateGuestLink() async {
    final confirmed = await showCatchConfirmDialog(
      copy: catchDialogCopy(context.l10n),
      context: context,
      title: context.l10n.hostEventRehearsalRotateLink,
      message: context.l10n.hostEventRehearsalRotateLinkBody,
      confirmLabel: context.l10n.hostEventRehearsalRotateLink,
    );
    if (confirmed != true || !mounted) return;
    try {
      await EventRehearsalController.guestLinkMutation.run(
        ref,
        (tx) => tx
            .get(eventRehearsalControllerProvider.notifier)
            .rotateGuestLink(widget.sessionId),
      );
    } on Object {
      // The mutation listener owns user-visible action failure.
    }
  }

  Future<void> _reset() async {
    final confirmed = await showCatchConfirmDialog(
      copy: catchDialogCopy(context.l10n),
      context: context,
      title: context.l10n.hostEventRehearsalReset,
      message: context.l10n.hostEventRehearsalResetBody,
      confirmLabel: context.l10n.hostEventRehearsalReset,
    );
    if (confirmed != true || !mounted) return;
    try {
      await EventRehearsalController.resetMutation.run(
        ref,
        (tx) => tx
            .get(eventRehearsalControllerProvider.notifier)
            .reset(widget.sessionId),
      );
    } on Object {
      // The mutation listener owns user-visible action failure.
    }
  }

  Future<void> _fork() async {
    try {
      final created = await EventRehearsalController.forkMutation.run(
        ref,
        (tx) => tx
            .get(eventRehearsalControllerProvider.notifier)
            .fork(widget.sessionId),
      );
      if (!mounted) return;
      context.goNamed(
        Routes.hostEventRehearsalScreen.name,
        pathParameters: {
          'organizerId': widget.clubId,
          'sessionId': created.sessionId,
        },
      );
    } on Object {
      // The mutation listener owns user-visible action failure.
    }
  }

  Future<void> _export() async {
    try {
      await EventRehearsalController.exportMutation.run(
        ref,
        (tx) => tx
            .get(eventRehearsalControllerProvider.notifier)
            .exportReproduction(widget.sessionId),
      );
      if (mounted) {
        showCatchNotice(
          context,
          context.l10n.hostEventRehearsalReproductionCopied,
          tone: CatchNoticeTone.success,
        );
      }
    } on Object {
      // The mutation listener owns user-visible action failure.
    }
  }
}
