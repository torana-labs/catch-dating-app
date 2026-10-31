part of '../host_operations_screen.dart';

class HostOrganizerTeamScreen extends ConsumerStatefulWidget {
  const HostOrganizerTeamScreen({super.key, required this.organizerId});

  final String organizerId;

  @override
  ConsumerState<HostOrganizerTeamScreen> createState() =>
      _HostOrganizerTeamScreenState();
}

class _HostOrganizerTeamScreenState
    extends ConsumerState<HostOrganizerTeamScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _displayNameController = TextEditingController();
  final _roleTitleController = TextEditingController();
  final _bioController = TextEditingController();
  String? _loadedProfileKey;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: HostTeamMode.values.length,
      vsync: this,
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    _displayNameController.dispose();
    _roleTitleController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final routeTitle = context.l10n.hostsHostOrganizerEditTabLabelHostTeam;
    final uidAsync = ref.watch(uidProvider);
    final uidState = catchAsyncStateFromAsyncValue(uidAsync);
    if (uidState.hasError) {
      return CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: routeTitle,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        body: CatchRouteBody.standardViewport(
          child: CatchLocalizedErrorState(
            uidState.error!,
            context: AppErrorContext.auth,
            onRetry: () => ref.invalidate(uidProvider),
          ),
        ),
      );
    }
    if (uidState.isLoading) {
      return HostLoadingScreen(title: routeTitle);
    }

    final uid = uidState.value;
    if (uid == null) {
      return CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: routeTitle,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        body: CatchRouteBody.standardViewport(
          child: CatchErrorState(
            title: context.l10n.hostsHostAuthRequiredScreenTitleSignInRequired,
            message:
                context.l10n.hostsHostAuthRequiredScreenMessageSignInToManage,
            retryLabel:
                context.l10n.hostsHostAuthRequiredScreenVisiblecopySignIn,
            onRetry: () => context.go(Routes.authScreen.path),
          ),
        ),
      );
    }

    final hostProfileAsync = ref.watch(watchHostProfileProvider(uid));
    final organizersAsync = ref.watch(hostOperableOrganizersProvider(uid));
    final hostProfileState = catchAsyncStateFromAsyncValue(hostProfileAsync);
    final organizersState = catchAsyncStateFromAsyncValue(organizersAsync);
    if (organizersState.hasError) {
      return CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: routeTitle,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        body: CatchRouteBody.standardViewport(
          child: CatchLocalizedErrorState(
            organizersState.error!,
            context: AppErrorContext.organizer,
            onRetry: () =>
                hostOperableOrganizerReads(uid).forEach(ref.invalidate),
          ),
        ),
      );
    }
    if (organizersState.isLoading) {
      return HostLoadingScreen(title: routeTitle);
    }
    final organizers = organizersState.value ?? const <Organizer>[];
    final organizer = organizers
        .where((item) => item.id == widget.organizerId)
        .firstOrNull;
    if (organizer == null) {
      return CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: routeTitle,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        body: CatchRouteBody.standardViewport(
          child: CatchLocalizedErrorState(
            StateError('Organizer unavailable'),
            context: AppErrorContext.organizer,
            onRetry: () =>
                hostOperableOrganizerReads(uid).forEach(ref.invalidate),
          ),
        ),
      );
    }
    final ensureMutation = ref.watch(
      HostProfileController.ensureProfileMutation,
    );
    final saveMutation = ref.watch(HostProfileController.saveProfileMutation);
    final state = buildHostTeamWorkspaceState(
      uid: uid,
      profile: hostProfileState,
      organizers: organizersState,
      creatingProfile: ensureMutation.isPending,
    );
    final actions = state.actions;
    final editableProfile = actions.profileForEdit;
    if (editableProfile != null) _syncProfileControllers(editableProfile);

    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        HostProfileController.ensureProfileMutation,
        HostProfileController.saveProfileMutation,
      ],
      errorContext: AppErrorContext.profile,
    );
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: routeTitle,
        subtitle: organizer.name,
        leading: CatchIconAction.toolbar(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: CatchIcons.back,
          onPressed: _leaveTeam,
        ),
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
        footer: CatchPageTabBar<HostTeamMode>.controlled(
          controller: _tabController,
          options: [
            CatchOption(
              value: HostTeamMode.edit,
              label: context.l10n.hostsHostOrganizerTeamScreenLabelEdit,
            ),
            CatchOption(
              value: HostTeamMode.preview,
              label: context.l10n.hostsHostOrganizerTeamScreenLabelPreview,
            ),
          ],
        ),
      ),
      body: CatchRouteBody.paged(
        controller: _tabController,
        pages: [
          CatchRouteBody.standardConstrained(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                HostTeamProfileSection(
                  state: state.profile,
                  editMode: actions.editMode,
                  creatingProfile: actions.creatingProfile,
                  onRetry: () => ref.invalidate(watchHostProfileProvider(uid)),
                  onCreateProfile: actions.canCreateProfile
                      ? () => unawaited(_createHostProfile())
                      : null,
                  displayNameController: _displayNameController,
                  roleTitleController: _roleTitleController,
                  bioController: _bioController,
                  savingProfile: saveMutation.isPending,
                  onSaveProfile:
                      actions.canEditProfile && !saveMutation.isPending
                      ? _saveProfile
                      : null,
                ),
                HostTeamManagementSection(
                  organizer: organizer,
                  currentUid: uid,
                  canManage: organizer.isOwnedBy(uid),
                ),
                HostTeamHostedOrganizersSection(
                  actions: actions,
                  state: state.organizers,
                  onRetry: () =>
                      hostOperableOrganizerReads(uid).forEach(ref.invalidate),
                  onOpenOrganizer: _openHostedOrganizer,
                ),
              ],
            ),
          ),
          CatchRouteBody.standardConstrained(
            child: HostTeamProfessionalProfilePreview(
              state: state.profile,
              organizers: organizers,
              onRetry: () => ref.invalidate(watchHostProfileProvider(uid)),
            ),
          ),
        ],
      ),
    );
  }

  void _syncProfileControllers(HostProfile profile) {
    final profileKey = [
      profile.uid,
      profile.displayName,
      profile.roleTitle,
      profile.bio,
      profile.updatedAt?.microsecondsSinceEpoch,
    ].join('|');
    if (_loadedProfileKey == profileKey) return;
    _loadedProfileKey = profileKey;
    _displayNameController.text = profile.displayName;
    _roleTitleController.text = profile.roleTitle ?? '';
    _bioController.text = profile.bio ?? '';
  }

  Future<bool> _saveProfile() async {
    if (_requiredDisplayName(_displayNameController.text, context.l10n) !=
        null) {
      return false;
    }
    try {
      await HostProfileController.saveProfileMutation.run(
        ref,
        (tx) async => tx
            .get(hostProfileControllerProvider.notifier)
            .saveProfile(
              displayName: _displayNameController.text,
              roleTitle: _roleTitleController.text,
              bio: _bioController.text,
            ),
      );
    } catch (_) {
      // listenToCatchMutationErrors owns user-facing error display.
      return false;
    }
    if (!mounted) return true;
    showCatchNotice(
      context,
      context.l10n.hostsHostOrganizerTeamScreenVisiblecopyHostProfileSaved,
    );
    return true;
  }

  Future<void> _createHostProfile() async {
    try {
      await HostProfileController.ensureProfileMutation.run(
        ref,
        (tx) async =>
            tx.get(hostProfileControllerProvider.notifier).ensureProfile(),
      );
    } catch (_) {
      // listenToCatchMutationErrors owns user-facing error display.
      return;
    }
    if (!mounted) return;
    showCatchNotice(
      context,
      context.l10n.hostsHostOrganizerTeamScreenVisiblecopyHostProfileCreated,
    );
  }

  void _openHostedOrganizer(HostTeamOrganizerNavigationState navigation) {
    if (navigation.destination == HostTeamOrganizerDestination.edit) {
      context.goNamed(
        Routes.hostOrganizerScreen.name,
        queryParameters: {
          'organizerId': navigation.organizer.id,
          'tab': HostOrganizerTab.edit.name,
        },
      );
      return;
    }
    context.pushNamed(
      Routes.hostOrganizerDetailScreen.name,
      pathParameters: {'organizerId': navigation.organizer.id},
      extra: navigation.organizer,
    );
  }

  void _leaveTeam() {
    if (context.canPop()) {
      context.pop();
      return;
    }
    context.goNamed(
      Routes.hostOrganizerScreen.name,
      queryParameters: {
        'organizerId': widget.organizerId,
        'tab': HostOrganizerTab.edit.name,
      },
    );
  }
}

