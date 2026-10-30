part of 'create_organizer_screen.dart';

extension _CreateOrganizerActions on _CreateOrganizerScreenState {
  Future<void> _restoreSavedDraft() async {
    try {
      final draft = await CreateOrganizerDraftController.loadDraftMutation.run(
        ref,
        (tx) =>
            tx.get(createOrganizerDraftControllerProvider.notifier).loadDraft(),
      );
      if (!mounted || draft == null || draft.isEmpty) {
        return;
      }
      final restoredDraft = draft;

      _setLocalState(() {
        _restoreFromDraft(restoredDraft);
        _restoredDraft = true;
        _lastSavedDraftSignature = _currentDraftContentSignature;
      });

      showCatchNotice(
        context,
        context
            .l10n
            .hostsCreateOrganizerScreenVisiblecopyRestoredYourOrganizerDraft,
      );
    } catch (error, stackTrace) {
      ref
          .read(errorLoggerProvider)
          .logError(
            error,
            stackTrace,
            reason: context
                .l10n
                .hostsCreateOrganizerScreenVisiblecopyCreateorganizerscreenRestoresaveddraftFailed,
          );
      return;
    }
  }

  void _seedInitialMedia() {
    _profileImage = widget.initialProfileImage;
    if (widget.initialPickedOrganizerPhotos.isEmpty) return;
    _clubPhotos.addAll(
      widget.initialPickedOrganizerPhotos.map(
        (photo) =>
            _PickedOrganizerPhotoDraft(_nextPickedOrganizerPhotoId++, photo),
      ),
    );
    _organizerPhotosTouched = true;
  }

  void _restoreFromDraft(OrganizerDraft draft) {
    if (draft.name != null) _nameController.text = draft.name!;
    if (draft.area != null) _areaController.text = draft.area!;
    if (draft.description != null) {
      _descriptionController.text = draft.description!;
    }
    if (draft.location != null) _selectedCity = draft.location;
    _organizerType = draft.organizerType;
    if (draft.instagramHandle != null) {
      _instagramController.text = draft.instagramHandle!;
    }
    if (draft.phoneNumber != null) _phoneController.text = draft.phoneNumber!;
    if (draft.email != null) _emailController.text = draft.email!;
    _hostDefaults = draft.hostDefaults;
  }

  Future<void> _pickOrganizerPhotos() async {
    final photos = await ref
        .read(createOrganizerControllerProvider.notifier)
        .pickOrganizerPhotos();
    if (!mounted || photos.isEmpty) {
      return;
    }
    _setLocalState(() {
      _clubPhotos.addAll(
        photos.map(
          (photo) =>
              _PickedOrganizerPhotoDraft(_nextPickedOrganizerPhotoId++, photo),
        ),
      );
      _organizerPhotosTouched = true;
    });
  }

  void _removeOrganizerPhoto(int index) {
    if (index < 0 || index >= _clubPhotos.length) return;
    _setLocalState(() {
      _clubPhotos.removeAt(index);
      _organizerPhotosTouched = true;
    });
  }

  void _reorderOrganizerPhoto(int fromIndex, int toIndex) {
    if (fromIndex == toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= _clubPhotos.length ||
        toIndex >= _clubPhotos.length) {
      return;
    }
    _setLocalState(() {
      final moved = _clubPhotos.removeAt(fromIndex);
      _clubPhotos.insert(toIndex, moved);
      _organizerPhotosTouched = true;
    });
  }

  Future<void> _pickProfileImage() async {
    final image = await ref
        .read(createOrganizerControllerProvider.notifier)
        .pickProfileImage();
    if (!mounted || image == null) {
      return;
    }
    _setLocalState(() {
      _profileImage = image;
    });
  }

  void _removeProfileImage() {
    _setLocalState(() => _profileImage = null);
  }

  Future<void> _handleCloseIntent(HostOrganizerCreateCloseIntent intent) async {
    if (_requestPending) return;
    switch (intent) {
      case HostOrganizerCreateCloseIntent.confirmUnsavedChanges:
        final decision = await showHostDraftExitDialog(context);
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
      case HostOrganizerCreateCloseIntent.close:
        _completeClose();
    }
  }

