part of '../host_operations_screen_test.dart';

Finder _hostEventsScrollable() => find
    .descendant(
      of: find.byType(HostEventsTimelineBody),
      matching: find.byWidgetPredicate(
        (widget) =>
            widget is Scrollable && widget.axisDirection == AxisDirection.down,
      ),
    )
    .hitTestable();

void registerHostEventEntryTests() {
  testWidgets('Host Today delegates creation and opens event manage', (
    tester,
  ) async {
    final organizer = buildOrganizer(id: 'club-host', ownerUserId: _hostUid);
    final event = buildEvent(
      id: 'event-host',
      clubId: organizer.id,
      startTime: DateTime(2026, 6, 15, 17),
    );

    await _pumpHostScreen(
      tester,
      HostTodayScreen(now: DateTime(2026, 6, 15, 12)),
      overrides: [
        ..._hostOrganizerOverrides(
          owned: [organizer],
          timelineEventsByOrganizer: {
            organizer.id: [event],
          },
        ),
        watchEventsForOrganizerProvider(
          organizer.id,
        ).overrideWithValue(AsyncData<List<Event>>([event])),
      ],
    );

    expect(find.text('Today'), findsOneWidget);
    expect(find.byTooltip('Create organizer'), findsNothing);
    expect(find.byTooltip('Switch organizer'), findsNothing);
    expect(find.text('Create event'), findsNothing);
    final header = tester.widget<CatchTopBar>(find.byType(CatchTopBar));
    expect(header.subtitle, 'Monday, June 15, 2026');
    expect(header.actions, isEmpty);
    expect(
      find.byKey(const ValueKey<String>('host-today-create-event')),
      findsNothing,
    );
    expect(find.text('Use guest list'), findsNothing);

    expect(
      tester
          .widget<HostTodayEventSection>(find.byType(HostTodayEventSection))
          .event,
      event,
    );
    await tester.tap(find.text('Continue setup'));
    await pumpFeatureUi(tester);

    expect(find.text('Manage ${event.id}'), findsOneWidget);
    expect(find.text('Section setup'), findsOneWidget);
  });

  testWidgets('Host Today owns the dedicated dress rehearsal entry point', (
    tester,
  ) async {
    final organizer = buildOrganizer(id: 'rehearsal-club', ownerUserId: _hostUid);

    await _pumpHostScreen(
      tester,
      HostTodayScreen(now: DateTime(2026, 6, 15, 12)),
      overrides: [
        ..._hostOrganizerOverrides(owned: [organizer]),
        watchEventsForOrganizerProvider(
          organizer.id,
        ).overrideWithValue(const AsyncData<List<Event>>([])),
      ],
    );

    final rehearsalAction = find.byKey(
      const ValueKey<String>('host-today-suggested-action'),
    );
    expect(rehearsalAction, findsOneWidget);
    await tester.tap(rehearsalAction);
    await pumpFeatureUi(tester);
    expect(find.text('Rehearse rehearsal-club'), findsOneWidget);
  });

  testWidgets('Host Today opens smart event entry from its quiet state', (
    tester,
  ) async {
    final organizer = buildOrganizer(id: 'quiet-club', ownerUserId: _hostUid);
    final draft = EventDraft(
      id: 'quiet-draft',
      clubId: organizer.id,
      savedAt: DateTime(2026, 6, 15, 10),
      customActivityLabel: 'Quiz night',
    );
    final pastEvent = buildEvent(
      id: 'past-event',
      clubId: organizer.id,
      startTime: DateTime(2026, 6, 14, 17),
    );

    await _pumpHostScreen(
      tester,
      HostTodayScreen(now: DateTime(2026, 6, 15, 12)),
      overrides: [
        ..._hostOrganizerOverrides(
          owned: [organizer],
          draftsByOrganizer: {
            organizer.id: [draft],
          },
          timelineEventsByOrganizer: {
            organizer.id: [pastEvent],
          },
        ),
        watchEventsForOrganizerProvider(
          organizer.id,
        ).overrideWithValue(AsyncData<List<Event>>([pastEvent])),
      ],
    );

    final createEvent = find.byKey(
      const ValueKey<String>('host-today-create-event'),
    );
    await tester.scrollUntilVisible(
      createEvent,
      400,
      scrollable: find.byType(Scrollable).first,
    );
    expect(createEvent, findsOneWidget);
    await tester.tap(createEvent);
    await pumpFeatureUi(tester);

    expect(
      find.byKey(const ValueKey<String>('host-event-entry-sheet')),
      findsOneWidget,
    );
    expect(find.text('Continue draft'), findsNothing);
    expect(find.text('Quiz night'), findsOneWidget);
    expect(find.text('Repeat last event'), findsOneWidget);
    expect(find.text('Use guest list'), findsNothing);
    expect(
      find.byKey(const ValueKey<String>('host-event-entry-createEvent')),
      findsOneWidget,
    );

    await tester.tap(find.text('Quiz night'));
    await pumpFeatureUi(tester);
    expect(find.text('Draft quiet-draft'), findsOneWidget);
  });

  testWidgets('Host Events resumes a loaded draft without a second lookup', (
    tester,
  ) async {
    final organizer = buildOrganizer(id: 'draft-club', ownerUserId: _hostUid);
    final draft = EventDraft(
      id: 'draft-one',
      clubId: organizer.id,
      savedAt: DateTime(2026, 6, 15, 10),
      customActivityLabel: 'Quiz night',
    );

    await _pumpHostScreen(
      tester,
      HostEventsScreen(now: DateTime(2026, 6, 15, 12)),
      overrides: [
        ..._hostOrganizerOverrides(
          owned: [organizer],
          draftsByOrganizer: {
            organizer.id: [draft],
          },
        ),
        watchEventsForOrganizerProvider(
          organizer.id,
        ).overrideWithValue(const AsyncData<List<Event>>([])),
      ],
    );

    await tester.tap(
      find.byKey(const ValueKey<String>('host-events-create-event')),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Continue draft'), findsNothing);
    expect(find.text('Quiz night'), findsOneWidget);
    final eventEntrySheet = find.byKey(
      const ValueKey<String>('host-event-entry-sheet'),
    );
    expect(
      find.descendant(of: eventEntrySheet, matching: find.byType(CatchSection)),
      findsNWidgets(2),
    );
    expect(
      find.descendant(
        of: eventEntrySheet,
        matching: find.byType(CatchSectionSurface),
      ),
      findsNothing,
    );
    expect(find.text('CONTINUE'), findsOneWidget);
    expect(find.text('START NEW'), findsOneWidget);

    await tester.tap(find.text('Quiz night'));
    await pumpFeatureUi(tester);
    expect(find.text('Draft draft-one'), findsOneWidget);
  });
}

void registerHostWorkspacePagingTest() {
  testWidgets('Host club workspace uses native horizontal tab paging', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final ownedOrganizer = buildOrganizer(
      id: 'paged-club',
      name: 'Paged Club',
      ownerUserId: _hostUid,
    );

    await _pumpHostScreen(
      tester,
      const HostOrganizersScreen(),
      overrides: [
        ..._hostOrganizerOverrides(owned: [ownedOrganizer]),
        watchEventsForOrganizerProvider(
          ownedOrganizer.id,
        ).overrideWithValue(const AsyncData<List<Event>>([])),
        organizerDetailViewModelProvider(ownedOrganizer.id).overrideWithValue(
          AsyncData<OrganizerDetailViewModel?>(_previewViewModel(ownedOrganizer)),
        ),
        watchHostPaymentAccountsProvider(
          _hostUid,
        ).overrideWithValue(const AsyncData<List<HostPaymentAccount>>([])),
        hostAnalyticsRepositoryProvider.overrideWithValue(
          const _EmptyHostAnalyticsRepository(),
        ),
      ],
    );

    final pager = find.byType(TabBarView);
    expect(
      find.byKey(const ValueKey('host-club-insights-summary')),
      findsNothing,
    );
    expect(find.byType(HostOrganizerEditBody), findsOneWidget);
    expect(find.byType(HostOrganizerInsightsSection), findsNothing);

    await tester.drag(pager, const Offset(-320, 0));
    await pumpFeatureUi(tester);
    expect(find.byType(HostOrganizerInsightsSection), findsOneWidget);
    expect(
      find.byKey(const ValueKey('host-club-insights-summary')),
      findsOneWidget,
    );
    expect(find.byType(HostOrganizerEditBody), findsNothing);

    await tester.drag(pager, const Offset(-320, 0));
    await pumpFeatureUi(tester);
    expect(
      find.byKey(const ValueKey('club-detail-hero-module')),
      findsOneWidget,
    );
    expect(find.text('Open public preview'), findsNothing);

    await tester.drag(pager, const Offset(320, 0));
    await pumpFeatureUi(tester);
    expect(find.byType(HostOrganizerInsightsSection), findsOneWidget);

    await tester.drag(pager, const Offset(320, 0));
    await pumpFeatureUi(tester);
    expect(find.byType(HostOrganizerEditBody), findsOneWidget);
    expect(
      find.byKey(const ValueKey('host-club-insights-summary')),
      findsNothing,
    );
  });
}

