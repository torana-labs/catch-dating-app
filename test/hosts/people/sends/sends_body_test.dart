import 'package:catch_dating_app/contexts/audience/domain/crm/host_manual_send_task.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_send_summary.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_body.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_detail_body.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_state.dart';
import 'package:catch_l10n/generated/app_localizations.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/events_test_helpers.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _frame(Widget child) => MaterialApp(
  theme: AppTheme.light,
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  home: CatchRoot(
    child: CatchScreen(
      body: CatchScrollView(child: CatchPageBody(child: child)),
    ),
  ),
);

final _announcement = HostAnnouncementSendSummary(
  broadcastId: 'broadcast-1',
  eventId: 'event-1',
  eventName: 'Tuesday Trivia Night',
  audience: 'booked',
  recipientCount: 24,
  sentAt: DateTime(2026, 10, 27, 18),
  partialFailure: true,
  activityAt: DateTime(2026, 10, 27, 18),
);

final _task = HostManualSendTask(
  organizerId: 'org',
  taskId: 'task-1',
  contactId: 'contact-1',
  displayName: 'Rhea Kapoor',
  status: HostManualSendTaskStatus.queued,
  active: true,
  revision: 1,
  phoneE164: '+919800000001',
  prefillText: 'See you tonight',
  openCount: 0,
  createdAt: DateTime(2026, 10, 27),
  updatedAt: DateTime(2026, 10, 27),
  openedAt: null,
  expiresAt: DateTime(2026, 11, 26),
);

void main() {
  testWidgets('history lists sends, the handoff queue and Load more', (
    tester,
  ) async {
    final opened = <HostSendSummary>[];
    final replanned = <List<HostManualSendTask>>[];
    await tester.pumpWidget(
      _frame(
        HostSendsBody(
          state: HostSendsState(
            history: LivePages(items: [_announcement], hasMore: true),
            historyStatus: HostSendsReadStatus.ready,
            tasks: LivePages(items: [_task, _task], hasMore: false),
            tasksStatus: HostSendsReadStatus.ready,
          ),
          onChoose: () {},
          onSettings: () {},
          onOpen: opened.add,
          onLoadMore: () {},
          onOpenTask: (_) {},
          onReplan: replanned.add,
          onLoadMoreTasks: () {},
          onRetry: () {},
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Tuesday Trivia Night'), findsOneWidget);
    expect(find.text('Some deliveries need attention'), findsOneWidget);
    expect(find.text('Rhea Kapoor'), findsOneWidget);
    expect(find.text('Load more'), findsOneWidget);
    // Unknown setup keeps WhatsApp settings on offer.
    expect(find.text('WhatsApp Business settings'), findsOneWidget);
    await tester.tap(find.text('Tuesday Trivia Night'));
    await tester.tap(find.text('Check options'));
    expect(opened.single, same(_announcement));
    expect(replanned.single.single.taskId, 'task-1');
  });

  testWidgets('choosing what to send shows what can start now', (tester) async {
    final event = buildEvent(organizerId: 'org');
    var announced = 0;
    await tester.pumpWidget(
      _frame(
        HostSendsChooseBody(
          state: HostSendsState(
            setup: const HostMessagingSetup(
              organizerId: 'org',
              providerConfigured: false,
              embeddedSignup: HostWhatsappEmbeddedSignupConfig(
                appId: null,
                configId: null,
                graphVersion: null,
              ),
              connection: null,
              templates: [],
            ),
            setupStatus: HostSendsReadStatus.ready,
            quota: 0,
            quotaStatus: HostSendsReadStatus.ready,
            announcement: HostSendsAnnouncement(
              status: HostSendsAnnouncementStatus.ready,
              event: event,
              booked: 3,
              prospective: 2,
            ),
          ),
          onConversation: () {},
          onCampaign: () {},
          onAnnouncement: () => announced++,
          onFollowerUpdate: () {},
          onSettings: () {},
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Continue a conversation'), findsOneWidget);
    // A provider that is not configured hides the campaign and settings.
    expect(find.text('Message a saved audience'), findsNothing);
    expect(find.text('WhatsApp Business settings'), findsNothing);
    expect(find.text('3 selected'), findsOneWidget);
    expect(find.text('Weekly limit reached'), findsOneWidget);
    await tester.tap(find.text('Send an event announcement'));
    expect(announced, 1);
  });

  testWidgets('an announcement report shows its reach and partial delivery', (
    tester,
  ) async {
    await tester.pumpWidget(_frame(HostSendsReportBody(send: _announcement)));
    await pumpFeatureUi(tester);
    expect(find.text('Tuesday Trivia Night'), findsOneWidget);
    expect(find.textContaining('24 people'), findsOneWidget);
    expect(
      find.textContaining('Some deliveries need attention'),
      findsOneWidget,
    );
  });
}
