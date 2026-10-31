part of 'private_event_create_screen.dart';

typedef CreatePrivateEvent =
    Future<PrivateEventCreateReceipt> Function({
      required String organizerId,
      required String requestId,
      required PrivateEventBasics basics,
    });

typedef UpdatePrivateEventBasics =
    Future<PrivateEventCreateReceipt> Function(
      PrivateEventBasicsUpdateRequest request,
    );

typedef ReadPrivateEventBasics =
    Future<PrivateEventBasicSummary> Function({
      required String organizerId,
      required String eventId,
    });

typedef ReadPrivateEventOrganizerDefaults =
    Future<ManagerEventSetupDefaults> Function(String organizerId);

extension _PrivateEventCreateBody on _PrivateEventCreateScreenState {
  void _openPublication() {
    final receipt = _receipt;
    if (receipt == null || _publicationScope != null) return;
    try {
      final uid = ref.read(uidProvider).asData?.value;
      if (uid == null || uid.isEmpty) {
        throw const SignInRequiredException('manage event visibility');
      }
      final scope = (
        userId: uid,
        organizerId: widget.organizer.id,
        eventId: receipt.eventId,
      );
      _mutateScreenState(() {
        _publicationScope = scope;
        _editingPublication = true;
      });
      unawaited(
        ref.read(eventPublicationControllerProvider(scope).notifier).load(),
      );
    } catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    }
  }

  void _closePublication() {
    final scope = _publicationScope;
    if (scope == null) return;
    final event = ref.read(eventPublicationControllerProvider(scope)).event;
    _mutateScreenState(() {
      if (event != null) {
        _receipt = PrivateEventCreateReceipt(
          eventId: event.eventId,
          setupRevision: event.setupRevision,
          replayed: true,
        );
        _savedPublicationState = event.publicationState;
        _canEditSavedBasics = event.canEditBasics;
        _canChangeSavedCity = event.canChangeCity;
      }
      _publicationScope = null;
      _editingPublication = false;
    });
    if (event == null && _receipt != null) {
      unawaited(_loadSavedEvent(savedEventId: _receipt!.eventId));
    }
  }

  void _openDetails() {
    final receipt = _receipt;
    if (receipt == null || _detailsScope != null) {
      return;
    }
    try {
      final uid = ref.read(uidProvider).asData?.value;
      if (uid == null || uid.isEmpty) {
        throw const SignInRequiredException('edit private event details');
      }
      final scope = (
        userId: uid,
        organizerId: widget.organizer.id,
        eventId: receipt.eventId,
      );
      _mutateScreenState(() {
        _detailsScope = scope;
        _editingDetails = true;
      });
      unawaited(
        ref.read(privateEventDetailsControllerProvider(scope).notifier).load(),
      );
    } catch (error, stackTrace) {
      app_ops.logAppError(
        error,
        stackTrace: stackTrace,
        context: const app_ops.AppErrorContext(
          operation: app_ops.AppOperation.ui,
          action: 'open private event details',
          resource: 'private_event_details',
        ),
        logError: ref.read(errorLoggerProvider),
      );
      if (!mounted) {
        return;
      }
      ref
          .read(catchNoticeControllerProvider.notifier)
          .show(
            CatchNoticeData(
              id: 'private-event-details-open-error',
              title: context.l10n.hostsEventPreferenceError,
              message: appErrorMessage(
                error,
                l10n: context.l10n,
                context: AppErrorContext.event,
              ),
              tone: CatchNoticeTone.danger,
            ),
          );
    }
  }

  void _closeDetails() {
    final scope = _detailsScope;
    if (scope == null) return;
    final latestRevision = ref
        .read(privateEventDetailsControllerProvider(scope))
        .event
        ?.setupRevision;
    _mutateScreenState(() {
      if (latestRevision != null &&
          _receipt != null &&
          latestRevision > _receipt!.setupRevision) {
        _receipt = PrivateEventCreateReceipt(
          eventId: _receipt!.eventId,
          setupRevision: latestRevision,
          replayed: true,
        );
      }
      _detailsScope = null;
      _editingDetails = false;
    });
  }

  void _openPreferences() {
    final receipt = _receipt;
    if (receipt == null || _preferencesScope != null) {
      return;
    }
    try {
      final uid = ref.read(uidProvider).asData?.value;
      if (uid == null || uid.isEmpty) {
        throw const SignInRequiredException('edit private event settings');
      }
      final scope = (
        userId: uid,
        organizerId: widget.organizer.id,
        eventId: receipt.eventId,
      );
      _mutateScreenState(() {
        _preferencesScope = scope;
        _editingPreferences = true;
      });
      unawaited(
        ref
            .read(privateEventPreferencesControllerProvider(scope).notifier)
            .load(),
      );
    } catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    }
  }

  void _closePreferences() {
    final scope = _preferencesScope;
    if (scope == null) {
      return;
    }
    final latestRevision = ref
        .read(privateEventPreferencesControllerProvider(scope))
        .event
        ?.setupRevision;
    _mutateScreenState(() {
      if (latestRevision != null &&
          _receipt != null &&
          latestRevision > _receipt!.setupRevision) {
        _receipt = PrivateEventCreateReceipt(
          eventId: _receipt!.eventId,
          setupRevision: latestRevision,
          replayed: true,
        );
      }
      _preferencesScope = null;
      _editingPreferences = false;
    });
  }

  Future<void> _loadOrganizerDefaults() async {
    final read = widget.readOrganizerDefaults;
    if (read == null) {
      return;
    }
    _mutateScreenState(() {
      _loadingManagerDefaults = true;
      _managerDefaultsError = null;
    });
    try {
      final defaults = await read(widget.organizer.id);
      if (!mounted) {
        return;
      }
      if (defaults.organizerId != widget.organizer.id) {
        throw const FormatException('Organizer defaults identity changed');
      }
      final startingValues =
          widget.initialDraft ?? widget.initialPrefill?.values;
      _mutateScreenState(() {
        _managerDefaults = defaults;
        _loadingManagerDefaults = false;
        if (_submittedPayloadJson != null || _receipt != null) {
          return;
        }
        if (startingValues == null) {
          _cityInherited = defaults.cityId != null && defaults.marketId != null;
          _timezoneInherited = defaults.timezone != null;
        } else {
          _cityInherited = startingValues.eventCityMode == 'inherit';
          _timezoneInherited = startingValues.eventTimezoneMode == 'inherit';
          _defaultsChanged =
              (_cityInherited || _timezoneInherited) &&
              (startingValues.eventReviewedDefaultsHash !=
                      defaults.basicsReviewedHash ||
                  (_cityInherited && defaults.cityId == null) ||
                  (_timezoneInherited && defaults.timezone == null));
        }
        if (_cityInherited &&
            defaults.cityId != null &&
            defaults.marketId != null) {
          _city = defaultCityOptions
              .where(
                (option) =>
                    option.effectiveCityId == defaults.cityId &&
                    option.effectiveMarketId == defaults.marketId,
              )
              .firstOrNull;
          _savedCity = EventSetupCity(
            cityId: defaults.cityId!,
            marketId: defaults.marketId!,
          );
        }
        if (_timezoneInherited && defaults.timezone != null) {
          _timezoneController.text = defaults.timezone!;
        }
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      _mutateScreenState(() {
        _loadingManagerDefaults = false;
        _managerDefaultsError = appErrorMessage(
          error,
          l10n: context.l10n,
          context: AppErrorContext.event,
        );
      });
    }
  }

  Future<void> _loadSavedEvent({String? savedEventId}) async {
    final eventId = savedEventId ?? widget.initialSavedEventId!;
    _mutateScreenState(() {
      _loadingSavedEvent = true;
      _readError = null;
    });
    try {
      final controller = ref.read(createEventDraftControllerProvider.notifier);
      final summary =
          await (widget.readSaved ?? controller.getPrivateEventSetup)(
            organizerId: widget.organizer.id,
            eventId: eventId,
          );
      if (!mounted) {
        return;
      }
      if (summary.eventId != eventId ||
          summary.organizerId != widget.organizer.id) {
        throw const FormatException('Private event read changed identity');
      }
      final basics = PrivateEventBasics(
        name: summary.name,
        city: EventSetupValue.set(summary.city),
        localDate: summary.localDate,
        localStartTime: summary.localStartTime,
        timezone: EventSetupValue.set(summary.timezone),
      );
      final drafts = await controller.loadDrafts(
        organizerId: widget.organizer.id,
      );
      if (!mounted) {
        return;
      }
      _activeDraft = drafts
          .where((draft) => draft.eventCreateReceiptEventId == eventId)
          .firstOrNull;
      _localDraftId = _activeDraft?.id ?? 'private-event-$eventId';
      _requestId = _activeDraft?.eventCreateRequestId ?? _requestId;
      _submittedSignature = _activeDraft?.eventCreatePayloadSignature;
      _submittedPayloadJson = _activeDraft?.eventCreatePayloadJson;
      _mutateScreenState(() {
        _applyExplicitBasics(basics);
        _receipt = PrivateEventCreateReceipt(
          eventId: summary.eventId,
          setupRevision: summary.setupRevision,
          replayed: true,
        );
        _savedBasics = basics;
        _savedPublicationState = summary.publicationState;
        _savedEventActive =
            summary.status == 'active' &&
            summary.startTimeMillis > DateTime.now().millisecondsSinceEpoch;
        _canEditSavedBasics = _savedEventActive && summary.canEditBasics;
        _canChangeSavedCity = _savedEventActive && summary.canChangeCity;
        if (!_savedEventActive) {
          _pendingUpdate = null;
          _editingSavedBasics = false;
          _loadingSavedEvent = false;
        }
      });
      if (_savedEventActive) await _loadPendingUpdate();
      if (mounted &&
          widget.initialPublicationReview &&
          !_openedInitialPublication &&
          _readError == null) {
        _openedInitialPublication = true;
        _openPublication();
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      _mutateScreenState(() {
        _savedBasics = null;
        _canEditSavedBasics = false;
        _canChangeSavedCity = false;
        _savedEventActive = false;
        _readError = appErrorMessage(
          error,
          l10n: context.l10n,
          context: AppErrorContext.event,
        );
        _loadingSavedEvent = false;
      });
    }
  }

  Future<void> _loadPendingUpdate() async {
    final receipt = _receipt;
    if (receipt == null) {
      return;
    }
    try {
      final pending = await ref
          .read(createEventDraftControllerProvider.notifier)
          .loadPendingBasicsUpdate(
            organizerId: widget.organizer.id,
            eventId: receipt.eventId,
          );
      if (!mounted) {
        return;
      }
      _mutateScreenState(() {
        _pendingUpdate = pending;
        _editingSavedBasics = pending != null;
        if (pending != null &&
            pending.basics.city.mode == EventSetupValueMode.set &&
            pending.basics.timezone.mode == EventSetupValueMode.set) {
          _applyExplicitBasics(pending.basics);
        }
        _loadingSavedEvent = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      _mutateScreenState(() {
        _savedBasics = null;
        _canEditSavedBasics = false;
        _canChangeSavedCity = false;
        _savedEventActive = false;
        _readError = appErrorMessage(
          error,
          l10n: context.l10n,
          context: AppErrorContext.event,
        );
        _loadingSavedEvent = false;
      });
    }
  }

  Future<void> _save() async {
    if (_saving) {
      return;
    }
    if (_receipt != null) {
      await _saveUpdate();
      return;
    }
    final pendingPayload = _submittedPayloadJson;
    if (_defaultsChanged && pendingPayload == null) {
      _mutateScreenState(() {
        _error = context.l10n.hostsPrivateEventDefaultsChanged;
      });
      return;
    }
    PrivateEventBasics? basics;
    if (pendingPayload != null) {
      try {
        basics = PrivateEventBasics.fromJson(
          Map<String, dynamic>.from(jsonDecode(pendingPayload) as Map),
        );
      } catch (_) {
        _mutateScreenState(
          () => _error = context.l10n.hostsPrivateEventPendingRequest,
        );
        return;
      }
    } else {
      basics = _basics;
    }
    if (basics == null || !basics.isValid) {
      _mutateScreenState(() => _showErrors = true);
      return;
    }
    final signature = jsonEncode(basics.toJson());
    if (_submittedSignature != null && _submittedSignature != signature) {
      _mutateScreenState(
        () => _error = context.l10n.hostsPrivateEventPendingRequest,
      );
      return;
    }
    FocusScope.of(context).unfocus();
    _mutateScreenState(() {
      _saving = true;
      _error = null;
    });
    var requestSent = false;
    try {
      // Persist the exact idempotency key and body before the network call.
      // A lost response or app restart must resume this same operation.
      _submittedSignature = signature;
      _submittedPayloadJson = signature;
      await _persistDraft();
      requestSent = true;
      final receipt =
          await (widget.create ??
              ref
                  .read(createEventDraftControllerProvider.notifier)
                  .createPrivateEvent)(
            organizerId: widget.organizer.id,
            requestId: _requestId,
            basics: basics,
          );
      if (!mounted) {
        return;
      }
      await _persistDraft(receipt: receipt);
      if (!mounted) {
        return;
      }
      _mutateScreenState(() {
        _receipt = receipt;
        _loadingSavedEvent = true;
      });
      // Replay receipts contain the revision of the original command, which
      // may now be older than the canonical event. Read the manager projection
      // before enabling any further edit or presenting its setup actions.
      await _loadSavedEvent(savedEventId: receipt.eventId);
      if (!mounted || _readError != null) {
        return;
      }
      widget.onSaved?.call(_receipt!);
    } catch (error) {
      if (!mounted) {
        return;
      }
      if (!requestSent) {
        _submittedSignature = null;
        _submittedPayloadJson = null;
      }
      // Even an authorization or validation response cannot prove this
      // request never committed: an earlier response may have been lost.
      // Keep the exact request and body until an authoritative receipt arrives.
      _mutateScreenState(
        () => _error = appErrorMessage(
          error,
          l10n: context.l10n,
          context: AppErrorContext.event,
        ),
      );
      showCatchNoticeError(context, error);
    } finally {
      if (mounted) _mutateScreenState(() => _saving = false);
    }
  }

  Future<void> _saveUpdate() async {
    final receipt = _receipt;
    if (receipt == null || (!_canEditSavedBasics && _pendingUpdate == null)) {
      return;
    }
    final existing = _pendingUpdate;
    if (_defaultsChanged && existing == null) {
      _mutateScreenState(
        () => _error = context.l10n.hostsPrivateEventDefaultsChanged,
      );
      return;
    }
    final basics = existing?.basics ?? _basics;
    if (existing == null && !_canChangeSavedCity) {
      final currentCity = basics?.city.value;
      if (currentCity == null ||
          currentCity.cityId != _savedCity?.cityId ||
          currentCity.marketId != _savedCity?.marketId) {
        _mutateScreenState(
          () => _error = context.l10n.hostsPrivateEventSetupUnavailable,
        );
        return;
      }
    }
    if (basics == null || !basics.isValid) {
      _mutateScreenState(() => _showErrors = true);
      return;
    }
    if (existing == null &&
        jsonEncode(basics.toJson()) == jsonEncode(_savedBasics?.toJson())) {
      _mutateScreenState(() => _editingSavedBasics = false);
      return;
    }
    final request =
        existing ??
        PrivateEventBasicsUpdateRequest(
          organizerId: widget.organizer.id,
          eventId: receipt.eventId,
          requestId: newPrivateEventRequestId(),
          expectedSetupRevision: receipt.setupRevision,
          basics: basics,
        );
    FocusScope.of(context).unfocus();
    _mutateScreenState(() {
      _saving = true;
      _error = null;
    });
    try {
      // The journal write must finish before any network attempt. Every
      // subsequent attempt reuses its complete command, even after a lost
      // response, a restart, or an intervening authorization failure.
      if (existing == null) {
        await ref
            .read(createEventDraftControllerProvider.notifier)
            .savePendingBasicsUpdate(request);
        _pendingUpdate = request;
      }
      final updated =
          await (widget.update ??
              ref
                  .read(createEventDraftControllerProvider.notifier)
                  .updatePrivateEventBasics)(request);
      if (!mounted) {
        return;
      }
      if (updated.eventId != request.eventId) {
        throw const FormatException('Basics update changed event identity');
      }
      await _persistDraft(receipt: updated);
      if (!mounted) {
        return;
      }
      await _loadSavedEvent(savedEventId: receipt.eventId);
      if (!mounted || _readError != null) {
        return;
      }
      await ref
          .read(createEventDraftControllerProvider.notifier)
          .clearPendingBasicsUpdate(request);
      if (!mounted) {
        return;
      }
      _mutateScreenState(() {
        _pendingUpdate = null;
        _editingSavedBasics = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      _mutateScreenState(
        () => _error = appErrorMessage(
          error,
          l10n: context.l10n,
          context: AppErrorContext.event,
        ),
      );
      showCatchNoticeError(context, error);
    } finally {
      if (mounted) _mutateScreenState(() => _saving = false);
    }
  }

  Future<void> _close() async {
    if (_saving) {
      return;
    }
    if (_pendingUpdate != null ||
        (_receipt == null && _submittedPayloadJson != null)) {
      final leave = await showCatchAdaptiveDialog<bool>(
        context: context,
        title: context.l10n.hostsPrivateEventPendingExitTitle,
        message: _pendingUpdate == null
            ? context.l10n.hostsPrivateEventPendingExitBody
            : context.l10n.hostsPrivateEventPendingUpdateExitBody,
        actions: [
          CatchDialogAction(
            label: context.l10n.hostsPrivateEventPendingStay,
            value: false,
          ),
          CatchDialogAction(
            label: context.l10n.hostsPrivateEventPendingLeave,
            value: true,
            isDefault: true,
          ),
        ],
        barrierDismissible: false,
      );
      if (!mounted || leave != true) {
        return;
      }
      _mutateScreenState(() => _allowPop = true);
      Navigator.of(context).pop();
      return;
    }
    if (_editingSavedBasics) {
      final saved = _savedBasics;
      _mutateScreenState(() {
        if (saved != null) _applyExplicitBasics(saved);
        _editingSavedBasics = false;
        _error = null;
        _showErrors = false;
      });
      return;
    }
    if (_receipt != null || !_hasChanges) {
      _mutateScreenState(() => _allowPop = true);
      Navigator.of(context).pop();
      return;
    }
    final decision = await showHostDraftExitDialog(context);
    if (!mounted || decision == null) {
      return;
    }
    switch (decision) {
      case HostDraftExitDecision.keepEditing:
        return;
      case HostDraftExitDecision.discardAndExit:
        _mutateScreenState(() => _allowPop = true);
        Navigator.of(context).pop();
        return;
      case HostDraftExitDecision.saveDraftAndExit:
        try {
          await _persistDraft();
          if (mounted) {
            _mutateScreenState(() => _allowPop = true);
            Navigator.of(context).pop();
          }
        } catch (error) {
          if (mounted) showCatchNoticeError(context, error);
        }
    }
  }

  Future<void> _persistDraft({PrivateEventCreateReceipt? receipt}) async {
    final draft = privateEventDraftSnapshot(
      old: _activeDraft,
      draftId: _localDraftId,
      organizerId: widget.organizer.id,
      name: _nameController.text.trim(),
      cityId: _city?.effectiveCityId ?? _savedCity?.cityId,
      marketId: _city?.effectiveMarketId ?? _savedCity?.marketId,
      localDate: _date == null ? null : _localDate,
      localStartTime: _start == null ? null : _localStartTime,
      timezone: _timezoneController.text.trim(),
      cityInherited: _cityInherited,
      timezoneInherited: _timezoneInherited,
      organizerDefaultsHash: _organizerDefaultsHash,
      requestId: _requestId,
      submittedSignature: _submittedSignature,
      submittedPayloadJson: _submittedPayloadJson,
      date: _date,
      start: _start,
      receipt: receipt,
    );
    await ref
        .read(createEventDraftControllerProvider.notifier)
        .saveDraft(draft);
    _activeDraft = draft;
    ref.invalidate(
      organizerEventDraftsProvider(organizerId: widget.organizer.id),
    );
  }
}