class _RecordingHostOrganizerEditActions implements HostOrganizerEditActions {
  _RecordingHostOrganizerEditActions({
    this.pickedPhotos = const [],
    this.mediaFailuresRemaining = 0,
  });

  final List<HostPickedOrganizerPhoto> pickedPhotos;
  final List<UpdateOrganizerPatch> profileWrites = [];
  final List<List<HostOrganizerMediaInput>> mediaWrites = [];
  int mediaFailuresRemaining;
  int mediaUpdateCalls = 0;
  final List<bool> removeLogoWrites = [];

  @override
  Future<void> updateOrganizer({
    required String clubId,
    required UpdateOrganizerPatch patch,
  }) async {
    profileWrites.add(patch);
  }

  @override
  Future<List<HostPickedOrganizerPhoto>> pickOrganizerPhotos({int? limit}) async =>
      limit == null
      ? pickedPhotos
      : pickedPhotos.take(limit).toList(growable: false);

  @override
  Future<HostPickedOrganizerLogo?> pickOrganizerLogo() async => null;

  @override
  Future<HostOrganizerMediaSaveResult> updateOrganizerMedia({
    required Organizer organizer,
    List<HostOrganizerMediaInput>? photoInputs,
    HostPickedOrganizerLogo? logo,
    bool removeLogo = false,
    ValueChanged<HostOrganizerMediaProgress>? onProgress,
  }) async {
    mediaUpdateCalls += 1;
    removeLogoWrites.add(removeLogo);
    if (mediaFailuresRemaining > 0) {
      mediaFailuresRemaining -= 1;
      final error = StateError('media update failed');
      final newInputs =
          photoInputs?.whereType<HostNewOrganizerPhotoInput>().toList() ?? const [];
      final failedId = newInputs.isEmpty ? null : newInputs.first.id;
      return HostOrganizerMediaSaveResult(
        photoInputs: photoInputs,
        logo: logo,
        failures: {?failedId: error},
        attached: false,
      );
    }
    if (photoInputs != null) {
      mediaWrites.add(List<HostOrganizerMediaInput>.of(photoInputs));
    }
    return HostOrganizerMediaSaveResult(
      photoInputs: photoInputs,
      logo: logo,
      failures: const {},
      attached: true,
    );
  }

