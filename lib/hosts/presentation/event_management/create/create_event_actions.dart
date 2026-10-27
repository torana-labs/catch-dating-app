part of 'create_event_screen.dart';

extension _CreateEventActions on _CreateEventScreenState {
  Future<void> _restorePhotoRecovery() async {
    if (!mounted || _sessionReplaced) return;
    await ref
        .read(
          createEventPhotoRecoveryControllerProvider(widget.club.id).notifier,
        )
        .restore();
    if (!mounted || _sessionReplaced) return;
    final recovery = ref.read(
      createEventPhotoRecoveryControllerProvider(widget.club.id),
    );
    if (recovery.restored is AsyncData<void> && recovery.event == null) {
      await _checkForDrafts();
    }
  }

  Future<void> _pickDate() async {
    final today = DateUtils.dateOnly(widget.now());
    final picked = await showCatchDatePicker(
      copy: catchDatePickerCopy(context.l10n),
      context: context,
      initialDate: _selectedDate ?? today,
      firstDate: today,
      lastDate: today.add(const Duration(days: 365)),
      title: context.l10n.hostsCreateEventScreenTitleEventDate,
    );
    if (picked != null) {
      final result = _scheduleState.selectDate(picked, now: widget.now());
      _setLocalState(() {
        _selectedDate = result.selectedDate;
        _selectedStartTime = result.selectedStartTime;
        _dateController.text = result.dateText;
        _startTimeController.text = result.startTimeText;
        _scheduleErrorText = result.errorText;
      });
    }
  }

  Future<void> _pickStartTime() async {
    final picked = await showCatchTimePicker(
      copy: catchTimePickerCopy(context.l10n),
      context: context,
      initialTime:
          _selectedStartTime ??
          _scheduleState.initialStartTime(now: widget.now()),
      title: context.l10n.hostsCreateEventScreenTitleStartTime,
    );
    if (picked != null) {
      final result = _scheduleState.selectStartTime(picked, now: widget.now());
      _setLocalState(() {
        _selectedDate = result.selectedDate;
        _selectedStartTime = result.selectedStartTime;
        _startTimeController.text = result.startTimeText;
        _scheduleErrorText = result.errorText;
      });
    }
  }

  Future<void> _pickLocation() async {
    final deviceLocation = ref.read(deviceLocationProvider).asData?.value;
    final result = await Navigator.of(context).push<LocationPickerResult>(
      MaterialPageRoute(
        builder: (_) => LocationPickerScreen(
          countryIsoCode: countryIsoCodeForCityName(widget.club.location),
          initialLocation: _locationState.startingPoint,
          initialCenter: _locationState.initialCenter(deviceLocation),
          initialLabel: _locationState.initialLabel(
            meetingPoint: _meetingPointController.text,
          ),
          loadMapTiles: widget.loadMapTiles,
        ),
        fullscreenDialog: true,
      ),
    );
    if (result != null) {
      final selection = _locationState.selectLocation(
        coordinate: result.coordinate,
        displayName: result.displayName,
        address: result.address,
        placeId: result.placeId,
      );
      _setLocalState(() {
        _locationState = selection.state;
        final meetingPointText = selection.meetingPointText;
        if (meetingPointText != null) {
          _meetingPointController.text = meetingPointText;
        }
      });
    }
  }

  void _selectVenue(OrganizerEventVenue venue) {
    final selection = _locationState.selectVenue(
      venue,
      currentCapacityText: _capacityController.text,
    );
    _setLocalState(() {
      _locationState = selection.state;
      _meetingPointController.text = selection.meetingPointText;
      _locationDetailsController.text = selection.locationDetailsText;
      final capacity = selection.suggestedCapacityText;
      if (capacity != null) _capacityController.text = capacity;
    });
  }

  Future<EventMeetingLocation?> _pickItineraryLocation(
    EventMeetingLocation? current,
  ) async {
    final deviceLocation = ref.read(deviceLocationProvider).asData?.value;
    final meetingLocation = _currentMeetingLocation;
    final result = await Navigator.of(context).push<LocationPickerResult>(
      MaterialPageRoute(
        builder: (_) => LocationPickerScreen(
          countryIsoCode: countryIsoCodeForCityName(widget.club.location),
          initialLocation: current == null
              ? null
              : LocationCoordinate(current.latitude, current.longitude),
          initialCenter:
              (current == null
                  ? _locationState.startingPoint
                  : LocationCoordinate(current.latitude, current.longitude)) ??
              deviceLocation,
          initialLabel: current?.name,
          loadMapTiles: widget.loadMapTiles,
        ),
        fullscreenDialog: true,
      ),
    );
    if (result == null || !mounted) return null;
    return EventMeetingLocation(
      name:
          result.displayName ??
          current?.name ??
          meetingLocation?.name ??
          context.l10n.eventsMapPinTileTitlePinnedLocation,
      address: result.address,
      placeId: result.placeId,
      latitude: result.coordinate.latitude,
      longitude: result.coordinate.longitude,
    ).normalized();
  }

