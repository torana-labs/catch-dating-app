import 'package:catch_dating_app/hosts/presentation/inbox/host_sends_page_body.dart';
import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/clubs/data/club_posts_repository.dart';
import 'package:catch_dating_app/clubs/data/clubs_repository.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/design_fixtures/host_inbox_surface_fixtures.dart';
import 'package:catch_dating_app/events/data/event_callable_responses.dart';
import 'package:catch_dating_app/events/data/event_participation_repository.dart';
import 'package:catch_dating_app/events/data/event_repository.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_participation.dart';
import 'package:catch_dating_app/hosts/data/crm/host_campaign_repository.dart';
import 'package:catch_dating_app/hosts/data/crm/host_communication_repository.dart';
import 'package:catch_dating_app/hosts/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_manual_send_task.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_send_summary.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_broadcast_composer_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_scope_menu.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_screen.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_people.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

const _deviceWidth = 390.0;
const _deviceHeight = 812.0;
const _composerHeight = 760.0;
const _scopeControlHeight = 180.0;
const _audienceControlHeight = 120.0;
const _workspaceHeight = 560.0;
const _emptyStateHeight = 320.0;

@widgetbook.UseCase(
  name: 'People and sends navigation',
  type: HostMessagingWorkspaceTabBar,
  path: '[P1 product surfaces]/Host/Inbox/Components',
)
Widget hostMessagingTabs(BuildContext context) =>
    const _HostRoleBoundary(child: _HostInboxFrame());

@widgetbook.UseCase(
  name: 'Resolved scope and people',
  type: HostInboxWorkspaceSection,
  path: '[P1 product surfaces]/Host/Inbox/Components',
)
Widget hostInboxWorkspaceSection(BuildContext context) =>
    const _HostRoleBoundary(child: _HostInboxFrame());

