import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_invite_link.dart';
import 'package:catch_dating_app/contexts/events/domain/event_private_access.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_preference.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/events/presentation/widgets/who_is_going_section.dart';
import 'package:catch_dating_app/events/shared/attendance_sheet_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'role_theme.dart';

List<String> widgetbookHostManageAssignmentParticipantUids(
  List<EventSuccessAssignment> assignments,
) {
  final uids = <String>{
    for (final assignment in assignments) ...[
      assignment.uid,
      ...assignment.allPeerUids,
    ],
  }.toList()..sort();
  return uids;
}

List<String> widgetbookHostManageWingmanProfileUids(
  List<EventSuccessWingmanRequest> requests,
) {
  final uids = <String>{
    for (final request in requests) ...[
      request.requesterUid,
      request.targetUid,
    ],
  }.toList()..sort();
  return uids;
}

class WidgetbookHostManageRouteScope extends StatelessWidget {
  const WidgetbookHostManageRouteScope({
    super.key,
    this.child,
    this.uid = 'design-host-owner',
    this.club,
    this.event,
    this.clubValue,
    this.eventValue,
    this.attendanceValue,
    this.attendeeProfilesValue,
    this.privateAccessValue,
    this.inviteLinksValue,
    this.planValue,
    this.scorecardValue,
    this.assignments = const <EventSuccessAssignment>[],
    this.rotationAssignments = const <EventSuccessAssignment>[],
    this.preferences = const <EventSuccessPreference>[],
    this.wingmanRequests = const <EventSuccessWingmanRequest>[],
    this.assignmentPeerProfiles = const <PublicProfile>[],
    this.rotationPeerProfiles = const <PublicProfile>[],
    this.wingmanProfiles = const <PublicProfile>[],
    this.participations,
    this.initialSection = HostEventManageSection.setup,
    this.initialParticipantSearchQuery = '',
  });

  final Widget? child;
  final String? uid;
  final Club? club;
  final Event? event;
  final AsyncValue<Club?>? clubValue;
  final AsyncValue<Event?>? eventValue;
  final AsyncValue<AttendanceSheetViewModel?>? attendanceValue;
  final AsyncValue<Map<String, (String, String?)>>? attendeeProfilesValue;
  final AsyncValue<EventPrivateAccess?>? privateAccessValue;
  final AsyncValue<List<EventInviteLink>>? inviteLinksValue;
  final AsyncValue<EventSuccessPlan?>? planValue;
  final AsyncValue<EventSuccessScorecard?>? scorecardValue;
  final List<EventSuccessAssignment> assignments;
  final List<EventSuccessAssignment> rotationAssignments;
  final List<EventSuccessPreference> preferences;
  final List<EventSuccessWingmanRequest> wingmanRequests;
  final List<PublicProfile> assignmentPeerProfiles;
  final List<PublicProfile> rotationPeerProfiles;
  final List<PublicProfile> wingmanProfiles;
  final List<EventParticipation>? participations;
  final HostEventManageSection initialSection;
  final String initialParticipantSearchQuery;

