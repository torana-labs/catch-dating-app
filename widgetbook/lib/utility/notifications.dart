import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/activity_notification_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/dashboard/presentation/activity_screen.dart';
import 'package:catch_dating_app/dashboard/presentation/widgets/activity_section.dart';
import 'package:catch_dating_app/design_fixtures/utility_surface_fixtures.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/contract_preview.dart';
import '../support/page_preview.dart';
import '../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';

final _notifications = UtilitySurfaceFixtures.notifications;

@widgetbook.UseCase(
  name: 'Screen states',
  type: ActivityScreen,
  path: '[P3 utility surfaces]/Notifications',
)
Widget activityScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ActivityScreen',
    contractId: 'screen.notifications.list',
    children: [
      WidgetbookPageStateCard(
        label: 'uid loading',
        child: WidgetbookUtilityDeviceFrame(
          child: _ActivityScreenScope(
            uidStream: widgetbookUtilityLoadingStream<String?>(),
            notificationsStream: Stream.value(_notifications),
            child: const ActivityScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'uid error',
        child: WidgetbookUtilityDeviceFrame(
          child: _ActivityScreenScope(
            uidStream: widgetbookUtilityErrorStream<String?>('Identity failed'),
            notificationsStream: Stream.value(_notifications),
            child: const ActivityScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'signed out',
        child: WidgetbookUtilityDeviceFrame(
          child: _ActivityScreenScope(
            uidStream: Stream<String?>.value(null),
            notificationsStream: Stream.value(_notifications),
            child: const ActivityScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'mark-all-read visible',
        child: WidgetbookUtilityDeviceFrame(
          child: _ActivityScreenScope(
            notificationsStream: Stream.value(_notifications),
            child: const ActivityScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'activity error',
        child: WidgetbookUtilityDeviceFrame(
          child: _ActivityScreenScope(
            notificationsStream: widgetbookUtilityErrorStream(
              'Activity stream failed',
            ),
            child: const ActivityScreen(),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Section states',
  type: ActivitySection,
  path: '[P3 utility surfaces]/Notifications',
)
Widget activitySectionStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ActivitySection',
    contractId: 'screen.notifications.list.activity_body',
    children: [
      WidgetbookPageStateCard(
        label: 'loading',
        child: _ActivitySectionScope(
          notificationsStream:
              widgetbookUtilityLoadingStream<List<ActivityNotification>>(),
          child: const ActivitySection(uid: widgetbookUtilityViewerUid),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty',
        child: _ActivitySectionScope(
          notificationsStream: Stream.value(const <ActivityNotification>[]),
          child: const ActivitySection(uid: widgetbookUtilityViewerUid),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'error',
        child: _ActivitySectionScope(
          notificationsStream: widgetbookUtilityErrorStream(
            'Activity unavailable',
          ),
          child: const ActivitySection(uid: widgetbookUtilityViewerUid),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'grouped read and unread',
        child: _ActivitySectionScope(
          notificationsStream: Stream.value(_notifications),
          child: const ActivitySection(uid: widgetbookUtilityViewerUid),
        ),
      ),
    ],
  );
}

Widget notificationRowStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'NotificationRow',
    contractId: 'screen.notifications.list.row',
    children: [
      WidgetbookPageStateCard(
        label: 'unread event reminder',
        child: const NotificationRow(
          type: ActivityNotificationType.eventReminder,
          title: 'Event starts tomorrow',
          time: '2h',
          body: 'Sundowner 5K meets at Carter Road Jetty.',
          unread: true,
          onTap: widgetbookNoop,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'read signup',
        child: const NotificationRow(
          type: ActivityNotificationType.eventSignup,
          title: 'You are booked',
          time: '5h',
          body: 'Your spot is confirmed for Wednesday evening.',
          onTap: widgetbookNoop,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'long copy',
        child: const NotificationRow(
          type: ActivityNotificationType.organizerUpdate,
          title: 'Sea Face Social added a new slower return-to-running loop',
          time: 'yesterday',
          body:
              'The host posted pacing notes, regroup points, and cafe timing for members returning after a break.',
          unread: true,
          onTap: widgetbookNoop,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'non-navigable cancellation',
        child: const NotificationRow(
          type: ActivityNotificationType.eventCancelled,
          title: 'Morning run was cancelled',
          time: 'mon',
          body: 'Heavy rain moved the session to next week.',
        ),
      ),
    ],
  );
}

class _ActivityScreenScope extends StatelessWidget {
  const _ActivityScreenScope({
    required this.child,
    required this.notificationsStream,
    this.uidStream,
  });

  final Widget child;
  final Stream<String?>? uidStream;
  final Stream<List<ActivityNotification>> notificationsStream;

  @override
  Widget build(BuildContext context) {
    return WidgetbookFixtureScope(
      overrides: [
        uidProvider.overrideWith(
          (ref) =>
              uidStream ?? Stream<String?>.value(widgetbookUtilityViewerUid),
        ),
        watchActivityNotificationsProvider(
          widgetbookUtilityViewerUid,
        ).overrideWith((ref) => notificationsStream),
      ],
      child: child,
    );
  }
}

class _ActivitySectionScope extends StatelessWidget {
  const _ActivitySectionScope({
    required this.notificationsStream,
    required this.child,
  });

  final Stream<List<ActivityNotification>> notificationsStream;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return WidgetbookFixtureScope(
      overrides: [
        watchActivityNotificationsProvider(
          widgetbookUtilityViewerUid,
        ).overrideWith((ref) => notificationsStream),
      ],
      child: child,
    );
  }
}
