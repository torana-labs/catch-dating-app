import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/booked_events_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_calendar_links.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/data/activity_notification_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_name_lookup.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_membership.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_full_view_model.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_screen.dart';
import 'package:catch_dating_app/design_fixtures/dashboard_surface_fixtures.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';

final _memberships = DashboardSurfaceFixtures.memberships;

class WidgetbookDashboardScope extends StatelessWidget {
  const WidgetbookDashboardScope({
    super.key,
    this.profileStream,
    this.membershipsStream,
    this.signedUpEventsStream,
    this.memberships,
    this.signedUpEvents,
    this.notificationsValue,
    this.child = const DashboardScreen(),
  });

  final Stream<UserProfile?>? profileStream;
  final Stream<List<OrganizerMembership>>? membershipsStream;
  final Stream<List<Event>>? signedUpEventsStream;
  final List<OrganizerMembership>? memberships;
  final List<Event>? signedUpEvents;
  final AsyncValue<List<ActivityNotification>>? notificationsValue;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final effectiveMemberships = memberships ?? _memberships;
    final effectiveSignedUpEvents =
        signedUpEvents ?? [widgetbookDashboardNextEvent];
    final organizerNames = <String, String>{
      widgetbookDashboardOrganizer.id: widgetbookDashboardOrganizer.name,
    };
    final focusOrganizerQuery = OrganizerNameLookupQuery(
      effectiveSignedUpEvents.map((event) => event.clubId),
    );
    final organizersByIdQuery = OrganizersByIdQuery([widgetbookDashboardOrganizer.id]);

    return WidgetbookFixtureScope(
      overrides: [
        dashboardNowProvider.overrideWithValue(DashboardSurfaceFixtures.now),
        uidProvider.overrideWithValue(
          AsyncData<String?>(widgetbookDashboardViewer.uid),
        ),
        watchUserProfileProvider.overrideWith(
          (ref) =>
              profileStream ??
              Stream<UserProfile?>.value(widgetbookDashboardViewer),
        ),
        watchActiveOrganizerMembershipsForUserProvider(
          widgetbookDashboardViewer.uid,
        ).overrideWith(
          (ref) =>
              membershipsStream ??
              Stream<List<OrganizerMembership>>.value(effectiveMemberships),
        ),
        watchSignedUpEventsProvider(widgetbookDashboardViewer.uid).overrideWith(
          (ref) =>
              signedUpEventsStream ??
              Stream<List<Event>>.value(effectiveSignedUpEvents),
        ),
        watchActivityNotificationsProvider(
          widgetbookDashboardViewer.uid,
        ).overrideWithValue(
          notificationsValue ??
              AsyncData<List<ActivityNotification>>(
                widgetbookDashboardNotifications,
              ),
        ),
        watchAttendedEventsProvider(
          widgetbookDashboardViewer.uid,
        ).overrideWithValue(const AsyncData<List<Event>>([])),
        watchReviewsByUserProvider(
          widgetbookDashboardViewer.uid,
        ).overrideWithValue(
          AsyncData<List<Review>>(DashboardSurfaceFixtures.reviews),
        ),
        organizerNameLookupProvider(
          focusOrganizerQuery,
        ).overrideWith((ref) async => organizerNames),
        watchOrganizersByIdsProvider(organizersByIdQuery).overrideWith(
          (ref) => Stream<List<Organizer>>.value([widgetbookDashboardOrganizer]),
        ),
        watchOrganizerProvider(
          widgetbookDashboardOrganizer.id,
        ).overrideWith((ref) => Stream<Organizer?>.value(widgetbookDashboardOrganizer)),
        externalUrlLauncherProvider.overrideWithValue(_noopLauncher),
        nativeCalendarLauncherProvider.overrideWithValue(_noopCalendarLauncher),
      ],
      child: child,
    );
  }
}

Future<bool> _noopLauncher(Uri uri, {Object? mode}) async {
  return true;
}

Future<bool> _noopCalendarLauncher(CalendarEventPayload event) async {
  return true;
}
