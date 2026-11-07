part of 'host_operational_roster_section.dart';

extension _HostOperationalRosterActions on _HostOperationalRosterSectionState {
  static const _rosterIntakeJournal = HostRosterIntakeDraftJournal();

  bool get _showsProviderSource {
    final provider = widget.bookingProvider;
    return widget._view == _HostOperationalRosterView.guestIntake &&
        provider != null &&
        provider != ExternalBookingProvider.catchPlatform;
  }

  /// Starts the provider setup listener the first time the field opens.
  void _openProviderSetup() {
    if (!_providerSetupRequested) {
      _setLocalState(() => _providerSetupRequested = true);
    }
  }

  /// The provider setup listener, once requested. A setup whose connection
  /// view is missing or incomplete shows the boundary's error state.
  AsyncValue<HostProviderSetup>? _watchProviderSetup() {
    if (!_providerSetupRequested || !_showsProviderSource) return null;
    final provider = hostProviderSetupProvider(
      widget.organizerId,
      widget.eventId,
    );
    ref.listen(provider, (previous, next) {
      if (next case AsyncError(
        :final error,
        :final stackTrace,
      ) when previous is! AsyncError) {
        app_ops.logAppError(
          error,
          stackTrace: stackTrace,
          context: const app_ops.AppErrorContext(
            operation: app_ops.AppOperation.ui,
            action: 'load organizer booking provider setup',
            resource: 'host_provider_setup',
          ),
          logError: ref.read(errorLoggerProvider),
        );
      }
    });
    return switch (ref.watch(provider)) {
      AsyncData(:final value)
          when value.sourceCoverage != HostProviderSetupCoverage.complete =>
        AsyncError(
          HostProviderSetupUnavailable(value.sourceCoverage),
          StackTrace.current,
        ),
      final setup => setup,
    };
  }

  /// Restarts the provider setup listener from the error state, which shows
  /// for a failed listener and for a connection view that is not complete.
  void _retryProviderSetup() => ref.invalidate(
    hostProviderSetupProvider(widget.organizerId, widget.eventId),
  );

  Future<void> _connectLuma() async {
    final input = await showCatchBottomSheet<HostLumaConnectionInput>(
      context: context,
      builder: (context) => HostLumaConnectionSheet(
        organizerId: widget.organizerId,
        eventId: widget.eventId,
        controller: ref.read(hostOperationalRosterControllerProvider),
      ),
    );
    if (input == null || !mounted) return;
    _setLocalState(() {
      _providerMutationPending = true;
      _mutationError = null;
    });
    try {
      await ref
          .read(hostOperationalRosterControllerProvider)
          .connectLuma(
            organizerId: widget.organizerId,
            eventId: widget.eventId,
            externalEventId: input.externalEventId,
            apiKey: input.apiKey,
          );
      if (!mounted) return;
      showCatchNotice(
        context,
        context.l10n.hostsOperationalRosterProviderConnected,
      );
    } catch (error) {
      if (mounted) _setLocalState(() => _mutationError = error);
    } finally {
      if (mounted) _setLocalState(() => _providerMutationPending = false);
    }
  }

  Future<void> _syncProvider() async {
    if (_providerMutationPending) return;
    final operationId = _providerSyncOperationId ??=
        _newProviderSyncOperationId();
    _setLocalState(() {
      _providerMutationPending = true;
      _mutationError = null;
    });
    try {
      final result = await ref
          .read(hostOperationalRosterControllerProvider)
          .syncProvider(
            organizerId: widget.organizerId,
            eventId: widget.eventId,
            clientOperationId: operationId,
          );
      _providerSyncOperationId = null;
      if (!mounted) return;
      showCatchNotice(
        context,
        context.l10n.hostsOperationalRosterProviderSyncSuccess(
          created: result.createdCount,
          updated: result.updatedCount,
          skipped: result.skippedCount,
        ),
      );
    } catch (error) {
      if (mounted) _setLocalState(() => _mutationError = error);
    } finally {
      if (mounted) _setLocalState(() => _providerMutationPending = false);
    }
  }

  Future<void> _disconnectProvider() async {
    final connection = ref
        .read(hostProviderSetupProvider(widget.organizerId, widget.eventId))
        .asData
        ?.value
        .mappedConnection;
    if (connection == null || _providerMutationPending) return;
    final confirmed = await showCatchConfirmDialog(
      copy: catchDialogCopy(context.l10n),
      context: context,
      title: context.l10n.hostsOperationalRosterProviderDisconnectTitle,
      message: context.l10n.hostsOperationalRosterProviderDisconnectBody,
      confirmLabel: context.l10n.hostsOperationalRosterProviderDisconnect,
      danger: true,
    );
    if (confirmed != true || !mounted) return;
    _setLocalState(() {
      _providerMutationPending = true;
      _mutationError = null;
    });
    try {
      await ref
          .read(hostOperationalRosterControllerProvider)
          .disconnectProvider(
            organizerId: widget.organizerId,
            eventId: widget.eventId,
            connectionId: connection.connectionId,
          );
    } catch (error) {
      if (mounted) _setLocalState(() => _mutationError = error);
    } finally {
      if (mounted) _setLocalState(() => _providerMutationPending = false);
    }
  }

