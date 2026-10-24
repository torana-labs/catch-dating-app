part of 'host_inbox_screen.dart';

class HostInboxWorkspaceSection extends ConsumerWidget {
  const HostInboxWorkspaceSection({
    super.key,
    required this.uidState,
    required this.uid,
    required this.clubsState,
    required this.selectedClub,
    required this.query,
    required this.now,
    required this.requestedScope,
    required this.selectedSegment,
    required this.selectedThreadId,
    required this.onRetry,
    required this.onScopeChanged,
    required this.onSegmentChanged,
    required this.onPersonSelected,
  });
  final CatchAsyncState<String?> uidState;
  final String? uid;
  final CatchAsyncState<List<Club>> clubsState;
  final Club? selectedClub;
  final String query;
  final DateTime now;
  final HostInboxScope? requestedScope;
  final HostInboxAudienceSegment selectedSegment;
  final String? selectedThreadId;
  final ValueChanged<String?> onRetry;
  final ValueChanged<HostInboxScope> onScopeChanged;
  final ValueChanged<HostInboxAudienceSegment> onSegmentChanged;
  final ValueChanged<HostInboxPerson> onPersonSelected;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (uidState.hasError || clubsState.hasError) {
      final failed = uidState.hasError ? uidState : clubsState;
      return CatchLocalizedSliverErrorState(
        failed.error!,
        context: AppErrorContext.chat,
        onRetry: () => onRetry(selectedClub?.id),
      );
    }
    if (uidState.isLoading) return const ChatsListSkeleton();
    if (uid == null) return const _HostAuthRequiredSliver();
    if (clubsState.isLoading) return const ChatsListSkeleton();
    final club = selectedClub;
    if (club == null) return const _HostNoOrganizerSliver();
    final eventsAsync = ref.watch(watchEventsForClubProvider(club.id));
    final inboxAsync = ref.watch(hostInboxCatchViewModelProvider);
    final whatsappAsync = ref.watch(hostInboxWhatsappPagesProvider(club.id));
    final programsAsync = ref.watch(organizerProgramListProvider(club.id));
    final eventsState = catchAsyncStateFromAsyncValue(eventsAsync);
    final inboxState = catchAsyncStateFromAsyncValue(inboxAsync);
    final liveInboxState = catchAsyncStateFromAsyncValue(
      ref.watch(chatsListViewModelProvider),
    );
    final whatsappState = catchAsyncStateFromAsyncValue(whatsappAsync);
    final programsState = catchAsyncStateFromAsyncValue(programsAsync);
    final events = eventsState.value;
    final requestedProgramId = requestedScope?.programId;
    final programPagesAsync = requestedProgramId == null
        ? null
        : ref.watch(
            hostInboxProgramAudiencePagesProvider(club.id, requestedProgramId),
          );
    final programPagesState = programPagesAsync == null
        ? null
        : catchAsyncStateFromAsyncValue(programPagesAsync);
    if (programPagesState?.hasError == true) {
      return CatchLocalizedSliverErrorState(
        programPagesState!.error!,
        context: AppErrorContext.chat,
        onRetry: () => onRetry(club.id),
      );
    }
    if (requestedProgramId != null &&
        (programPagesState?.isLoading == true ||
            programPagesState?.value == null)) {
      return const ChatsListSkeleton();
    }
    final programPage = programPagesState?.value;
    final programs = <OrganizerProgramSummary>[
      ...?programsState.value,
      if (programPage != null &&
          programsState.value?.any(
                (program) => program.programId == programPage.program.programId,
              ) !=
              true)
        programPage.program,
    ];
    final scope = resolveHostInboxScope(
      events: events ?? const [],
      now: now,
      requestedScope: requestedScope,
      programs: programs,
    );
    final eventId = scope.eventId;
    final programId = scope.programId;
    final participationsAsync = eventId == null
        ? const AsyncData<List<EventParticipation>>([])
        : ref.watch(watchEventParticipationsForEventProvider(eventId));
    final failed = eventsState.hasError ? eventsState : null;
    if (failed != null && !scope.isProgram) {
      return CatchLocalizedSliverErrorState(
        failed.error!,
        context: AppErrorContext.chat,
        onRetry: () => onRetry(club.id),
      );
    }
    final loading = eventsState.isLoading && !scope.isProgram;
    final inbox =
        inboxState.value ??
        const ChatsListViewModel(
          newMatches: [],
          conversations: [],
          totalThreadCount: 0,
        );
    final participations = catchAsyncStateFromAsyncValue(
      participationsAsync,
    ).value;
    final whatsappPage = whatsappState.value;
    final catchPages = ref.watch(hostInboxCatchPagesProvider(uid!));
    final sourceWindowMayHaveMore =
        catchAsyncStateFromAsyncValue(
          ref.watch(chatsListViewModelProvider),
        ).value?.sourceWindowMayHaveMore ??
        true;
    final catchHasMore = catchPages.canLoadMore(sourceWindowMayHaveMore);
    final whatsappThreads = whatsappPage?.threads ?? const [];
    final programAudience = programId == null
        ? null
        : hostInboxProgramAudience(
            guestContactIds: programPage?.contactIds ?? const [],
            whatsappThreads: whatsappThreads,
          );
    final workspace = events == null && !scope.isProgram
        ? null
        : HostInboxViewModel.compose(
            events: events ?? const [],
            inbox: inbox,
            participations: participations ?? const [],
            selectedOrganizerId: club.id,
            selectedScope: scope,
            selectedSegment: selectedSegment,
            query: query,
            now: now,
            programs: programs,
            programAudience: programAudience,
          );
    if (loading || workspace == null) {
      return const ChatsListSkeleton();
    }
    final people = composeHostInboxPeople(
      organizerId: club.id,
      scope: scope,
      segment: selectedSegment,
      catchThreads: [...inbox.newMatches, ...inbox.conversations],
      whatsappThreads: whatsappThreads,
      participations: participations,
      query: query,
      programAudience: programAudience,
    );
    final partial =
        catchHasMore ||
        catchPages.error != null ||
        liveInboxState.isLoading ||
        liveInboxState.hasError ||
        inboxState.isLoading ||
        inboxState.hasError ||
        whatsappState.isLoading ||
        whatsappState.hasError ||
        whatsappPage?.nextCursor != null ||
        (programPage?.nextCursor != null) ||
        (programPage?.loadingMore ?? false) ||
        (programPage?.error != null) ||
        (scope.isProgram &&
            (programsState.isLoading || programsState.hasError));
    return SliverMainAxisGroup(
      slivers: [
        if (workspace.scopeOptions.length > 1)
          HostInboxScopeMenu(
            workspace: workspace,
            now: now,
            onChanged: onScopeChanged,
          ),
        if (workspace.selectedScope.kind == HostInboxScopeKind.event)
          HostInboxAudienceInput(
            workspace: workspace,
            people: people,
            complete: !partial && participations != null,
            onChanged: onSegmentChanged,
          ),
        if (partial)
          SliverToBoxAdapter(
            child: CatchSection.content(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CatchText(
                    context.l10n.hostInboxPartialSources,
                    variant: CatchTextVariant.supporting,
                  ),
                  if (liveInboxState.hasError ||
                      inboxState.hasError ||
                      whatsappState.hasError)
                    CatchButton(
                      label: context.l10n.sharedActionTryAgain,
                      onPressed: () {
                        ref.invalidate(hostWhatsappThreadsProvider(club.id));
                        onRetry(club.id);
                      },
                    ),
                ],
              ),
            ),
          ),
        if (scope.isProgram && (programPage?.unlinkedGuestCount ?? 0) > 0)
          SliverToBoxAdapter(
            child: CatchSection.content(
              child: CatchText(
                context.l10n.hostInboxProgramContactsUnlinked,
                variant: CatchTextVariant.supporting,
              ),
            ),
          ),
        if (people.unclassifiedCount > 0)
          SliverToBoxAdapter(
            child: CatchSection.content(
              child: CatchText(
                context.l10n.hostInboxUnclassified,
                variant: CatchTextVariant.supporting,
              ),
            ),
          ),
        HostInboxPeopleSection(
          workspace: workspace,
          people: people,
          now: now,
          selectedThreadId: selectedThreadId,
          showEmpty: !partial,
          sourceCoverageComplete: !partial,
          onPersonSelected: onPersonSelected,
        ),
        if (catchHasMore)
          SliverToBoxAdapter(
            child: CatchSection.content(
              child: CatchButton(
                label: catchPages.error == null
                    ? context.l10n.hostInboxMoreConversations
                    : context.l10n.sharedActionTryAgain,
                onPressed: catchPages.loadingMore
                    ? null
                    : () => ref
                          .read(hostInboxCatchPagesProvider(uid!).notifier)
                          .loadMore(),
              ),
            ),
          ),
        if (whatsappPage?.nextCursor != null)
          SliverToBoxAdapter(
            child: CatchSection.content(
              child: CatchButton(
                label: whatsappPage?.error == null
                    ? context.l10n.hostInboxMoreConversations
                    : context.l10n.sharedActionTryAgain,
                onPressed: whatsappPage!.loadingMore
                    ? null
                    : () => ref
                          .read(
                            hostInboxWhatsappPagesProvider(club.id).notifier,
                          )
                          .loadMore(),
              ),
            ),
          ),
        if (programPage?.nextCursor != null)
          SliverToBoxAdapter(
            child: CatchSection.content(
              child: CatchButton(
                label: programPage?.error == null
                    ? context.l10n.hostInboxMoreProgramGuests
                    : context.l10n.sharedActionTryAgain,
                onPressed: programPage!.loadingMore
                    ? null
                    : () => ref
                          .read(
                            hostInboxProgramAudiencePagesProvider(
                              club.id,
                              programId!,
                            ).notifier,
                          )
                          .loadMore(),
              ),
            ),
          ),
      ],
    );
  }
}

