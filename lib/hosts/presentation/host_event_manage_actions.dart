part of 'host_event_manage_screen.dart';

/// The manage screen's actions: opening the roster, messages and edit,
/// confirming cancel and delete, and the private invite links.
extension _HostEventManageActions on _HostEventManageScreenState {
  void _openRoster() {
    widget.onSectionChanged?.call(HostEventManageSection.guests);
    if (GoRouter.maybeOf(context) != null) {
      context.pushNamed(
        Routes.hostEventRosterScreen.name,
        pathParameters: {
          'organizerId': widget.organizer.id,
          'eventId': widget.event.id,
        },
        extra: widget.event,
      );
    }
  }

  void _openEventMessages(Organizer organizer, Event event) {
    context.pushNamed(
      Routes.hostInboxScreen.name,
      queryParameters: {'eventId': event.id},
      extra: organizer,
    );
  }

  Future<void> _handleHostEventActionIntent(
    HostEventManageActionIntent intent, {
    required Event event,
    required VoidCallback onDeleted,
  }) {
    final effect = HostEventManageActionEffect.resolve(
      intent: intent,
      event: event,
    );
    switch (effect.destination) {
      case HostEventManageActionDestination.editEventRoute:
        _openEditEvent(effect);
        return Future<void>.value();
      case HostEventManageActionDestination.cancelConfirmation:
        return _confirmCancelEvent(effect.event);
      case HostEventManageActionDestination.deleteConfirmation:
        return _confirmDeleteEvent(effect.event, onDeleted);
    }
  }

  Future<void> _setPublicRegistration({
    required Event event,
    required bool enabled,
  }) async {
    try {
      await HostEventBookingController.publicRegistrationMutation.run(
        ref,
        (tx) => tx
            .get(hostEventBookingControllerProvider.notifier)
            .setPublicRegistration(event: event, enabled: enabled),
      );
    } catch (_) {
      // HostPublicRegistrationField owns the localized mutation error.
    }
  }

  void _openEditEvent(HostEventManageActionEffect effect) {
    context.pushNamed(
      Routes.hostAppEditEventScreen.name,
      pathParameters: effect.pathParameters,
      extra: effect.event,
    );
  }

  Future<void> _confirmCancelEvent(Event event) async {
    final confirmed = await showCatchAdaptiveDialog<bool>(
      context: context,
      title: context.l10n.hostsHostEventManageScreenTitleCancelThisEvent,
      message:
          context.l10n.hostsHostEventManageScreenMessageCancellingRemovesItFrom,
      actions: [
        CatchDialogAction(
          label: context.l10n.hostsHostEventManageScreenLabelKeepEvent,
          value: false,
          isDefault: true,
        ),
        CatchDialogAction(
          label: context.l10n.hostsHostEventManageScreenLabelCancelEvent,
          value: true,
          isDestructive: true,
        ),
      ],
    );
    if (confirmed != true || !mounted) return;

    unawaited(
      HostEventBookingController.hostCancelEventMutation.run(ref, (tx) async {
        await tx
            .get(hostEventManageActionsProvider)
            .cancelHostedEvent(event: event);
        if (!mounted) return;
        showCatchNotice(
          context,
          context.l10n.hostsHostEventManageScreenVisiblecopyEventCancelled,
        );
      }),
    );
  }

  Future<void> _confirmDeleteEvent(Event event, VoidCallback onDeleted) async {
    final confirmed = await showCatchAdaptiveDialog<bool>(
      context: context,
      title: context.l10n.hostsHostEventManageScreenTitleDeleteUnusedEvent,
      message: context.l10n.hostsHostEventManageScreenMessageOnlyEventsWithNo,
      actions: [
        CatchDialogAction(
          label: context.l10n.hostsHostEventManageScreenLabelKeepEvent,
          value: false,
          isDefault: true,
        ),
        CatchDialogAction(
          label: context.l10n.hostsHostEventManageScreenLabelDeleteUnusedEvent,
          value: true,
          isDestructive: true,
        ),
      ],
    );
    if (confirmed != true || !mounted) return;

    unawaited(
      HostEventBookingController.deleteEventMutation.run(ref, (tx) async {
        await tx
            .get(hostEventManageActionsProvider)
            .deleteUnusedEvent(event: event);
        if (!mounted) return;
        showCatchNotice(
          context,
          context.l10n.hostsHostEventManageScreenVisiblecopyEventDeleted,
        );
        onDeleted();
      }),
    );
  }