  Future<void> _pickRoster() async {
    final operation = ++_importGeneration;
    final eventId = widget.eventId;
    final organizerId = widget.organizerId;
    final accountId = ref.read(uidProvider).asData?.value;
    if (accountId == null) return;
    bool sameScope() =>
        mounted &&
        _importGeneration == operation &&
        widget.eventId == eventId &&
        widget.organizerId == organizerId &&
        ref.read(uidProvider).asData?.value == accountId;
    _setLocalState(() {
      _importing = true;
      _mutationError = null;
    });
    try {
      final table = await ref
          .read(hostOperationalRosterControllerProvider)
          .pickRosterFile(providerHint: widget.bookingProvider);
      if (table == null || !sameScope() || !mounted) return;
      final plan = await showHostRosterMapping(
        context,
        table,
        suggestedRevenueAmountMinor: widget.suggestedRevenueAmountMinor,
        defaultRevenueCurrency: widget.revenueCurrency,
      );
      if (plan == null || !sameScope() || !mounted) return;
      final initial = await ref
          .read(hostOperationalRosterControllerProvider)
          .startRosterIntake(
            eventId: eventId,
            organizerId: organizerId,
            plan: plan,
          );
      if (!sameScope() || !mounted) return;
      await _rosterIntakeJournal.save(
        userId: accountId,
        organizerId: organizerId,
        eventId: eventId,
        sessionId: initial.sessionId,
      );
      if (!sameScope() || !mounted) return;
      _setLocalState(() => _savedRosterIntakeSessionId = initial.sessionId);
      final applied = await _reviewRosterIntake(initial, sameScope: sameScope);
      if (applied == null || !sameScope() || !mounted) return;
      await _completeRosterIntake(
        eventId: eventId,
        organizerId: organizerId,
        accountId: accountId,
        applied: applied,
      );
    } on HostRosterImportException catch (error) {
      if (sameScope() && mounted) {
        showCatchNotice(
          context,
          hostRosterImportIssueCopy(context, error.issue),
        );
      }
    } catch (error) {
      if (sameScope() && mounted) showCatchNoticeError(context, error);
    } finally {
      if (mounted && operation == _importGeneration) {
        _setLocalState(() => _importing = false);
      }
    }
  }

  Future<void> _loadRosterIntakeDraft() async {
    final eventId = widget.eventId;
    final organizerId = widget.organizerId;
    final accountId = ref.read(uidProvider).asData?.value;
    if (accountId == null) return;
    final sessionId = await _rosterIntakeJournal.load(
      userId: accountId,
      organizerId: organizerId,
      eventId: eventId,
    );
    if (!mounted ||
        widget.eventId != eventId ||
        widget.organizerId != organizerId ||
        ref.read(uidProvider).asData?.value != accountId) {
      return;
    }
    _setLocalState(() => _savedRosterIntakeSessionId = sessionId);
  }

  Future<void> _resumeRosterIntake() async {
    final operation = ++_importGeneration;
    final sessionId = _savedRosterIntakeSessionId;
    final eventId = widget.eventId;
    final organizerId = widget.organizerId;
    final accountId = ref.read(uidProvider).asData?.value;
    if (sessionId == null || accountId == null) return;
    bool sameScope() =>
        mounted &&
        _importGeneration == operation &&
        widget.eventId == eventId &&
        widget.organizerId == organizerId &&
        ref.read(uidProvider).asData?.value == accountId;
    _setLocalState(() {
      _importing = true;
      _mutationError = null;
    });
    try {
      final review = await ref
          .read(hostOperationalRosterControllerProvider)
          .resumeRosterIntake(sessionId);
      if (!sameScope() || !mounted) return;
      final applied = await _reviewRosterIntake(review, sameScope: sameScope);
      if (applied == null || !sameScope() || !mounted) return;
      await _completeRosterIntake(
        eventId: eventId,
        organizerId: organizerId,
        accountId: accountId,
        applied: applied,
      );
    } catch (error) {
      if (sameScope() && mounted) showCatchNoticeError(context, error);
    } finally {
      if (mounted && operation == _importGeneration) {
        _setLocalState(() => _importing = false);
      }
    }
  }

