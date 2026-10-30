import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/chats/presentation/inbox/widgets/chats_empty_state.dart';
import 'package:catch_dating_app/chats/presentation/inbox/widgets/chats_list.dart';
import 'package:catch_dating_app/chats/presentation/inbox/widgets/chats_sliver_header.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_catch_pages_controller.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_people.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_person_page_body.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_program_audience_controller.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_scope_menu.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_whatsapp_pages_controller.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_new_message_screen.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_reply_drafts.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_sends_page_body.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

part 'host_inbox_workspace_section.dart';

enum HostMessagingWorkspace { inbox, campaigns }

class HostInboxScreen extends ConsumerStatefulWidget {
  const HostInboxScreen({
    super.key,
    this.initialScope,
    this.initialSegment = HostInboxAudienceSegment.booked,
    this.initialWorkspace = HostMessagingWorkspace.inbox,
    this.initialSavedAudienceId,
    this.initialOrganizerId,
    this.initialThreadId,
    this.broadcastEnabled,
    this.syncSelectionToRoute = true,
    this.now,
  });

  final HostInboxScope? initialScope;
  final HostInboxAudienceSegment initialSegment;
  final HostMessagingWorkspace initialWorkspace;
  final String? initialSavedAudienceId;
  final String? initialOrganizerId;
  final String? initialThreadId;
  final bool? broadcastEnabled;
  final bool syncSelectionToRoute;
  final DateTime? now;

  @override
  ConsumerState<HostInboxScreen> createState() => _HostInboxScreenState();
}

class _HostInboxScreenState extends ConsumerState<HostInboxScreen> {
  HostInboxScope? _requestedScope;
  late HostInboxAudienceSegment _segment;
  late HostMessagingWorkspace _workspace;
  bool _campaignBusy = false;
  String? _accountId;
  String? _selectedThreadId;
  final _threadDrafts = HostReplyDrafts();

  @override
  void initState() {
    super.initState();
    _requestedScope = widget.initialScope;
    _segment = widget.initialSegment;
    _workspace = widget.initialWorkspace;
    _selectedThreadId = widget.initialThreadId;
  }