  @override
  Future<void> discardOrganizerMedia({
    required List<HostOrganizerMediaInput> photoInputs,
    HostPickedOrganizerLogo? logo,
  }) async {}
}

class _FakeHostProfileRepository implements HostProfileRepository {
  _FakeHostProfileRepository({
    this.profile,
    this.throwOnEnsure = false,
    this.throwOnSave = false,
  });

  HostProfile? profile;
  final bool throwOnEnsure;
  final bool throwOnSave;
  String? ensuredUid;
  String? savedUid;
  String? savedDisplayName;
  String? savedRoleTitle;
  String? savedBio;

  @override
  Stream<HostProfile?> watchHostProfile(String uid) => Stream.value(profile);

  @override
  Future<void> ensureHostProfile({
    required String uid,
    required String displayName,
  }) async {
    if (throwOnEnsure) throw StateError('create failed');
    ensuredUid = uid;
  }

  @override
  Future<void> saveHostProfile({
    required String uid,
    required String displayName,
    String? roleTitle,
    String? bio,
  }) async {
    if (throwOnSave) throw StateError('save failed');
    savedUid = uid;
    savedDisplayName = displayName;
    savedRoleTitle = roleTitle;
    savedBio = bio;
  }
}

class _FakeHostAuthRepository extends Fake implements AuthRepository {
  _FakeHostAuthRepository({this.throwOnSignOut = false});