  Future<void> _pickEventPhotos() async {
    final picked = await ref
        .read(createEventControllerProvider.notifier)
        .pickEventPhotos();
    if (!mounted || picked.isEmpty) return;
    _setLocalState(() => _eventPhotos = _eventPhotos.addPicked(picked));
  }

  void _removeEventPhoto(int index) {
    _setLocalState(() => _eventPhotos = _eventPhotos.removeAt(index));
  }

  void _reorderEventPhoto(int fromIndex, int toIndex) {
    _setLocalState(
      () => _eventPhotos = _eventPhotos.reorder(fromIndex, toIndex),
    );
  }

  void _setRosterPlan(HostRosterImportPlan plan) {
    _pendingRosterImport = plan;
    _rosterFileName = plan.fileName;
    _rosterFileFingerprint = plan.fileFingerprint;
    _rosterReadyCount = plan.readyCount;
    _externalBookingProvider = plan.bookingProvider;
    final capacity = int.tryParse(_capacityController.text.trim()) ?? 0;
    if (capacity < plan.readyCount) {
      _capacityController.text = plan.readyCount.toString();
    }
    _priceController.text = '0';
  }

  Future<void> _pickRoster() async {
    try {
      final table = await ref
          .read(createEventControllerProvider.notifier)
          .pickRosterFile(providerHint: _externalBookingProvider);
      if (table == null || !mounted) return;
      final plan = await showHostRosterMapping(
        context,
        table,
        suggestedRevenueAmountMinor:
            ((double.tryParse(_priceController.text.trim()) ?? 0) * 100)
                .round(),
        defaultRevenueCurrency: _eventCurrencyCode,
      );
      if (plan == null || !mounted) return;
      _setLocalState(() => _setRosterPlan(plan));
    } on HostRosterImportException catch (error) {
      if (mounted) {
        showCatchNotice(
          context,
          hostRosterImportIssueCopy(context, error.issue),
        );
      }
    } on Object catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    }
  }

  Future<void> _handleCloseIntent(CreateEventWizardCloseIntent intent) async {
    if (_requestPending) return;
    switch (intent) {
      case CreateEventWizardCloseIntent.confirmUnsavedChanges:
        final decision = await showCreateEventUnsavedChangesDialog(context);
        if (!mounted || decision == null) return;
        switch (decision) {
          case HostDraftExitDecision.keepEditing:
            return;
          case HostDraftExitDecision.discardAndExit:
            _completeClose();
          case HostDraftExitDecision.saveDraftAndExit:
            if (await _saveDraft(showSuccess: false)) {
              _completeClose();
            }
        }
      case CreateEventWizardCloseIntent.close:
        _completeClose();
    }
  }

  void _handlePreviousIntent(CreateEventWizardPreviousIntent intent) {
    if (_requestPending) return;
    switch (intent) {
      case CreateEventWizardPreviousIntent.previousStep:
        _showStep(_currentStep - 1);
      case CreateEventWizardPreviousIntent.returnToSteps:
        _showStep(_currentStep);
    }
  }

  void _handlePrimaryIntent(CreateEventWizardPrimaryIntent intent) {
    if (_requestPending) return;

    switch (intent) {
      case CreateEventWizardPrimaryIntent.nextStep:
        _goToStep(_currentStep + 1);
      case CreateEventWizardPrimaryIntent.review:
        _setLocalState(() => _isReviewing = true);
      case CreateEventWizardPrimaryIntent.submit:
        if (_validateAllInput()) _submit();
    }
  }

  Future<void> _handleSuccessNavigationIntent(
    CreateEventSuccessNavigationIntent intent,
    CreateEventSuccessNavigationState state,
  ) async {
    if (_sessionReplaced) return;
    final controller = ref.read(
      createEventPhotoRecoveryControllerProvider(widget.club.id).notifier,
    );
    final recovery = ref.read(
      createEventPhotoRecoveryControllerProvider(widget.club.id),
    );
    if (recovery.hasPhotoRecovery && !recovery.isDurable) {
      final leave = await showCatchConfirmDialog(
        copy: catchDialogCopy(context.l10n),
        context: context,
        title: context.l10n.hostsEventPhotoRecoveryLeaveTitle,
        message: context.l10n.hostsEventPhotoRecoveryLeaveMessage,
        confirmLabel: context.l10n.hostsEventPhotoRecoveryLeave,
      );
      if (leave != true || !mounted || _sessionReplaced) return;
    }
    if (!await controller.acknowledgeDeparture() ||
        !mounted ||
        _sessionReplaced) {
      return;
    }
    _setLocalState(() => _allowRoutePop = true);
    final effect = CreateEventSuccessNavigationEffect.resolve(
      intent: intent,
      state: state,
    );
    switch (effect.destination) {
      case CreateEventSuccessNavigationDestination.manageEventRoute:
        context.goNamed(
          Routes.hostAppEventManageScreen.name,
          pathParameters: effect.pathParameters,
          extra: effect.extra,
        );
      case CreateEventSuccessNavigationDestination.popRoute:
        Navigator.of(context).pop();
    }
  }

  void _goToStep(int step) {
    if (step < 0 || step >= _stepSpecs.length || _requestPending) return;
    _setLocalState(() {
      _isReviewing = false;
      _currentStep = step;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_pageController.hasClients) return;
      _pageController.animateToPage(
        step,
        duration: CatchMotion.pageStep,
        curve: CatchMotion.easeInOutCurve,
      );
    });
  }

  void _showStep(int step) {
    if (step < 0 || step >= _stepSpecs.length || _requestPending) return;
    _setLocalState(() {
      _isReviewing = false;
      _currentStep = step;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_pageController.hasClients) return;
      _pageController.jumpToPage(step);
    });
  }

  bool _validateAllInput() {
    var formsAreValid = true;
    int? firstInvalidForm;
    for (var index = 0; index < _stepSpecs.length; index++) {
      final form = _stepSpecs[index].formKey?.currentState;
      if (form != null && !form.validate()) {
        formsAreValid = false;
        firstInvalidForm ??= index;
      }
    }
    final review = _reviewState;
    final firstInvalid = review.firstIncompleteStep ?? firstInvalidForm;
    if (!formsAreValid || !review.canSubmit) {
      final scheduleError = _scheduleState.errorText(now: widget.now());
      _setLocalState(() {
        _showValidationErrors = true;
        _scheduleErrorText = scheduleError;
      });
      if (firstInvalid != null) _showStep(firstInvalid);
      return false;
    }
    return true;
  }

  void _submit() {
    final startTime = _selectedStartDateTime!;
    final endTime = startTime.add(Duration(minutes: _durationMinutes));
    final meetingLocation = _currentMeetingLocation;
    if (meetingLocation == null) return;

    final externalOrigin = _externalBookingMode
        ? ExternalEventOriginInput(
            provider: _externalBookingProvider,
            externalEventId: _trimmedTextOrNull(_externalEventIdController),
            externalEventUrl: _trimmedTextOrNull(_externalEventUrlController),
            sourceExternalEventId: _trimmedTextOrNull(
              _externalEventIdController,
            ),
            adapterVersion: _externalBookingProvider.rosterAdapterVersion,
          )
        : null;
    final effectiveEventSuccessDefaults = _externalBookingMode
        ? _eventSuccessDefaults.copyWith(enabled: true)
        : _eventSuccessDefaults;

    final rosterPlan = _pendingRosterImport;
    CreateEventController.submitMutation.run(ref, (tx) async {
      final createdEvent = await tx
          .get(createEventControllerProvider.notifier)
          .submit(
            clubId: widget.club.id,
            name: _nameController.text,
            startTime: startTime,
            endTime: endTime,
            meetingLocation: meetingLocation,
            sourceVenueId: _locationState.sourceVenueId,
            sourceDraftId: _activeDraftId,
            itinerary: _itinerary,
            eventFormat: _selectedEventFormat,
            distanceKm: _distanceKmForSelectedActivity(),
            pace: _selectedPace ?? PaceLevel.easy,
            description: _descriptionController.text.trim(),
            currency: _eventCurrencyCode,
            constraints: _constraints,
            eventPolicy: _eventPolicy,
            inviteCode: _externalBookingMode
                ? null
                : _trimmedTextOrNull(_inviteCodeController),
            photoImages: _eventPhotos.pickedPhotos
                .map((photo) => photo.image)
                .toList(),
            eventSuccessDefaults: effectiveEventSuccessDefaults,
            externalOrigin: externalOrigin,
            runtimeWalkInPolicy: _externalBookingMode
                ? _runtimeWalkInPolicy
                : null,
          );
      EventAttendeeImportResult? rosterResult;
      var rosterFailed = false;
      if (rosterPlan != null) {
        try {
          rosterResult = await tx
              .get(createEventControllerProvider.notifier)
              .importRoster(eventId: createdEvent.id, plan: rosterPlan);
        } on Object catch (error, stackTrace) {
          // The event already exists. Preserve that success and route the host
          // to the event roster for a safe, idempotent retry of the same file.
          ref
              .read(errorLoggerProvider)
              .logError(
                error,
                stackTrace,
                reason: 'Create event roster import failed after creation.',
              );
          rosterFailed = true;
        }
      }
      if (mounted) {
        _setLocalState(() {
          _rosterImportResult = rosterResult;
          _rosterImportFailed = rosterFailed;
        });
      }

      return createdEvent;
    }).ignore();
  }

  bool get _hasUnsavedChanges {
    return ref
                .read(
                  createEventPhotoRecoveryControllerProvider(widget.club.id),
                )
                .event ==
            null &&
        _draftActionState.hasUnsavedChanges;
  }

  bool get _requestPending =>
      ref.read(CreateEventController.submitMutation).isPending ||
      ref.read(CreateEventDraftController.saveDraftMutation).isPending;

  CreateEventWizardReviewState get _reviewState =>
      CreateEventWizardReviewState.resolve(
        activeSteps: _stepSpecs,
        name: _nameController.text,
        activityKind: _selectedActivityKind,
        customActivityLabel: _customActivityLabelController.text,
        distance: _distanceController.text,
        pace: _selectedPace,
        externalBookingMode: _externalBookingMode,
        externalEventUrl: _externalEventUrlController.text,
        rosterAttachmentRequired:
            _rosterFileFingerprint != null && _pendingRosterImport == null,
        hasStartingPoint: _locationState.hasStartingPoint,
        meetingPoint: _meetingPointController.text,
        scheduleState: _scheduleState,
        now: widget.now(),
        capacity: _capacityController.text,
        rosterReadyCount: _pendingRosterImport?.readyCount,
        price: _priceController.text,
        currencyCode: _eventCurrencyCode,
        admissionPreset: _policyState.admissionPreset,
        inviteCode: _inviteCodeController.text,
        cohortCapsEnabled: _policyState.cohortCapsEnabled,
        maxMen: _maxMenController.text,
        maxWomen: _maxWomenController.text,
        crossPathsPairInventoryEnabled:
            _policyState.crossPathsPairInventoryEnabled,
        crossPathsPairCapacity: _crossPathsPairCapacityController.text,
        dynamicPricingEnabled: _policyState.dynamicPricingEnabled,
        dynamicPricingStep: _dynamicPricingStepController.text,
        dynamicPricingMax: _dynamicPricingMaxController.text,
        minAge: _minAgeController.text,
        maxAge: _maxAgeController.text,
      );

  Object get _currentDraftContentSignature => _currentDraftSnapshot.signature;

  List<CatchFormReviewSummaryItem> get _reviewSummaryItems {
    final start = _selectedStartDateTime;
    final end = start?.add(Duration(minutes: _durationMinutes));
    final capacity = int.tryParse(_capacityController.text.trim());
    final priceInMinorUnits = parseMajorCurrencyAmountToMinorUnits(
      _priceController.text,
      currencyCode: _eventCurrencyCode,
    );
    final activity = _selectedEventFormat.label;
    return [
      CatchFormReviewSummaryItem(
        label: context.l10n.hostsEventDetailsStepTitleEventName,
        value: _nameController.text.trim().isEmpty
            ? context.l10n.hostsWizardStatusNeedsInformation
            : _nameController.text.trim(),
        icon: CatchIcons.eventConfirmed,
      ),
      CatchFormReviewSummaryItem(
        label: context.l10n.hostsCreateEventReviewActivity,
        value: _selectedEventFormat.isDistanceBased
            ? '$activity · ${_distanceController.text.trim()} km · ${_selectedPace?.label ?? context.l10n.hostsWizardStatusNeedsInformation}'
            : activity,
        icon: CatchIcons.eventConfirmed,
      ),
      CatchFormReviewSummaryItem(
        label: context.l10n.hostsCreateEventReviewBooking,
        value: _externalBookingMode
            ? context.l10n.hostsCreateEventReviewExternalBookings(
                provider: _externalBookingProviderLabel,
              )
            : context.l10n.hostsCreateEventReviewCatchBookings,
        icon: CatchIcons.ticket,
      ),
      if (_externalBookingMode)
        CatchFormReviewSummaryItem(
          label: context.l10n.hostsCreateEventRosterTitle,
          value: _rosterFileName == null
              ? context.l10n.hostsCreateEventRosterLater
              : _pendingRosterImport == null
              ? context.l10n.hostsCreateEventRosterReattach(
                  fileName: _rosterFileName!,
                )
              : context.l10n.hostsCreateEventRosterAttached(
                  fileName: _rosterFileName!,
                  ready: _pendingRosterImport!.readyCount,
                  review: _pendingRosterImport!.needsReviewCount,
                  excluded: _pendingRosterImport!.excludedCount,
                ),
          icon: CatchIcons.people,
        ),
      CatchFormReviewSummaryItem(
        label: context.l10n.hostsCreateEventReviewLocation,
        value: _meetingPointController.text.trim().isEmpty
            ? context.l10n.hostsWizardStatusNeedsInformation
            : _meetingPointController.text.trim(),
        icon: CatchIcons.location,
      ),
      CatchFormReviewSummaryItem(
        label: context.l10n.hostsCreateEventReviewSchedule,
        value: start == null || end == null
            ? context.l10n.hostsWizardStatusNeedsInformation
            : '${EventFormatters.longDate(start)} · ${EventFormatters.timeRange(start, end)}',
        icon: CatchIcons.date,
      ),
      CatchFormReviewSummaryItem(
        label: context.l10n.hostsCreateEventReviewCapacity,
        value: capacity == null
            ? context.l10n.hostsWizardStatusNeedsInformation
            : context.l10n.hostsCreateEventReviewCapacityValue(count: capacity),
        icon: CatchIcons.people,
      ),
      CatchFormReviewSummaryItem(
        label: context.l10n.hostsCreateEventReviewPrice,
        value: _externalBookingMode
            ? context.l10n.hostsCreateEventReviewExternalPrice
            : priceInMinorUnits == null
            ? context.l10n.hostsWizardStatusNeedsInformation
            : priceInMinorUnits == 0
            ? context.l10n.hostsCreateEventReviewFree
            : EventFormatters.priceInPaise(
                priceInMinorUnits,
                currencyCode: _eventCurrencyCode,
              ),
        icon: CatchIcons.payment,
      ),
      if (!_externalBookingMode)
        CatchFormReviewSummaryItem(
          label: context.l10n.hostsCreateEventReviewAdmission,
          value: _policyState.admissionPreset.title(context.l10n),
          icon: CatchIcons.checkIn,
        ),
    ];
  }

  String get _externalBookingProviderLabel =>
      switch (_externalBookingProvider) {
        ExternalBookingProvider.catchPlatform =>
          context.l10n.hostsEventDetailsStepExternalProviderCatch,
        ExternalBookingProvider.generic =>
          context.l10n.hostsEventDetailsStepExternalProviderOther,
        ExternalBookingProvider.luma =>
          context.l10n.hostsEventDetailsStepExternalProviderLuma,
        ExternalBookingProvider.eventbrite =>
          context.l10n.hostsEventDetailsStepExternalProviderEventbrite,
        ExternalBookingProvider.partiful =>
          context.l10n.hostsEventDetailsStepExternalProviderPartiful,
        ExternalBookingProvider.posh =>
          context.l10n.hostsEventDetailsStepExternalProviderPosh,
        ExternalBookingProvider.bookmyshow =>
          context.l10n.hostsEventDetailsStepExternalProviderBookMyShow,
        ExternalBookingProvider.district =>
          context.l10n.hostsEventDetailsStepExternalProviderDistrict,
        ExternalBookingProvider.sortmyscene =>
          context.l10n.hostsEventDetailsStepExternalProviderSortMyScene,
        ExternalBookingProvider.airbnb =>
          context.l10n.hostsEventDetailsStepExternalProviderAirbnbExperiences,
      };
}
