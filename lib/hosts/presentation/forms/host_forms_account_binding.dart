part of 'host_forms_screen.dart';

extension _HostFormsAccountBinding on _HostFormsScreenState {
  void _bindAccount(String? accountId) {
    if (!_accountBound) {
      _accountBound = true;
      _boundAccountId = accountId;
      return;
    }
    if (_boundAccountId == accountId) return;
    _boundAccountId = accountId;
    _boundOrganizerId = null;
    _preferredRouteOrganizerId = null;
    _resetWorkspace();
  }

  void _bindAvailableOrganizer(String accountId, List<Organizer> organizers) {
    if (_boundAccountId != accountId) return;
    final organizer = resolveSelectedHostOrganizer(
      organizers,
      selectedOrganizerId: ref.read(hostOrganizerSelectionProvider(accountId)),
      preferredOrganizerId: _preferredRouteOrganizerId,
    );
    if (_preferredRouteOrganizerId != organizer?.id) {
      _preferredRouteOrganizerId = null;
    }
    if (organizer != null) {
      _bindOrganizer(organizer.id);
    } else if (_boundOrganizerId != null) {
      _boundOrganizerId = null;
      _resetWorkspace();
    }
  }

  void _bindOrganizer(String organizerId) {
    if (_boundOrganizerId == organizerId) return;
    if (_boundOrganizerId != null ||
        (widget.initialOrganizerId != null &&
            widget.initialOrganizerId != organizerId)) {
      _resetWorkspace();
      if (_preferredRouteOrganizerId == organizerId) {
        _responseFormId = widget.initialFormId;
        _responseContactId = widget.initialContactId;
      }
    }
    _boundOrganizerId = organizerId;
  }

  void _resetWorkspace() {
    _accountGeneration++;
    _searchDebounce?.cancel();
    _query = null;
    _responseQuery = null;
    _responseFormId = null;
    _responseContactId = null;
    _searchExpanded = false;
    _statuses = const {};
    _purposes = const {};
    _importRevision++;
    // Release only this view's ownership; an already dispatched import still
    // finishes, but its completion cannot update a later workspace.
    _importOperation = null;
    _importing = false;
    _routeSyncNeeded = true;
  }

  bool get _workspaceCurrent {
    if (!mounted || _boundAccountId == null || _boundOrganizerId == null) {
      return false;
    }
    final actor = catchAsyncStateFromAsyncValue(ref.read(uidProvider));
    if (!actor.isSettledData ||
        actor.value != _boundAccountId ||
        ref.read(firebaseAuthProvider).currentUser?.uid != _boundAccountId) {
      return false;
    }
    final organizers = catchAsyncStateFromAsyncValue(
      ref.read(hostOperableOrganizersProvider(_boundAccountId!)),
    );
    if (!organizers.isSettledData) return false;
    final selection = ref.read(
      hostOrganizerSelectionProvider(_boundAccountId!),
    );
    return resolveSelectedHostOrganizer(
          organizers.value ?? const <Organizer>[],
          selectedOrganizerId: selection,
          preferredOrganizerId: _preferredRouteOrganizerId,
        )?.id ==
        _boundOrganizerId;
  }

  void _scheduleWorkspaceRouteSync() {
    if (!_routeSyncNeeded) return;
    _routeSyncNeeded = false;
    final generation = _accountGeneration;
    final router = GoRouter.maybeOf(context);
    final uri = router?.routeInformationProvider.value.uri;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted ||
          generation != _accountGeneration ||
          router?.routeInformationProvider.value.uri != uri) {
        return;
      }
      _syncRoute();
    });
  }

  bool _directoryRequestCurrent(HostFormListRequest request) =>
      _workspaceCurrent &&
      _boundAccountId == request.accountUid &&
      _boundOrganizerId == request.organizerId &&
      _accountGeneration == request.accountGeneration;

  Future<void> _handleRowAction(
    _HostFormRowAction action,
    HostFormSummary form,
    HostFormListRequest request,
  ) async {
    if (!_directoryRequestCurrent(request) ||
        form.organizerId != request.organizerId) {
      return;
    }
    final actionContext = context;
    if (action == _HostFormRowAction.analytics) {
      await actionContext.pushNamed(
        Routes.hostFormAnalyticsScreen.name,
        pathParameters: {'formId': form.formId},
        queryParameters: {'organizerId': form.organizerId},
      );
      return;
    }
    if (action == _HostFormRowAction.automations) {
      await actionContext.pushNamed(
        Routes.hostFormAutomationsScreen.name,
        pathParameters: {'formId': form.formId},
        queryParameters: {'organizerId': form.organizerId},
      );
      return;
    }
    try {
      switch (action) {
        case _HostFormRowAction.analytics:
        case _HostFormRowAction.automations:
          break;
        case _HostFormRowAction.duplicate:
          final duplicate = await ref
              .read(hostFormsControllerProvider)
              .duplicate(source: form, requestId: _requestId('duplicate'));
          if (!_directoryRequestCurrent(request)) return;
          ref.invalidate(hostFormsDirectoryControllerProvider(request));
          if (!actionContext.mounted) return;
          await actionContext.pushNamed(
            Routes.hostFormBuilderScreen.name,
            pathParameters: {'formId': duplicate.form.formId},
            queryParameters: {'organizerId': form.organizerId},
          );
          return;
        case _HostFormRowAction.pause:
        case _HostFormRowAction.resume:
        case _HostFormRowAction.archive:
          final lifecycleAction = switch (action) {
            _HostFormRowAction.pause => HostFormLifecycleAction.pause,
            _HostFormRowAction.resume => HostFormLifecycleAction.resume,
            _ => HostFormLifecycleAction.archive,
          };
          if (lifecycleAction == HostFormLifecycleAction.archive) {
            final confirmed = await showCatchConfirmDialog(
              copy: catchDialogCopy(actionContext.l10n),
              context: actionContext,
              title: actionContext.l10n.hostFormsArchiveConfirmTitle,
              message: actionContext.l10n.hostFormsArchiveConfirmBody,
              confirmLabel: actionContext.l10n.hostFormsArchive,
              danger: true,
            );
            if (confirmed != true || !_directoryRequestCurrent(request)) {
              return;
            }
          }
          await ref
              .read(hostFormsControllerProvider)
              .setLifecycle(form: form, action: lifecycleAction);
          if (!_directoryRequestCurrent(request)) return;
          ref.invalidate(hostFormsDirectoryControllerProvider(request));
          return;
        case _HostFormRowAction.delete:
          final confirmed = await showCatchConfirmDialog(
            copy: catchDialogCopy(actionContext.l10n),
            context: actionContext,
            title: actionContext.l10n.hostFormsDeleteConfirmTitle,
            message: actionContext.l10n.hostFormsDeleteConfirmBody,
            confirmLabel: actionContext.l10n.hostFormsDeleteDraft,
            danger: true,
          );
          if (confirmed != true || !_directoryRequestCurrent(request)) return;
          await ref.read(hostFormsControllerProvider).deleteDraft(form);
          if (!_directoryRequestCurrent(request)) return;
          ref.invalidate(hostFormsDirectoryControllerProvider(request));
          return;
      }
    } on Object catch (error) {
      if (!_directoryRequestCurrent(request)) return;
      if (!actionContext.mounted) return;
      showCatchNoticeError(actionContext, error);
    }
  }
}
