part of '../host_operations_screen.dart';

abstract final class HostOrganizerEditFieldKeys {
  static const organizerType = 'organizerType';
  static const name = 'name';
  static const location = 'location';
  static const area = 'area';
  static const description = 'description';
  static const instagramHandle = 'instagramHandle';
  static const phoneNumber = 'phoneNumber';
  static const email = 'email';
  static const primaryActivityKind = 'primaryActivityKind';
  static const admissionPreset = 'admissionPreset';
  static const ageRange = 'ageRange';
  static const cancellationPolicyId = 'cancellationPolicyId';
}

abstract final class HostOrganizerMediaKeys {
  static const summaryStrip = ValueKey('host-media-summary-strip');
  static const logoTile = ValueKey('host-media-logo-tile');
}

typedef HostOrganizerSettingsNavigation =
    void Function(Routes route, String organizerId);

class HostOrganizerEditBody extends ConsumerStatefulWidget {
  const HostOrganizerEditBody({
    super.key,
    required this.organizer,
    required this.currentUid,
    required this.isOwner,
    this.initialExpandedField,
    this.onOpenSettingsRoute,
  });

  final Organizer organizer;
  final String currentUid;
  final bool isOwner;
  final String? initialExpandedField;
  final HostOrganizerSettingsNavigation? onOpenSettingsRoute;

  @override
  ConsumerState<HostOrganizerEditBody> createState() =>
      _HostOrganizerEditBodyState();
}

class _HostOrganizerEditBodyState extends ConsumerState<HostOrganizerEditBody> {
  late final CatchAccordionController _fieldAccordion;
  late List<_HostOrganizerMediaDraft> _mediaDrafts;
  HostPickedOrganizerLogo? _pickedLogo;
  bool _removeLogoOnSave = false;
  bool _mediaDirty = false;
  bool _mediaCommitInFlight = false;
  bool _mediaAwaitingSnapshot = false;
  int _mediaSourceRevision = 0;
  bool _showMediaError = false;
  Object? _mediaError;
  ValueNotifier<List<OrderedPhotoPreview>>? _mediaManagerPhotos;

  Future<void> _setPublicListingEnabled(bool enabled) async {
    try {
      await HostOrganizerEditController.publicationMutation.run(
        ref,
        (tx) => tx
            .get(hostOrganizerEditControllerProvider)
            .updateOrganizer(
              organizerId: widget.organizer.id,
              patch: UpdateOrganizerPatch(publicListingEnabled: enabled),
            ),
      );
    } catch (_) {
      // The publication card owns the localized mutation error.
    }
  }

  @override
  void initState() {
    super.initState();
    _fieldAccordion = CatchAccordionController(
      initialExpanded: widget.initialExpandedField,
    )..addListener(_handleAccordionChanged);
    _resetMediaFromOrganizer();
    _mediaManagerPhotos = ValueNotifier(_visibleMediaPreviews);
  }