/// Read-only projection of the professional identity edited in Host team.
/// This intentionally consumes [HostTeamProfileState] rather than the dating
/// profile collection: a host can have a valid organizer identity without a
/// discoverable consumer profile.
class HostTeamProfessionalProfilePreview extends StatelessWidget {
  const HostTeamProfessionalProfilePreview({
    super.key,
    required this.state,
    required this.organizers,
    required this.onRetry,
  });

  final HostTeamProfileState state;
  final List<Organizer> organizers;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final state = this.state;
    if (state case HostTeamProfileContent(:final profile)) {
      final t = CatchTokens.of(context);
      final hostedOrganizers = organizers
          .where((organizer) => organizer.isHostedBy(profile.uid))
          .toList(growable: false);
      final roleTitle = profile.roleTitle?.trim();
      final bio = profile.bio?.trim();

      return Column(
        key: const ValueKey<String>('host-team-professional-profile-preview'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchSurface(
            borderRole: CatchBorderRole.separator,
            padding: CatchInsets.cardContent,
            child: Column(
              children: [
                CatchAvatar(
                  size: CatchSpacing.s16,
                  name: profile.displayName,
                  imageUrl: profile.avatarUrl,
                  borderWidth: CatchStroke.avatarRing,
                  borderColor: t.primarySoft,
                ),
                gapH16,
                CatchText(
                  profile.displayName,
                  variant: CatchTextVariant.displayXs,
                  textAlign: TextAlign.center,
                ),
                if (roleTitle?.isNotEmpty == true) ...[
                  gapH8,
                  CatchText(
                    roleTitle!,
                    variant: CatchTextVariant.bodyLead,
                    color: t.ink2,
                    textAlign: TextAlign.center,
                  ),
                ],
                gapH12,
                CatchBadge.functional(
                  label: hostProfileStatusLabel(profile.status, context.l10n),
                  tone: profile.isActive
                      ? CatchBadgeTone.success
                      : CatchBadgeTone.neutral,
                ),
                if (bio?.isNotEmpty == true) ...[
                  gapH16,
                  CatchText(
                    bio!,
                    textAlign: TextAlign.center,
                    variant: CatchTextVariant.bodyM,
                    color: t.ink2,
                  ),
                ],
              ],
            ),
          ),
          CatchSection.fieldRows(
            title:
                context.l10n.hostsHostOrganizerTeamScreenTitleOrganizersYouHost,
            children: [
              for (final organizer in hostedOrganizers)
                CatchField.read(
                  copy: catchFieldCopy(context.l10n),
                  title: organizer.name,
                  valueText: organizer.isOwnedBy(profile.uid)
                      ? context.l10n.organizersOrganizerHostRoleOwner
                      : context.l10n.organizersOrganizerHostRoleHost,
                  icon: CatchIcons.people,
                ),
            ],
          ),
        ],
      );
    }
    return switch (state) {
      HostTeamProfileError(:final error) => CatchLocalizedErrorState(
        error,
        context: AppErrorContext.profile,
        onRetry: onRetry,
      ),
      HostTeamProfileMissing() => CatchEmptyState(
        icon: CatchIcons.person,
        title: context
            .l10n
            .hostsHostOrganizerTeamScreenVisiblecopyCreateHostProfile,
        message:
            context.l10n.hostsHostOrganizerTeamScreenVisiblecopyAddAHostBio,
      ),
      _ => const CatchLoadingIndicator(),
    };
  }
}

