import 'dart:async';

import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_input.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_campaign_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_communication_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_manual_send_task.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_send_summary.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_posts_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_campaign_editor.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_scope_menu.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_screen.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_manual_send_list.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_person_conversation_page_body.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/routing/shell/app_shell_active_tab.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart' as event_test;
import '../organizers/organizers_test_helpers.dart' as organizer_test;
import '../test_pump_helpers.dart';
import 'inbox/host_inbox_test_fixtures.dart' as inbox_fixture;

part 'host_inbox_sends_tests.dart';

// ignore_for_file: riverpod_lint/scoped_providers_should_specify_dependencies

void main() {
  final now = DateTime(2026, 7, 10, 18);

  setUp(() => AppConfig.configureEntrypointRole(AppRole.host));
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  for (final selection in <String?>[null, 'uid:guest', 'catch-a', 'wa-a']) {
    testWidgets(
      'program screen contains shared history for selection $selection',
      (tester) async {
        final repository = _PendingProgramRepository()
          ..detail.complete(_programDetail())
          ..guestPage.complete(_linkedGuestPage());
        await tester.pumpWidget(
          _app(
            event: null,
            previews: [
              inbox_fixture.preview('catch-a', 'guest', org: 'club-1'),
            ],
            whatsappThreads: [
              inbox_fixture.wa('wa-a', 'contact', uid: 'guest'),
            ],
            participations: const [],
            now: now,
            initialScope: const HostInboxScope.program('older-program'),
            initialThreadId: selection,
            programRepository: repository,
          ),
        );
        await pumpFeatureUi(tester);
        expect(find.text('Program conversations unavailable'), findsWidgets);
        expect(find.text('Catch catch-a'), findsNothing);
        expect(find.text('WhatsApp wa-a'), findsNothing);
        expect(find.text('Same name'), findsNothing);
        expect(find.byType(HostPersonConversationPageBody), findsNothing);
        expect(find.byType(ChatInput), findsNothing);
        expect(find.byTooltip('New message'), findsNothing);
        expect(find.text('GENERAL'), findsNothing);
      },
    );
  }

  testWidgets('account switch with late program completion stays contained', (
    tester,
  ) async {
    final repository = _PendingProgramRepository();
    final accounts = StreamController<String?>();
    addTearDown(accounts.close);
    await tester.pumpWidget(
      _app(
        event: null,
        previews: [inbox_fixture.preview('catch-a', 'guest', org: 'club-1')],
        whatsappThreads: [inbox_fixture.wa('wa-a', 'contact', uid: 'guest')],
        participations: const [],
        now: now,
        initialScope: const HostInboxScope.program('older-program'),
        initialThreadId: 'catch-a',
        accountStream: accounts.stream,
        programRepository: repository,
      ),
    );
    accounts.add('host-1');
    await tester.pump();
    accounts.add('host-2');
    await tester.pump();
    repository.detail.complete(_programDetail());
    repository.guestPage.complete(_linkedGuestPage());
    await pumpFeatureUi(tester);
    expect(find.text('Program conversations unavailable'), findsWidgets);
    expect(find.text('Catch catch-a'), findsNothing);
    expect(find.text('WhatsApp wa-a'), findsNothing);
    expect(find.byType(HostPersonConversationPageBody), findsNothing);
    expect(find.byType(ChatInput), findsNothing);
    expect(find.text('GENERAL'), findsNothing);
  });

  testWidgets(
    'older program remains scoped with unlinked guests and no composer',
    (tester) async {
      final repository = _PendingProgramRepository()
        ..detail.complete(_programDetail())
        ..guestPage.complete(
          const ProgramGuestListPage(
            programId: 'older-program',
            guests: [
              ProgramGuestRow(
                guestId: 'guest-1',
                displayName: 'Guest 1',
                groupIds: [],
                invitationStatus: 'draft',
                rsvpStatus: 'unknown',
                revision: 1,
              ),
            ],
            households: [],
            functionGuests: [],
            groups: [],
          ),
        );
      await tester.pumpWidget(
        _app(
          event: null,
          previews: const [],
          participations: const [],
          now: now,
          initialScope: const HostInboxScope.program('older-program'),
          programRepository: repository,
        ),
      );
      await pumpFeatureUi(tester);
      expect(find.text('OLDER PROGRAM'), findsOneWidget);
      expect(
        find.textContaining('We can’t verify which messages belong'),
        findsOneWidget,
      );
      expect(find.byTooltip('New message'), findsNothing);
      expect(find.text('General inquiry'), findsNothing);
    },
  );

  testWidgets(
    'requested program waits for direct lookup and keeps error scoped',
    (tester) async {
      final repository = _PendingProgramRepository();
      await tester.pumpWidget(
        _app(
          event: null,
          previews: const [],
          participations: const [],
          now: now,
          initialScope: const HostInboxScope.program('older-program'),
          programRepository: repository,
        ),
      );
      await tester.pump();
      expect(find.text('GENERAL'), findsNothing);
      expect(find.byTooltip('New message'), findsNothing);
      repository.detail.completeError(StateError('Program unavailable'));
      await pumpFeatureUi(tester);
      expect(find.text('GENERAL'), findsNothing);
      expect(find.byTooltip('New message'), findsNothing);
      expect(find.byType(CatchLocalizedSliverErrorState), findsOneWidget);
    },
  );

  testWidgets('resolved signed-out state is not shown as loading', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream<String?>.value(null)),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: HostInboxScreen(now: now, syncSelectionToRoute: false),
        ),
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.text('Sign in required'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Create your first organizer'), findsNothing);
  });

  testWidgets('renders selected-event segments without an outbound card', (
    tester,
  ) async {
    final event = event_test.buildEvent(
      startTime: now.add(const Duration(hours: 1)),
      endTime: now.add(const Duration(hours: 2)),
    );
    final booked = _preview(
      uid: 'booked-1',
      name: 'Asha Guest',
      eventIds: [event.id],
    );
    final prospective = _preview(
      uid: 'waitlist-1',
      name: 'Mira Guest',
      eventIds: [event.id],
    );

    await tester.pumpWidget(
      _app(
        event: event,
        previews: [booked, prospective],
        participations: [
          event_test.buildEventParticipation(event: event, uid: 'booked-1'),
          event_test.buildEventParticipation(
            event: event,
            uid: 'waitlist-1',
            status: EventParticipationStatus.waitlisted,
            hostApprovalStatus: EventJoinRequestStatus.pending,
          ),
        ],
        now: now,
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.text('Messaging'), findsOneWidget);
    expect(find.text('One-to-one conversations and replies.'), findsNothing);
    expect(find.text('Inbox'), findsOneWidget);
    expect(find.text('Sends'), findsOneWidget);
    expect(find.byType(HostInboxScopeMenu), findsOneWidget);
    expect(find.text('Booked · 1'), findsOneWidget);
    expect(find.text('Prospective · 1'), findsOneWidget);
    expect(
      find.byType(CatchChoiceInput<HostInboxAudienceSegment>),
      findsOneWidget,
    );
    expect(find.text('Message 1 booked attendee'), findsNothing);
    expect(find.text('Asha Guest'), findsOneWidget);
    expect(find.text('Can you help?'), findsOneWidget);
    expect(find.text('Mira Guest'), findsNothing);

    await tester.tap(find.text('Prospective · 1'));
    await pumpFeatureUi(tester);

    expect(find.text('Message 1 prospective attendee'), findsNothing);
    expect(find.text('Mira Guest'), findsOneWidget);
    expect(find.text('Can you help?'), findsOneWidget);
    expect(find.text('Asha Guest'), findsNothing);
  });

  testWidgets(
    'Messaging pane header and rail remain fixed while its list scrolls',
    (tester) async {
      final previews = List<ChatThreadPreview>.generate(
        24,
        (index) => _preview(
          uid: 'general-$index',
          name: 'General Guest $index',
          eventIds: const [],
        ),
      );
      await tester.pumpWidget(
        _app(
          event: null,
          previews: previews,
          participations: const [],
          now: now,
        ),
      );
      await pumpFeatureUi(tester);

      expect(find.byType(NestedScrollView), findsNothing);
      expect(find.byType(CatchWorkspacePaneScaffold), findsOneWidget);
      final topBar = tester.widget<CatchTopBar>(find.byType(CatchTopBar));
      expect(topBar.navigation.mode, CatchTopBarNavigationMode.none);
      final rail = find.byType(HostMessagingWorkspaceTabBar);
      final railBefore = tester.getRect(rail);

      await tester.drag(find.byType(CustomScrollView), const Offset(0, -600));
      await pumpFeatureUi(tester);
      final railAfterCollapse = tester.getRect(rail);
      expect(railAfterCollapse.top, closeTo(railBefore.top, 0.001));

      await tester.drag(find.byType(CustomScrollView), const Offset(0, -240));
      await pumpFeatureUi(tester);
      expect(tester.getRect(rail).top, closeTo(railAfterCollapse.top, 0.001));
    },
  );

  testWidgets('expanded inbox reserves a stable conversation detail pane', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(1200, 900);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    final preview = _preview(
      uid: 'expanded-guest',
      name: 'Expanded Guest',
      eventIds: const [],
    );

    await tester.pumpWidget(
      _app(
        event: null,
        previews: [preview],
        participations: const [],
        now: now,
        routeWidth: 1200,
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.byType(CatchScaffold), findsOneWidget);
    expect(find.byType(CatchNavigationViewport), findsOneWidget);
    expect(find.text('Select a conversation'), findsOneWidget);
    expect(find.text('Expanded Guest'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('split view uses route-body width after shell chrome', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(1200, 900);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    final preview = _preview(
      uid: 'constrained-guest',
      name: 'Constrained Guest',
      eventIds: const [],
    );

    await tester.pumpWidget(
      _app(
        event: null,
        previews: [preview],
        participations: const [],
        now: now,
        routeWidth: 700,
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.byType(CatchNavigationViewport), findsOneWidget);
    expect(find.text('Select a conversation'), findsNothing);
    expect(find.text('Constrained Guest'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('keeps WhatsApp threads inside the existing Inbox scopes', (
    tester,
  ) async {
    final event = event_test.buildEvent(
      startTime: now.add(const Duration(hours: 1)),
      endTime: now.add(const Duration(hours: 2)),
    );
    final eventThread = _whatsappThread(
      threadId: 'event-thread',
      displayName: 'Event Guest',
      eventIds: [event.id],
      body: 'Where is the entrance?',
      now: now,
    );
    final generalThread = _whatsappThread(
      threadId: 'general-thread',
      displayName: 'General Guest',
      eventIds: const [],
      body: 'When is your next event?',
      now: now,
    );

    await tester.pumpWidget(
      _app(
        event: event,
        previews: const [],
        participations: const [],
        whatsappThreads: [eventThread, generalThread],
        now: now,
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.text('Event Guest'), findsOneWidget);
    expect(find.text('Where is the entrance?'), findsOneWidget);
    expect(find.byType(CatchField), findsOneWidget);
    expect(find.text('Booking status unavailable'), findsOneWidget);
    expect(find.text('General Guest'), findsNothing);

    await tester.tap(find.bySemanticsLabel(RegExp('Inbox scope')));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('General inquiries'));
    await pumpFeatureUi(tester);

    expect(find.text('General Guest'), findsOneWidget);
    expect(find.text('When is your next event?'), findsOneWidget);
    expect(find.text('Event Guest'), findsNothing);
  });

  testWidgets('keeps Catch Inbox usable when WhatsApp enrichment fails', (
    tester,
  ) async {
    final preview = _preview(
      uid: 'general-1',
      name: 'Asha Guest',
      eventIds: const [],
    );

    await tester.pumpWidget(
      _app(
        event: null,
        previews: [preview],
        participations: const [],
        whatsappThreadsValue: AsyncError(
          StateError('listOrganizerWhatsappThreads is not deployed'),
          StackTrace.empty,
        ),
        now: now,
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.text('Asha Guest'), findsOneWidget);
    expect(find.text('Can you help?'), findsOneWidget);
    expect(find.text('Chat not found'), findsNothing);
  });

  testWidgets('compact scope label opens the shared event menu', (
    tester,
  ) async {
    final event = event_test.buildEvent(
      startTime: now.add(const Duration(hours: 1)),
      endTime: now.add(const Duration(hours: 2)),
    );

    await tester.pumpWidget(
      _app(
        event: event,
        previews: const [],
        participations: const [],
        now: now,
      ),
    );
    await pumpFeatureUi(tester);

    await tester.tap(find.bySemanticsLabel(RegExp('Inbox scope')));
    await pumpFeatureUi(tester);

    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is CatchMenu<HostInboxScope> && widget.builder == null,
      ),
      findsOneWidget,
    );
    expect(find.text('General inquiries'), findsOneWidget);

    await tester.tap(find.text('General inquiries'));
    await pumpFeatureUi(tester);

    expect(find.text('GENERAL INQUIRIES'), findsOneWidget);
    expect(find.byType(HostInboxAudienceInput), findsNothing);
  });

  testWidgets(
    'scope menu stays above floating shell navigation and scrolls internally',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(400, 800);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      const bottomOverlayInset = 100.0;
      final events = [
        for (var index = 0; index < 20; index++)
          event_test.buildEvent(
            id: 'event-$index',
            name: 'Scope event $index',
            startTime: now.add(Duration(days: index + 1)),
            endTime: now.add(Duration(days: index + 1, hours: 1)),
          ),
      ];

      await tester.pumpWidget(
        _app(
          event: events.first,
          events: events,
          previews: const [],
          participations: const [],
          now: now,
          routeWidth: 400,
          floatingBottomOverlayInset: bottomOverlayInset,
        ),
      );
      await pumpFeatureUi(tester);

      await tester.tap(find.bySemanticsLabel(RegExp('Inbox scope')));
      await pumpFeatureUi(tester);

      final menu = find.byWidgetPredicate(
        (widget) =>
            widget is CatchMenu<HostInboxScope> && widget.builder == null,
      );
      expect(menu, findsOneWidget);
      final usableBottom =
          tester.view.physicalSize.height / tester.view.devicePixelRatio -
          bottomOverlayInset;
      expect(tester.getRect(menu).bottom, lessThanOrEqualTo(usableBottom));
      final scrollable = find.descendant(
        of: menu,
        matching: find.byType(Scrollable),
      );
      expect(scrollable, findsOneWidget);
      expect(
        tester.state<ScrollableState>(scrollable).position.maxScrollExtent,
        greaterThan(0),
      );
    },
  );

  testWidgets('General scope excludes event-specific inquiries', (
    tester,
  ) async {
    final event = event_test.buildEvent(
      startTime: now.add(const Duration(hours: 1)),
      endTime: now.add(const Duration(hours: 2)),
    );
    final general = _preview(
      uid: 'general-1',
      name: 'General Guest',
      eventIds: const [],
    );
    final scoped = _preview(
      uid: 'event-1',
      name: 'Event Guest',
      eventIds: [event.id],
    );

    await tester.pumpWidget(
      _app(
        event: event,
        previews: [general, scoped],
        participations: const [],
        initialScope: const HostInboxScope.general(),
        now: now,
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.text('GENERAL INQUIRIES'), findsOneWidget);
    expect(find.text('General Guest'), findsOneWidget);
    expect(find.text('Can you help?'), findsOneWidget);
    expect(find.text('Event Guest'), findsNothing);
    expect(find.textContaining('Message '), findsNothing);
    expect(find.textContaining('Booked ·'), findsNothing);
  });

  testWidgets(
    'singleton general scope centers the canonical empty state without a header',
    (tester) async {
      await tester.pumpWidget(
        _app(
          event: null,
          previews: const [],
          participations: const [],
          now: now,
        ),
      );
      await pumpFeatureUi(tester);

      expect(find.byType(HostInboxScopeMenu), findsNothing);
      expect(find.text('GENERAL INQUIRIES'), findsNothing);
      expect(find.text('No general inquiries'), findsOneWidget);

      final emptyState = find.byType(CatchEmptyState);
      final content = find.byType(CatchEmptyState);
      expect(find.byType(CatchStateViewport), findsOneWidget);
      expect(
        find.ancestor(of: emptyState, matching: find.byType(Center)),
        findsNothing,
      );
      final fills = tester.widgetList<SliverFillRemaining>(
        find.ancestor(
          of: emptyState,
          matching: find.byType(SliverFillRemaining),
        ),
      );
      expect(fills.any((fill) => fill.hasScrollBody), isTrue);
      expect(
        tester.getCenter(content).dx,
        closeTo(tester.getCenter(emptyState).dx, 0.5),
      );
      expect(
        tester.getCenter(content).dy,
        closeTo(tester.getCenter(emptyState).dy, 0.5),
      );
    },
  );

  _registerHostInboxSendsTests(now);
}

Widget _app({
  required Event? event,
  List<Event>? events,
  required List<ChatThreadPreview> previews,
  required List<EventParticipation> participations,
  required DateTime now,
  HostInboxScope? initialScope,
  HostMessagingWorkspace initialWorkspace = HostMessagingWorkspace.inbox,
  String? initialSavedAudienceId,
  List<HostSendSummary> sends = const [],
  List<HostWhatsappThreadSummary> whatsappThreads = const [],
  List<HostManualSendTask> manualSendTasks = const [],
  AsyncValue<HostWhatsappThreadPage>? whatsappThreadsValue,
  ProgramSetupRepository? programRepository,
  String? initialThreadId,
  Stream<String?>? accountStream,
  int remainingFollowerQuota = 3,
  double routeWidth = 390,
  double floatingBottomOverlayInset = 0,
  bool whatsappProviderConfigured = true,
}) {
  final organizer = organizer_test.buildOrganizer(id: event?.clubId ?? 'club-1');
  final inbox = ChatsListViewModel(
    newMatches: const [],
    conversations: previews,
    totalThreadCount: previews.length,
  );
  final screen = HostInboxScreen(
    initialScope: initialScope,
    initialThreadId: initialThreadId,
    initialWorkspace: initialWorkspace,
    initialSavedAudienceId: initialSavedAudienceId,
    syncSelectionToRoute: false,
    now: now,
  );
  final route = Align(
    alignment: Alignment.topLeft,
    child: SizedBox(width: routeWidth, height: 900, child: screen),
  );
  return ProviderScope(
    overrides: [
      uidProvider.overrideWith(
        (ref) => accountStream ?? Stream.value('host-1'),
      ),
      eventRepositoryProvider.overrideWithValue(
        event_test.FakeEventRepository(),
      ),
      hostOperableOrganizersProvider('host-1').overrideWithValue(AsyncData([organizer])),
      hostOperableOrganizersProvider('host-2').overrideWithValue(AsyncData([organizer])),
      organizerProgramListProvider(
        organizer.id,
      ).overrideWithValue(const AsyncData([])),
      if (programRepository != null)
        programSetupRepositoryProvider.overrideWithValue(programRepository),
      watchEventsForOrganizerProvider(
        organizer.id,
      ).overrideWith((ref) => Stream.value(events ?? [?event])),
      chatsListViewModelProvider.overrideWithValue(AsyncData(inbox)),
      hostMessagingSetupProvider(organizer.id).overrideWithValue(
        AsyncData(
          _messagingSetup(
            organizer.id,
            providerConfigured: whatsappProviderConfigured,
          ),
        ),
      ),
      hostCrmSummaryProvider(
        organizer.id,
      ).overrideWithValue(AsyncData(_crmSummary(organizer.id))),
      hostSendsProvider(organizer.id).overrideWithValue(
        AsyncData(
          HostSendsPage(organizerId: organizer.id, sends: sends, nextCursor: null),
        ),
      ),
      hostManualSendTasksProvider(organizer.id).overrideWithValue(
        AsyncData(
          HostManualSendTaskPage(
            organizerId: organizer.id,
            tasks: manualSendTasks,
            nextCursor: null,
          ),
        ),
      ),
      watchOrganizerPostRemainingWeeklyQuotaProvider(
        organizer.id,
      ).overrideWith((ref) => Stream.value(remainingFollowerQuota)),
      hostWhatsappThreadsProvider(organizer.id).overrideWithValue(
        whatsappThreadsValue ??
            AsyncData(
              HostWhatsappThreadPage(
                organizerId: organizer.id,
                threads: whatsappThreads,
                nextCursor: null,
              ),
            ),
      ),
      hostCustomerSegmentCountProvider.overrideWith(
        (ref, request) async => const HostCustomerSegmentCount(
          count: 12,
          coverage: HostCustomerMatchCountCoverage.exact,
        ),
      ),
      hostSavedAudiencesProvider(organizer.id).overrideWithValue(
        AsyncData(
          HostSavedAudiencePage(
            audiences: [_savedAudience(organizer.id)],
            nextCursor: null,
          ),
        ),
      ),
      if (event != null)
        watchEventParticipationsForEventProvider(
          event.id,
        ).overrideWith((ref) => Stream.value(participations)),
    ],
    child: MaterialApp(
      theme: AppTheme.light,
      home: floatingBottomOverlayInset > 0
          ? CatchTabViewportScope(
              index: appShellChatsTabIndex,
              bottomBarPlacement: CatchTabViewportScopePlacement.floating,
              bottomOverlayInset: floatingBottomOverlayInset,
              child: route,
            )
          : route,
    ),
  );
}

ProgramGuestListPage _linkedGuestPage() => const ProgramGuestListPage(
  programId: 'older-program',
  guests: [
    ProgramGuestRow(
      guestId: 'guest',
      displayName: 'Same name',
      contactId: 'contact',
      groupIds: [],
      invitationStatus: 'sent',
      rsvpStatus: 'unknown',
      revision: 1,
    ),
  ],
  households: [],
  functionGuests: [],
  groups: [],
  nextCursor: 'more-guests',
);

class _PendingProgramRepository extends Fake implements ProgramSetupRepository {
  final detail = Completer<OrganizerProgramDetail>();
  final guestPage = Completer<ProgramGuestListPage>();

  @override
  Future<OrganizerProgramDetail> getProgram(String programId) => detail.future;

  @override
  Future<ProgramGuestListPage> listGuests(
    String programId, {
    int? limit,
    String? cursor,
  }) => guestPage.future;
}

OrganizerProgramDetail _programDetail() => OrganizerProgramDetail(
  program: OrganizerProgramSettings(
    programId: 'older-program',
    organizerId: 'club-1',
    kind: ProgramKind.wedding,
    title: 'Older program',
    timezone: 'Asia/Kolkata',
    status: ProgramStatus.active,
    startsAt: DateTime(2026),
    endsAt: DateTime(2026, 2),
    capabilities: const [],
    revision: 1,
  ),
  functions: const [],
  pickupPoints: const [],
  hotels: const [],
  counts: const {},
);

HostSavedAudience _savedAudience(String organizerId) => HostSavedAudience(
  organizerId: organizerId,
  audienceId: 'audience-1',
  name: 'Lapsed customers',
  status: 'active',
  definition: const HostSavedAudienceDefinition(
    join: HostSavedAudienceJoin.all,
    predicates: [
      HostSavedAudienceComputedSegment(HostAudienceSegment.lapsedRegular),
    ],
  ),
  definitionHash:
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  definitionVersion: 1,
  revision: 1,
  lastPreviewMatchCount: 12,
  lastPreviewAt: DateTime(2026, 8, 30),
  createdAt: DateTime(2026, 8, 30),
  updatedAt: DateTime(2026, 8, 30),
);

HostManualSendTask _manualSendTask(HostManualSendTaskStatus status) =>
    HostManualSendTask(
      organizerId: 'club-1',
      taskId: 'task-1',
      contactId: 'contact-1',
      displayName: 'Asha Manual',
      status: status,
      active: true,
      revision: status == HostManualSendTaskStatus.handoffOpened ? 2 : 1,
      phoneE164: '+919876543210',
      prefillText: 'Would you like to join us?',
      openCount: status == HostManualSendTaskStatus.handoffOpened ? 1 : 0,
      createdAt: DateTime(2026, 8, 30),
      updatedAt: DateTime(2026, 8, 30),
      openedAt: status == HostManualSendTaskStatus.handoffOpened
          ? DateTime(2026, 8, 30)
          : null,
      expiresAt: DateTime(2026, 9, 29),
    );

HostWhatsappThreadSummary _whatsappThread({
  required String threadId,
  required String displayName,
  required List<String> eventIds,
  required String body,
  required DateTime now,
}) => HostWhatsappThreadSummary(
  threadId: threadId,
  contactId: 'contact-$threadId',
  displayName: displayName,
  eventIds: eventIds,
  lastMessageBody: body,
  lastMessageDirection: HostWhatsappMessageDirection.inbound,
  lastMessageAt: now,
  lastInboundAt: now,
  serviceWindowExpiresAt: now.add(const Duration(hours: 24)),
  serviceWindowOpen: true,
);

HostMessagingSetup _messagingSetup(
  String organizerId, {
  bool providerConfigured = true,
}) => HostMessagingSetup(
  organizerId: organizerId,
  providerConfigured: providerConfigured,
  embeddedSignup: const HostWhatsappEmbeddedSignupConfig(
    appId: 'test-app',
    configId: 'test-config',
    graphVersion: 'v24.0',
  ),
  connection: const HostWhatsappConnection(
    connectionId: 'test-whatsapp',
    status: 'active',
    displayPhoneNumber: '+91 98765 43210',
    verifiedName: 'Test organizer',
    qualityRating: 'GREEN',
    messagingLimitTier: 'TIER_1K',
    templateSyncStatus: 'ready',
    webhookStatus: 'healthy',
    testStatus: 'verified',
    revision: 1,
  ),
  templates: const [
    HostWhatsappTemplate(
      templateId: 'test-invitation',
      name: 'event_invitation',
      language: 'en_US',
      category: 'MARKETING',
      status: 'APPROVED',
      variableNames: ['first_name', 'invite_url'],
      hasMediaHeader: false,
      buttonKinds: ['URL'],
    ),
  ],
);

HostCrmSummary _crmSummary(String organizerId) => HostCrmSummary(
  organizerId: organizerId,
  contactCount: 12,
  pastAttendeeCount: 10,
  repeatAttendeeCount: 5,
  linkedAccountCount: 8,
  importedContactCount: 4,
  whatsappOptInCount: 7,
  smsOptInCount: 0,
  truncated: false,
  inAppReadiness: HostCrmChannelReadiness.currentEventOnly,
  whatsappReadiness: HostCrmChannelReadiness.currentEventOnly,
  smsReadiness: HostCrmChannelReadiness.providerAndDltSetupRequired,
);

ChatThreadPreview _preview({
  required String uid,
  required String name,
  required List<String> eventIds,
}) {
  final match = Match(
    id: 'match-$uid',
    user1Id: uid,
    user2Id: 'host-1',
    eventIds: eventIds,
    createdAt: DateTime(2026, 7, 10),
    lastMessageAt: DateTime(2026, 7, 10, 17),
    lastMessagePreview: 'Can you help?',
    lastMessageSenderId: uid,
    conversationType: MatchConversationType.clubHostInquiry,
    clubId: 'club-1',
  );
  return ChatThreadPreview(
    match: match,
    matchId: match.id,
    otherUid: uid,
    displayName: name,
    photoUrl: null,
    previewText: match.lastMessagePreview!,
    timestamp: match.lastMessageAt!,
    unreadCount: 0,
    hasConversation: true,
    eventIds: eventIds,
  );
}
