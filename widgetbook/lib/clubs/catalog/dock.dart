import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_detail_dock.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';

@widgetbook.UseCase(
  name: 'Provider dock states',
  type: ClubMembershipDock,
  path: '[Club Detail]/Sections',
)
Widget clubMembershipDockStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ClubMembershipDock',
    catalogId: 'section.club.membership_dock_provider',
    children: [
      WidgetbookPageStateCard(
        label: 'visitor',
        child: WidgetbookContentFrame(
          child: ClubMembershipDock(
            club: widgetbookClubClub,
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
          child: ClubMembershipDock(
            club: widgetbookClubClub,
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
  type: ClubDetailDock,
  path: '[Club Detail]/Dock',
)
Widget clubDetailDockStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ClubDetailDock',
    catalogId: 'section.club.detail_dock',
    children: [
      WidgetbookPageStateCard(
        label: 'guest',
        child: WidgetbookContentFrame(
          child: ClubDetailDock(
            state: ClubDetailDockRole.guest,
            activityKind: ActivityKind.socialRun,
            footnote: 'Sign in to request access.',
            onSignIn: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'visitor',
        child: WidgetbookContentFrame(
          child: ClubDetailDock(
            state: ClubDetailDockRole.visitor,
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
          child: ClubDetailDock(
            state: ClubDetailDockRole.visitor,
            activityKind: ActivityKind.dinner,
            members: 42,
            isJoinLoading: true,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'member',
        child: WidgetbookContentFrame(
          child: ClubDetailDock(
            state: ClubDetailDockRole.member,
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
          child: ClubDetailDock(
            state: ClubDetailDockRole.member,
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
          child: ClubDetailDock(
            state: ClubDetailDockRole.owner,
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
  type: ClubMemberCountText,
  path: '[Club Detail]/Dock',
)
Widget dockCountStates(BuildContext context) {
  return const WidgetbookScrollCatalogFrame(
    title: 'ClubMemberCountText',
    catalogId: 'section.club.dock.count',
    children: [
      WidgetbookPageStateCard(
        label: 'member count',
        child: ClubMemberCountText(members: 214, label: 'MEMBERS'),
      ),
      WidgetbookPageStateCard(
        label: 'short label',
        child: ClubMemberCountText(members: 8, label: 'GOING'),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Dock bell states',
  type: ClubBellButton,
  path: '[Club Detail]/Dock',
)
Widget dockBellStates(BuildContext context) {
  final t = CatchTokens.of(context);
  return WidgetbookScrollCatalogFrame(
    title: 'ClubBellButton',
    catalogId: 'section.club.dock.bell',
    children: [
      WidgetbookPageStateCard(
        label: 'active',
        child: ClubBellButton(
          active: true,
          accent: t.primary,
          isLoading: false,
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'inactive',
        child: ClubBellButton(
          active: false,
          accent: t.primary,
          isLoading: false,
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'loading',
        child: ClubBellButton(
          active: true,
          accent: t.primary,
          isLoading: true,
          onPressed: widgetbookNoop,
        ),
      ),
    ],
  );
}