  void _showInviteLinkResult(String label, {bool disabled = false}) {
    if (!mounted) return;
    final l10n = context.l10n;
    showCatchNotice(
      context,
      disabled
          ? l10n.hostsHostEventManageScreenVisiblecopyLabelDisabled(
              label: label,
            )
          : l10n.hostsHostEventManageScreenVisiblecopyLabelCopied(label: label),
    );
  }

  void _logAppError(Object error, StackTrace stackTrace, String reason) {
    ref.read(errorLoggerProvider).logError(error, stackTrace, reason: reason);
  }

  Future<void> _createNamedInviteLink({
    required Event event,
    required String inviteCode,
    required HostInviteLinkDraft draft,
  }) async {
    final l10n = context.l10n;
    try {
      final label = await HostEventManageController.createInviteLinkMutation
          .run(
            ref,
            (tx) => tx
                .get(hostEventManageActionsProvider)
                .createInviteLink(
                  event: event,
                  inviteCode: inviteCode,
                  draft: draft,
                ),
          );
      _showInviteLinkResult(label);
    } catch (error, stackTrace) {
      _logAppError(
        error,
        stackTrace,
        l10n.hostsHostEventManageScreenVisiblecopyHosteventmanagescreenCreatenamedinvitelinkFailed,
      );
    }
  }

  Future<void> _copyNamedInviteLink({
    required Event event,
    required String inviteCode,
    required EventInviteLink link,
  }) async {
    final l10n = context.l10n;
    try {
      final label = await HostEventManageController.copyInviteLinkMutation.run(
        ref,
        (tx) => tx
            .get(hostEventManageActionsProvider)
            .copyInviteLink(event: event, inviteCode: inviteCode, link: link),
      );
      _showInviteLinkResult(label);
    } catch (error, stackTrace) {
      _logAppError(
        error,
        stackTrace,
        l10n.hostsHostEventManageScreenVisiblecopyHosteventmanagescreenCopynamedinvitelinkFailed,
      );
    }
  }

  Future<void> _disableNamedInviteLink({
    required Event event,
    required EventInviteLink link,
  }) async {
    final l10n = context.l10n;
    final confirmed = await showCatchAdaptiveDialog<bool>(
      context: context,
      title: l10n.hostsHostEventManageScreenTitleDisableInviteLink,
      message: l10n.hostsHostEventManageScreenMessageThisStopsNewAttribution(
        label: link.label,
      ),
      actions: [
        CatchDialogAction(
          label: l10n.hostsHostEventManageScreenLabelKeepActive,
          value: false,
        ),
        CatchDialogAction(
          label: l10n.hostsHostEventManageScreenLabelDisable,
          value: true,
          isDestructive: true,
        ),
      ],
    );
    if (confirmed != true) return;
    if (!mounted) return;
    try {
      final label = await HostEventManageController.disableInviteLinkMutation
          .run(
            ref,
            (tx) => tx
                .get(hostEventManageActionsProvider)
                .disableInviteLink(event: event, link: link),
          );
      _showInviteLinkResult(label, disabled: true);
    } catch (error, stackTrace) {
      _logAppError(
        error,
        stackTrace,
        l10n.hostsHostEventManageScreenVisiblecopyHosteventmanagescreenDisablenamedinvitelinkFailed,
      );
    }
  }

  void _shareHostPrivateLink({
    required Organizer organizer,
    required Event event,
    required String inviteLink,
  }) {
    final box = context.findRenderObject() as RenderBox?;
    final l10n = context.l10n;
    final origin = box == null
        ? null
        : box.localToGlobal(Offset.zero) & box.size;
    unawaited(
      HostEventManageController.sharePrivateLinkMutation
          .run(
            ref,
            (tx) => tx
                .get(hostEventManageActionsProvider)
                .sharePrivateLink(
                  organizer: organizer,
                  event: event,
                  inviteLink: inviteLink,
                  l10n: l10n,
                  origin: origin,
                ),
          )
          .then<void>(
            (_) {},
            onError: (Object error, StackTrace stackTrace) {
              _logAppError(
                error,
                stackTrace,
                l10n.hostsHostEventManageScreenVisiblecopyHosteventmanagescreenSharehostprivatelinkFailed,
              );
            },
          ),
    );
  }
}