class HostMessagingWorkspaceTabBar extends StatelessWidget
    implements CatchPrimaryRail, CatchScaledPreferredSize {
  const HostMessagingWorkspaceTabBar({
    super.key,
    required this.selected,
    required this.onChanged,
  });
  final HostMessagingWorkspace selected;
  final ValueChanged<HostMessagingWorkspace>? onChanged;
  @override
  Size get preferredSize => Size.fromHeight(CatchPageTabBar.minimumHeight);
  @override
  Size preferredSizeFor(BuildContext context, {double? width}) =>
      Size.fromHeight(CatchPageTabBar.heightFor(context));
  @override
  Widget build(BuildContext context) => CatchPageTabBar<HostMessagingWorkspace>(
    key: const ValueKey<String>('host-messaging-workspace-rail'),
    selected: selected,
    options: [
      CatchOption(
        value: HostMessagingWorkspace.inbox,
        label: context.l10n.hostMessagingWorkspaceInbox,
      ),
      CatchOption(
        value: HostMessagingWorkspace.campaigns,
        label: context.l10n.hostMessagingWorkspaceSends,
      ),
    ],
    onChanged: onChanged,
  );
}

class HostInboxAudienceInput extends StatelessWidget {
  const HostInboxAudienceInput({
    super.key,
    required this.workspace,
    required this.onChanged,
    this.people,
    this.complete = true,
  });
  final HostInboxViewModel workspace;
  final HostInboxPeople? people;
  final bool complete;
  final ValueChanged<HostInboxAudienceSegment> onChanged;
  @override
  Widget build(BuildContext context) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: CatchInsets.pageHorizontal,
        child: CatchChoiceInput<HostInboxAudienceSegment>.segmented(
          variant: CatchChoiceInputVariant.summary,
          contract:
              CatchContractConstraints.mobileFormStateHostInboxAudienceSegment,
          contractValueBuilder: (segment) => segment.name,
          selected: workspace.selectedSegment,
          options: [
            CatchOption(
              value: HostInboxAudienceSegment.booked,
              label: complete
                  ? context.l10n
                        .hostsHostInboxScreenLabelBookedBookedthreadcount(
                          bookedThreadCount:
                              people?.bookedCount ??
                              workspace.bookedThreadCount,
                        )
                  : context.l10n.hostInboxBookedStatus,
            ),
            CatchOption(
              value: HostInboxAudienceSegment.prospective,
              label: complete
                  ? context.l10n
                        .hostsHostInboxScreenLabelProspectiveProspectivethreadcount(
                          prospectiveThreadCount:
                              people?.prospectiveCount ??
                              workspace.prospectiveThreadCount,
                        )
                  : context.l10n.hostInboxProspectiveStatus,
            ),
          ],
          onChanged: onChanged,
        ),
      ),
    );
  }
}

