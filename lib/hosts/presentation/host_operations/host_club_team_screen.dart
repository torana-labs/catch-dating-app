part of '../host_operations_screen.dart';

class HostClubTeamScreen extends ConsumerStatefulWidget {
  const HostClubTeamScreen({super.key, required this.clubId});

  final String clubId;

  @override
  ConsumerState<HostClubTeamScreen> createState() => _HostClubTeamScreenState();
}

class _HostClubTeamScreenState extends ConsumerState<HostClubTeamScreen>
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
    final routeTitle = context.l10n.hostsHostClubEditTabLabelHostTeam;
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
    final clubsAsync = ref.watch(_hostClubsForUserProvider(uid));
    final hostProfileState = catchAsyncStateFromAsyncValue(hostProfileAsync);
    final clubsState = catchAsyncStateFromAsyncValue(clubsAsync);
    if (clubsState.hasError) {
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
            clubsState.error!,
            context: AppErrorContext.club,
            onRetry: () => ref.invalidate(_hostClubsForUserProvider(uid)),
          ),
        ),
      );
    }
    if (clubsState.isLoading) {
      return HostLoadingScreen(title: routeTitle);
    }
    final clubs = clubsState.value ?? const <Club>[];
    final club = clubs.where((item) => item.id == widget.clubId).firstOrNull;
    if (club == null) {
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
            context: AppErrorContext.club,
            onRetry: () => ref.invalidate(_hostClubsForUserProvider(uid)),
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
      clubs: clubsState,
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
        subtitle: club.name,
        leading: CatchIconAction.toolbar(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: CatchIcons.arrowBackIosNewRounded,
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
              label: context.l10n.hostsHostClubTeamScreenLabelEdit,
            ),
            CatchOption(
              value: HostTeamMode.preview,
              label: context.l10n.hostsHostClubTeamScreenLabelPreview,
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
                  club: club,
                  currentUid: uid,
                  canManage: club.isOwnedBy(uid),
                ),
                HostTeamHostedClubsSection(
                  actions: actions,
                  state: state.clubs,
                  onRetry: () => ref.invalidate(_hostClubsForUserProvider(uid)),
                  onOpenClub: _openHostedClub,
                ),
              ],
            ),
          ),
          CatchRouteBody.standardConstrained(
            child: HostTeamProfessionalProfilePreview(
              state: state.profile,
              clubs: clubs,
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
      context.l10n.hostsHostClubTeamScreenVisiblecopyHostProfileSaved,
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
      context.l10n.hostsHostClubTeamScreenVisiblecopyHostProfileCreated,
    );
  }

  void _openHostedClub(HostTeamClubNavigationState navigation) {
    if (navigation.destination == HostTeamClubDestination.edit) {
      context.goNamed(
        Routes.hostOrganizerScreen.name,
        queryParameters: {
          'clubId': navigation.club.id,
          'tab': HostClubTab.edit.name,
        },
      );
      return;
    }
    context.pushNamed(
      Routes.hostClubDetailScreen.name,
      pathParameters: {'clubId': navigation.club.id},
      extra: navigation.club,
    );
  }

  void _leaveTeam() {
    if (context.canPop()) {
      context.pop();
      return;
    }
    context.goNamed(
      Routes.hostOrganizerScreen.name,
      queryParameters: {'clubId': widget.clubId, 'tab': HostClubTab.edit.name},
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
    required this.clubs,
    required this.onRetry,
  });

  final HostTeamProfileState state;
  final List<Club> clubs;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return switch (state) {
      HostTeamProfileLoading() => const CatchLoadingIndicator(),
      HostTeamProfileError(:final error) => CatchLocalizedErrorState(
        error,
        context: AppErrorContext.profile,
        onRetry: onRetry,
      ),
      HostTeamProfileMissing() => CatchEmptyState(
        icon: CatchIcons.personOutlineRounded,
        title: context.l10n.hostsHostClubTeamScreenVisiblecopyCreateHostProfile,
        message: context.l10n.hostsHostClubTeamScreenVisiblecopyAddAHostBio,
      ),
      HostTeamProfileContent(:final profile) =>
        _HostTeamProfessionalProfileContent(profile: profile, clubs: clubs),
    };
  }
}

