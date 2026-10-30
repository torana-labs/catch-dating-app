part of '../host_operations_screen.dart';

List<CatchOption<HostOrganizerTab>> _hostOrganizerTabOptions(
  BuildContext context,
) => [
  CatchOption(
    value: HostOrganizerTab.edit,
    label: context.l10n.hostsHostOrganizersScaffoldLabelEdit,
  ),
  CatchOption(
    value: HostOrganizerTab.insights,
    label: context.l10n.hostsHostOrganizersScaffoldLabelInsights,
  ),
  CatchOption(
    value: HostOrganizerTab.preview,
    label: context.l10n.hostsHostOrganizersScaffoldLabelPreview,
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

  final HostOrganizerTab selectedTab;
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
          actions: CatchPageTabBar<HostOrganizerTab>(
            groupKey: _hostOrganizerTabRailKey,
            selected: selectedTab,
            selectionPosition: selectedTab.index.toDouble(),
            options: _hostOrganizerTabOptions(context),
          ),
          semanticsLabel: context
              .l10n
              .hostsHostOrganizersScaffoldLabelOrganizerWorkspaceTabs,
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

class HostOrganizersScaffold extends ConsumerStatefulWidget {
  const HostOrganizersScaffold({
    super.key,
    required this.organizers,
    required this.currentUid,
    required this.initialTab,
    this.initialOrganizerId,
    this.initialExpandedEditField,
  });

  final List<Organizer> organizers;
  final String currentUid;
  final String? initialOrganizerId;
  final HostOrganizerTab initialTab;
  final String? initialExpandedEditField;

  @override
  ConsumerState<HostOrganizersScaffold> createState() =>
      _HostOrganizersScaffoldState();
}

class _HostOrganizersScaffoldState extends ConsumerState<HostOrganizersScaffold>
    with SingleTickerProviderStateMixin {
  static const _editorRevealAlignment = 0.08;
  static const _privacyPolicyAction = 'privacy-policy';
  static const _termsAction = 'terms';
  static const _helpAction = 'help';
  static const _deleteAction = 'delete';

  late HostOrganizerTab _selectedTab;
  late final TabController _tabController;
  final GlobalKey _profileSectionsKey = GlobalKey();
  final Map<HostOrganizerTab, CatchRootScreenPageScrollController>
  _pageScrollControllers = {
    for (final tab in HostOrganizerTab.values)
      tab: CatchRootScreenPageScrollController(),
  };
  final Map<HostOrganizerTab, double> _pageScrollOffsets = {};
  final HostOrganizerInsightsRefreshController _insightsRefreshController =
      HostOrganizerInsightsRefreshController();
  bool _didRevealInitialEditor = false;
  bool _legalLinkPending = false;

  @override
  void initState() {
    super.initState();
    _selectedTab = _effectiveInitialTab;
    _tabController = TabController(
      length: HostOrganizerTab.values.length,
      initialIndex: HostOrganizerTab.values.indexOf(_selectedTab),
      vsync: this,
    )..addListener(_handleTabControllerChanged);
  }

  @override
  void didUpdateWidget(HostOrganizersScaffold oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialExpandedEditField != widget.initialExpandedEditField ||
        oldWidget.initialOrganizerId != widget.initialOrganizerId) {
      _didRevealInitialEditor = false;
    }
    if (oldWidget.initialTab != widget.initialTab) {
      _selectedTab = _effectiveInitialTab;
    }
    final selectedIndex = HostOrganizerTab.values.indexOf(_selectedTab);
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
      tooltip: context.l10n.hostsHostOrganizerTeamScreenTitleSignOut,
      icon: CatchIcons.signOut,
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
            icon: CatchIcons.locked,
          ),
        if (termsUrl != null)
          CatchActionMenuItem(
            value: _termsAction,
            label: context.l10n.safetySettingsScreenTitleTerms,
            icon: CatchIcons.document,
          ),
        if (helpUrl != null)
          CatchActionMenuItem(
            value: _helpAction,
            label: context.l10n.safetySettingsScreenTitleHelpSupport,
            icon: CatchIcons.help,
          ),
        CatchActionMenuItem(
          value: _deleteAction,
          label: context.l10n.safetySettingsScreenTitleDeleteAccount658588,
          icon: CatchIcons.delete,
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
    final state = HostOrganizersScreenState.resolve(
      organizers: widget.organizers,
      currentUid: widget.currentUid,
      selectedOrganizerId: selectedOrganizerId ?? widget.initialOrganizerId,
      selectedTab: _selectedTab,
    );
    final selectedOrganizer = state.selectedOrganizer;
    if (selectedOrganizer == null) {
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
            icon: CatchIcons.people,
            title: context
                .l10n
                .hostsHostOrganizersScaffoldTitleNoHostOrganizersYet,
            message:
                context.l10n.hostsHostOrganizersScaffoldBodyCreateAOrganizerOr,
            actions: [
              CatchButton(
                label: context
                    .l10n
                    .hostsHostOrganizersScaffoldLabelCreateOrganizer,
                leading: Icon(CatchIcons.add, size: CatchIconSize.md),
                size: CatchButtonSize.md,
                onPressed: () =>
                    context.pushNamed(Routes.hostCreateOrganizerScreen.name),
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
        title: selectedOrganizer.name,
        actions: [accountMenu, signOutAction],
      ),
      actions: CatchPageTabBar<HostOrganizerTab>.controlled(
        controller: _tabController,
        groupKey: _hostOrganizerTabRailKey,
        options: _hostOrganizerTabOptions(context),
      ),
      semanticsLabel:
          context.l10n.hostsHostOrganizersScaffoldLabelOrganizerWorkspaceTabs,
      semanticsHint:
          context.l10n.hostsHostOrganizersScaffoldBodyDragLeftOrRight,
      body: CatchRootScreenBody.paged(
        controller: _tabController,
        pages: [
          CatchRootScreenPageSpec.scroll(
            page: CatchRootScreenPageScrollView.sections(
              scrollStateController:
                  _pageScrollControllers[HostOrganizerTab.edit],
              scrollKey: PageStorageKey(
                'host-club-${selectedOrganizer.id}-edit-scroll',
              ),
              children: [
                SliverToBoxAdapter(
                  child: SizedBox(
                    width: double.infinity,
                    child: KeyedSubtree(
                      key: _profileSectionsKey,
                      child: HostOrganizerEditBody(
                        key: ValueKey('host-club-${selectedOrganizer.id}-edit'),
                        organizer: selectedOrganizer,
                        currentUid: state.currentUid,
                        isOwner: state.selectedOrganizerIsOwner,
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
                  _pageScrollControllers[HostOrganizerTab.insights],
              onRefresh: _insightsRefreshController.refresh,
              scrollKey: PageStorageKey(
                'host-club-${selectedOrganizer.id}-insights-scroll',
              ),
              children: [
                SliverToBoxAdapter(
                  child: SizedBox(
                    width: double.infinity,
                    child: HostOrganizerInsightsSection(
                      key: ValueKey(
                        'host-club-${selectedOrganizer.id}-insights',
                      ),
                      organizer: selectedOrganizer,
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
                  _pageScrollControllers[HostOrganizerTab.preview],
              scrollKey: PageStorageKey(
                'host-club-${selectedOrganizer.id}-preview-scroll',
              ),
              children: [
                OrganizerDetailReadOnlyPreview(
                  initialOrganizer: selectedOrganizer,
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
        showPreview: _selectedTab != HostOrganizerTab.preview,
        preview: CatchWorkspacePaneScaffold(
          title: CatchTopBar.primaryRail(
            title: context.l10n.hostsHostOrganizersScaffoldLabelPreview,
          ),
          body: CustomScrollView(
            key: PageStorageKey(
              'host-club-${selectedOrganizer.id}-persistent-preview',
            ),
            slivers: [
              OrganizerDetailReadOnlyPreview(
                initialOrganizer: selectedOrganizer,
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

  HostOrganizerTab get _effectiveInitialTab =>
      widget.initialExpandedEditField == null
      ? widget.initialTab
      : HostOrganizerTab.edit;

  void _handleTabControllerChanged() {
    final tab = HostOrganizerTab.values[_tabController.index];
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
