import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/dashboard/presentation/widgets/club_posts_home_section.dart';
import 'package:catch_dating_app/design_fixtures/dashboard_surface_fixtures.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Club post states',
  type: ClubPostsHomeSection,
  path: '[P1 product surfaces]/Dashboard home',
)
Widget dashboardClubPostsHomeSectionReviewStates(BuildContext context) {
  final notifications = [
    _clubPostNotification(
      id: 'widgetbook-club-post-linked',
      postId: 'post-linked',
      eventId: widgetbookDashboardNextEvent.id,
      body: 'Meet ten minutes early at the main gate for bib pickup.',
    ),
    _clubPostNotification(
      id: 'widgetbook-club-post-general',
      postId: 'post-general',
      body: 'New Sunday route preview is up for members.',
    ),
  ];

  return WidgetbookPageCatalogFrame(
    title: 'ClubPostsHomeSection',
    contractId: 'dashboard.home.club_posts',
    children: [
      WidgetbookPageStateCard(
        label: 'home module',
        child: WidgetbookDashboardScope(
          child: WidgetbookDashboardPrimitiveFrame(
            child: ClubPostsHomeSection(
              notifications: notifications,
              onOpenPost: (_) => widgetbookNoop(),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'single card',
        child: WidgetbookDashboardPrimitiveFrame(
          child: ClubPostHomeCard(
            notification: notifications.first,
            club: widgetbookDashboardClub,
            onTap: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Card states',
  type: ClubPostHomeCard,
  path: '[P1 product surfaces]/Dashboard home',
)
Widget dashboardClubPostHomeCardReviewStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ClubPostHomeCard',
    contractId: 'dashboard.home.club_post_card',
    children: [
      WidgetbookPageStateCard(
        label: 'linked event',
        child: WidgetbookDashboardPrimitiveFrame(
          child: ClubPostHomeCard(
            notification: _clubPostNotification(
              id: 'widgetbook-club-post-card-linked',
              postId: 'post-card-linked',
              eventId: widgetbookDashboardNextEvent.id,
              body: 'Meet ten minutes early at the main gate for bib pickup.',
            ),
            club: widgetbookDashboardClub,
            onTap: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'club fallback',
        child: WidgetbookDashboardPrimitiveFrame(
          child: ClubPostHomeCard(
            notification: _clubPostNotification(
              id: 'widgetbook-club-post-card-fallback',
              postId: 'post-card-fallback',
              body: 'New Sunday route preview is up for members.',
            ),
            club: null,
            onTap: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

ActivityNotification _clubPostNotification({
  required String id,
  required String postId,
  String? eventId,
  required String body,
}) {
  return ActivityNotification(
    id: id,
    uid: widgetbookDashboardViewer.uid,
    type: ActivityNotificationType.clubUpdate,
    title: 'New update from ${widgetbookDashboardClub.name}',
    body: body,
    createdAt: DashboardSurfaceFixtures.now.subtract(const Duration(hours: 1)),
    clubId: widgetbookDashboardClub.id,
    postId: postId,
    eventId: eventId,
    actorName: widgetbookDashboardClub.name,
  );
}