class HostTeamProfileSection extends StatelessWidget {
  const HostTeamProfileSection({
    super.key,
    required this.state,
    required this.editMode,
    this.creatingProfile = false,
    required this.onRetry,
    required this.onCreateProfile,
    required this.displayNameController,
    required this.roleTitleController,
    required this.bioController,
    required this.savingProfile,
    required this.onSaveProfile,
  });

  final HostTeamProfileState state;
  final bool editMode;
  final bool creatingProfile;
  final VoidCallback? onRetry;
  final VoidCallback? onCreateProfile;
  final TextEditingController displayNameController;
  final TextEditingController roleTitleController;
  final TextEditingController bioController;
  final bool savingProfile;
  final Future<bool> Function()? onSaveProfile;

  @override
  Widget build(BuildContext context) {
    return switch (state) {
      HostTeamProfileLoading() => const CatchLoadingIndicator(),
      HostTeamProfileError(:final error) => CatchLocalizedErrorState(
        error,
        context: AppErrorContext.profile,
        onRetry: onRetry,
      ),
      HostTeamProfileMissing() => CatchSection.fieldRows(
        title: context.l10n.hostsHostOrganizerTeamScreenTitleProfile,
        first: true,
        children: [
          CatchField.nav(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsHostOrganizerTeamScreenTitleDisplayName,
            valueText: creatingProfile
                ? context
                      .l10n
                      .hostsHostOrganizerTeamScreenVisiblecopyCreatingProfile
                : context
                      .l10n
                      .hostsHostOrganizerTeamScreenVisiblecopyCreateHostProfile,
            icon: CatchIcons.business,
            actions: creatingProfile
                ? const SizedBox.square(
                    dimension: CatchIconSize.md,
                    child: CatchLoadingIndicator(
                      strokeWidth: CatchIconSize.strokeSm,
                    ),
                  )
                : null,
            onTap: creatingProfile ? null : onCreateProfile,
          ),
        ],
      ),
      HostTeamProfileContent(:final profile) => HostTeamProfileList(
        profile: profile,
        editMode: editMode,
        displayNameController: displayNameController,
        roleTitleController: roleTitleController,
        bioController: bioController,
        savingProfile: savingProfile,
        onSaveProfile: onSaveProfile,
      ),
    };
  }
}

