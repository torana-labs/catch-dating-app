import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_membership.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_screen.dart';
import 'package:catch_dating_app/design_fixtures/dashboard_surface_fixtures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Screen states',
  type: DashboardScreen,
  path: '[P1 product surfaces]/Dashboard home',
)
Widget dashboardScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'DashboardScreen',
    contractId: 'screen.dashboard.home',
    children: [
      WidgetbookPageStateCard(
        label: 'profile loading',
        child: WidgetbookDashboardDeviceFrame(
          child: WidgetbookDashboardScope(
            profileStream: _loadingStream<UserProfile?>(),
            child: const DashboardScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'profile error',
        child: WidgetbookDashboardDeviceFrame(
          child: WidgetbookDashboardScope(
            profileStream: _errorStream<UserProfile?>('Profile failed'),
            child: const DashboardScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty start',
        child: const WidgetbookDashboardDeviceFrame(
          child: WidgetbookDashboardScope(
            signedUpEvents: [],
            memberships: [],
            child: DashboardScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'memberships loading',
        child: WidgetbookDashboardDeviceFrame(
          child: WidgetbookDashboardScope(
            membershipsStream: _loadingStream<List<ClubMembership>>(),
            child: const DashboardScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'memberships error',
        child: WidgetbookDashboardDeviceFrame(
          child: WidgetbookDashboardScope(
            membershipsStream: _errorStream<List<ClubMembership>>(
              'Memberships failed',
            ),
            child: const DashboardScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'booked events loading',
        child: WidgetbookDashboardDeviceFrame(
          child: WidgetbookDashboardScope(
            signedUpEventsStream: _loadingStream<List<Event>>(),
            child: const DashboardScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'booked events error',
        child: WidgetbookDashboardDeviceFrame(
          child: WidgetbookDashboardScope(
            signedUpEventsStream: _errorStream<List<Event>>(
              'Booked events failed',
            ),
            child: const DashboardScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'full dashboard',
        child: const WidgetbookDashboardDeviceFrame(
          child: WidgetbookDashboardScope(),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'notification action no unread',
        child: const WidgetbookDashboardDeviceFrame(
          child: WidgetbookDashboardScope(
            notificationsValue: AsyncData<List<ActivityNotification>>([]),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: const WidgetbookDashboardDeviceFrame(
          child: WidgetbookMediaOverride(
            textScaler: TextScaler.linear(2),
            child: WidgetbookDashboardScope(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reduced motion',
        child: const WidgetbookDashboardDeviceFrame(
          child: WidgetbookMediaOverride(
            disableAnimations: true,
            child: WidgetbookDashboardScope(),
          ),
        ),
      ),
    ],
  );
}

Stream<T> _loadingStream<T>() => DashboardSurfaceFixtures.loadingStream<T>();

Stream<T> _errorStream<T>(String message) =>
    DashboardSurfaceFixtures.errorStream<T>(message);
