import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_detail_dock.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';

@widgetbook.UseCase(
  name: 'Provider dock states',
  type: OrganizerMembershipDock,
  path: '[Club Detail]/Sections',
)
Widget organizerMembershipDockStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'OrganizerMembershipDock',
    catalogId: 'section.club.membership_dock_provider',
    children: [
      WidgetbookPageStateCard(
        label: 'visitor',
        child: WidgetbookContentFrame(
          child: OrganizerMembershipDock(
            organizer: widgetbookOrganizerOrganizer,
            isMember: false,
            isAuthenticated: true,
            isMutating: false,
            pushNotificationsEnabled: false,
            isPushMutating: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'member pending push',
        child: WidgetbookContentFrame(
          child: OrganizerMembershipDock(
            organizer: widgetbookOrganizerOrganizer,
            isMember: true,
            isAuthenticated: true,
            isMutating: false,
            pushNotificationsEnabled: true,
            isPushMutating: true,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Dock states',
  type: OrganizerDetailDock,
  path: '[Club Detail]/Dock',
)
Widget organizerDetailDockStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'OrganizerDetailDock',
    catalogId: 'section.club.detail_dock',
    children: [
      WidgetbookPageStateCard(
        label: 'guest',
        child: WidgetbookContentFrame(
          child: OrganizerDetailDock(
            state: OrganizerDetailDockRole.guest,
            activityKind: ActivityKind.socialRun,
            footnote: 'Sign in to request access.',
            onSignIn: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'visitor',
        child: WidgetbookContentFrame(
          child: OrganizerDetailDock(
            state: OrganizerDetailDockRole.visitor,
            activityKind: ActivityKind.pickleball,
            members: 128,
            footnote: 'Requests are approved by the host.',
            onJoin: widgetbookNoop,
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'visitor pending',
        child: WidgetbookContentFrame(
          child: OrganizerDetailDock(
            state: OrganizerDetailDockRole.visitor,
            activityKind: ActivityKind.dinner,
            members: 42,
            isJoinLoading: true,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'member',
        child: WidgetbookContentFrame(
          child: OrganizerDetailDock(
            state: OrganizerDetailDockRole.member,
            activityKind: ActivityKind.yoga,
            members: 76,
            footnote: 'You are a member.',
            onBell: widgetbookNoop,
            onManage: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'member bell pending',
        child: WidgetbookContentFrame(
          child: OrganizerDetailDock(
            state: OrganizerDetailDockRole.member,
            activityKind: ActivityKind.socialRun,
            members: 76,
            notificationsEnabled: false,
            isBellLoading: true,
            onBell: widgetbookNoop,
            onManage: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'owner',
        child: WidgetbookContentFrame(
          child: OrganizerDetailDock(
            state: OrganizerDetailDockRole.owner,
            activityKind: ActivityKind.pubQuiz,
            onManage: widgetbookNoop,
            onCreate: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Dock count states',
  type: OrganizerMemberCountText,
  path: '[Club Detail]/Dock',
)
Widget dockCountStates(BuildContext context) {
  return const WidgetbookScrollCatalogFrame(
    title: 'OrganizerMemberCountText',
    catalogId: 'section.club.dock.count',
    children: [
      WidgetbookPageStateCard(
        label: 'member count',
        child: OrganizerMemberCountText(members: 214, label: 'MEMBERS'),
      ),
      WidgetbookPageStateCard(
        label: 'short label',
        child: OrganizerMemberCountText(members: 8, label: 'GOING'),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Dock bell states',
  type: OrganizerBellButton,
  path: '[Club Detail]/Dock',
)
Widget dockBellStates(BuildContext context) {
  final t = CatchTokens.of(context);
  return WidgetbookScrollCatalogFrame(
    title: 'OrganizerBellButton',
    catalogId: 'section.club.dock.bell',
    children: [
      WidgetbookPageStateCard(
        label: 'active',
        child: OrganizerBellButton(
          active: true,
          accent: t.primary,
          isLoading: false,
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'inactive',
        child: OrganizerBellButton(
          active: false,
          accent: t.primary,
          isLoading: false,
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'loading',
        child: OrganizerBellButton(
          active: true,
          accent: t.primary,
          isLoading: true,
          onPressed: widgetbookNoop,
        ),
      ),
    ],
  );
}