  Future<HostRosterIntakeReview?> _reviewRosterIntake(
    HostRosterIntakeReview initial, {
    required bool Function() sameScope,
  }) => showHostRosterIntakeReview(
    context,
    review: initial,
    scopeRevision: _rosterIntakeScopeRevision,
    onSetExcluded: (review, rowIds) {
      if (!sameScope()) throw StateError('Host event scope changed.');
      return ref
          .read(hostOperationalRosterControllerProvider)
          .setRosterIntakeExcludedRows(review, rowIds);
    },
    onApply: (review) {
      if (!sameScope()) throw StateError('Host event scope changed.');
      return ref
          .read(hostOperationalRosterControllerProvider)
          .applyRosterIntake(review, organizerId: widget.organizerId);
    },
  );

  Future<void> _completeRosterIntake({
    required String eventId,
    required String organizerId,
    required String accountId,
    required HostRosterIntakeReview applied,
  }) async {
    await _showAppliedRosterReceipt(eventId: eventId, review: applied);
    await _rosterIntakeJournal.clear(
      userId: accountId,
      organizerId: organizerId,
      eventId: eventId,
      sessionId: applied.sessionId,
    );
    if (mounted && widget.eventId == eventId) {
      _setLocalState(() => _savedRosterIntakeSessionId = null);
    }
  }