class _HostTeamProfessionalProfileContent extends StatelessWidget {
  const _HostTeamProfessionalProfileContent({
    required this.profile,
    required this.clubs,
  });

  final HostProfile profile;
  final List<Club> clubs;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final hostedClubs = clubs
        .where((club) => club.isHostedBy(profile.uid))
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
              Text(
                profile.displayName,
                textAlign: TextAlign.center,
                style: CatchTextStyles.headlineS(context),
              ),
              if (roleTitle?.isNotEmpty == true) ...[
                gapH8,
                Text(
                  roleTitle!,
                  textAlign: TextAlign.center,
                  style: CatchTextStyles.fieldRowTitle(context, color: t.ink2),
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
          title: context.l10n.hostsHostClubTeamScreenTitleClubsYouHost,
          children: [
            for (final club in hostedClubs)
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: club.name,
                valueText: club.isOwnedBy(profile.uid)
                    ? context.l10n.clubsClubHostRoleOwner
                    : context.l10n.clubsClubHostRoleHost,
                icon: CatchIcons.groupOutlined,
              ),
          ],
        ),
      ],
    );
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
        title: context.l10n.hostsHostClubTeamScreenTitleProfile,
        first: true,
        children: [
          CatchField.nav(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsHostClubTeamScreenTitleDisplayName,
            valueText: creatingProfile
                ? context.l10n.hostsHostClubTeamScreenVisiblecopyCreatingProfile
                : context
                      .l10n
                      .hostsHostClubTeamScreenVisiblecopyCreateHostProfile,
            icon: CatchIcons.businessOutlined,
            actions: creatingProfile
                ? const SizedBox.square(
                    dimension: CatchIcon.md,
                    child: CatchLoadingIndicator(
                      strokeWidth: CatchIcon.strokeSm,
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
        title: context.l10n.hostsHostClubTeamScreenTitleProfile,
        first: true,
        children: [
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsHostClubTeamScreenTitleDisplayName,
            valueText: profile.displayName,
            icon: CatchIcons.personOutlineRounded,
          ),
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsHostClubTeamScreenTitleRoleTitle,
            valueText: profile.roleTitle?.trim().isNotEmpty == true
                ? profile.roleTitle!.trim()
                : context.l10n.hostsHostClubTeamScreenVisiblecopyAddRoleTitle,
            icon: CatchIcons.cardMembershipOutlined,
          ),
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsHostClubTeamScreenTitleStatus,
            valueText: hostProfileStatusLabel(profile.status, context.l10n),
            icon: CatchIcons.checkCircleOutlineRounded,
          ),
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsHostClubTeamScreenTitleAboutYouAsA,
            valueText: profile.bio?.trim().isNotEmpty == true
                ? profile.bio!.trim()
                : context.l10n.hostsHostClubTeamScreenVisiblecopyAddAHostBio,
            icon: CatchIcons.chatBubbleOutlineRounded,
            valueMaxLines: 3,
          ),
        ],
      );
    }

    return CatchSection.fieldRows(
      title: context.l10n.hostsHostClubTeamScreenTitleProfile,
      first: true,
      children: [
        CatchField.inputActions(
          copy: catchFieldCopy(context.l10n),
          key: const ValueKey('host-team-profile-display-name'),
          title: context.l10n.hostsHostClubTeamScreenTitleDisplayName,
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
          icon: CatchIcons.personOutlineRounded,
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
          title: context.l10n.hostsHostClubTeamScreenTitleRoleTitle,
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
          icon: CatchIcons.cardMembershipOutlined,
          textInputAction: TextInputAction.done,
          textCapitalization: TextCapitalization.words,
        ),
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsHostClubTeamScreenTitleStatus,
          valueText: hostProfileStatusLabel(profile.status, context.l10n),
          icon: CatchIcons.checkCircleOutlineRounded,
        ),
        CatchField.inputActions(
          copy: catchFieldCopy(context.l10n),
          key: const ValueKey('host-team-profile-bio'),
          title: context.l10n.hostsHostClubTeamScreenTitleAboutYouAsA,
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
          icon: CatchIcons.chatBubbleOutlineRounded,
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