  @override
  Widget build(BuildContext context) {
    final effectiveClub = club ?? widgetbookClub;
    final effectiveEvent = event ?? widgetbookPrivateEvent;
    final referenceNow = switch (initialSection) {
      HostEventManageSection.setup || HostEventManageSection.guests =>
        effectiveEvent.startTime.subtract(const Duration(hours: 1)),
      HostEventManageSection.live => effectiveEvent.startTime,
      HostEventManageSection.report => effectiveEvent.endTime.add(
        const Duration(minutes: 1),
      ),
    };
    final effectiveParticipations =
        participations ?? HostOperationsFixtures.participations;
    final roster = EventParticipationRoster.fromParticipations(
      effectiveParticipations,
    );
    final effectiveAttendanceValue =
        attendanceValue ??
        buildAttendanceSheetViewModel(
          eventAsync: AsyncData<Event?>(effectiveEvent),
          participationsAsync: AsyncData<List<EventParticipation>>(
            effectiveParticipations,
          ),
        );
    final profileIds = switch (effectiveAttendanceValue) {
      AsyncData(:final value) => value?.profileIds ?? const <String>[],
      _ => const <String>[],
    };
    const defaultProfiles = <String, (String, String?)>{
      HostOperationsFixtures.guestUid: ('Aarav Mehta', null),
      HostOperationsFixtures.secondGuestUid: ('Rhea Kapoor', null),
      HostOperationsFixtures.waitlistUid: ('Kabir Jain', null),
    };
    final profiles = <String, (String, String?)>{
      for (final profileId in profileIds)
        if (defaultProfiles.containsKey(profileId))
          profileId: defaultProfiles[profileId]!,
    };
    return WidgetbookAppRoleBoundary(
      role: AppRole.host,
      child: WidgetbookFixtureScope(
        overrides: [
          uidProvider.overrideWithValue(AsyncData<String?>(uid)),
          fetchClubProvider(
            effectiveClub.id,
          ).overrideWith((ref) => _futureOrValue(clubValue, effectiveClub)),
          watchEventProvider(
            effectiveEvent.id,
          ).overrideWith((ref) => _streamValue(eventValue, effectiveEvent)),
          watchEventParticipationRosterProvider(effectiveEvent.id).overrideWith(
            (ref) => Stream<EventParticipationRoster>.value(roster),
          ),
          watchEventParticipationsForEventProvider(
            effectiveEvent.id,
          ).overrideWith(
            (ref) =>
                Stream<List<EventParticipation>>.value(effectiveParticipations),
          ),
          attendanceSheetViewModelProvider(
            effectiveEvent.id,
          ).overrideWith((ref) => effectiveAttendanceValue),
          attendeeProfilesProvider(profileIds).overrideWithValue(
            attendeeProfilesValue ??
                AsyncData<Map<String, (String, String?)>>(profiles),
          ),
          watchEventPrivateAccessProvider(effectiveEvent.id).overrideWith(
            (ref) => _streamValue(
              privateAccessValue,
              HostOperationsFixtures.privateAccess,
            ),
          ),
          watchEventInviteLinksProvider(effectiveEvent.id).overrideWith(
            (ref) => _streamValue(
              inviteLinksValue,
              HostOperationsFixtures.inviteLinks,
            ),
          ),
          watchEventSuccessPlanProvider(
            effectiveEvent.id,
          ).overrideWith((ref) => _streamValue(planValue, null)),
          watchEventSuccessScorecardProvider(
            effectiveEvent.id,
          ).overrideWith((ref) => _streamValue(scorecardValue, null)),
          watchEventSuccessAssignmentsProvider(effectiveEvent.id).overrideWith((
            ref,
          ) {
            return Stream<List<EventSuccessAssignment>>.value(assignments);
          }),
          watchEventSuccessRotationAssignmentsProvider(
            effectiveEvent.id,
          ).overrideWith((ref) {
            return Stream<List<EventSuccessAssignment>>.value(
              rotationAssignments,
            );
          }),
          watchEventSuccessPreferencesProvider(effectiveEvent.id).overrideWith((
            ref,
          ) {
            return Stream<List<EventSuccessPreference>>.value(preferences);
          }),
          watchEventSuccessWingmanRequestsProvider(
            effectiveEvent.id,
          ).overrideWith((ref) {
            return Stream<List<EventSuccessWingmanRequest>>.value(
              wingmanRequests,
            );
          }),
          if (assignments.isNotEmpty)
            eventSuccessAssignmentPeerProfilesProvider(
              eventSuccessPeerUidsKey(
                widgetbookHostManageAssignmentParticipantUids(assignments),
              ),
            ).overrideWith((ref) async => assignmentPeerProfiles),
          if (rotationAssignments.isNotEmpty)
            eventSuccessAssignmentPeerProfilesProvider(
              eventSuccessPeerUidsKey(
                widgetbookHostManageAssignmentParticipantUids(
                  rotationAssignments,
                ),
              ),
            ).overrideWith((ref) async => rotationPeerProfiles),
          if (wingmanRequests.isNotEmpty)
            eventSuccessAssignmentPeerProfilesProvider(
              eventSuccessPeerUidsKey(
                widgetbookHostManageWingmanProfileUids(wingmanRequests),
              ),
            ).overrideWith((ref) async => wingmanProfiles),
        ],
        child: WidgetbookThemedHostPreview(
          themeMode: ThemeMode.light,
          child:
              child ??
              HostEventManageRouteScreen(
                clubId: effectiveClub.id,
                eventId: effectiveEvent.id,
                initialEvent: _initialManageEvent(eventValue, effectiveEvent),
                initialSection: initialSection,
                initialParticipantSearchQuery: initialParticipantSearchQuery,
                referenceNow: referenceNow,
              ),
        ),
      ),
    );
  }
}

Future<Club?> _futureOrValue(AsyncValue<Club?>? value, Club fallback) {
  return switch (value) {
    AsyncData(:final value) => Future.value(value),
    AsyncError(:final error, :final stackTrace) => Future<Club?>.error(
      error,
      stackTrace,
    ),
    AsyncLoading() => Future<Club?>.delayed(const Duration(days: 1)),
    null => Future.value(fallback),
  };
}

Event? _initialManageEvent(AsyncValue<Event?>? value, Event fallback) {
  return switch (value) {
    AsyncData(:final value) => value,
    _ => fallback,
  };
}

Stream<T> _streamValue<T>(AsyncValue<T>? value, T fallback) {
  return switch (value) {
    AsyncData(:final value) => Stream<T>.value(value),
    AsyncError(:final error, :final stackTrace) => Stream<T>.error(
      error,
      stackTrace,
    ),
    AsyncLoading() => Stream<T>.empty(),
    null => Stream<T>.value(fallback),
  };
}