  final bool throwOnSignOut;
  int signOutCallCount = 0;

  @override
  Future<void> signOut() async {
    signOutCallCount += 1;
    if (throwOnSignOut) throw StateError('sign out failed');
  }
}

final class _EmptyHostAnalyticsRepository implements HostAnalyticsRepository {
  const _EmptyHostAnalyticsRepository({this.topEvents = const []});

  final List<HostAnalyticsEventRow> topEvents;

  @override
  Future<HostAnalyticsReport> getHostAnalytics(HostAnalyticsQuery query) async {
    return HostAnalyticsReport(
      generatedAt: DateTime(2026, 7, 10),
      summaryCards: const [],
      trend: const [],
      topEvents: topEvents,
      reviewSummary: const HostAnalyticsReviewSummary(
        newReviews: 0,
        publishedReviews: 0,
        verifiedReviews: 0,
        publicReviews: 0,
        ownerResponseCount: 0,
        averageRating: 0,
      ),
      discoverySummary: const HostAnalyticsDiscoverySummary(
        listingViews: 0,
        searchAppearances: 0,
        eventViews: 0,
        organizerSaves: 0,
        eventSaves: 0,
        contactClicks: 0,
        claimClicks: 0,
        outboundClicks: 0,
      ),
      dataQuality: const [],
    );
  }
}

HostAnalyticsEventRow _hostAnalyticsEventRow({required String eventId}) =>
    HostAnalyticsEventRow(
      eventId: eventId,
      clubId: 'exact-club',
      title: 'Top event',
      startTime: DateTime(2026, 7, 8, 19),
      status: 'completed',
      bookedCount: 20,
      checkedInCount: 18,
      waitlistedCount: 2,
      fillRate: 1,
      checkInRate: 0.9,
      grossRevenueMinor: 0,
      currency: 'INR',
      checkoutStartedCount: 0,
      checkoutDropoffCount: 0,
      paymentCompletedCount: 0,
      paymentFailedCount: 0,
      paymentRefundedCount: 0,
      reviewCount: 2,
      averageRating: 4.5,
      demandCount: 24,
      inviteOpenCount: 3,
      mutualMatchCount: 4,
      chatStartedCount: 2,
      repeatAttendeeCount: 5,
    );

List _hostOrganizerOverrides({
  List<Organizer> owned = const [],
  List<Organizer> hosted = const [],
  Map<String, List<EventDraft>> draftsByOrganizer = const {},
  Map<String, List<Event>> timelineEventsByOrganizer = const {},
  Map<String, HostMessagingSetup> messagingSetupByOrganizer = const {},
}) {
  final organizerIds = {
    ...owned.map((organizer) => organizer.id),
    ...hosted.map((organizer) => organizer.id),
  };
  return [
    programEventsControllerProvider.overrideWith((ref, request) {
      final controller = ProgramEventsController(
        isActorCurrent: () => true,
        fetchPage: ({cursor, programId}) async =>
            const OrganizerProgramInventoryPage(programs: []),
        mutate: (_, _) async =>
            throw StateError('Preview inventory is read only'),
        onMutation: (_) {},
      );
      ref.onDispose(controller.dispose);
      unawaited(controller.refresh());
      return controller;
    }),
    eventRepositoryProvider.overrideWithValue(
      _FixedHostEventRepository(timelineEventsByOrganizer),
    ),
    hostTodayFeedControllerProvider.overrideWith2(
      (_) => _FixedHostTodayFeedController(timelineEventsByOrganizer),
    ),
    hostEventsTimelineControllerProvider.overrideWith2(
      (_) => _FixedHostEventsTimelineController(timelineEventsByOrganizer),
    ),
    uidProvider.overrideWith((ref) => Stream.value(_hostUid)),
    watchOrganizersOwnedByProvider(
      _hostUid,
    ).overrideWithValue(AsyncData<List<Organizer>>(owned)),
    watchOrganizersHostedByProvider(
      _hostUid,
    ).overrideWithValue(AsyncData<List<Organizer>>(hosted)),
    for (final organizerId in organizerIds)
      organizerEventDraftsProvider(clubId: organizerId).overrideWithValue(
        AsyncData<List<EventDraft>>(
          draftsByOrganizer[organizerId] ?? const <EventDraft>[],
        ),
      ),
    for (final organizerId in organizerIds)
      hostCrmSummaryProvider(
        organizerId,
      ).overrideWithValue(AsyncData(_emptyCrmSummary(organizerId))),
    for (final organizerId in organizerIds)
      hostAudienceProvider(
        organizerId,
        const HostAudienceQuery(),
      ).overrideWithValue(
        AsyncData(
          HostAudiencePage(
            organizerId: organizerId,
            contacts: const [],
            nextCursor: null,
            matchCount: 0,
            matchCountCoverage: HostAudienceMatchCountCoverage.exact,
            sourceCoverage: HostAudienceSourceCoverage.exact,
            projectionVersion: 1,
          ),
        ),
      ),
    for (final organizerId in organizerIds)
      hostMessagingSetupProvider(organizerId).overrideWithValue(
        AsyncData(
          messagingSetupByOrganizer[organizerId] ??
              HostMessagingSetup(
                organizerId: organizerId,
                providerConfigured: false,
                embeddedSignup: const HostWhatsappEmbeddedSignupConfig(
                  appId: null,
                  configId: null,
                  graphVersion: null,
                ),
                connection: null,
                templates: const [],
              ),
        ),
      ),
  ];
}

