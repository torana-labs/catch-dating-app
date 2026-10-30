part of 'edit_hosted_event_screen.dart';

extension _EditHostedEventActions on _EditHostedEventScreenState {
  Future<void> _pickDate() async {
    if (_savePending) return;
    final today = DateUtils.dateOnly(_now);
    final lastDate = today.add(BusinessRules.eventEditDatePickerWindow);
    final initialDate = _selectedDate.isBefore(today) ? today : _selectedDate;
    final picked = await showCatchDatePicker(
      copy: catchDatePickerCopy(context.l10n),
      context: context,
      initialDate: initialDate.isAfter(lastDate) ? lastDate : initialDate,
      firstDate: today,
      lastDate: lastDate,
      title: context.l10n.hostsEditHostedEventScreenTitleEventDate,
    );
    if (picked == null || _savePending) return;
    final scheduleError = _scheduleValidationFor(
      picked,
      _selectedStartTime,
    ).errorText;
    _setLocalState(() {
      _selectedDate = DateUtils.dateOnly(picked);
      _scheduleErrorText = scheduleError;
    });
  }

  Future<void> _pickStartTime() async {
    if (_savePending) return;
    final picked = await showCatchTimePicker(
      copy: catchTimePickerCopy(context.l10n),
      context: context,
      initialTime: _selectedStartTime,
      title: context.l10n.hostsEditHostedEventScreenTitleStartTime,
    );
    if (picked == null || _savePending) return;
    final scheduleError = _scheduleValidationFor(
      _selectedDate,
      picked,
    ).errorText;
    _setLocalState(() {
      _selectedStartTime = picked;
      _scheduleErrorText = scheduleError;
    });
  }

  Future<void> _pickLocation() async {
    if (_savePending) return;
    final deviceLocation = ref.read(deviceLocationProvider).asData?.value;
    final locationState = HostEventEditLocationState.from(
      canEdit: true,
      startingPoint: _startingPoint,
      meetingPoint: _meetingPointController.text,
    );
    final result = await Navigator.of(context).push<LocationPickerResult>(
      MaterialPageRoute(
        builder: (_) => LocationPickerScreen(
          countryIsoCode: countryIsoCodeForCityName(widget.organizer.location),
          initialLocation: locationState.startingPoint,
          initialCenter: locationState.startingPoint ?? deviceLocation,
          initialLabel: locationState.pickerInitialLabel,
          loadMapTiles: widget.loadMapTiles,
        ),
        fullscreenDialog: true,
      ),
    );
    if (result != null && !_savePending) {
      _setLocalState(() {
        _startingPoint = result.coordinate;
        _meetingLocationAddress = result.address;
        _meetingLocationPlaceId = result.placeId;
        final placeName = result.displayName;
        if (placeName != null) {
          _meetingPointController.text = placeName;
        }
      });
    }
  }

  HostEventEditScheduleValidationState _scheduleValidationFor(
    DateTime date,
    TimeOfDay startTime, {
    bool scheduleLocked = false,
  }) {
    return HostEventEditScheduleValidationState.from(
      scheduleLocked: scheduleLocked,
      selectedStartDateTime: DateTime(
        date.year,
        date.month,
        date.day,
        startTime.hour,
        startTime.minute,
      ),
      now: _now,
      invalidScheduleMessage: HostEventEditSaveOutcomeState.updated(
        context.l10n,
      ).invalidScheduleMessage,
    );
  }

  void _handleIntent(HostEventEditIntent intent) {
    if (_savePending) return;
    switch (intent) {
      case HostEventEditPickDateIntent():
        unawaited(_pickDate());
      case HostEventEditPickStartTimeIntent():
        unawaited(_pickStartTime());
      case HostEventEditDurationChangedIntent(:final durationMinutes):
        _setLocalState(() => _durationMinutes = durationMinutes);
      case HostEventEditMeetingPointChangedIntent():
        _setLocalState(() {});
      case HostEventEditPickLocationIntent():
        unawaited(_pickLocation());
      case HostEventEditPaceChangedIntent(:final pace):
        _setLocalState(() => _selectedPace = pace);
      case HostEventEditAdmissionPresetChangedIntent(:final preset):
        _setLocalState(() {
          _selectedAdmissionPreset = preset;
          if (preset != EventAdmissionPreset.inviteOnly) {
            _loadedPrivateAccess = false;
          }
          if (preset != EventAdmissionPreset.balancedSingles) {
            _dynamicPricingEnabled = false;
          }
          if (preset != EventAdmissionPreset.openCapacity) {
            _cohortCapsEnabled = false;
          }
        });
      case HostEventEditCohortCapsChangedIntent(:final enabled):
        _setLocalState(() => _cohortCapsEnabled = enabled);
      case HostEventEditDynamicPricingChangedIntent(:final enabled):
        _setLocalState(() {
          _dynamicPricingEnabled = enabled;
          if (enabled && _dynamicPricingStepController.text.isEmpty) {
            _dynamicPricingStepController.text = '250';
          }
          if (enabled && _dynamicPricingMaxController.text.isEmpty) {
            _dynamicPricingMaxController.text = '1500';
          }
        });
      case HostEventEditCancellationPolicyChangedIntent(:final policyId):
        _setLocalState(() => _selectedCancellationPolicyId = policyId);
      case HostEventEditSaveIntent():
        _saveChanges();
    }
  }