@widgetbook.UseCase(
  name: 'Event-scoped states',
  type: HostInboxScreen,
  path: '[P1 product surfaces]/Host/Inbox',
)
Widget hostInboxEventScopedStates(BuildContext context) {
  return const _HostRoleBoundary(
    child: _HostInboxCatalog(
      title: 'HostInboxScreen',
      contractId: 'screen.host.inbox',
      children: [
        _StateCard(
          label: 'Booked · 24 with personal inquiries',
          child: _HostInboxFrame(),
        ),
        _StateCard(
          label: 'Prospective · 9 with Requested and Waitlist rows',
          child: _HostInboxFrame(
            initialSegment: HostInboxAudienceSegment.prospective,
          ),
        ),
        _StateCard(
          label: 'General inquiries stay explicit',
          child: _HostInboxFrame(initialScope: HostInboxScope.general()),
        ),
        _StateCard(
          label: 'Sends owns outbound intent and delivery history',
          child: _HostInboxFrame(
            initialWorkspace: HostMessagingWorkspace.campaigns,
          ),
        ),
        _StateCard(
          label: 'event scope remains explicit without conversations',
          child: _HostInboxFrame(
            viewModel: AsyncData(HostInboxSurfaceFixtures.noThreads),
          ),
        ),
        _StateCard(
          label: 'loading',
          child: _HostInboxFrame(viewModel: AsyncLoading<ChatsListViewModel>()),
        ),
        _StateCard(label: 'error', child: _HostInboxFrame.error()),
        _StateCard(
          label: 'search empty after event and audience classification',
          child: _HostInboxFrame(query: 'No attendee by this name'),
        ),
        _StateCard(
          label: 'production preflight disabled',
          child: _HostInboxFrame(broadcastEnabled: false),
        ),
        _StateCard(
          label: 'text scale 2.0',
          child: _HostInboxFrame(textScale: 2),
        ),
        _StateCard(
          label: 'dark theme',
          child: _HostInboxFrame(themeMode: ThemeMode.dark),
        ),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Lifecycle states',
  type: HostBroadcastComposerSheet,
  path: '[P1 product surfaces]/Host/Inbox',
)
Widget hostBroadcastComposerLifecycleStates(BuildContext context) {
  return const _HostRoleBoundary(
    child: _HostInboxCatalog(
      title: 'HostBroadcastComposerSheet',
      contractId: 'sheet.host.broadcast_composer',
      children: [
        _StateCard(
          label: 'ready with template selected',
          child: _BroadcastComposerFrame(
            initialTemplate: HostBroadcastTemplate.reminder,
          ),
        ),
        _StateCard(
          label: 'prospective audience',
          child: _BroadcastComposerFrame(
            initialSegment: HostInboxAudienceSegment.prospective,
            initialTemplate: HostBroadcastTemplate.meetingPoint,
          ),
        ),
        _StateCard(
          label: 'zero audience',
          child: _BroadcastComposerFrame(bookedCount: 0, prospectiveCount: 0),
        ),
        _StateCard(
          label: 'production preflight disabled',
          child: _BroadcastComposerFrame(sendingEnabled: false),
        ),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Scope control states',
  type: HostInboxScopeMenu,
  path: '[P1 product surfaces]/Host/Inbox/Components',
)
Widget hostInboxScopeSelectorStates(BuildContext context) {
  final workspace = _workspace();
  return _HostRoleBoundary(
    child: _HostInboxCatalog(
      title: 'HostInboxScopeMenu',
      contractId: 'component.host.inbox_scope_selector',
      children: [
        _StateCard(
          label: 'selected event with explicit General option',
          child: _DeviceFrame(
            height: _scopeControlHeight,
            child: Scaffold(
              body: CustomScrollView(
                slivers: [
                  HostInboxScopeMenu(
                    workspace: workspace,
                    now: HostInboxSurfaceFixtures.now,
                    onChanged: (_) {},
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Audience control states',
  type: HostInboxAudienceInput,
  path: '[P1 product surfaces]/Host/Inbox/Components',
)
Widget hostInboxAudienceRailStates(BuildContext context) {
  final workspace = _workspace();
  return _HostRoleBoundary(
    child: _HostInboxCatalog(
      title: 'HostInboxAudienceInput',
      contractId: 'component.host.inbox_audience_rail',
      children: [
        _StateCard(
          label: 'Booked and Prospective personal thread counts',
          child: _DeviceFrame(
            height: _audienceControlHeight,
            child: Scaffold(
              body: CustomScrollView(
                slivers: [
                  HostInboxAudienceInput(
                    workspace: workspace,
                    onChanged: (_) {},
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Workspace states',
  type: HostInboxPeopleSection,
  path: '[P1 product surfaces]/Host/Inbox/Components',
)
Widget hostInboxWorkspaceStates(BuildContext context) {
  final workspace = _workspace();
  return _HostRoleBoundary(
    child: _HostInboxCatalog(
      title: 'HostInboxPeopleSection',
      contractId: 'component.host.inbox_workspace',
      children: [
        _StateCard(
          label: 'Roster-backed broadcast and personal threads',
          child: _DeviceFrame(
            height: _workspaceHeight,
            child: Scaffold(
              body: CustomScrollView(
                slivers: [
                  HostInboxPeopleSection(
                    workspace: workspace,
                    now: HostInboxSurfaceFixtures.now,
                    onPersonSelected: (_) {},
                    people: composeHostInboxPeople(
                      organizerId: HostInboxSurfaceFixtures.club.id,
                      scope: workspace.selectedScope,
                      segment: workspace.selectedSegment,
                      catchThreads: workspace.threads
                          .map((row) => row.preview)
                          .toList(),
                      whatsappThreads: const [],
                      participations: null,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Empty states',
  type: HostInboxEmptyState,
  path: '[P1 product surfaces]/Host/Inbox/Components',
)
Widget hostInboxEmptyStates(BuildContext context) {
  return const _HostRoleBoundary(
    child: _HostInboxCatalog(
      title: 'HostInboxEmptyState',
      contractId: 'component.host.inbox_empty_state',
      children: [
        _StateCard(
          label: 'Booked personal threads empty',
          child: _DeviceFrame(
            height: _emptyStateHeight,
            child: Scaffold(
              body: HostInboxEmptyState(
                title: 'No booked attendees have written yet',
                message:
                    'Personal questions appear here. Event announcements are composed from Sends.',
              ),
            ),
          ),
        ),
        _StateCard(
          label: 'General inquiries empty',
          child: _DeviceFrame(
            height: _emptyStateHeight,
            child: Scaffold(
              body: HostInboxEmptyState(
                title: 'No general inquiries',
                message:
                    'Questions that are not tied to one event will appear here.',
              ),
            ),
          ),
        ),
      ],
    ),
  );
}

HostInboxViewModel _workspace({
  HostInboxAudienceSegment segment = HostInboxAudienceSegment.booked,
}) => HostInboxViewModel.compose(
  events: [HostInboxSurfaceFixtures.event],
  inbox: HostInboxSurfaceFixtures.allThreads,
  participations: HostInboxSurfaceFixtures.participations,
  selectedOrganizerId: HostInboxSurfaceFixtures.club.id,
  selectedScope: const HostInboxScope.event(HostInboxSurfaceFixtures.eventId),
  selectedSegment: segment,
  query: '',
  now: HostInboxSurfaceFixtures.now,
);

class _HostInboxFrame extends StatelessWidget {
  const _HostInboxFrame({
    this.viewModel,
    this.initialScope = const HostInboxScope.event(
      HostInboxSurfaceFixtures.eventId,
    ),
    this.initialSegment = HostInboxAudienceSegment.booked,
    this.initialWorkspace = HostMessagingWorkspace.inbox,
    this.broadcastEnabled = true,
    this.query = '',
    this.themeMode = ThemeMode.light,
    this.textScale = 1,
  }) : error = null;

  const _HostInboxFrame.error()
    : viewModel = null,
      initialScope = const HostInboxScope.event(
        HostInboxSurfaceFixtures.eventId,
      ),
      initialSegment = HostInboxAudienceSegment.booked,
      initialWorkspace = HostMessagingWorkspace.inbox,
      broadcastEnabled = true,
      query = '',
      themeMode = ThemeMode.light,
      textScale = 1,
      error = 'Host inbox unavailable';

  final AsyncValue<ChatsListViewModel>? viewModel;
  final HostInboxScope initialScope;
  final HostInboxAudienceSegment initialSegment;
  final HostMessagingWorkspace initialWorkspace;
  final bool broadcastEnabled;
  final String query;
  final ThemeMode themeMode;
  final double textScale;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final inboxValue = error == null
        ? viewModel ?? AsyncData(HostInboxSurfaceFixtures.allThreads)
        : AsyncError<ChatsListViewModel>(StateError(error!), StackTrace.empty);
    return ProviderScope(
      overrides: [
        uidProvider.overrideWithValue(
          const AsyncData<String?>(HostInboxSurfaceFixtures.hostUid),
        ),
        hostOperableClubsProvider(
          HostInboxSurfaceFixtures.hostUid,
        ).overrideWithValue(AsyncData([HostInboxSurfaceFixtures.club])),
        watchEventsForClubProvider(
          HostInboxSurfaceFixtures.club.id,
        ).overrideWithValue(
          AsyncData<List<Event>>([HostInboxSurfaceFixtures.event]),
        ),
        chatsListViewModelProvider.overrideWithValue(inboxValue),
        chatSearchQueryProvider.overrideWithValue(query),
        watchEventParticipationsForEventProvider(
          HostInboxSurfaceFixtures.eventId,
        ).overrideWithValue(
          AsyncData<List<EventParticipation>>(
            HostInboxSurfaceFixtures.participations,
          ),
        ),
        hostMessagingSetupProvider(
          HostInboxSurfaceFixtures.club.id,
        ).overrideWithValue(
          AsyncData(_messagingSetup(HostInboxSurfaceFixtures.club.id)),
        ),
        hostSendsProvider(HostInboxSurfaceFixtures.club.id).overrideWithValue(
          AsyncData(
            HostSendsPage(
              organizerId: HostInboxSurfaceFixtures.club.id,
              sends: const [],
              nextCursor: null,
            ),
          ),
        ),
        hostManualSendTasksProvider(
          HostInboxSurfaceFixtures.club.id,
        ).overrideWithValue(
          AsyncData(
            HostManualSendTaskPage(
              organizerId: HostInboxSurfaceFixtures.club.id,
              tasks: const [],
              nextCursor: null,
            ),
          ),
        ),
        hostWhatsappThreadsProvider(
          HostInboxSurfaceFixtures.club.id,
        ).overrideWithValue(
          AsyncData(
            HostWhatsappThreadPage(
              organizerId: HostInboxSurfaceFixtures.club.id,
              threads: const [],
              nextCursor: null,
            ),
          ),
        ),
        watchClubPostRemainingWeeklyQuotaProvider(
          HostInboxSurfaceFixtures.club.id,
        ).overrideWith((ref) => Stream.value(3)),
      ],
      child: _DeviceFrame(
        themeMode: themeMode,
        textScale: textScale,
        child: HostInboxScreen(
          initialScope: initialScope,
          initialSegment: initialSegment,
          initialWorkspace: initialWorkspace,
          broadcastEnabled: broadcastEnabled,
          syncSelectionToRoute: false,
          now: HostInboxSurfaceFixtures.now,
        ),
      ),
    );
  }
}

HostMessagingSetup _messagingSetup(String organizerId) => HostMessagingSetup(
  organizerId: organizerId,
  providerConfigured: false,
  embeddedSignup: const HostWhatsappEmbeddedSignupConfig(
    appId: null,
    configId: null,
    graphVersion: null,
  ),
  connection: null,
  templates: const [],
);

class _BroadcastComposerFrame extends StatelessWidget {
  const _BroadcastComposerFrame({
    this.bookedCount = 24,
    this.prospectiveCount = 9,
    this.initialSegment = HostInboxAudienceSegment.booked,
    this.initialTemplate,
    this.sendingEnabled = true,
  });

  final int bookedCount;
  final int prospectiveCount;
  final HostInboxAudienceSegment initialSegment;
  final HostBroadcastTemplate? initialTemplate;
  final bool sendingEnabled;

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      child: _DeviceFrame(
        height: _composerHeight,
        child: Scaffold(
          body: Align(
            alignment: Alignment.bottomCenter,
            child: HostBroadcastComposerSheet(
              event: HostInboxSurfaceFixtures.event,
              bookedCount: bookedCount,
              prospectiveCount: prospectiveCount,
              initialSegment: initialSegment,
              initialTemplate: initialTemplate,
              sendingEnabled: sendingEnabled,
              requestIdFactory: () => 'widgetbook-broadcast-request',
              sendAction: _previewSend,
            ),
          ),
        ),
      ),
    );
  }
}

Future<SendEventBroadcastCallableResponse> _previewSend({
  required String requestId,
  required String eventId,
  required EventBroadcastAudience audience,
  required String body,
}) async => SendEventBroadcastCallableResponse(
  broadcastId: 'widgetbook-broadcast',
  status: EventBroadcastDeliveryStatus.completed,
  recipientCount: audience == EventBroadcastAudience.prospective ? 9 : 24,
  excludedCount: 0,
  activityAvailableCount: audience == EventBroadcastAudience.prospective
      ? 9
      : 24,
  pushAttemptedCount: 0,
  pushAcceptedCount: 0,
  pushFailedCount: 0,
  pushUnknownCount: 0,
  idempotentReplay: false,
);

class _DeviceFrame extends StatelessWidget {
  const _DeviceFrame({
    required this.child,
    this.height = _deviceHeight,
    this.themeMode = ThemeMode.light,
    this.textScale = 1,
  });

  final Widget child;
  final double height;
  final ThemeMode themeMode;
  final double textScale;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: _deviceWidth,
      height: height,
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        themeMode: themeMode,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(textScale)),
          child: child!,
        ),
        home: child,
      ),
    );
  }
}

class _HostInboxCatalog extends StatelessWidget {
  const _HostInboxCatalog({
    required this.title,
    required this.contractId,
    required this.children,
  });

  final String title;
  final String contractId;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Scaffold(
      backgroundColor: t.bg,
      body: SafeArea(
        child: ListView(
          padding: CatchInsets.content,
          children: [
            Text(title, style: CatchTextStyles.titleL(context)),
            gapH4,
            Text(
              contractId,
              style: CatchTextStyles.monoLabel(context, color: t.ink2),
            ),
            gapH24,
            for (final child in children) ...[child, gapH20],
          ],
        ),
      ),
    );
  }
}

class _StateCard extends StatelessWidget {
  const _StateCard({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: CatchTextStyles.statusLabel(context, color: t.ink2)),
        gapH8,
        ClipRRect(
          borderRadius: BorderRadius.circular(CatchRadius.md),
          child: child,
        ),
      ],
    );
  }
}

class _HostRoleBoundary extends StatefulWidget {
  const _HostRoleBoundary({required this.child});

  final Widget child;

  @override
  State<_HostRoleBoundary> createState() => _HostRoleBoundaryState();
}

class _HostRoleBoundaryState extends State<_HostRoleBoundary> {
  @override
  void initState() {
    super.initState();
    AppConfig.configureEntrypointRole(AppRole.host);
  }

  @override
  Widget build(BuildContext context) {
    AppConfig.configureEntrypointRole(AppRole.host);
    return widget.child;
  }
}

@widgetbook.UseCase(
  name: 'History and outbound intent',
  type: HostSendsPageBody,
  path: '[Host]/Inbox',
)
Widget hostSendsPanel(BuildContext context) => const _HostRoleBoundary(
  child: _HostInboxFrame(initialWorkspace: HostMessagingWorkspace.campaigns),
);
