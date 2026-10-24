part of '../host_operations_screen.dart';

abstract final class HostClubEditFieldKeys {
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

abstract final class HostClubMediaKeys {
  static const summaryStrip = ValueKey('host-media-summary-strip');
  static const logoTile = ValueKey('host-media-logo-tile');
}

typedef HostClubSettingsNavigation = void Function(Routes route, String clubId);

class HostClubEditBody extends ConsumerStatefulWidget {
  const HostClubEditBody({
    super.key,
    required this.club,
    required this.currentUid,
    required this.isOwner,
    this.initialExpandedField,
    this.onOpenSettingsRoute,
  });

  final Club club;
  final String currentUid;
  final bool isOwner;
  final String? initialExpandedField;
  final HostClubSettingsNavigation? onOpenSettingsRoute;

  @override
  ConsumerState<HostClubEditBody> createState() => _HostClubEditBodyState();
}

class _HostClubEditBodyState extends ConsumerState<HostClubEditBody> {
  late final CatchAccordionController _fieldAccordion;
  late List<_HostClubMediaDraft> _mediaDrafts;
  HostPickedClubLogo? _pickedLogo;
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
      await HostClubEditController.publicationMutation.run(
        ref,
        (tx) => tx
            .get(hostClubEditControllerProvider)
            .updateClub(
              clubId: widget.club.id,
              patch: UpdateClubPatch(publicListingEnabled: enabled),
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
    _resetMediaFromClub();
    _mediaManagerPhotos = ValueNotifier(_visibleMediaPreviews);
  }

  @override
  void didUpdateWidget(covariant HostClubEditBody oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.club.id != widget.club.id) {
      _setExpandedField(widget.initialExpandedField);
      _resetMediaFromClub();
    } else if (oldWidget.initialExpandedField != widget.initialExpandedField) {
      _setExpandedField(widget.initialExpandedField);
    }
    if (oldWidget.club.clubPhotos != widget.club.clubPhotos ||
        oldWidget.club.profileImageUrl != widget.club.profileImageUrl ||
        oldWidget.club.logoPhoto != widget.club.logoPhoto) {
      _mediaSourceRevision += 1;
      _mediaAwaitingSnapshot = false;
      _resetMediaFromClub();
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

  void _resetMediaFromClub() {
    final drafts = <_HostClubMediaDraft>[
      for (final photo in [
        ...widget.club.clubPhotos,
      ]..sort((a, b) => a.position.compareTo(b.position)))
        _HostExistingClubMediaDraft(photo),
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

  Future<HostPickedClubLogo?> _pickLogo() async {
    final logo = await ref.read(hostClubEditControllerProvider).pickClubLogo();
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
            .read(hostClubEditControllerProvider)
            .discardClubMedia(photoInputs: const [], logo: previousLogo),
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

  Future<List<_HostPickedClubMediaDraft>> _pickAndAppendPhotos() async {
    final photos = await ref
        .read(hostClubEditControllerProvider)
        .pickClubPhotos();
    if (!mounted || photos.isEmpty) return const [];
    final added = [
      for (final photo in photos) _HostPickedClubMediaDraft(photo),
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
          if (widget.club.imageUrl case final imageUrl?)
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
          header: HostClubLogoManagerHeader(
            imageBytes: _pickedLogo?.bytes,
            existingImageUrl: _removeLogoOnSave
                ? null
                : widget.club.profileImageUrl,
            onPickLogo: _pickLogo,
            onRemoveLogo: _removeLogo,
          ),
          footer: HostClubMediaManagerDock(
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
    if (draft is! _HostPickedClubMediaDraft || !draft.job.canRetry) {
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
      _removeLogoOnSave = widget.club.profileImageUrl != null;
      _mediaDirty = true;
      _showMediaError = false;
    });
    _syncMediaManagerPhotos();
    if (stagedLogo?.uploadedPhoto != null) {
      await ref
          .read(hostClubEditControllerProvider)
          .discardClubMedia(photoInputs: const [], logo: stagedLogo);
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
    if (removed is _HostPickedClubMediaDraft && removed.input.isUploaded) {
      unawaited(
        ref
            .read(hostClubEditControllerProvider)
            .discardClubMedia(photoInputs: [removed.input]),
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
          if (draft is _HostPickedClubMediaDraft && !draft.input.isUploaded)
            draft.withJob(const ImageUploadJobState.queued())
          else
            draft,
      ];
    });
    try {
      final result = await HostClubEditController.updateMediaMutation.run(
        ref,
        (tx) => tx
            .get(hostClubEditControllerProvider)
            .updateClubMedia(
              club: widget.club,
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
            if (draft is _HostPickedClubMediaDraft)
              draft.clearUpload(error)
            else
              draft,
        ];
        if (_pickedLogo != null) {
          _pickedLogo = HostPickedClubLogo(
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
      context: AppErrorContext.club,
    );
  }

  void _updateMediaProgress(HostClubMediaProgress progress) {
    if (!mounted) return;
    final index = _mediaDrafts.indexWhere((draft) => draft.id == progress.id);
    if (index < 0) return;
    final draft = _mediaDrafts[index];
    if (draft is! _HostPickedClubMediaDraft) return;
    setState(() => _mediaDrafts[index] = draft.withJob(progress.state));
    _syncMediaManagerPhotos();
  }

  void _applyResolvedInputs(HostClubMediaSaveResult result) {
    final resolvedById = {
      for (final input in result.photoInputs ?? const <HostClubMediaInput>[])
        input.id: input,
    };
    _mediaDrafts = [
      for (final draft in _mediaDrafts)
        switch (draft) {
          _HostExistingClubMediaDraft() => draft,
          _HostPickedClubMediaDraft() => draft.withResolvedInput(
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
      await ref
          .read(hostClubEditControllerProvider)
          .discardClubMedia(
            photoInputs: [for (final draft in _mediaDrafts) draft.input],
            logo: _pickedLogo,
          );
      if (mounted) setState(_resetMediaFromClub);
    } finally {
      _mediaCommitInFlight = false;
      if (mounted) setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final club = widget.club;
    final updateClubMutation = ref.watch(
      HostClubEditController.updateClubMutation,
    );
    final mediaPending = _mediaCommitInFlight || _mediaAwaitingSnapshot;
    final publicationMutation = ref.watch(
      HostClubEditController.publicationMutation,
    );
    final publicationState = HostClubPublicationState.fromClub(club);
    final publicationBody = switch (publicationState.kind) {
      HostClubPublicationKind.private =>
        context.l10n.hostsHostClubPublicationBodyPrivate,
      HostClubPublicationKind.catchOnly =>
        context.l10n.hostsHostClubPublicationBodyCatchOnly,
      HostClubPublicationKind.websiteOnly =>
        context.l10n.hostsHostClubPublicationBodyWebsiteOnly,
      HostClubPublicationKind.everywhere =>
        context.l10n.hostsHostClubPublicationBodyEverywhere,
    };
    final publicationAction = switch (publicationState.kind) {
      HostClubPublicationKind.private =>
        context.l10n.hostsHostClubPublicationActionMakePublic,
      HostClubPublicationKind.catchOnly =>
        context.l10n.hostsHostClubPublicationActionEnableWebsite,
      HostClubPublicationKind.websiteOnly =>
        context.l10n.hostsHostClubPublicationActionRestoreCatch,
      HostClubPublicationKind.everywhere =>
        context.l10n.hostsHostClubPublicationActionMakePrivate,
    };
    final cityOptions = <_HostClubCityOption>[
      for (final city in defaultCityOptions.where((city) => city.hostCreatable))
        _HostClubCityOption(value: city.effectiveMarketId, label: city.label),
      if (!defaultCityOptions.any(
        (city) => city.hostCreatable && city.effectiveMarketId == club.location,
      ))
        _HostClubCityOption(
          value: club.location,
          label: cityLabel(club.location),
        ),
    ];
    final eventSuccess = club.hostDefaults.eventSuccessForActivity(
      club.hostDefaults.primaryActivityKind,
    );
    final hostCount = club.displayHostProfiles.length;
    final identityRows = _identityRows(context, club, cityOptions);
    final contactRows = _contactRows(context, club);
    final visibleMediaPreviews = _visibleMediaPreviews;
    final hasVisibleLogo =
        _pickedLogo != null ||
        (!_removeLogoOnSave && club.profileImageUrl != null);
    final mediaAssetCount =
        visibleMediaPreviews.length + (hasVisibleLogo ? 1 : 0);

    return CatchSectionList(
      emptyStateOmitted: true,
      children: [
        if (updateClubMutation.hasError) ...[
          CatchSection.content(
            child: CatchLocalizedErrorBanner.mutation(
              mutation: updateClubMutation,
              context: AppErrorContext.club,
            ),
          ),
          gapH12,
        ],
        if (widget.isOwner)
          CatchSection.content(
            child: CatchSection.action(
              title: context.l10n.hostsHostClubPublicationTitle,
              message: publicationBody,
              meta: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  HostClubPublicationChannelRow(
                    key: const ValueKey('host-publication-catch-app'),
                    label: context.l10n.hostsHostClubPublicationChannelCatch,
                    status: publicationState.catchAppVisible
                        ? context.l10n.hostsHostClubPublicationStatusVisible
                        : context.l10n.hostsHostClubPublicationStatusHidden,
                    visible: publicationState.catchAppVisible,
                  ),
                  gapH8,
                  HostClubPublicationChannelRow(
                    key: const ValueKey('host-publication-website'),
                    label: context.l10n.hostsHostClubPublicationChannelWebsite,
                    status: publicationState.websiteEnabled
                        ? context.l10n.hostsHostClubPublicationStatusEnabled
                        : context.l10n.hostsHostClubPublicationStatusNotEnabled,
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
                  publicationState.kind == HostClubPublicationKind.everywhere
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
          title: context.l10n.hostsHostClubProfileTitleMedia,
          count: context.l10n.coreOrderedPhotoPickerSubtitlePhotoCount(
            count: mediaAssetCount,
          ),
          trailing: CatchButton.text(
            key: OrderedPhotoPickerKeys.manageAction,
            label: context.l10n.hostsHostClubEditTabActionManageImages,
            onPressed: mediaPending
                ? null
                : () => unawaited(_openMediaManager()),
            padding: EdgeInsets.zero,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              HostClubMediaRail(
                logoImageBytes: _pickedLogo?.bytes,
                logoImageUrl: _removeLogoOnSave ? null : club.profileImageUrl,
                photos: visibleMediaPreviews,
                logoBadgeLabel: context.l10n.hostsHostClubEditTabBadgeLogo,
                addPhotosLabel: context
                    .l10n
                    .hostsCreateClubPhotosPickerVisiblecopyAddPhotos,
                onManageMedia: mediaPending
                    ? null
                    : () => unawaited(_openMediaManager()),
              ),
            ],
          ),
        ),
        CatchFormList<UpdateClubPatch>(
          fieldCopy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsHostClubProfileTitleIdentity,
          rows: identityRows,
          accordion: _fieldAccordion,
          onSave: _savePatch,
          errorTextBuilder: _errorText,
        ),
        CatchFormList<UpdateClubPatch>(
          fieldCopy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsHostClubProfileTitleContact,
          rows: contactRows,
          accordion: _fieldAccordion,
          onSave: _savePatch,
          errorTextBuilder: _errorText,
        ),
        CatchSection.rows(
          title: context.l10n.hostsHostClubEditTabTitleClubSettings,
          children: [
            CatchField.nav(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host-club-settings-event-defaults'),
              title: context.l10n.hostsHostClubEditTabLabelEventDefaults,
              valueText: club.hostDefaults.primaryActivityKind.label,
              icon: CatchIcons.eventOutlined,
              onTap: () => _openSpoke(Routes.hostClubEventDefaultsScreen),
            ),
            CatchField.nav(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host-club-settings-live-guide'),
              title: context.l10n.hostsHostClubEditTabLabelLiveEventGuide,
              valueText: eventSuccess.enabled
                  ? context.l10n.hostsHostClubEditTabValueOn
                  : context.l10n.hostsHostClubEditTabValueOff,
              icon: CatchIcons.autoAwesomeOutlined,
              onTap: () => _openSpoke(Routes.hostClubLiveGuideScreen),
            ),
            if (widget.isOwner)
              CatchField.nav(
                copy: catchFieldCopy(context.l10n),
                key: const ValueKey('host-club-settings-payments'),
                title: context.l10n.hostsHostClubEditTabLabelPayments,
                icon: CatchIcons.paymentsOutlined,
                onTap: () => _openSpoke(Routes.hostClubPaymentsScreen),
              ),
            CatchField.nav(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host-club-settings-host-team'),
              title: context.l10n.hostsHostClubEditTabLabelHostTeam,
              valueText: context.l10n.hostsHostClubEditTabValueHostCount(
                count: hostCount,
              ),
              icon: CatchIcons.groupAddOutlined,
              onTap: () => _openSpoke(Routes.hostClubTeamScreen),
            ),
          ],
        ),
      ],
    );
  }

  Future<bool> _savePatch(UpdateClubPatch patch) async {
    if (patch.isEmpty) return true;
    if (ref.read(HostClubEditController.updateClubMutation).isPending) {
      return false;
    }
    await HostClubEditController.updateClubMutation.run(
      ref,
      (tx) => tx
          .get(hostClubEditControllerProvider)
          .updateClub(clubId: widget.club.id, patch: patch),
    );
    return true;
  }

  String _errorText(BuildContext context, Object error) =>
      appErrorMessage(error, l10n: context.l10n, context: AppErrorContext.club);

  void _openSpoke(Routes route) {
    final onOpenSettingsRoute = widget.onOpenSettingsRoute;
    if (onOpenSettingsRoute != null) {
      onOpenSettingsRoute(route, widget.club.id);
      return;
    }
    openHostOrganizerSetting(context, route, widget.club.id);
  }
}

class HostClubPublicationChannelRow extends StatelessWidget {
  const HostClubPublicationChannelRow({
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