class HostTeamProfileList extends StatefulWidget {
  const HostTeamProfileList({
    super.key,
    required this.profile,
    required this.editMode,
    required this.displayNameController,
    required this.roleTitleController,
    required this.bioController,
    required this.savingProfile,
    required this.onSaveProfile,
  });

  final HostProfile profile;
  final bool editMode;
  final TextEditingController displayNameController;
  final TextEditingController roleTitleController;
  final TextEditingController bioController;
  final bool savingProfile;
  final Future<bool> Function()? onSaveProfile;

  @override
  State<HostTeamProfileList> createState() => _HostTeamProfileListState();
}

class _HostTeamProfileListState extends State<HostTeamProfileList> {
  static const _displayNameField = 'displayName';
  static const _roleTitleField = 'roleTitle';
  static const _bioField = 'bio';

  final CatchAccordionController _accordion = CatchAccordionController();
  String? _displayNameError;

  @override
  void initState() {
    super.initState();
    _accordion.addListener(_handleAccordionChanged);
  }

  @override
  void dispose() {
    _accordion
      ..removeListener(_handleAccordionChanged)
      ..dispose();
    super.dispose();
  }

  void _handleAccordionChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final profile = widget.profile;
    if (!widget.editMode) {
      return CatchSection.fieldRows(
        title: context.l10n.hostsHostOrganizerTeamScreenTitleProfile,
        first: true,
        children: [
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsHostOrganizerTeamScreenTitleDisplayName,
            valueText: profile.displayName,
            icon: CatchIcons.person,
          ),
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsHostOrganizerTeamScreenTitleRoleTitle,
            valueText: profile.roleTitle?.trim().isNotEmpty == true
                ? profile.roleTitle!.trim()
                : context
                      .l10n
                      .hostsHostOrganizerTeamScreenVisiblecopyAddRoleTitle,
            icon: CatchIcons.membership,
          ),
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsHostOrganizerTeamScreenTitleStatus,
            valueText: hostProfileStatusLabel(profile.status, context.l10n),
            icon: CatchIcons.success,
          ),
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsHostOrganizerTeamScreenTitleAboutYouAsA,
            valueText: profile.bio?.trim().isNotEmpty == true
                ? profile.bio!.trim()
                : context
                      .l10n
                      .hostsHostOrganizerTeamScreenVisiblecopyAddAHostBio,
            icon: CatchIcons.chat,
            valueMaxLines: 3,
          ),
        ],
      );
    }

    return CatchSection.fieldRows(
      title: context.l10n.hostsHostOrganizerTeamScreenTitleProfile,
      first: true,
      children: [
        CatchField.inputActions(
          copy: catchFieldCopy(context.l10n),
          key: const ValueKey('host-team-profile-display-name'),
          title: context.l10n.hostsHostOrganizerTeamScreenTitleDisplayName,
          contract: CatchContractConstraints.hostProfileDocumentDisplayName,
          controller: widget.displayNameController,
          open: _accordion.isExpanded(_displayNameField),
          onOpenChanged: (open) => _setOpen(_displayNameField, open),
          onCancel: () => _cancelField(
            _displayNameField,
            widget.displayNameController,
            profile.displayName,
          ),
          onSubmit: () => unawaited(_submitField(_displayNameField)),
          status:
              widget.savingProfile && _accordion.isExpanded(_displayNameField)
              ? CatchFieldStatus.saving
              : CatchFieldStatus.idle,
          states: <WidgetState>{
            if (!(!widget.savingProfile && widget.onSaveProfile != null))
              WidgetState.disabled,
          },
          icon: CatchIcons.person,
          textInputAction: TextInputAction.done,
          textCapitalization: TextCapitalization.words,
          error: _displayNameError,
          onChanged: (_) {
            if (_displayNameError != null) {
              setState(() => _displayNameError = null);
            }
          },
        ),
        CatchField.inputActions(
          copy: catchFieldCopy(context.l10n),
          key: const ValueKey('host-team-profile-role-title'),
          title: context.l10n.hostsHostOrganizerTeamScreenTitleRoleTitle,
          contract: CatchContractConstraints.hostProfileDocumentRoleTitle,
          controller: widget.roleTitleController,
          open: _accordion.isExpanded(_roleTitleField),
          onOpenChanged: (open) => _setOpen(_roleTitleField, open),
          onCancel: () => _cancelField(
            _roleTitleField,
            widget.roleTitleController,
            profile.roleTitle ?? '',
          ),
          onSubmit: () => unawaited(_submitField(_roleTitleField)),
          status: widget.savingProfile && _accordion.isExpanded(_roleTitleField)
              ? CatchFieldStatus.saving
              : CatchFieldStatus.idle,
          states: <WidgetState>{
            if (!(!widget.savingProfile && widget.onSaveProfile != null))
              WidgetState.disabled,
          },
          icon: CatchIcons.membership,
          textInputAction: TextInputAction.done,
          textCapitalization: TextCapitalization.words,
        ),
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsHostOrganizerTeamScreenTitleStatus,
          valueText: hostProfileStatusLabel(profile.status, context.l10n),
          icon: CatchIcons.success,
        ),
        CatchField.inputActions(
          copy: catchFieldCopy(context.l10n),
          key: const ValueKey('host-team-profile-bio'),
          title: context.l10n.hostsHostOrganizerTeamScreenTitleAboutYouAsA,
          contract: CatchContractConstraints.hostProfileDocumentBio,
          controller: widget.bioController,
          open: _accordion.isExpanded(_bioField),
          onOpenChanged: (open) => _setOpen(_bioField, open),
          onCancel: () =>
              _cancelField(_bioField, widget.bioController, profile.bio ?? ''),
          onSubmit: () => unawaited(_submitField(_bioField)),
          status: widget.savingProfile && _accordion.isExpanded(_bioField)
              ? CatchFieldStatus.saving
              : CatchFieldStatus.idle,
          states: <WidgetState>{
            if (!(!widget.savingProfile && widget.onSaveProfile != null))
              WidgetState.disabled,
          },
          icon: CatchIcons.chat,
          minLines: 2,
          maxLines: 4,
          textInputAction: TextInputAction.newline,
        ),
      ],
    );
  }

  void _setOpen(String field, bool open) {
    if (open) {
      final previous = _accordion.expanded;
      if (previous != null && previous != field) _restoreField(previous);
      if (!_accordion.isExpanded(field)) _accordion.toggle(field);
      return;
    }
    if (_accordion.isExpanded(field)) _accordion.collapse();
  }

  void _cancelField(
    String field,
    TextEditingController controller,
    String persisted,
  ) {
    controller.text = persisted;
    if (field == _displayNameField) _displayNameError = null;
    _accordion.collapse();
  }

  void _restoreField(String field) {
    switch (field) {
      case _displayNameField:
        widget.displayNameController.text = widget.profile.displayName;
        _displayNameError = null;
        return;
      case _roleTitleField:
        widget.roleTitleController.text = widget.profile.roleTitle ?? '';
        return;
      case _bioField:
        widget.bioController.text = widget.profile.bio ?? '';
        return;
    }
  }

  Future<void> _submitField(String field) async {
    if (field == _displayNameField) {
      final error = _requiredDisplayName(
        widget.displayNameController.text,
        context.l10n,
      );
      if (error != null) {
        setState(() => _displayNameError = error);
        return;
      }
    }
    final save = widget.onSaveProfile;
    if (save == null) return;
    final saved = await save();
    if (!mounted || !saved) return;
    _accordion.collapse();
  }
}

String? _requiredDisplayName(String? value, AppLocalizations l10n) {
  if (value == null || value.trim().isEmpty) {
    return l10n.hostsValidationEnterDisplayName;
  }
  return null;
}

String hostProfileStatusLabel(HostProfileStatus status, AppLocalizations l10n) {
  return switch (status) {
    HostProfileStatus.active => l10n.hostsProfileStatusActive,
    HostProfileStatus.pending => l10n.hostsProfileStatusPending,
    HostProfileStatus.suspended => l10n.hostsProfileStatusSuspended,
  };
}