  @override
  void didUpdateWidget(covariant HostInboxScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialScope != widget.initialScope &&
        widget.initialScope != null) {
      _requestedScope = widget.initialScope;
    }
    if (oldWidget.initialSegment != widget.initialSegment) {
      _segment = widget.initialSegment;
    }
    if (oldWidget.initialWorkspace != widget.initialWorkspace) {
      _workspace = widget.initialWorkspace;
    }
    if (oldWidget.initialThreadId != widget.initialThreadId) {
      _selectedThreadId = widget.initialThreadId;
    }
  }

  @override
  void dispose() {
    _threadDrafts.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final now = widget.now ?? DateTime.now();
    final uidAsync = ref.watch(uidProvider);
    final uidState = catchAsyncStateFromAsyncValue(uidAsync);
    final uid = uidState.value;
    if (_accountId != null && _accountId != uid && !uidState.isLoading) {
      _threadDrafts.clear();
      _selectedThreadId = null;
    }
    if (!uidState.isLoading) _accountId = uid;
    final clubsAsync = uid == null
        ? const AsyncLoading<List<Club>>()
        : ref.watch(hostOperableClubsProvider(uid));
    final clubsState = catchAsyncStateFromAsyncValue(clubsAsync);
    final clubs = clubsState.value;
    final selectedOrganizerId = uid == null
        ? null
        : ref.watch(hostOrganizerSelectionProvider(uid));
    final selectedClub = clubs == null || clubs.isEmpty
        ? null
        : resolveSelectedHostOrganizer(
            clubs,
            selectedOrganizerId: selectedOrganizerId,
            preferredOrganizerId: selectedOrganizerId == null
                ? widget.initialOrganizerId
                : null,
          );
    final query = ref.watch(chatSearchQueryProvider);
    final isInbox = _workspace == HostMessagingWorkspace.inbox;
    final showSearch = isInbox;
    final selectedThreadId = _selectedThreadId;

    Widget buildMaster(BuildContext context, {Widget? historySliver}) {
      final workspaceSliver =
          historySliver ??
          (isInbox
              ? HostInboxWorkspaceSection(
                  uidState: uidState,
                  uid: uid,
                  clubsState: clubsState,
                  selectedClub: selectedClub,
                  query: query,
                  now: now,
                  requestedScope: _requestedScope,
                  selectedSegment: _segment,
                  selectedThreadId: selectedThreadId,
                  onRetry: _retry,
                  onScopeChanged: _selectScope,
                  onSegmentChanged: _selectSegment,
                  onPersonSelected: (person) => _openPerson(person),
                )
              : CatchViewport.sliverLane(
                  maxExtent: CatchLayout.hostMessagingSendsPageMaxExtent,
                  child: _HostCampaignWorkspaceSliver(
                    uidState: uidState,
                    uid: uid,
                    clubsState: clubsState,
                    selectedClub: selectedClub,
                    initialSavedAudienceId: widget.initialSavedAudienceId,
                    preferredEventId: _requestedScope?.eventId,
                    initialSegment: _segment,
                    broadcastEnabled: _broadcastEnabled,
                    now: now,
                    onRetry: _retry,
                    onBusyChanged: _setCampaignBusy,
                    onOpenInbox: () =>
                        _selectWorkspace(HostMessagingWorkspace.inbox),
                  ),
                ));
      return CatchRootScreenScrollView.withPrimaryRail(
        header: CatchRootScreenHeader.custom(
          ChatsBrowseHeader(
            presentation: ChatsBrowsePresentation.host,
            showSearchAction: showSearch,
            searchValue: isInbox ? query : '',
            onSearchChanged: isInbox
                ? ref.read(chatSearchQueryProvider.notifier).setQuery
                : null,
            hostFilter: null,
            hostUnreadCount: 0,
            onHostFilterChanged: null,
            showHostSubtitle: !isInbox,
            subtitle: isInbox ? null : context.l10n.hostSendsSubtitle,
            compactForPrimaryRail: true,
            actions: [
              if (isInbox &&
                  selectedClub != null &&
                  _requestedScope?.isProgram != true)
                CatchIconAction.toolbar(
                  tooltip: context.l10n.hostInboxNewMessage,
                  onPressed: () => _newMessage(selectedClub.id),
                  icon: CatchIcons.edit,
                ),
            ],
          ),
        ),
        actions: HostMessagingWorkspaceTabBar(
          selected: _workspace,
          onChanged: _campaignBusy ? null : _selectWorkspace,
        ),
        body: CatchRootScreenBody.single(
          page: CatchRootScreenPageSpec.scroll(
            page: CatchRootScreenPageScrollView.fullBleed(
              scrollKey: PageStorageKey<String>(
                'host-messaging-${_workspace.name}',
              ),
              children: [workspaceSliver],
            ),
          ),
        ),
      );
    }

    if (!isInbox &&
        selectedClub != null &&
        !uidState.isLoading &&
        !clubsState.isLoading &&
        !uidState.hasError &&
        !clubsState.hasError) {
      return CatchScaffold.workspace(
        backgroundColor: t.bg,
        body: HostSendsPageBody(
          club: selectedClub,
          initialSavedAudienceId: widget.initialSavedAudienceId,
          preferredEventId: _requestedScope?.eventId,
          initialSegment: _segment,
          broadcastEnabled: _broadcastEnabled,
          now: now,
          onBusyChanged: _setCampaignBusy,
          onOpenInbox: () => _selectWorkspace(HostMessagingWorkspace.inbox),
          indexBuilder: (sliver) => buildMaster(context, historySliver: sliver),
        ),
      );
    }
    final detail = selectedThreadId == null || selectedClub == null
        ? CatchEmptyState(
            icon: CatchIcons.chat,
            title: context.l10n.hostInboxSelectConversationTitle,
            message: context.l10n.hostInboxSelectConversationBody,
          )
        : HostInboxPersonPageBody(
            organizerId: selectedClub.id,
            selection: selectedThreadId,
            scope: _requestedScope,
            now: now,
            segment: _segment,
            drafts: _threadDrafts,
            onBack: _closePerson,
          );

    return CatchScaffold.workspace(
      backgroundColor: t.bg,
      body: HostNavigationWorkspace(
        spec: isInbox
            ? HostDirectoryWorkspace<String>(
                index: buildMaster(context),
                selection: selectedClub == null ? null : selectedThreadId,
                detailBuilder: (_) => detail,
                unselected: detail,
                onBack: _closePerson,
              )
            : HostDirectoryWorkspace<String>(
                index: buildMaster(context),
                selection: null,
                detailBuilder: (_) => const SizedBox.shrink(),
                unselected: detail,
              ),
      ),
    );
  }

  void _selectWorkspace(HostMessagingWorkspace workspace) {
    if (_campaignBusy || workspace == _workspace) return;
    if (workspace == HostMessagingWorkspace.campaigns) {
      ref.read(chatSearchQueryProvider.notifier).clear();
    }
    setState(() {
      _workspace = workspace;
      _selectedThreadId = null;
    });
    if (!widget.syncSelectionToRoute) return;
    context.goNamed(
      Routes.hostInboxScreen.name,
      queryParameters: _routeQuery(workspace: workspace),
    );
  }

  void _setCampaignBusy(bool value) {
    if (!mounted || _campaignBusy == value) return;
    setState(() => _campaignBusy = value);
  }

  void _retry(String? organizerId) {
    final uid = catchAsyncStateFromAsyncValue(ref.read(uidProvider)).value;
    ref.invalidate(uidProvider);
    ref.invalidate(chatsListViewModelProvider);
    if (uid != null) {
      ref.invalidate(hostOperableClubsProvider(uid));
      ref.invalidate(hostInboxCatchPagesProvider(uid));
    }
    if (_requestedScope?.eventId case final eventId?) {
      ref.invalidate(watchEventParticipationsForEventProvider(eventId));
    }
    if (_requestedScope?.programId case final programId?) {
      if (organizerId != null) {
        ref.invalidate(
          hostInboxProgramAudiencePagesProvider(organizerId, programId),
        );
      }
    }
    if (organizerId != null) {
      ref.invalidate(watchEventsForClubProvider(organizerId));
      ref.invalidate(hostMessagingSetupProvider(organizerId));
    }
    setState(() {});
  }

  void _selectScope(HostInboxScope scope) {
    setState(() {
      _requestedScope = scope;
      _segment = HostInboxAudienceSegment.booked;
      _selectedThreadId = null;
    });
    if (!widget.syncSelectionToRoute) return;
    context.goNamed(
      Routes.hostInboxScreen.name,
      queryParameters: _routeQuery(scope: scope),
    );
  }

  void _selectSegment(HostInboxAudienceSegment segment) {
    if (segment == _segment) return;
    setState(() {
      _segment = segment;
      _selectedThreadId = null;
    });
    if (!widget.syncSelectionToRoute) return;
    context.goNamed(
      Routes.hostInboxScreen.name,
      queryParameters: _routeQuery(),
    );
  }

  void _openPerson(HostInboxPerson person) {
    setState(() {
      _selectedThreadId = person.personId;
      _requestedScope = person.scope;
    });
    if (widget.syncSelectionToRoute) {
      context.goNamed(
        Routes.hostInboxScreen.name,
        queryParameters: _routeQuery(
          organizerId: person.organizerId,
          threadId: person.personId,
        ),
      );
    }
  }

  void _closePerson() {
    setState(() => _selectedThreadId = null);
    if (widget.syncSelectionToRoute) {
      context.goNamed(
        Routes.hostInboxScreen.name,
        queryParameters: _routeQuery(),
      );
    }
  }

  Future<void> _newMessage(String organizerId) async {
    final accountId = _accountId;
    final selection = await context.pushNamed<HostNewMessageSelection>(
      Routes.hostNewMessageScreen.name,
      queryParameters: {'organizerId': organizerId},
    );
    if (!mounted || selection == null || accountId != _accountId) return;
    ref.invalidate(chatsListViewModelProvider);
    setState(() {
      _requestedScope = selection.scope;
      _selectedThreadId = selection.endpointId;
    });
    if (widget.syncSelectionToRoute) {
      context.goNamed(
        Routes.hostInboxScreen.name,
        queryParameters: _routeQuery(
          organizerId: organizerId,
          threadId: selection.endpointId,
        ),
      );
    }
  }

  Map<String, String> _routeQuery({
    HostInboxScope? scope,
    HostMessagingWorkspace? workspace,
    String? organizerId,
    String? threadId,
  }) {
    final effectiveScope = scope ?? _requestedScope;
    final effectiveWorkspace = workspace ?? _workspace;
    return {
      if (effectiveWorkspace != HostMessagingWorkspace.inbox)
        'workspace': effectiveWorkspace.name,
      if (effectiveScope?.isGeneral == true) 'scope': 'general',
      'segment': _segment.name,
      'eventId': ?effectiveScope?.eventId,
      'programId': ?effectiveScope?.programId,
      if (organizerId != null && organizerId.isNotEmpty)
        'organizerId': organizerId,
      if (threadId != null && threadId.isNotEmpty) 'threadId': threadId,
    };
  }

  bool get _broadcastEnabled => widget.broadcastEnabled ?? true;
}