  @override
  void didUpdateWidget(covariant HostOrganizerEditBody oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.organizer.id != widget.organizer.id) {
      _setExpandedField(widget.initialExpandedField);
      _resetMediaFromOrganizer();
    } else if (oldWidget.initialExpandedField != widget.initialExpandedField) {
      _setExpandedField(widget.initialExpandedField);
    }
    if (oldWidget.organizer.organizerPhotos !=
            widget.organizer.organizerPhotos ||
        oldWidget.organizer.profileImageUrl !=
            widget.organizer.profileImageUrl ||
        oldWidget.organizer.logoPhoto != widget.organizer.logoPhoto) {
      _mediaSourceRevision += 1;
      _mediaAwaitingSnapshot = false;
      _resetMediaFromOrganizer();
    }
  }

  @override
  void dispose() {
    _fieldAccordion
      ..removeListener(_handleAccordionChanged)
      ..dispose();
    _mediaManagerPhotos?.dispose();
    super.dispose();
  }

  void _handleAccordionChanged() {
    if (mounted) setState(() {});
  }

  void _setExpandedField(String? fieldName) {
    if (fieldName == null) {
      _fieldAccordion.collapse();
    } else if (_fieldAccordion.expanded != fieldName) {
      _fieldAccordion.toggle(fieldName);
    }
  }

  void _resetMediaFromOrganizer() {
    final drafts = <_HostOrganizerMediaDraft>[
      for (final photo in [
        ...widget.organizer.organizerPhotos,
      ]..sort((a, b) => a.position.compareTo(b.position)))
        _HostExistingOrganizerMediaDraft(photo),
    ];
    _mediaDrafts = drafts;
    _pickedLogo = null;
    _removeLogoOnSave = false;
    _mediaDirty = false;
    _mediaAwaitingSnapshot = false;
    _showMediaError = false;
    _mediaError = null;
    _syncMediaManagerPhotos();
  }

  void _syncMediaManagerPhotos() {
    _mediaManagerPhotos?.value = _visibleMediaPreviews;
  }

  Future<HostPickedOrganizerLogo?> _pickLogo() async {
    // provider-graph: ownership-widget-async:_HostOrganizerEditBodyState._pickLogo:await:hostOrganizerEditControllerProvider.pickOrganizerLogo watch CAT156 -- Existing bounded review signal at _HostOrganizerEditBodyState._pickLogo (await:hostOrganizerEditControllerProvider.pickOrganizerLogo). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
    final logo = await ref
        .read(hostOrganizerEditControllerProvider)
        .pickOrganizerLogo();
    if (!mounted || logo == null) return null;
    final previousLogo = _pickedLogo;
    setState(() {
      _pickedLogo = logo;
      _removeLogoOnSave = false;
      _mediaDirty = true;
      _showMediaError = false;
    });
    _syncMediaManagerPhotos();
    if (previousLogo?.uploadedPhoto != null) {
      unawaited(
        ref
            .read(hostOrganizerEditControllerProvider)
            .discardOrganizerMedia(photoInputs: const [], logo: previousLogo),
      );
    }
    return logo;
  }

  Future<void> _pickPhotos() async {
    await _pickAndAppendPhotos();
  }

  Future<List<OrderedPhotoPreview>> _pickPhotosInManager() async {
    final added = await _pickAndAppendPhotos();
    return [for (final draft in added) draft.preview];
  }

  Future<List<_HostPickedOrganizerMediaDraft>> _pickAndAppendPhotos() async {
    // provider-graph: ownership-widget-async:_HostOrganizerEditBodyState._pickAndAppendPhotos:await:hostOrganizerEditControllerProvider.pickOrganizerPhotos watch CAT156 -- Existing bounded review signal at _HostOrganizerEditBodyState._pickAndAppendPhotos (await:hostOrganizerEditControllerProvider.pickOrganizerPhotos). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
    final photos = await ref
        .read(hostOrganizerEditControllerProvider)
        .pickOrganizerPhotos();
    if (!mounted || photos.isEmpty) return const [];
    final added = [
      for (final photo in photos) _HostPickedOrganizerMediaDraft(photo),
    ];
    setState(() {
      _mediaDrafts.addAll(added);
      _mediaDirty = true;
      _showMediaError = false;
    });
    _syncMediaManagerPhotos();
    return added;
  }

  List<OrderedPhotoPreview> get _visibleMediaPreviews => _mediaDrafts.isNotEmpty
      ? [for (final draft in _mediaDrafts) draft.preview]
      : [
          if (widget.organizer.imageUrl case final imageUrl?)
            OrderedPhotoPreview(
              id: 'existing_legacy_club_cover',
              imageUrl: imageUrl,
            ),
        ];

  Future<void> _openMediaManager() async {
    final photos = _visibleMediaPreviews;
    final saved = await Navigator.of(context, rootNavigator: true).push<bool>(
      MaterialPageRoute<bool>(
        fullscreenDialog: true,
        builder: (_) => OrderedPhotoManagerScreen(
          photos: photos,
          onAddPhotos: _pickPhotos,
          onRemovePhoto: _removePhoto,
          onReorderPhoto: _reorderPhoto,
          onRetryPhoto: _retryPhoto,
          onAddPhotosInManager: _pickPhotosInManager,
          photosListenable: _mediaManagerPhotos,
          canAdd: true,
          header: HostOrganizerLogoManagerHeader(
            imageBytes: _pickedLogo?.bytes,
            existingImageUrl: _removeLogoOnSave
                ? null
                : widget.organizer.profileImageUrl,
            onPickLogo: _pickLogo,
            onRemoveLogo: _removeLogo,
          ),
          footer: HostOrganizerMediaManagerDock(
            onSave: _saveMedia,
            errorText: _mediaErrorText,
          ),
          showDoneAction: false,
        ),
      ),
    );
    if (!mounted || saved == true || !_mediaDirty) return;
    await _discardMedia();
  }

  Future<void> _retryPhoto(int index) async {
    if (index < 0 || index >= _mediaDrafts.length) return;
    final draft = _mediaDrafts[index];
    if (draft is! _HostPickedOrganizerMediaDraft || !draft.job.canRetry) {
      return;
    }
    setState(() {
      _mediaDrafts[index] = draft.withJob(const ImageUploadJobState.queued());
      _mediaDirty = true;
    });
    _syncMediaManagerPhotos();
    await _saveMedia();
  }

  Future<void> _removeLogo() async {
    final stagedLogo = _pickedLogo;
    setState(() {
      _pickedLogo = null;
      _removeLogoOnSave = widget.organizer.profileImageUrl != null;
      _mediaDirty = true;
      _showMediaError = false;
    });
    _syncMediaManagerPhotos();
    if (stagedLogo?.uploadedPhoto != null) {
      // provider-graph: ownership-widget-async:_HostOrganizerEditBodyState._removeLogo:await:hostOrganizerEditControllerProvider.discardOrganizerMedia watch CAT156 -- Existing bounded review signal at _HostOrganizerEditBodyState._removeLogo (await:hostOrganizerEditControllerProvider.discardOrganizerMedia). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
      await ref
          .read(hostOrganizerEditControllerProvider)
          .discardOrganizerMedia(photoInputs: const [], logo: stagedLogo);
    }
  }

  void _removePhoto(int index) {
    if (index < 0 || index >= _mediaDrafts.length) return;
    final removed = _mediaDrafts[index];
    setState(() {
      _mediaDrafts.removeAt(index);
      _mediaDirty = true;
      _showMediaError = false;
    });
    _syncMediaManagerPhotos();
    if (removed is _HostPickedOrganizerMediaDraft && removed.input.isUploaded) {
      unawaited(
        ref
            .read(hostOrganizerEditControllerProvider)
            .discardOrganizerMedia(photoInputs: [removed.input]),
      );
    }
  }

  void _reorderPhoto(int fromIndex, int toIndex) {
    if (fromIndex == toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= _mediaDrafts.length ||
        toIndex >= _mediaDrafts.length) {
      return;
    }
    setState(() {
      final moved = _mediaDrafts.removeAt(fromIndex);
      _mediaDrafts.insert(toIndex, moved);
      _mediaDirty = true;
      _showMediaError = false;
    });
    _syncMediaManagerPhotos();
  }

  Future<bool> _saveMedia() async {
    if (!_mediaDirty) return true;
    if (_mediaCommitInFlight) return false;
    final sourceRevision = _mediaSourceRevision;
    _mediaCommitInFlight = true;
    setState(() {
      _showMediaError = false;
      _mediaError = null;
      _mediaDrafts = [
        for (final draft in _mediaDrafts)
          if (draft is _HostPickedOrganizerMediaDraft &&
              !draft.input.isUploaded)
            draft.withJob(const ImageUploadJobState.queued())
          else
            draft,
      ];
    });
    try {
      final result = await HostOrganizerEditController.updateMediaMutation.run(
        ref,
        (tx) => tx
            .get(hostOrganizerEditControllerProvider)
            .updateOrganizerMedia(
              organizer: widget.organizer,
              photoInputs: [for (final draft in _mediaDrafts) draft.input],
              logo: _pickedLogo,
              removeLogo: _removeLogoOnSave,
              onProgress: _updateMediaProgress,
            ),
      );
      if (!mounted) return !result.hasFailures;
      setState(() {
        _applyResolvedInputs(result);
        if (result.hasFailures) {
          _mediaAwaitingSnapshot = false;
          _showMediaError = true;
          _mediaError = result.failures.values.first;
          return;
        }
        _mediaDirty = false;
        _removeLogoOnSave = false;
        _mediaAwaitingSnapshot = _mediaSourceRevision == sourceRevision;
        _showMediaError = false;
      });
      _syncMediaManagerPhotos();
      return !result.hasFailures;
    } catch (error) {
      if (!mounted) return false;
      setState(() {
        _mediaDrafts = [
          for (final draft in _mediaDrafts)
            if (draft is _HostPickedOrganizerMediaDraft)
              draft.clearUpload(error)
            else
              draft,
        ];
        if (_pickedLogo != null) {
          _pickedLogo = HostPickedOrganizerLogo(
            id: _pickedLogo!.id,
            image: _pickedLogo!.image,
            bytes: _pickedLogo!.bytes,
          );
        }
        _mediaAwaitingSnapshot = false;
        _showMediaError = true;
        _mediaError = error;
      });
      _syncMediaManagerPhotos();
      return false;
    } finally {
      _mediaCommitInFlight = false;
      if (mounted) setState(() {});
    }
  }

  String? _mediaErrorText(BuildContext context) {
    if (!_showMediaError || _mediaError == null) return null;
    return appErrorMessage(
      _mediaError!,
      l10n: context.l10n,
      context: AppErrorContext.organizer,
    );
  }

  void _updateMediaProgress(HostOrganizerMediaProgress progress) {
    if (!mounted) return;
    final index = _mediaDrafts.indexWhere((draft) => draft.id == progress.id);
    if (index < 0) return;
    final draft = _mediaDrafts[index];
    if (draft is! _HostPickedOrganizerMediaDraft) return;
    setState(() => _mediaDrafts[index] = draft.withJob(progress.state));
    _syncMediaManagerPhotos();
  }

  void _applyResolvedInputs(HostOrganizerMediaSaveResult result) {
    final resolvedById = {
      for (final input
          in result.photoInputs ?? const <HostOrganizerMediaInput>[])
        input.id: input,
    };
    _mediaDrafts = [
      for (final draft in _mediaDrafts)
        switch (draft) {
          _HostExistingOrganizerMediaDraft() => draft,
          _HostPickedOrganizerMediaDraft() => draft.withResolvedInput(
            resolvedById[draft.id],
            error: result.failures[draft.id],
          ),
        },
    ];
    _pickedLogo = result.logo;
  }

  Future<void> _discardMedia() async {
    if (_mediaCommitInFlight) return;
    _mediaCommitInFlight = true;
    if (mounted) setState(() {});
    try {
      // provider-graph: ownership-widget-async:_HostOrganizerEditBodyState._discardMedia:await:hostOrganizerEditControllerProvider.discardOrganizerMedia watch CAT156 -- Existing bounded review signal at _HostOrganizerEditBodyState._discardMedia (await:hostOrganizerEditControllerProvider.discardOrganizerMedia). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
      await ref
          .read(hostOrganizerEditControllerProvider)
          .discardOrganizerMedia(
            photoInputs: [for (final draft in _mediaDrafts) draft.input],
            logo: _pickedLogo,
          );
      if (mounted) setState(_resetMediaFromOrganizer);
    } finally {
      _mediaCommitInFlight = false;
      if (mounted) setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final organizer = widget.organizer;
    final updateOrganizerMutation = ref.watch(
      HostOrganizerEditController.updateOrganizerMutation,
    );
    final mediaPending = _mediaCommitInFlight || _mediaAwaitingSnapshot;
    final publicationMutation = ref.watch(
      HostOrganizerEditController.publicationMutation,
    );
    final publicationState = HostOrganizerPublicationState.fromOrganizer(
      organizer,
    );
    final publicationBody = switch (publicationState.kind) {
      HostOrganizerPublicationKind.private =>
        context.l10n.hostsHostOrganizerPublicationBodyPrivate,
      HostOrganizerPublicationKind.catchOnly =>
        context.l10n.hostsHostOrganizerPublicationBodyCatchOnly,
      HostOrganizerPublicationKind.websiteOnly =>
        context.l10n.hostsHostOrganizerPublicationBodyWebsiteOnly,
      HostOrganizerPublicationKind.everywhere =>
        context.l10n.hostsHostOrganizerPublicationBodyEverywhere,
    };
    final publicationAction = switch (publicationState.kind) {
      HostOrganizerPublicationKind.private =>
        context.l10n.hostsHostOrganizerPublicationActionMakePublic,
      HostOrganizerPublicationKind.catchOnly =>
        context.l10n.hostsHostOrganizerPublicationActionEnableWebsite,
      HostOrganizerPublicationKind.websiteOnly =>
        context.l10n.hostsHostOrganizerPublicationActionRestoreCatch,
      HostOrganizerPublicationKind.everywhere =>
        context.l10n.hostsHostOrganizerPublicationActionMakePrivate,
    };
    final cityOptions = <_HostOrganizerCityOption>[
      for (final city in defaultCityOptions.where((city) => city.hostCreatable))
        _HostOrganizerCityOption(
          value: city.effectiveMarketId,
          label: city.label,
        ),
      if (!defaultCityOptions.any(
        (city) =>
            city.hostCreatable && city.effectiveMarketId == organizer.location,
      ))
        _HostOrganizerCityOption(
          value: organizer.location,
          label: cityLabel(organizer.location),
        ),
    ];
    final eventSuccess = organizer.hostDefaults.eventSuccessForActivity(
      organizer.hostDefaults.primaryActivityKind,
    );
    final hostCount = organizer.displayHostProfiles.length;
    final identityRows = _identityRows(context, organizer, cityOptions);
    final contactRows = _contactRows(context, organizer);
    final visibleMediaPreviews = _visibleMediaPreviews;
    final hasVisibleLogo =
        _pickedLogo != null ||
        (!_removeLogoOnSave && organizer.profileImageUrl != null);
    final mediaAssetCount =
        visibleMediaPreviews.length + (hasVisibleLogo ? 1 : 0);

    return CatchSectionList(
      emptyStateOmitted: true,
      children: [
        if (updateOrganizerMutation.hasError) ...[
          CatchSection.content(
            child: CatchLocalizedErrorBanner.mutation(
              mutation: updateOrganizerMutation,
              context: AppErrorContext.organizer,
            ),
          ),
          gapH12,
        ],
        if (widget.isOwner)
          CatchSection.content(
            child: CatchSection.action(
              title: context.l10n.hostsHostOrganizerPublicationTitle,
              message: publicationBody,
              meta: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  HostOrganizerPublicationChannelRow(
                    key: const ValueKey('host-publication-catch-app'),
                    label:
                        context.l10n.hostsHostOrganizerPublicationChannelCatch,
                    status: publicationState.catchAppVisible
                        ? context
                              .l10n
                              .hostsHostOrganizerPublicationStatusVisible
                        : context
                              .l10n
                              .hostsHostOrganizerPublicationStatusHidden,
                    visible: publicationState.catchAppVisible,
                  ),
                  gapH8,
                  HostOrganizerPublicationChannelRow(
                    key: const ValueKey('host-publication-website'),
                    label: context
                        .l10n
                        .hostsHostOrganizerPublicationChannelWebsite,
                    status: publicationState.websiteEnabled
                        ? context
                              .l10n
                              .hostsHostOrganizerPublicationStatusEnabled
                        : context
                              .l10n
                              .hostsHostOrganizerPublicationStatusNotEnabled,
                    visible: publicationState.websiteEnabled,
                  ),
                ],
              ),
              actionLabel: publicationAction,
              onAction: publicationMutation.isPending
                  ? null
                  : () => unawaited(
                      _setPublicListingEnabled(
                        publicationState.targetPublicListingEnabled,
                      ),
                    ),
              actionStatus: publicationMutation.isPending
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              actionEmphasis:
                  publicationState.kind ==
                      HostOrganizerPublicationKind.everywhere
                  ? CatchSectionEmphasis.secondary
                  : CatchSectionEmphasis.primary,
              footer: publicationMutation.hasError
                  ? CatchFieldSupportRow(
                      text: mutationErrorMessage(
                        publicationMutation,
                        l10n: context.l10n,
                      ),
                      color: CatchTokens.of(context).danger,
                      showErrorIcon: true,
                    )
                  : null,
            ),
          ),
        CatchSection.content(
          title: context.l10n.hostsHostOrganizerProfileTitleMedia,
          count: context.l10n.coreOrderedPhotoPickerSubtitlePhotoCount(
            count: mediaAssetCount,
          ),
          trailing: CatchButton.text(
            key: OrderedPhotoPickerKeys.manageAction,
            label: context.l10n.hostsHostOrganizerEditTabActionManageImages,
            onPressed: mediaPending
                ? null
                : () => unawaited(_openMediaManager()),
            padding: EdgeInsets.zero,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              HostOrganizerMediaRail(
                logoImageBytes: _pickedLogo?.bytes,
                logoImageUrl: _removeLogoOnSave
                    ? null
                    : organizer.profileImageUrl,
                photos: visibleMediaPreviews,
                logoBadgeLabel: context.l10n.hostsHostOrganizerEditTabBadgeLogo,
                addPhotosLabel: context
                    .l10n
                    .hostsCreateOrganizerPhotosPickerVisiblecopyAddPhotos,
                onManageMedia: mediaPending
                    ? null
                    : () => unawaited(_openMediaManager()),
              ),
            ],
          ),
        ),
        CatchFormList<UpdateOrganizerPatch>(
          fieldCopy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsHostOrganizerProfileTitleIdentity,
          rows: identityRows,
          accordion: _fieldAccordion,
          onSave: _savePatch,
          errorTextBuilder: _errorText,
        ),
        CatchFormList<UpdateOrganizerPatch>(
          fieldCopy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsHostOrganizerProfileTitleContact,
          rows: contactRows,
          accordion: _fieldAccordion,
          onSave: _savePatch,
          errorTextBuilder: _errorText,
        ),
        CatchSection.rows(
          title: context.l10n.hostsHostOrganizerEditTabTitleOrganizerSettings,
          children: [
            CatchField.nav(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host-club-settings-event-defaults'),
              title: context.l10n.hostsHostOrganizerEditTabLabelEventDefaults,
              valueText: organizer.hostDefaults.primaryActivityKind.label,
              icon: CatchIcons.event,
              onTap: () => _openSpoke(Routes.hostOrganizerEventDefaultsScreen),
            ),
            CatchField.nav(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host-club-settings-live-guide'),
              title: context.l10n.hostsHostOrganizerEditTabLabelLiveEventGuide,
              valueText: eventSuccess.enabled
                  ? context.l10n.hostsHostOrganizerEditTabValueOn
                  : context.l10n.hostsHostOrganizerEditTabValueOff,
              icon: CatchIcons.magic,
              onTap: () => _openSpoke(Routes.hostOrganizerLiveGuideScreen),
            ),
            if (widget.isOwner)
              CatchField.nav(
                copy: catchFieldCopy(context.l10n),
                key: const ValueKey('host-club-settings-payments'),
                title: context.l10n.hostsHostOrganizerEditTabLabelPayments,
                icon: CatchIcons.payment,
                onTap: () => _openSpoke(Routes.hostOrganizerPaymentsScreen),
              ),
            CatchField.nav(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host-club-settings-memberships'),
              title: context.l10n.hostMembershipsScreenTitle,
              icon: CatchIcons.membership,
              onTap: () => _openSpoke(Routes.hostOrganizerMembershipsScreen),
            ),
            CatchField.nav(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host-club-settings-host-team'),
              title: context.l10n.hostsHostOrganizerEditTabLabelHostTeam,
              valueText: context.l10n.hostsHostOrganizerEditTabValueHostCount(
                count: hostCount,
              ),
              icon: CatchIcons.addPerson,
              onTap: () => _openSpoke(Routes.hostOrganizerTeamScreen),
            ),
          ],
        ),
      ],
    );
  }

  Future<bool> _savePatch(UpdateOrganizerPatch patch) async {
    if (patch.isEmpty) return true;
    if (ref
        .read(HostOrganizerEditController.updateOrganizerMutation)
        .isPending) {
      return false;
    }
    await HostOrganizerEditController.updateOrganizerMutation.run(
      ref,
      (tx) => tx
          .get(hostOrganizerEditControllerProvider)
          .updateOrganizer(organizerId: widget.organizer.id, patch: patch),
    );
    return true;
  }

  String _errorText(BuildContext context, Object error) => appErrorMessage(
    error,
    l10n: context.l10n,
    context: AppErrorContext.organizer,
  );

  void _openSpoke(Routes route) {
    final onOpenSettingsRoute = widget.onOpenSettingsRoute;
    if (onOpenSettingsRoute != null) {
      onOpenSettingsRoute(route, widget.organizer.id);
      return;
    }
    openHostOrganizerSetting(context, route, widget.organizer.id);
  }
}

class HostOrganizerPublicationChannelRow extends StatelessWidget {
  const HostOrganizerPublicationChannelRow({
    super.key,
    required this.label,
    required this.status,
    required this.visible,
  });

  final String label;
  final String status;
  final bool visible;

  @override
  Widget build(BuildContext context) {
    final tokens = CatchTokens.of(context);
    return Semantics(
      label: '$label: $status',
      child: ExcludeSemantics(
        child: Row(
          children: [
            Expanded(
              child: CatchText(
                label,
                variant: CatchTextVariant.statusLabel,
                color: tokens.ink,
              ),
            ),
            gapW12,
            CatchBadge.functional(
              label: status,
              tone: visible ? CatchBadgeTone.success : CatchBadgeTone.neutral,
            ),
          ],
        ),
      ),
    );
  }
}
