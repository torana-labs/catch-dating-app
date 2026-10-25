part of '../host_operations_screen.dart';

List<CatchOption<HostClubTab>> _hostClubTabOptions(BuildContext context) => [
  CatchOption(
    value: HostClubTab.edit,
    label: context.l10n.hostsHostClubsScaffoldLabelEdit,
  ),
  CatchOption(
    value: HostClubTab.insights,
    label: context.l10n.hostsHostClubsScaffoldLabelInsights,
  ),
  CatchOption(
    value: HostClubTab.preview,
    label: context.l10n.hostsHostClubsScaffoldLabelPreview,
  ),
];

/// Organizer route-state adapter that preserves the loaded workspace chrome.
///
/// Loading, auth, error, and no-organizer states replace only the tab body;
/// the route title, pinned peer rail, semantic body rhythm, responsive content
/// lane, scroll ownership, and shell terminal clearance stay on the canonical
/// tabbed-screen path.
class HostOrganizerStateScaffold extends StatelessWidget {
  const HostOrganizerStateScaffold({
    super.key,
    required this.selectedTab,
    required this.scrollKey,
    required this.slivers,
    this.actions = const <Widget>[],
  }) : assert(slivers.length > 0);

  final HostClubTab selectedTab;
  final PageStorageKey<String> scrollKey;
  final List<Widget> slivers;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    return HostNavigationWorkspace(
      spec: HostEditorWorkspace(
        preview: CatchEmptyState(
          title: context.l10n.coreCatchFieldVisiblecopySelect,
        ),
        editor: CatchRootScreenScaffold.withPrimaryRail(
          header: CatchRootScreenHeader.title(
            title: context.l10n.hostNavigationOrganizer,
            actions: actions,
          ),
          actions: CatchPageTabBar<HostClubTab>(
            groupKey: _hostClubTabRailKey,
            selected: selectedTab,
            selectionPosition: selectedTab.index.toDouble(),
            options: _hostClubTabOptions(context),
          ),
          semanticsLabel:
              context.l10n.hostsHostClubsScaffoldLabelClubWorkspaceTabs,
          body: CatchRootScreenBody.single(
            page: CatchRootScreenPageSpec.scroll(
              page: CatchRootScreenPageScrollView.standard(
                scrollKey: scrollKey,
                children: slivers,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class HostClubsScaffold extends ConsumerStatefulWidget {
  const HostClubsScaffold({
    super.key,
    required this.clubs,
    required this.currentUid,
    required this.initialTab,
    this.initialClubId,
    this.initialExpandedEditField,
  });

  final List<Club> clubs;
  final String currentUid;
  final String? initialClubId;
  final HostClubTab initialTab;
  final String? initialExpandedEditField;

  @override
  ConsumerState<HostClubsScaffold> createState() => _HostClubsScaffoldState();
}

class _HostClubsScaffoldState extends ConsumerState<HostClubsScaffold>
    with SingleTickerProviderStateMixin {
  static const _editorRevealAlignment = 0.08;
  static const _privacyPolicyAction = 'privacy-policy';
  static const _termsAction = 'terms';
  static const _helpAction = 'help';
  static const _deleteAction = 'delete';

  late HostClubTab _selectedTab;
  late final TabController _tabController;
  final GlobalKey _profileSectionsKey = GlobalKey();
  final Map<HostClubTab, CatchRootScreenPageScrollController>
  _pageScrollControllers = {
    for (final tab in HostClubTab.values)
      tab: CatchRootScreenPageScrollController(),
  };
  final Map<HostClubTab, double> _pageScrollOffsets = {};
  final HostClubInsightsRefreshController _insightsRefreshController =
      HostClubInsightsRefreshController();
  bool _didRevealInitialEditor = false;
  bool _legalLinkPending = false;

  @override
  void initState() {
    super.initState();
    _selectedTab = _effectiveInitialTab;
    _tabController = TabController(
      length: HostClubTab.values.length,
      initialIndex: HostClubTab.values.indexOf(_selectedTab),
      vsync: this,
    )..addListener(_handleTabControllerChanged);
  }

  @override
  void didUpdateWidget(HostClubsScaffold oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialExpandedEditField != widget.initialExpandedEditField ||
        oldWidget.initialClubId != widget.initialClubId) {
      _didRevealInitialEditor = false;
    }
    if (oldWidget.initialTab != widget.initialTab) {
      _selectedTab = _effectiveInitialTab;
    }
    final selectedIndex = HostClubTab.values.indexOf(_selectedTab);
    if (_tabController.index != selectedIndex) {
      _tabController.index = selectedIndex;
    }
  }

  @override
  void dispose() {
    _tabController
      ..removeListener(_handleTabControllerChanged)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final signOutMutation = ref.watch(AuthSessionController.signOutMutation);
    final deletionMutation = ref.watch(
      SettingsController.requestAccountDeletionMutation,
    );
    final accountOperationPending =
        signOutMutation.isPending ||
        deletionMutation.isPending ||
        _legalLinkPending;
    final signOutAction = CatchIconAction.toolbar(
      key: const ValueKey<String>('host-organizer-sign-out'),
      tooltip: context.l10n.hostsHostClubTeamScreenTitleSignOut,
      icon: CatchIcons.logoutRounded,
      onPressed: accountOperationPending ? null : () => unawaited(_signOut()),
    );
    final privacyPolicyUrl = AppConfig.privacyPolicyUrl;
    final termsUrl = AppConfig.termsUrl;
    final helpUrl = AppConfig.helpUrl;
    final accountMenu = CatchActionMenu<String>(
      key: const ValueKey<String>('host-account-menu'),
      tooltip: context.l10n.safetySettingsScreenTitleAccount,
      enabled: !accountOperationPending,
      items: [
        if (privacyPolicyUrl != null)
          CatchActionMenuItem(
            value: _privacyPolicyAction,
            label: context.l10n.safetySettingsScreenTitlePrivacyPolicy,
            icon: CatchIcons.lockOutline,
          ),
        if (termsUrl != null)
          CatchActionMenuItem(
            value: _termsAction,
            label: context.l10n.safetySettingsScreenTitleTerms,
            icon: CatchIcons.descriptionOutlined,
          ),
        if (helpUrl != null)
          CatchActionMenuItem(
            value: _helpAction,
            label: context.l10n.safetySettingsScreenTitleHelpSupport,
            icon: CatchIcons.helpOutline,
          ),
        CatchActionMenuItem(
          value: _deleteAction,
          label: context.l10n.safetySettingsScreenTitleDeleteAccount658588,
          icon: CatchIcons.deleteOutline,
          isDestructive: true,
        ),
      ],
      onSelected: (action) => unawaited(switch (action) {
        _privacyPolicyAction => _openLegalLink(privacyPolicyUrl),
        _termsAction => _openLegalLink(termsUrl),
        _helpAction => _openLegalLink(helpUrl),
        _deleteAction => _deleteAccount(),
        _ => Future<void>.value(),
      }),
    );
    final selectedOrganizerId = ref.watch(
      hostOrganizerSelectionProvider(widget.currentUid),
    );
    final state = HostClubsScreenState.resolve(
      clubs: widget.clubs,
      currentUid: widget.currentUid,
      selectedClubId: selectedOrganizerId ?? widget.initialClubId,
      selectedTab: _selectedTab,
    );
    final selectedClub = state.selectedClub;
    if (selectedClub == null) {
      listenToCatchMutationErrors(
        context,
        ref,
        mutations: [
          AuthSessionController.signOutMutation,
          SettingsController.requestAccountDeletionMutation,
        ],
        errorContext: AppErrorContext.auth,
      );
      return HostOrganizerStateScaffold(
        selectedTab: _selectedTab,
        scrollKey: const PageStorageKey<String>('host-organizer-empty-state'),
        actions: [accountMenu, signOutAction],
        slivers: [
          CatchSliverEmptyState(
            icon: CatchIcons.groupsOutlined,
            title: context.l10n.hostsHostClubsScaffoldTitleNoHostClubsYet,
            message: context.l10n.hostsHostClubsScaffoldBodyCreateAClubOr,
            actions: [
              CatchButton(
                label: context.l10n.hostsHostClubsScaffoldLabelCreateClub,
                leading: Icon(CatchIcons.addRounded, size: CatchIconSize.md),
                size: CatchButtonSize.md,
                onPressed: () =>
                    context.pushNamed(Routes.hostCreateClubScreen.name),
              ),
            ],
          ),
        ],
      );
    }

    _scheduleInitialEditorReveal();

    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        AuthSessionController.signOutMutation,
        SettingsController.requestAccountDeletionMutation,
      ],
      errorContext: AppErrorContext.auth,
    );
    final indexPane = CatchRootScreenScaffold.withPrimaryRail(
      header: CatchRootScreenHeader.title(
        title: selectedClub.name,
        actions: [accountMenu, signOutAction],
      ),
      actions: CatchPageTabBar<HostClubTab>.controlled(
        controller: _tabController,
        groupKey: _hostClubTabRailKey,
        options: _hostClubTabOptions(context),
      ),
      semanticsLabel: context.l10n.hostsHostClubsScaffoldLabelClubWorkspaceTabs,
      semanticsHint: context.l10n.hostsHostClubsScaffoldBodyDragLeftOrRight,
      body: CatchRootScreenBody.paged(
        controller: _tabController,
        pages: [
          CatchRootScreenPageSpec.scroll(
            page: CatchRootScreenPageScrollView.sections(
              scrollStateController: _pageScrollControllers[HostClubTab.edit],
              scrollKey: PageStorageKey(
                'host-club-${selectedClub.id}-edit-scroll',
              ),
              children: [
                SliverToBoxAdapter(
                  child: SizedBox(
                    width: double.infinity,
                    child: KeyedSubtree(
                      key: _profileSectionsKey,
                      child: HostClubEditBody(
                        key: ValueKey('host-club-${selectedClub.id}-edit'),
                        club: selectedClub,
                        currentUid: state.currentUid,
                        isOwner: state.selectedClubIsOwner,
                        initialExpandedField: widget.initialExpandedEditField,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          CatchRootScreenPageSpec.scroll(
            page: CatchRootScreenPageScrollView.sections(
              scrollStateController:
                  _pageScrollControllers[HostClubTab.insights],
              onRefresh: _insightsRefreshController.refresh,
              scrollKey: PageStorageKey(
                'host-club-${selectedClub.id}-insights-scroll',
              ),
              children: [
                SliverToBoxAdapter(
                  child: SizedBox(
                    width: double.infinity,
                    child: HostClubInsightsSection(
                      key: ValueKey('host-club-${selectedClub.id}-insights'),
                      club: selectedClub,
                      refreshController: _insightsRefreshController,
                    ),
                  ),
                ),
              ],
            ),
          ),
          CatchRootScreenPageSpec.surface(
            backgroundColor: t.bg,
            page: CatchRootScreenPageScrollView.fullBleed(
              scrollStateController:
                  _pageScrollControllers[HostClubTab.preview],
              scrollKey: PageStorageKey(
                'host-club-${selectedClub.id}-preview-scroll',
              ),
              children: [
                ClubDetailReadOnlyPreview(
                  initialClub: selectedClub,
                  currentUid: state.currentUid,
                ),
              ],
            ),
          ),
        ],
      ),
    );
    return HostNavigationWorkspace(
      spec: HostEditorWorkspace(
        editor: indexPane,
        showPreview: _selectedTab != HostClubTab.preview,
        preview: CatchWorkspacePaneScaffold(
          title: CatchTopBar.primaryRail(
            title: context.l10n.hostsHostClubsScaffoldLabelPreview,
          ),
          body: CustomScrollView(
            key: PageStorageKey(
              'host-club-${selectedClub.id}-persistent-preview',
            ),
            slivers: [
              ClubDetailReadOnlyPreview(
                initialClub: selectedClub,
                currentUid: state.currentUid,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _signOut() async {
    final mutation = ref.read(AuthSessionController.signOutMutation);
    if (mutation.isPending) return;
    try {
      await AuthSessionController.signOutMutation.run(
        ref,
        (tx) async => tx.get(authSessionControllerProvider.notifier).signOut(),
      );
    } catch (_) {
      // listenToCatchMutationErrors owns user-facing error display.
      return;
    }
    if (mounted) context.go(Routes.startScreen.path);
  }

  /// Opens a public legal/support page through the same external launcher as
  /// consumer Settings. The launch joins the account actions' exclusive
  /// pending state, and false and thrown outcomes are both reported.
  Future<void> _openLegalLink(Uri? uri) async {
    if (uri == null || _legalLinkPending) return;
    setState(() => _legalLinkPending = true);
    var opened = false;
    try {
      opened = await ref.read(externalLinkControllerProvider).openExternal(uri);
    } catch (_) {
      // ExternalLinkController retains the backend context; the account menu
      // owns the visible result.
    } finally {
      if (mounted) setState(() => _legalLinkPending = false);
    }
    if (!mounted || opened) return;
    showCatchNotice(
      context,
      context.l10n.safetySettingsScreenExternalLinkOpenFailed,
    );
  }

  Future<void> _deleteAccount() async {
    if (ref.read(SettingsController.requestAccountDeletionMutation).isPending ||
        ref.read(AuthSessionController.signOutMutation).isPending) {
      return;
    }
    final confirmed = await showConfirmDangerDialog(
      context: context,
      title: context.l10n.safetySettingsScreenTitleDeleteAccount,
      message: context.l10n.hostAccountDeletionConfirmation,
      confirmLabel: context.l10n.sharedActionDelete,
    );
    if (confirmed != true || !mounted) return;
    try {
      await SettingsController.requestAccountDeletionMutation.run(
        ref,
        (tx) async => tx
            .get(settingsControllerProvider.notifier)
            .requestAccountDeletion(),
      );
    } catch (_) {
      // The shared mutation listener presents the failure and enables retry.
      return;
    }
    if (mounted) context.go(Routes.startScreen.path);
  }

  HostClubTab get _effectiveInitialTab =>
      widget.initialExpandedEditField == null
      ? widget.initialTab
      : HostClubTab.edit;

  void _handleTabControllerChanged() {
    final tab = HostClubTab.values[_tabController.index];
    if (!mounted) return;
    if (tab != _selectedTab) {
      final previousTab = _selectedTab;
      final previousOffset = _pageScrollControllers[previousTab]
          ?.captureOffset();
      if (previousOffset != null) {
        _pageScrollOffsets[previousTab] = previousOffset;
      }
      setState(() => _selectedTab = tab);
      final router = GoRouter.maybeOf(context);
      if (router != null) {
        final uri = router.routeInformationProvider.value.uri;
        if (uri.queryParameters['tab'] != tab.name) {
          context.go(
            uri
                .replace(
                  queryParameters: {...uri.queryParameters, 'tab': tab.name},
                )
                .toString(),
          );
        }
      }
    }
    if (!_tabController.indexIsChanging && _tabController.offset == 0) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _pageScrollControllers[tab]?.restoreOffset(
          _pageScrollOffsets[tab] ?? 0,
        );
      });
    }
  }

  void _scheduleInitialEditorReveal() {
    if (_didRevealInitialEditor || widget.initialExpandedEditField == null) {
      return;
    }
    _didRevealInitialEditor = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final editorContext = _profileSectionsKey.currentContext;
      if (editorContext == null) {
        _didRevealInitialEditor = false;
        return;
      }
      unawaited(
        Scrollable.ensureVisible(
          editorContext,
          alignment: _editorRevealAlignment,
        ),
      );
    });
  }
}
