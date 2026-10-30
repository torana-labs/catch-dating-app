import 'package:catch_dating_app/contexts/audience/data/crm/host_communication_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign_policy.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_manual_send_task.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_campaign_editor.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_manual_send_list.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/widgetbook_harness.dart';
import 'preview.dart';

const _path = '[P1 product surfaces]/Host operations/Messaging';

HostCampaign _campaign({
  required String status,
  required bool canApprove,
  required bool canDispatch,
  Set<String> blockers = const {},
  Map<String, int> delivery = const {},
}) => HostCampaign(
  organizerId: HostOperationsFixtures.primaryOrganizer.id,
  campaignId: 'design-campaign-$status',
  savedAudienceId: 'design-audience-regulars',
  status: status,
  revision: 3,
  audienceCounts: const HostCampaignCounts({
    'total': 120,
    'reachable': 96,
    'optedOut': 14,
    'unknown': 10,
  }),
  deliveryCounts: HostCampaignCounts(delivery),
  senderStatus: 'active',
  templateStatus: 'APPROVED',
  canApprove: canApprove,
  canDispatch: canDispatch,
  blockers: blockers,
);

HostManualSendTask _task({
  required String id,
  required String name,
  required HostManualSendTaskStatus status,
}) => HostManualSendTask(
  organizerId: HostOperationsFixtures.primaryOrganizer.id,
  taskId: id,
  contactId: 'contact-$id',
  displayName: name,
  status: status,
  active: true,
  revision: status == HostManualSendTaskStatus.handoffOpened ? 2 : 1,
  phoneE164: '+919876543210',
  prefillText: 'Sunday Social is back this week. Would you like to join us?',
  openCount: status == HostManualSendTaskStatus.handoffOpened ? 1 : 0,
  createdAt: DateTime(2030, 6, 18),
  updatedAt: DateTime(2030, 6, 18),
  openedAt: status == HostManualSendTaskStatus.handoffOpened
      ? DateTime(2030, 6, 18, 9)
      : null,
  expiresAt: DateTime(2030, 7, 18),
);

final _tasks = [
  _task(
    id: 'design-task-1',
    name: 'Ananya Rao',
    status: HostManualSendTaskStatus.queued,
  ),
  _task(
    id: 'design-task-2',
    name: 'Kabir Jain',
    status: HostManualSendTaskStatus.handoffOpened,
  ),
];

HostManualSendTaskPage _page({String? nextCursor}) => HostManualSendTaskPage(
  organizerId: HostOperationsFixtures.primaryOrganizer.id,
  tasks: _tasks,
  nextCursor: nextCursor,
);

@widgetbook.UseCase(
  name: 'Campaign lifecycle',
  type: HostCampaignReportSection,
  path: _path,
)
Widget hostCampaignReportSectionStates(BuildContext context) =>
    widgetbookHostComponentStates('HostCampaignReportSection', [
      (
        'draft ready to approve',
        HostCampaignReportSection(
          campaign: _campaign(
            status: 'draft',
            canApprove: true,
            canDispatch: false,
          ),
          busy: false,
          onApprove: () {},
          onSend: null,
          onCancel: () {},
          onRefresh: () {},
          onNew: () {},
        ),
      ),
      (
        'blocked',
        HostCampaignReportSection(
          campaign: _campaign(
            status: 'draft',
            canApprove: false,
            canDispatch: false,
            blockers: const {HostCampaignBlockers.senderInactive},
          ),
          busy: false,
          onApprove: null,
          onSend: null,
          onCancel: () {},
          onRefresh: () {},
          onNew: () {},
        ),
      ),
      (
        'sent with receipts',
        HostCampaignReportSection(
          campaign: _campaign(
            status: 'sent',
            canApprove: false,
            canDispatch: false,
            delivery: const {
              'sent': 96,
              'delivered': 90,
              'read': 61,
              'failed': 6,
            },
          ),
          busy: false,
          onApprove: null,
          onSend: null,
          onCancel: null,
          onRefresh: () {},
          onNew: () {},
        ),
      ),
    ]);

@widgetbook.UseCase(name: 'Loaded queue', type: HostManualSendList, path: _path)
Widget hostManualSendListStates(BuildContext context) {
  final organizerId = HostOperationsFixtures.primaryOrganizer.id;
  return widgetbookHostComponentStates('HostManualSendList', [
    (
      'tasks waiting',
      WidgetbookFixtureScope(
        overrides: [
          hostManualSendTasksProvider(
            organizerId,
          ).overrideWithValue(AsyncData(_page())),
        ],
        child: HostManualSendList(organizerId: organizerId),
      ),
    ),
  ]);
}

@widgetbook.UseCase(
  name: 'Queue states',
  type: HostManualSendListBody,
  path: _path,
)
Widget hostManualSendListBodyStates(BuildContext context) =>
    widgetbookHostComponentStates('HostManualSendListBody', [
      (
        'tasks waiting',
        HostManualSendListBody(
          page: _page(),
          additionalTasks: const [],
          additionalNextCursor: null,
          loadingMore: false,
          replanning: false,
          onOpenTask: (_) {},
          onLoadMore: (_) {},
          onReplan: (_) {},
        ),
      ),
      (
        'more to load',
        HostManualSendListBody(
          page: _page(nextCursor: 'design-cursor'),
          additionalTasks: const [],
          additionalNextCursor: null,
          loadingMore: true,
          replanning: false,
          onOpenTask: (_) {},
          onLoadMore: (_) {},
          onReplan: (_) {},
        ),
      ),
    ]);

@widgetbook.UseCase(
  name: 'Handoff states',
  type: HostManualSendTaskSheet,
  path: _path,
)
Widget hostManualSendTaskSheetStates(BuildContext context) =>
    widgetbookHostComponentStates('HostManualSendTaskSheet', [
      for (final task in _tasks)
        (task.status.name, HostManualSendTaskSheet(task: task)),
    ]);