class HostInboxPeopleSection extends StatelessWidget {
  const HostInboxPeopleSection({
    super.key,
    required this.workspace,
    required this.people,
    required this.now,
    this.selectedThreadId,
    this.showEmpty = true,
    this.sourceCoverageComplete = true,
    required this.onPersonSelected,
  });
  final HostInboxViewModel workspace;
  final HostInboxPeople people;
  final DateTime now;
  final String? selectedThreadId;
  final bool showEmpty;
  final bool sourceCoverageComplete;
  final ValueChanged<HostInboxPerson> onPersonSelected;
  @override
  Widget build(BuildContext context) {
    if (people.people.isEmpty) {
      return showEmpty
          ? CatchStateViewport.sliver(
              child: workspace.query.isNotEmpty
                  ? const ChatsEmptyState.noHostSearchResults()
                  : HostInboxEmptyState(
                      title: workspace.isProgram
                          ? context
                                .l10n
                                .hostsHostInboxScreenTitleNoProgramConversations
                          : workspace.isGeneral
                          ? context
                                .l10n
                                .hostsHostInboxScreenTitleNoGeneralInquiries
                          : context.l10n.hostsHostInboxScreenTitleNoValue1HaveWritten(
                              value1:
                                  workspace.selectedSegment ==
                                      HostInboxAudienceSegment.booked
                                  ? context
                                        .l10n
                                        .hostsHostInboxScreenTitleBookedAttendees
                                  : context
                                        .l10n
                                        .hostsHostInboxScreenTitleProspectiveAttendees,
                            ),
                      message: context.l10n.hostInboxChoosePerson,
                    ),
            )
          : const SliverToBoxAdapter(child: SizedBox.shrink());
    }
    return CatchSection.sliverRows(
      itemCount: people.people.length,
      indexForKeyBuilder: (key) {
        final index = people.people.indexWhere((p) => ValueKey(p.key) == key);
        return index < 0 ? null : index;
      },
      itemBuilder: (context, index) {
        final person = people.people[index];
        final unread = person.knownUnreadCount;
        return CatchField.navigate(
          key: ValueKey(person.key),
          content: CatchConversationLayout(
            name: person.displayName,
            imageUrl: person.photoUrl,
            preview: person.previewText,
            timestamp: AppTimeFormatters.compactRelativeTime(
              person.timestamp,
              now: now,
            ),
            context:
                workspace.selectedScope.kind == HostInboxScopeKind.event &&
                    person.booked == null
                ? context.l10n.hostInboxUnknownBooking
                : null,
            activityLabel: unread > 0
                ? '$unread${sourceCoverageComplete && person.unreadCountIsComplete ? '' : '+'}'
                : null,
            activitySemantics: unread > 0
                ? sourceCoverageComplete && person.unreadCountIsComplete
                      ? context.l10n.coreCatchPersonRowLabelLabelUnreadChats(
                          label: '$unread',
                        )
                      : context.l10n.hostInboxPartialUnread(count: unread)
                : null,
          ),
          states: {
            if (selectedThreadId != null &&
                person.containsEndpoint(selectedThreadId!))
              WidgetState.selected,
          },
          onActivate: () => onPersonSelected(person),
        );
      },
    );
  }
}

class HostInboxEmptyState extends StatelessWidget {
  const HostInboxEmptyState({
    super.key,
    required this.title,
    required this.message,
  });
  final String title;
  final String message;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: CatchInsets.contentRelaxed,
      child: CatchEmptyState(
        icon: CatchIcons.chatBubbleOutlineRounded,
        title: title,
        message: message,
      ),
    );
  }
}
