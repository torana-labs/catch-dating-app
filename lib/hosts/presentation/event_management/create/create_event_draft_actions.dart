part of 'create_event_screen.dart';

extension _CreateEventDraftActions on _CreateEventScreenState {
  CreateEventDraftSideEffectState get _draftSideEffectState =>
      CreateEventDraftSideEffectState(
        hasCheckedDrafts: _checkedDrafts,
        activeDraftId: _activeDraftId,
      );

  CreateEventDraftActionState get _draftActionState =>
      CreateEventDraftActionState(
        activeDraftId: _activeDraftId,
        initialDraftContentSignature: _initialDraftContentSignature,
        lastSavedDraftSignature: _lastSavedDraftSignature,
        currentDraftContentSignature: _currentDraftContentSignature,
      );

  CreateEventDraftSnapshot get _currentDraftSnapshot =>
      CreateEventDraftSnapshot(
        name: _trimmedTextOrNull(_nameController),
        distance: _trimmedTextOrNull(_distanceController),
        capacity: _trimmedTextOrNull(_capacityController),
        price: _trimmedTextOrNull(_priceController),
        description: _trimmedTextOrNull(_descriptionController),
        accessibility: _trimmedTextOrNull(_accessibilityController),
        included: _trimmedTextOrNull(_includedController),
        externalBookingMode: _externalBookingMode,
        externalBookingProvider: _externalBookingMode
            ? _externalBookingProvider.name
            : null,
        externalEventUrl: _externalBookingMode
            ? _trimmedTextOrNull(_externalEventUrlController)
            : null,
        externalEventId: _externalBookingMode
            ? _trimmedTextOrNull(_externalEventIdController)
            : null,
        runtimeWalkInPolicy: _externalBookingMode
            ? _runtimeWalkInPolicy.name
            : null,
        rosterFileName: _externalBookingMode ? _rosterFileName : null,
        rosterFileFingerprint: _externalBookingMode
            ? _rosterFileFingerprint
            : null,
        rosterReadyCount: _externalBookingMode ? _rosterReadyCount : null,
        activityKind: _selectedActivityKind.name,
        customActivityLabel: _customActivityLabelDraftValue,
        interactionModel: _interactionModelDraftValue,
        paceName: _selectedPace?.name,
        routePlan: _routePlan,
        itinerary: _itinerary,
        meetingPoint: _trimmedTextOrNull(_meetingPointController),
        locationDetails: _trimmedTextOrNull(_locationDetailsController),
        meetingLocationAddress: _locationState.meetingLocationAddress,
        meetingLocationPlaceId: _locationState.meetingLocationPlaceId,
        sourceVenueId: _locationState.sourceVenueId,
        startingPointLat: _locationState.startingPoint?.latitude,
        startingPointLng: _locationState.startingPoint?.longitude,
        selectedDateMillis: _selectedDate?.millisecondsSinceEpoch,
        selectedStartHour: _selectedStartTime?.hour,
        selectedStartMinute: _selectedStartTime?.minute,
        durationMinutes: _durationMinutes,
        minAge: _trimmedTextOrNull(_minAgeController),
        maxAge: _trimmedTextOrNull(_maxAgeController),
        maxMen: _trimmedTextOrNull(_maxMenController),
        maxWomen: _trimmedTextOrNull(_maxWomenController),
        cohortCapsEnabled: _policyState.cohortCapsEnabled,
        admissionPreset: _policyState.draftAdmissionPresetName,
        inviteCode: _trimmedTextOrNull(_inviteCodeController),
        dynamicPricingEnabled: _policyState.dynamicPricingEnabled,
        dynamicPricingStep: _trimmedTextOrNull(_dynamicPricingStepController),
        dynamicPricingMax: _trimmedTextOrNull(_dynamicPricingMaxController),
        cancellationPolicy: _policyState.cancellationPolicyId.name,
        crossPathsPairInventoryEnabled:
            _policyState.crossPathsPairInventoryEnabled,
        crossPathsPairCapacity: _trimmedTextOrNull(
          _crossPathsPairCapacityController,
        ),
        eventSuccessDefaults: _eventSuccessDefaults,
        eventPhotoIds: _eventPhotos.signature,
      );

  Future<void> _checkForDrafts() async {
    final sideEffectState = _draftSideEffectState;
    if (!sideEffectState.shouldLoadDrafts) return;
    _checkedDrafts = true;

    final drafts = await ref
        .read(createEventDraftControllerProvider.notifier)
        .loadDrafts(clubId: widget.organizer.id);
    if (!mounted || !sideEffectState.shouldShowDraftPicker(drafts)) return;

    final picked = await showHostEventEntrySheet(
      context: context,
      state: HostEventEntryState.resolve(
        organizerId: widget.organizer.id,
        drafts: drafts,
      ),
      onDeleteDraft: _deleteDraftFromPicker,
    );
    if (!mounted) return;

    if (picked == null) return;
    if (picked.intent == HostEventEntryIntent.createProgram) {
      await context.pushNamed(
        Routes.hostCreateProgramScreen.name,
        pathParameters: {'clubId': widget.organizer.id},
      );
      return;
    }
    if (picked.draft case final draft?) {
      _restoreFromDraft(draft);
    }
  }