class _FixedHostEventRepository extends Fake implements EventRepository {
  _FixedHostEventRepository(this.eventsByOrganizer);

  final Map<String, List<Event>> eventsByOrganizer;

  @override
  Future<CursorPage<Event, DocumentSnapshot<Event>>> fetchActiveEventsPage({
    required String organizerId,
    required DateTime sessionBoundary,
    DocumentSnapshot<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) async {
    final events = eventsByOrganizer[organizerId] ?? const <Event>[];
    return CursorPage(
      items: events
          .where((event) => event.endTime.isAfter(sessionBoundary))
          .take(limit)
          .toList(growable: false),
      hasMore: false,
    );
  }

  @override
  Future<CursorPage<Event, DocumentSnapshot<Event>>> fetchPastEventsPage({
    required String organizerId,
    required DateTime sessionBoundary,
    DocumentSnapshot<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) async {
    final events = eventsByOrganizer[organizerId] ?? const <Event>[];
    return CursorPage(
      items: events
          .where((event) => !event.endTime.isAfter(sessionBoundary))
          .take(limit)
          .toList(growable: false),
      hasMore: false,
    );
  }
}

class _FixedHostTodayFeedController extends HostTodayFeedController {
  _FixedHostTodayFeedController(this.eventsByOrganizer);

  final Map<String, List<Event>> eventsByOrganizer;

  @override
  Future<HostTodayFeedData> build(HostTodayFeedRequest request) async {
    final events = eventsByOrganizer[request.organizerId] ?? const <Event>[];
    final activeEvents = events
        .where((event) => event.endTime.isAfter(request.sessionBoundary))
        .toList(growable: false);
    return HostTodayFeedData(
      activeEvents: activeEvents,
      pastEvents: events
          .where((event) => !event.endTime.isAfter(request.sessionBoundary))
          .toList(growable: false),
      attentionItems: _fixedAttentionItems(
        activeEvents,
        request.sessionBoundary,
      ),
      localAttendanceMerged: true,
    );
  }
}

List<HostAttentionItem> _fixedAttentionItems(
  Iterable<Event> events,
  DateTime now,
) => [
  for (final event in events)
    if (event.waitlistCount > 0 &&
        !event.effectiveEventPolicy.admissionPolicy.manualApprovalRequired)
      HostAttentionItem(
        id: 'attention-${event.id}',
        kind: HostAttentionKind.eventWaitlistReview,
        scope: HostAttentionScope.event,
        sourceOwner: HostAttentionSourceOwner.events,
        sourceId: event.id,
        sourceRevision: 'fixture-${event.waitlistCount}',
        eventId: event.id,
        status: HostAttentionStatus.open,
        consequence: HostAttentionConsequence.risksGuestExperience,
        blocking: false,
        urgency: event.startTime.difference(now) <= const Duration(hours: 24)
            ? HostAttentionUrgency.immediate
            : event.startTime.difference(now) <= const Duration(hours: 72)
            ? HostAttentionUrgency.soon
            : HostAttentionUrgency.upcoming,
        destination: HostAttentionDestination(
          route: HostAttentionDestinationRoute.hostEventManage,
          section: 'guests',
          eventId: event.id,
        ),
        context: HostAttentionContext(
          eventName: event.title,
          count: event.waitlistCount,
        ),
        dedupeKey: 'eventWaitlistReview:${event.id}',
        policyVersion: 1,
        resolutionVersion: 1,
        assignedHostUid: null,
        openedAt: now,
        dueAt: event.startTime.subtract(const Duration(hours: 24)),
        expiresAt: event.endTime,
      ),
];

class _FixedHostEventsTimelineController extends HostEventsTimelineController {
  _FixedHostEventsTimelineController(this.eventsByOrganizer);

  final Map<String, List<Event>> eventsByOrganizer;

  @override
  Future<HostEventsTimelineData> build(
    HostEventsTimelineRequest request,
  ) async {
    final events = eventsByOrganizer[request.organizerId] ?? const <Event>[];
    return HostEventsTimelineData(
      activeEvents: events
          .where((event) => event.endTime.isAfter(request.sessionBoundary))
          .toList(growable: false),
      pastEvents: events
          .where((event) => !event.endTime.isAfter(request.sessionBoundary))
          .toList(growable: false),
      activeCursor: null,
      pastCursor: null,
      hasMoreActive: false,
      hasMorePast: false,
    );
  }
}

HostCrmSummary _emptyCrmSummary(String organizerId) => HostCrmSummary(
  organizerId: organizerId,
  contactCount: 0,
  pastAttendeeCount: 0,
  repeatAttendeeCount: 0,
  linkedAccountCount: 0,
  importedContactCount: 0,
  whatsappOptInCount: 0,
  smsOptInCount: 0,
  truncated: false,
  inAppReadiness: HostCrmChannelReadiness.currentEventOnly,
  whatsappReadiness: HostCrmChannelReadiness.providerSetupRequired,
  smsReadiness: HostCrmChannelReadiness.providerAndDltSetupRequired,
);

Organizer _hostTeamOrganizerWithoutProfile() => buildOrganizer(
  id: 'owned-club',
  name: 'Saket Run Club',
  hostUserId: 'other-host',
  ownerUserId: 'other-host',
  hostProfiles: const [],
);

Future<void> _pumpHostOrganizerEditTab(
  WidgetTester tester, {
  required Organizer organizer,
  required HostOrganizerEditActions actions,
}) {
  return _pumpHostScreen(
    tester,
    Scaffold(
      body: SingleChildScrollView(
        child: HostOrganizerEditBody(
          organizer: organizer,
          currentUid: _hostUid,
          isOwner: true,
        ),
      ),
    ),
    overrides: [hostOrganizerEditControllerProvider.overrideWithValue(actions)],
  );
}

UploadedPhoto _uploadedOrganizerPhoto(String id, {required int position}) {
  final timestamp = DateTime(2026);
  return UploadedPhoto(
    id: id,
    url: 'https://example.test/$id.jpg',
    storagePath: 'clubs/test/$id.jpg',
    position: position,
    createdAt: timestamp,
    updatedAt: timestamp,
  );
}

Uint8List _testPngBytes() => base64Decode(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUl'
  'EQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==',
);

class _EmptyHostCustomersDirectoryController
    extends HostCustomersDirectoryController {
  _EmptyHostCustomersDirectoryController(this.requests);

  final List<HostCustomersDirectoryRequest> requests;

  @override
  Future<HostCustomersDirectoryState> build(
    HostCustomersDirectoryRequest request,
  ) async {
    requests.add(request);
    return const HostCustomersDirectoryState(
      contacts: [],
      nextCursor: null,
      matchCount: 0,
      matchCountCoverage: HostCustomerMatchCountCoverage.exact,
      sourceCoverage: HostCustomerDirectoryCoverage.exact,
      projectionVersion: 1,
    );
  }
}