  void _handlePreviousIntent(HostOrganizerCreatePreviousIntent intent) {
    if (_requestPending) return;
    switch (intent) {
      case HostOrganizerCreatePreviousIntent.previousStep:
        _showStep(_currentStep - 1);
      case HostOrganizerCreatePreviousIntent.returnToSteps:
        _showStep(_currentStep);
    }
  }

  void _handlePrimaryIntent(HostOrganizerCreatePrimaryIntent intent) {
    if (_requestPending) return;

    switch (intent) {
      case HostOrganizerCreatePrimaryIntent.nextStep:
        if (_currentStep < _activeSteps.length - 1) {
          _goToStep(_currentStep + 1);
        }
      case HostOrganizerCreatePrimaryIntent.review:
        _setLocalState(() => _isReviewing = true);
      case HostOrganizerCreatePrimaryIntent.submit:
        if (_validateAllInput()) _submit();
    }
  }

  Future<void> _handleDraftRestoreIntent(
    HostOrganizerCreateDraftRestoreIntent intent,
  ) async {
    if (_requestPending) return;
    switch (intent) {
      case HostOrganizerCreateDraftRestoreIntent.retry:
        await _restoreSavedDraft();
        return;
    }
  }

  void _goToStep(int step) {
    if (_requestPending || step < 0 || step >= _activeSteps.length) return;
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
    if (_requestPending || step < 0 || step >= _activeSteps.length) return;
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
    final steps = _activeSteps;
    for (var index = 0; index < steps.length; index++) {
      final form = steps[index].formKey?.currentState;
      if (form != null && !form.validate()) {
        formsAreValid = false;
        firstInvalidForm ??= index;
      }
    }
    final review = _reviewState;
    final firstInvalid = review.firstIncompleteStep ?? firstInvalidForm;
    if (!formsAreValid || !review.canSubmit) {
      _setLocalState(() => _showValidationErrors = true);
      if (firstInvalid != null) _showStep(firstInvalid);
      return false;
    }
    return true;
  }

  void _handleRouteIntent(HostOrganizerCreateRouteIntent intent) {
    if (_requestPending) return;
    switch (intent) {
      case HostOrganizerCreatePickProfileImageIntent():
        unawaited(_pickProfileImage());
      case HostOrganizerCreateRemoveProfileImageIntent():
        _removeProfileImage();
      case HostOrganizerCreatePickOrganizerPhotosIntent():
        unawaited(_pickOrganizerPhotos());
      case HostOrganizerCreateRemoveOrganizerPhotoIntent(:final index):
        _removeOrganizerPhoto(index);
      case HostOrganizerCreateReorderOrganizerPhotoIntent(
        :final fromIndex,
        :final toIndex,
      ):
        _reorderOrganizerPhoto(fromIndex, toIndex);
      case HostOrganizerCreateCityChangedIntent(:final city):
        _setLocalState(() => _selectedCity = city?.effectiveMarketId);
      case HostOrganizerCreateOrganizerTypeChangedIntent(:final organizerType):
        _setLocalState(() => _organizerType = organizerType);
      case HostOrganizerCreateDefaultsChangedIntent(:final defaults):
        _setLocalState(() => _hostDefaults = defaults);
    }
  }

  Future<bool> _saveDraft({bool showSuccess = true}) async {
    if (_requestPending) return false;
    final draftRequest = HostOrganizerCreateDraftRequest.fromForm(
      name: _nameController.text,
      area: _areaController.text,
      description: _descriptionController.text,
      organizerType: _organizerType,
      selectedCity: _selectedCity,
      instagramHandle: _instagramController.text,
      phoneNumber: _phoneController.text,
      email: _emailController.text,
      hostDefaults: _hostDefaults,
    );

    final savedDraft = await CreateOrganizerDraftController.saveDraftMutation
        .run(
          ref,
          (tx) async => tx
              .get(createOrganizerDraftControllerProvider.notifier)
              .saveDraft(draftRequest.toDraft(savedAt: DateTime.now())),
        );
    if (savedDraft == null) return false;

    _lastSavedDraftSignature = _currentDraftContentSignature;

    if (mounted && showSuccess) {
      showCatchNotice(
        context,
        _restoredDraft
            ? context.l10n.hostsCreateOrganizerScreenVisiblecopyDraftUpdated
            : context.l10n.hostsCreateOrganizerScreenVisiblecopyDraftSaved,
      );
    }
    _restoredDraft = true;
    return true;
  }