class _HostCampaignWorkspaceSliver extends StatelessWidget {
  const _HostCampaignWorkspaceSliver({
    required this.uidState,
    required this.uid,
    required this.clubsState,
    required this.selectedClub,
    required this.initialSavedAudienceId,
    required this.preferredEventId,
    required this.initialSegment,
    required this.broadcastEnabled,
    required this.now,
    required this.onRetry,
    required this.onBusyChanged,
    required this.onOpenInbox,
  });

  final CatchAsyncState<String?> uidState;
  final String? uid;
  final CatchAsyncState<List<Club>> clubsState;
  final Club? selectedClub;
  final String? initialSavedAudienceId;
  final String? preferredEventId;
  final HostInboxAudienceSegment initialSegment;
  final bool broadcastEnabled;
  final DateTime now;
  final ValueChanged<String?> onRetry;
  final ValueChanged<bool> onBusyChanged;
  final VoidCallback onOpenInbox;

  @override
  Widget build(BuildContext context) {
    if (uidState.hasError || clubsState.hasError) {
      final failed = uidState.hasError ? uidState : clubsState;
      return CatchLocalizedSliverErrorState(
        failed.error!,
        context: AppErrorContext.club,
        onRetry: () => onRetry(selectedClub?.id),
      );
    }
    if (uidState.isLoading) return const ChatsListSkeleton();
    if (uid == null) return const _HostAuthRequiredSliver();
    if (clubsState.isLoading) return const ChatsListSkeleton();
    final club = selectedClub;
    if (club == null) return const _HostNoOrganizerSliver();
    // The loaded sends workspace is composed above the scroll owner so it can
    // retain history alongside its selected report. This branch is state-only.
    return const SliverToBoxAdapter(child: SizedBox.shrink());
  }
}

class _HostNoOrganizerSliver extends StatelessWidget {
  const _HostNoOrganizerSliver();

  @override
  Widget build(BuildContext context) => CatchStateViewport.sliver(
    child: CatchEmptyState(
      icon: CatchIcons.people,
      title: context.l10n.hostsHostEventsScaffoldTitleCreateYourFirstClub,
      message: context.l10n.hostsHostEventsScaffoldBodyCreateAClubTo,
    ),
  );
}

class _HostAuthRequiredSliver extends StatelessWidget {
  const _HostAuthRequiredSliver();

  @override
  Widget build(BuildContext context) => CatchStateViewport.sliver(
    child: CatchEmptyState(
      icon: CatchIcons.locked,
      title: context.l10n.hostsHostAuthRequiredScreenTitleSignInRequired,
      message: context.l10n.hostsHostAuthRequiredScreenMessageSignInToManage,
      actions: [
        CatchButton(
          label: context.l10n.hostsHostAuthRequiredScreenVisiblecopySignIn,
          onPressed: () => context.go(Routes.authScreen.path),
        ),
      ],
    ),
  );
}