  Future<void> _showAppliedRosterReceipt({
    required String eventId,
    required HostRosterIntakeReview review,
  }) async {
    final result = review.result;
    if (result == null || !mounted || widget.eventId != eventId) return;
    await showCatchBottomSheet<void>(
      context: context,
      builder: (context) => CatchSheet.standard(
        title: context.l10n.hostsOperationalRosterImportSuccess(
          created: result.createdCount,
          updated: result.updatedCount,
          skipped: result.skippedCount,
        ),
        subtitle: review.fileName,
        footer: CatchButton.sheet(
          role: CatchButtonEmphasis.dismiss,
          label: context.l10n.hostsOperationalRosterImportResultDone,
          onPressed: () => Navigator.of(context).pop(),
        ),
        child: CatchSection.fieldRows(
          first: true,
          children: [
            CatchField.read(
              copy: catchFieldCopy(context.l10n),
              title: result.importId,
              body: review.reviewHash,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showManualGuest() async {
    final scopeGeneration = _importGeneration;
    final eventId = widget.eventId;
    final organizerId = widget.organizerId;
    final accountId = ref.read(uidProvider).asData?.value;
    if (accountId == null) return;
    final row = await showCatchBottomSheet<EventAttendeeImportRow>(
      context: context,
      builder: (context) => const HostManualAttendeeSheet(),
    );
    if (row == null ||
        !mounted ||
        _importGeneration != scopeGeneration ||
        widget.eventId != eventId ||
        widget.organizerId != organizerId ||
        ref.read(uidProvider).asData?.value != accountId) {
      return;
    }
    final operation = ++_importGeneration;
    _setLocalState(() {
      _importing = true;
      _mutationError = null;
    });
    try {
      await _importRows(
        generation: operation,
        eventId: eventId,
        organizerId: organizerId,
        accountId: accountId,
        fileName: 'manual-entry',
        format: EventAttendeeImportFormat.manual,
        rows: [row],
      );
    } catch (error) {
      if (mounted &&
          _importGeneration == operation &&
          widget.eventId == eventId &&
          widget.organizerId == organizerId &&
          ref.read(uidProvider).asData?.value == accountId) {
        showCatchNoticeError(context, error);
      }
    } finally {
      if (mounted && operation == _importGeneration) {
        _setLocalState(() => _importing = false);
      }
    }
  }

  Future<void> _showRosterHandoff() async {
    _setLocalState(() {
      _creatingHandoff = true;
      _mutationError = null;
    });
    try {
      final instructions = await ref
          .read(hostOperationalRosterControllerProvider)
          .createRosterHandoff(eventId: widget.eventId);
      if (!mounted) return;
      await showCatchBottomSheet<void>(
        context: context,
        builder: (context) => HostRosterHandoffSheet(
          instructions: instructions,
          onCopy: (value) =>
              ref.read(clipboardControllerProvider).copyText(value),
        ),
      );
    } catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    } finally {
      if (mounted) _setLocalState(() => _creatingHandoff = false);
    }
  }

  Future<void> _reviewClaim(
    EventRuntimeClaimRequest claim,
    EventRuntimeClaimDecision decision, {
    String? attendeeId,
  }) async {
    if (_pendingClaimUid != null) return;
    _setLocalState(() {
      _pendingClaimUid = claim.uid;
      _mutationError = null;
    });
    try {
      await ref
          .read(hostOperationalRosterControllerProvider)
          .reviewRuntimeClaim(
            eventId: widget.eventId,
            uid: claim.uid,
            decision: decision,
            attendeeId: attendeeId,
          );
      if (!mounted) return;
      showCatchNotice(
        context,
        decision == EventRuntimeClaimDecision.approve
            ? context.l10n.hostsOperationalRosterClaimApproved
            : context.l10n.hostsOperationalRosterClaimRejected,
      );
    } catch (error) {
      if (mounted) _setLocalState(() => _mutationError = error);
    } finally {
      if (mounted) _setLocalState(() => _pendingClaimUid = null);
    }
  }

  Future<void> _importRows({
    required int generation,
    required String eventId,
    required String organizerId,
    required String accountId,
    required String fileName,
    required EventAttendeeImportFormat format,
    required List<EventAttendeeImportRow> rows,
  }) async {
    bool sameScope() =>
        mounted &&
        _importGeneration == generation &&
        widget.eventId == eventId &&
        widget.organizerId == organizerId &&
        ref.read(uidProvider).asData?.value == accountId;
    if (!sameScope()) return;
    final importKey = format == EventAttendeeImportFormat.manual
        ? _newImportKey()
        : hostRosterImportKey(format: format, rows: rows, fileName: fileName);
    try {
      final result = await ref
          .read(hostOperationalRosterControllerProvider)
          .importAttendees(
            eventId: eventId,
            importKey: importKey,
            fileName: fileName,
            format: format,
            rows: rows,
          );
      if (!sameScope() || !mounted) return;
      if (result.errors.isEmpty) {
        showCatchNotice(
          context,
          context.l10n.hostsOperationalRosterImportSuccess(
            created: result.createdCount,
            updated: result.updatedCount,
            skipped: result.skippedCount,
          ),
        );
      } else {
        await showCatchBottomSheet<void>(
          context: context,
          builder: (context) => CatchSheet.standard(
            title: context.l10n.hostsOperationalRosterImportPartialTitle,
            subtitle: context.l10n.hostsOperationalRosterImportPartialBody(
              created: result.createdCount,
              updated: result.updatedCount,
              count: result.errors.length,
            ),
            footer: CatchButton.sheet(
              role: CatchButtonEmphasis.dismiss,
              label: context.l10n.hostsOperationalRosterImportResultDone,

              onPressed: () => Navigator.of(context).pop(),
            ),
            child: CatchFieldLanes.divided(
              children: [
                for (final error in result.errors)
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.hostsOperationalRosterImportRowError(
                      row: error.rowId,
                    ),
                    body: error.message,
                    bodyMaxLines: 5,
                  ),
              ],
            ),
          ),
        );
      }
    } catch (error) {
      if (sameScope()) _setLocalState(() => _mutationError = error);
      rethrow;
    }
  }

  Future<void> _toggleAttendance(EventAttendee attendee) async {
    if (_pendingAttendanceId != null) return;
    _setLocalState(() {
      _pendingAttendanceId = attendee.id;
      _mutationError = null;
    });
    try {
      final outbox = await ref
          .read(hostOperationalRosterControllerProvider)
          .setAttendance(
            eventId: widget.eventId,
            attendee: attendee,
            clientOperationId: _newAttendanceOperationId(attendee.id),
          );
      if (mounted) _setLocalState(() => _attendanceOutbox = outbox);
    } catch (error) {
      if (mounted) _setLocalState(() => _mutationError = error);
    } finally {
      if (mounted) _setLocalState(() => _pendingAttendanceId = null);
    }
  }

  Future<void> _loadAttendanceOutbox() async {
    try {
      final outbox = await ref
          .read(hostOperationalRosterControllerProvider)
          .loadAttendanceOutbox(widget.eventId);
      if (mounted) _setLocalState(() => _attendanceOutbox = outbox);
    } catch (error) {
      if (mounted) _setLocalState(() => _mutationError = error);
    }
  }

  Future<void> _flushAttendanceOutbox() async {
    try {
      final outbox = await ref
          .read(hostOperationalRosterControllerProvider)
          .flushAttendanceOutbox(widget.eventId);
      if (!mounted) return;
      _setLocalState(() => _attendanceOutbox = outbox);
    } catch (error) {
      if (mounted) _setLocalState(() => _mutationError = error);
    }
  }

  Future<void> _clearAttendanceConflicts() async {
    try {
      final outbox = await ref
          .read(hostOperationalRosterControllerProvider)
          .clearAttendanceConflicts(widget.eventId);
      if (mounted) _setLocalState(() => _attendanceOutbox = outbox);
    } catch (error) {
      if (mounted) _setLocalState(() => _mutationError = error);
    }
  }
}