  void _saveChanges() {
    if (_savePending) return;
    final screenState = HostEventEditScreenState.from(
      event: widget.event,
      now: _now,
      savePending: false,
      l10n: context.l10n,
    );
    if (!_formKey.currentState!.validate()) return;
    if (_startingPoint == null) {
      showCatchNotice(
        context,
        screenState.saveOutcome.missingStartingPointMessage,
      );
      return;
    }
    final scheduleValidation = _scheduleValidationFor(
      _selectedDate,
      _selectedStartTime,
      scheduleLocked: screenState.scheduleLocked,
    );
    if (!scheduleValidation.isValid) {
      _setLocalState(() => _scheduleErrorText = scheduleValidation.errorText);
      return;
    }

    final request = HostEventEditSaveRequest.fromForm(
      event: widget.event,
      name: _nameController.text,
      itinerary: _itinerary,
      routePlanChanged: true,
      routePlan: _routePlan,
      scheduleLocked: screenState.scheduleLocked,
      policyLocked: screenState.policyLocked,
      selectedStartDateTime: _selectedStartDateTime,
      durationMinutes: _durationMinutes,
      startingPoint: _startingPoint!,
      meetingPoint: _meetingPointController.text,
      meetingLocationAddress: _meetingLocationAddress,
      meetingLocationPlaceId: _meetingLocationPlaceId,
      locationDetails: _locationDetailsController.text,
      distanceText: _distanceController.text,
      selectedPace: _selectedPace,
      description: _descriptionController.text,
      accessibility: _accessibilityController.text,
      included: _includedController.text,
      capacityText: _capacityController.text,
      priceText: _priceController.text,
      admissionPreset: _selectedAdmissionPreset,
      cohortCapsEnabled: _cohortCapsEnabled,
      dynamicPricingEnabled: _dynamicPricingEnabled,
      minAgeText: _minAgeController.text,
      maxAgeText: _maxAgeController.text,
      maxMenText: _maxMenController.text,
      maxWomenText: _maxWomenController.text,
      dynamicPricingStepText: _dynamicPricingStepController.text,
      dynamicPricingMaxText: _dynamicPricingMaxController.text,
      cancellationPolicyId: _selectedCancellationPolicyId,
      inviteCodeText: _inviteCodeController.text,
    );

    unawaited(
      HostEventBookingController.updateHostedEventMutation.run(ref, (tx) async {
        await tx
            .get(hostEventBookingControllerProvider.notifier)
            .updateHostedEvent(
              event: request.nextEvent,
              includePolicy: request.includePolicy,
              inviteCode: request.inviteCode,
            );
        ref.invalidate(watchEventProvider(widget.event.id));
        ref.invalidate(watchEventParticipationRosterProvider(widget.event.id));
        if (!mounted) return;
        showCatchNotice(context, screenState.saveOutcome.successMessage);
        if (screenState.saveOutcome.popRouteOnSuccess &&
            Navigator.of(context).canPop()) {
          Navigator.of(context).pop();
        }
      }),
    );
  }

  Future<EventMeetingLocation?> _pickItineraryLocation(
    EventMeetingLocation? current,
  ) async {
    if (_savePending) return null;
    final deviceLocation = ref.read(deviceLocationProvider).asData?.value;
    final result = await Navigator.of(context).push<LocationPickerResult>(
      MaterialPageRoute(
        builder: (_) => LocationPickerScreen(
          countryIsoCode: countryIsoCodeForCityName(widget.organizer.location),
          initialLocation: current == null
              ? null
              : LocationCoordinate(current.latitude, current.longitude),
          initialCenter:
              (current == null
                  ? _startingPoint
                  : LocationCoordinate(current.latitude, current.longitude)) ??
              deviceLocation,
          initialLabel: current?.name,
          loadMapTiles: widget.loadMapTiles,
        ),
        fullscreenDialog: true,
      ),
    );
    if (result == null || !mounted || _savePending) return null;
    return EventMeetingLocation(
      name:
          result.displayName ??
          current?.name ??
          context.l10n.eventsMapPinTileTitlePinnedLocation,
      address: result.address,
      placeId: result.placeId,
      latitude: result.coordinate.latitude,
      longitude: result.coordinate.longitude,
    ).normalized();
  }

  EventMeetingLocation? get _currentMeetingLocation {
    final point = _startingPoint;
    if (point == null) return widget.event.effectiveMeetingLocation;
    final name = _meetingPointController.text.trim();
    if (name.isEmpty) return null;
    return EventMeetingLocation(
      name: name,
      address: _meetingLocationAddress,
      placeId: _meetingLocationPlaceId,
      latitude: point.latitude,
      longitude: point.longitude,
      notes: _trimToNull(_locationDetailsController.text),
    ).normalized();
  }

  bool get _savePending =>
      ref.read(HostEventBookingController.updateHostedEventMutation).isPending;
}

String? _trimToNull(String value) {
  final normalized = value.trim();
  return normalized.isEmpty ? null : normalized;
}