  void _restoreFromDraft(EventDraft draft) {
    _activeDraftId = draft.id;

    _setLocalState(() => _applyDraftValues(draft));
    _lastSavedDraftSignature = _currentDraftContentSignature;
  }

  void _applyDraftValues(EventDraft draft) {
    _externalBookingMode = draft.externalBookingMode;
    final restore = CreateEventDraftRestoreState.fromDraft(
      draft,
      now: widget.now(),
    );

    // Event details
    _accessibilityController.text = draft.accessibility ?? '';
    _includedController.text = draft.included ?? '';
    if (restore.nameText != null) {
      _nameController.text = restore.nameText!;
    }
    if (restore.distanceText != null) {
      _distanceController.text = restore.distanceText!;
    }
    if (restore.capacityText != null) {
      _capacityController.text = restore.capacityText!;
    }
    if (restore.priceText != null) {
      _priceController.text = restore.priceText!;
    }
    if (restore.descriptionText != null) {
      _descriptionController.text = restore.descriptionText!;
    }
    _externalBookingProvider = ExternalBookingProvider.values.firstWhere(
      (value) => value.name == draft.externalBookingProvider,
      orElse: () => ExternalBookingProvider.generic,
    );
    _externalEventUrlController.text = draft.externalEventUrl ?? '';
    _externalEventIdController.text = draft.externalEventId ?? '';
    _runtimeWalkInPolicy = EventRuntimeWalkInPolicy.values.firstWhere(
      (value) => value.name == draft.runtimeWalkInPolicy,
      orElse: () => EventRuntimeWalkInPolicy.hostApproval,
    );
    _pendingRosterImport = null;
    _rosterFileName = draft.rosterFileName;
    _rosterFileFingerprint = draft.rosterFileFingerprint;
    _rosterReadyCount = draft.rosterReadyCount;
    if (_externalBookingMode) _priceController.text = '0';
    _selectedActivityKind = restore.activityKind;
    _customActivityLabelController.text = restore.customActivityLabelText;
    _selectedInteractionModel = restore.interactionModel;
    _selectedPace = restore.pace;
    _routePlan = restore.routePlan;
    _itinerary = restore.itinerary;

    // Where
    if (restore.meetingPointText != null) {
      _meetingPointController.text = restore.meetingPointText!;
    }
    if (restore.locationDetailsText != null) {
      _locationDetailsController.text = restore.locationDetailsText!;
    }
    _locationState = restore.locationState;

    // When
    _selectedDate = restore.selectedDate;
    _selectedStartTime = restore.selectedStartTime;
    _dateController.text = restore.dateText;
    _startTimeController.text = restore.startTimeText;
    _durationMinutes = restore.durationMinutes;
    _scheduleErrorText = restore.scheduleErrorText;

    // Rules
    if (restore.minAgeText != null) {
      _minAgeController.text = restore.minAgeText!;
    }
    if (restore.maxAgeText != null) {
      _maxAgeController.text = restore.maxAgeText!;
    }
    if (restore.maxMenText != null) {
      _maxMenController.text = restore.maxMenText!;
    }
    if (restore.maxWomenText != null) {
      _maxWomenController.text = restore.maxWomenText!;
    }
    if (restore.inviteCodeText != null) {
      _inviteCodeController.text = restore.inviteCodeText!;
    }
    if (restore.dynamicPricingStepText != null) {
      _dynamicPricingStepController.text = restore.dynamicPricingStepText!;
    }
    if (restore.dynamicPricingMaxText != null) {
      _dynamicPricingMaxController.text = restore.dynamicPricingMaxText!;
    }
    if (restore.crossPathsPairCapacityText != null) {
      _crossPathsPairCapacityController.text =
          restore.crossPathsPairCapacityText!;
    }
    _policyState = restore.policyState;
    _eventSuccessDefaults = _externalBookingMode
        ? restore.eventSuccessDefaults.copyWith(enabled: true)
        : restore.eventSuccessDefaults;
  }

  Future<void> _deleteDraftFromPicker(EventDraft draft) {
    final intent = _draftSideEffectState.deleteFromPickerIntent(draft);
    return _deleteDraft(intent);
  }

  Future<void> _deleteDraft(CreateEventDraftDeleteIntent intent) {
    return CreateEventDraftController.deleteDraftMutation.run(
      ref,
      (tx) async => tx
          .get(createEventDraftControllerProvider.notifier)
          .deleteDraft(clubId: widget.organizer.id, draftId: intent.draftId),
    );
  }