  void _submit() {
    if (_requestPending) return;
    final failureReason = context
        .l10n
        .hostsCreateOrganizerScreenVisiblecopyCreateorganizerscreenSubmitFailed;
    unawaited(
      CreateOrganizerController.submitMutation
          .run(ref, (transaction) async {
            final request = HostOrganizerCreateSubmitRequest.fromForm(
              name: _nameController.text,
              selectedCity: _selectedCity,
              area: _areaController.text,
              description: _descriptionController.text,
              organizerType: _organizerType,
              organizerPhotoInputs: _organizerPhotoInputsForSubmit,
              profileImage: _profileImage,
              instagramHandle: _instagramController.text,
              phoneNumber: _phoneController.text,
              email: _emailController.text,
              hostDefaults: _hostDefaults,
            );
            await transaction
                .get(createOrganizerControllerProvider.notifier)
                .submit(
                  name: request.name,
                  location: request.location,
                  area: request.area,
                  description: request.description,
                  organizerType: request.organizerType,
                  organizerPhotoInputs: request.organizerPhotoInputs,
                  profileImage: request.profileImage?.image,
                  instagramHandle: request.instagramHandle,
                  phoneNumber: request.phoneNumber,
                  email: request.email,
                  hostDefaults: request.hostDefaults,
                );

            await transaction
                .get(createOrganizerDraftControllerProvider.notifier)
                .deleteDraft();
          })
          .catchError((error, stackTrace) {
            ref
                .read(errorLoggerProvider)
                .logError(error, stackTrace, reason: failureReason);
          }),
    );
  }

  List<OrderedPhotoPreview> get _organizerPhotoPreviews => [
    for (final photo in _clubPhotos) photo.preview,
  ];

  List<OrganizerPhotoInput>? get _organizerPhotoInputsForSubmit {
    if (!_organizerPhotosTouched) return null;
    return [for (final photo in _clubPhotos) photo.input];
  }

  bool get _requestPending =>
      ref.read(CreateOrganizerController.submitMutation).isPending ||
      ref.read(CreateOrganizerDraftController.saveDraftMutation).isPending ||
      ref.read(CreateOrganizerDraftController.loadDraftMutation).isPending;

  Object get _currentDraftContentSignature => (
    name: _nameController.text.trim(),
    area: _areaController.text.trim(),
    description: _descriptionController.text.trim(),
    organizerType: _organizerType,
    city: _selectedCity,
    instagram: _instagramController.text.trim(),
    phone: _phoneController.text.trim(),
    email: _emailController.text.trim(),
    defaults: _hostDefaults,
  );

  bool get _hasUnsavedChanges {
    final comparison =
        _lastSavedDraftSignature ?? _initialDraftContentSignature;
    return _currentDraftContentSignature != comparison;
  }

  HostOrganizerCreateReviewState get _reviewState =>
      HostOrganizerCreateReviewState.resolve(
        activeSteps: _activeSteps,
        name: _nameController.text,
        selectedCity: _selectedCity,
        area: _areaController.text,
        description: _descriptionController.text,
      );

  void _completeClose() {
    if (!mounted || _allowRoutePop) return;
    _setLocalState(() => _allowRoutePop = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) Navigator.of(context).pop();
    });
  }

  Future<void> _showStepOverview() async {
    if (_requestPending) return;
    final selected = await showCatchFormStepSheet(
      fieldCopy: catchFieldCopy(context.l10n),
      statusLabelBuilder: catchFormStepStatusLabelBuilder(context.l10n),
      context: context,
      title: context.l10n.hostsCreateOrganizerOverviewTitle,
      subtitle: context.l10n.hostsWizardOverviewSubtitle,
      items: _reviewState.items,
    );
    if (mounted && selected != null) _showStep(selected);
  }

  String _primaryLabel(HostOrganizerCreatePrimaryIntent intent) =>
      switch (intent) {
        HostOrganizerCreatePrimaryIntent.nextStep =>
          context.l10n.hostsStepperFooterLabelNext,
        HostOrganizerCreatePrimaryIntent.review =>
          context.l10n.hostsCreateOrganizerReviewTitle,
        HostOrganizerCreatePrimaryIntent.submit =>
          context.l10n.hostsCreateOrganizerCreateAction,
      };
}
