import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_manual_send_task.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_send_summary.dart';
import 'package:catch_dating_app/hosts/people/sends/campaign_body.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_body.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_detail_body.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_screen.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_sheets_body.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_state.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_test_support/organizers_test_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../preview_layout_contracts.dart';

const _path = '[P1 product surfaces]/Host/People/Sends';

final _sent = DateTime(2026, 10, 27, 18);

final _announcement = HostAnnouncementSendSummary(
  broadcastId: 'broadcast-1',
  eventId: 'event-1',
  eventName: 'Tuesday Trivia Night',
  audience: 'booked',
  recipientCount: 24,
  sentAt: _sent,
  partialFailure: false,
  activityAt: _sent,
);

final _task = HostManualSendTask(
  organizerId: 'preview-organizer',
  taskId: 'task-1',
  contactId: 'contact-1',
  displayName: 'Rhea Kapoor',
  status: HostManualSendTaskStatus.handoffOpened,
  active: true,
  revision: 1,
  phoneE164: '+919800000001',
  prefillText: 'See you tonight',
  openCount: 1,
  createdAt: _sent,
  updatedAt: _sent,
  openedAt: _sent,
  expiresAt: _sent.add(const Duration(days: 30)),
);

final _state = HostSendsState(
  history: LivePages(items: [_announcement], hasMore: true),
  historyStatus: HostSendsReadStatus.ready,
  tasks: LivePages(items: [_task], hasMore: false),
  tasksStatus: HostSendsReadStatus.ready,
  quota: 2,
  quotaStatus: HostSendsReadStatus.ready,
);

final _campaign = HostCampaign.fromCallableData({
  'organizerId': 'preview-organizer',
  'campaignId': 'campaign-1',
  'status': 'previewed',
  'revision': 1,
  'audienceCounts': {
    'total': 120,
    'reachable': 96,
    'optedOut': 14,
    'unknown': 10,
  },
  'deliveryCounts': <String, int>{},
  'senderStatus': 'active',
  'templateStatus': 'APPROVED',
  'canApprove': true,
  'canDispatch': false,
  'blockers': <String>[],
});

Widget _phone(Widget child) => SizedBox(
  width: WidgetbookPreviewLayout.phoneChromeWidth,
  height: WidgetbookPreviewLayout.hostEditorViewportHeight,
  child: CatchRoot(
    child: CatchScreen(
      body: CatchScrollView(child: CatchPageBody(child: child)),
    ),
  ),
);

@widgetbook.UseCase(
  name: 'History and handoffs',
  type: HostSendsBody,
  path: _path,
)
Widget sendsHistory(BuildContext context) => _phone(
  HostSendsBody(
    state: _state,
    onChoose: () {},
    onSettings: () {},
    onOpen: (_) {},
    onLoadMore: () {},
    onOpenTask: (_) {},
    onReplan: (_) {},
    onLoadMoreTasks: () {},
    onRetry: () {},
  ),
);

@widgetbook.UseCase(
  name: 'Needs your send',
  type: HostSendsQueueSection,
  path: _path,
)
Widget sendsQueue(BuildContext context) => _phone(
  HostSendsQueueSection(
    state: _state,
    onOpenTask: (_) {},
    onReplan: (_) {},
    onLoadMore: () {},
    onRetry: () {},
  ),
);

@widgetbook.UseCase(
  name: 'What to send',
  type: HostSendsChooseBody,
  path: _path,
)
Widget sendsChoose(BuildContext context) => _phone(
  HostSendsChooseBody(
    state: _state,
    onConversation: () {},
    onCampaign: () {},
    onAnnouncement: () {},
    onFollowerUpdate: () {},
    onSettings: () {},
  ),
);

@widgetbook.UseCase(
  name: 'Announcement sent',
  type: HostSendsReportBody,
  path: _path,
)
Widget sendsReport(BuildContext context) =>
    _phone(HostSendsReportBody(send: _announcement));

@widgetbook.UseCase(
  name: 'Previewed, ready to approve',
  type: HostSendsCampaignSection,
  path: _path,
)
Widget sendsCampaignReport(BuildContext context) => _phone(
  HostSendsCampaignSection(
    campaign: _campaign,
    onApprove: () {},
    onRefresh: () {},
    onNew: () {},
  ),
);

@widgetbook.UseCase(name: 'Setup loading', type: HostCampaignBody, path: _path)
Widget sendsCampaignBody(BuildContext context) => ProviderScope(
  overrides: [
    hostMessagingSetupProvider(
      'preview-organizer',
    ).overrideWithValue(const AsyncLoading()),
  ],
  child: _phone(
    HostCampaignBody(organizer: buildOrganizer(id: 'preview-organizer')),
  ),
);

@widgetbook.UseCase(
  name: 'Opened in WhatsApp',
  type: HostManualSendSheet,
  path: _path,
)
Widget sendsTaskSheet(BuildContext context) =>
    _phone(HostManualSendSheet(task: _task));

@widgetbook.UseCase(
  name: 'Check options results',
  type: HostManualSendReplanSheet,
  path: _path,
)
Widget sendsReplanSheet(BuildContext context) =>
    _phone(HostManualSendReplanSheet(tasks: [_task], results: const {}));

@widgetbook.UseCase(
  name: 'WhatsApp unavailable',
  type: HostFollowerUpdateSheet,
  path: _path,
)
Widget sendsFollowerSheet(BuildContext context) => _phone(
  HostFollowerUpdateSheet(
    remainingQuota: 2,
    requestIdFactory: () => 'preview',
    onSubmit: ({required requestId, required text, required whatsapp}) async =>
        null,
  ),
);

@widgetbook.UseCase(name: 'Signed out', type: HostSendsScreen, path: _path)
Widget sendsScreen(BuildContext context) => ProviderScope(
  overrides: [uidProvider.overrideWithValue(const AsyncData(null))],
  child: const SizedBox(
    width: WidgetbookPreviewLayout.phoneChromeWidth,
    height: WidgetbookPreviewLayout.hostEditorViewportHeight,
    child: HostSendsScreen(),
  ),
);