  Future<bool> _saveDraft({bool showSuccess = true}) async {
    final draftAction = _draftActionState;
    final now = widget.now();
    final draft = _currentDraftSnapshot.toDraft(
      id: draftAction.draftIdForSave(now: now),
      clubId: widget.organizer.id,
      savedAt: now,
    );

    final savedDraft = await CreateEventDraftController.saveDraftMutation.run(
      ref,
      (tx) async =>
          tx.get(createEventDraftControllerProvider.notifier).saveDraft(draft),
    );
    if (savedDraft == null) return false;

    _activeDraftId = savedDraft.id;
    _lastSavedDraftSignature = _currentDraftContentSignature;

    if (mounted && showSuccess) {
      showCatchNotice(context, draftAction.saveSuccessMessage);
    }
    return true;
  }

  void _completeClose() {
    if (!mounted || _allowRoutePop) return;
    _setLocalState(() => _allowRoutePop = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) Navigator.of(context).pop();
    });
  }

  List<OrderedPhotoPreview> get _eventPhotoPreviews => _eventPhotos.previews;

  String? get _customActivityLabelDraftValue {
    if (_selectedActivityKind != ActivityKind.openActivity) return null;
    return _trimmedTextOrNull(_customActivityLabelController);
  }

  String? get _interactionModelDraftValue {
    if (_selectedActivityKind != ActivityKind.openActivity) return null;
    return _selectedInteractionModel.name;
  }

  EventMeetingLocation? get _currentMeetingLocation {
    return _locationState.meetingLocation(
      meetingPoint: _meetingPointController.text,
      notes: _locationDetailsController.text,
    );
  }

  EventFormatSnapshot get _selectedEventFormat {
    final routeDetails = _routePlan == null
        ? const <String, Object?>{}
        : <String, Object?>{'routePlan': _routePlan!.toJson()};
    if (_selectedActivityKind != ActivityKind.openActivity) {
      return EventFormatSnapshot.fromActivityKind(
        _selectedActivityKind,
        activityDetails: routeDetails,
      ).withPublicDetails(
        accessibility: _accessibilityController.text,
        included: _includedController.text,
      );
    }
    return EventFormatSnapshot.custom(
      label: _customActivityLabelController.text,
      interactionModel: _selectedInteractionModel,
      activityDetails: {
        context.l10n.hostsCreateEventScreenVisiblecopyConfiguredin:
            context.l10n.hostsCreateEventScreenVisiblecopyCreateEvent,
        ...routeDetails,
      },
    ).withPublicDetails(
      accessibility: _accessibilityController.text,
      included: _includedController.text,
    );
  }

  void _applyOrganizerDefaults(OrganizerHostDefaults defaults) {
    _selectedActivityKind = defaults.primaryActivityKind;
    _selectedInteractionModel = _selectedActivityKind.defaultInteractionModel;
    _routePlan = RouteEventPlan.defaultForActivity(_selectedActivityKind);
    final policy = defaults.eventPolicy;
    final policyForm = CreateEventPolicyDefaultsFormState.fromDefaults(
      policy,
      currencyCode: _eventCurrencyCode,
    );
    _policyState = policyForm.policyState;
    _minAgeController.text = policyForm.minAgeText;
    _maxAgeController.text = policyForm.maxAgeText;
    _maxMenController.text = policyForm.maxMenText;
    _maxWomenController.text = policyForm.maxWomenText;
    _dynamicPricingStepController.text = policyForm.dynamicPricingStepText;
    _dynamicPricingMaxController.text = policyForm.dynamicPricingMaxText;
    _eventSuccessDefaults = defaults.eventSuccessForFormat(
      _selectedEventFormat,
    );
  }

  double _distanceKmForSelectedActivity() {
    if (!_selectedActivityKind.isDistanceBased) return 0;
    return double.parse(_distanceController.text.trim());
  }

  Future<void> _showStepOverview() async {
    if (_requestPending) return;
    final selected = await showCatchFormStepSheet(
      fieldCopy: catchFieldCopy(context.l10n),
      statusLabelBuilder: catchFormStepStatusLabelBuilder(context.l10n),
      context: context,
      title: context.l10n.hostsCreateEventOverviewTitle,
      subtitle: context.l10n.hostsWizardOverviewSubtitle,
      items: _reviewState.items,
    );
    if (mounted && selected != null) _showStep(selected);
  }

  String _primaryLabel(CreateEventWizardPrimaryIntent intent) =>
      switch (intent) {
        CreateEventWizardPrimaryIntent.nextStep =>
          context.l10n.hostsStepperFooterLabelNext,
        CreateEventWizardPrimaryIntent.review =>
          context.l10n.hostsCreateEventReviewTitle,
        CreateEventWizardPrimaryIntent.submit =>
          context.l10n.hostsCreateEventCreateAction,
      };
}

String? _trimmedTextOrNull(TextEditingController controller) {
  final value = controller.text.trim();
  return value.isEmpty ? null : value;
}
