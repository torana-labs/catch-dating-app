// Marketi// Marketi// Marketing// Marketing // Marketing // Marketing capt// Marketing capture `// Marketing capture `guest_after_event`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'dart:async';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_host_photos_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_host_photos.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_follow_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profiles_lookup.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_screen.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_view_model.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart' show AsyncData;
import '../../../events/events_test_helpers.dart';
import '../../../support/profile_readiness_fixtures.dart';
import '../../fixtures/sales_demo_synthetic_fixtures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/capture_fixtures.dart';
import '../shared/marketing_host_organizer.dart';
import '../shared/marketing_host_report_event.dart';

final guestAfterEventCapture = ScreenCaptureEntry(
  id: 'guest_after_event',
  routeIds: const <String>['eventRecapScreen'],
  device: CaptureDevice.genericPhone,
  marketingFixtureKeys: const <String>['hostMarketingIndia.guest.afterEvent'],
  disableAnimations: true,
  providerOverrides: _marketingAfterEventOverrides(),
  builder: (context) => EventRecapScreen(
    eventId: marketingHostReportEvent.id,
    now: _marketingAfterEventNow,
  ),
);
// The guest's after-event screen in the Mumbai marketing story: the morning
// after Evening Club's Saturday Trivia Social, picks still open.
final _marketingAfterEventNow = hostMarketingIndiaScenario.clock('followUp');
final _marketingAfterEventViewer = buildSocialReadyUser(
  uid: 'marketing-after-event-viewer',
  name: captureFixtures
      .publicProfile(hostMarketingIndiaScenario.scenario.viewerPersonaId)
      .name,
);
final _marketingAfterEventViewerUid = _marketingAfterEventViewer.uid;
final _marketingAfterEventProfiles = [
  for (final guest in hostMarketingIndiaScenario.guestsAt('followUp'))
    if (guest.checkedInAt != null &&
        guest.personaId != hostMarketingIndiaScenario.scenario.viewerPersonaId)
      captureFixtures.publicProfile(guest.personaId),
].take(6).toList(growable: false);
final _marketingAfterEventNext = marketingHostReportEvent.copyWith(
  id: 'event-host-trivia-store-demo-next',
  startTime: marketingHostReportEvent.startTime.add(const Duration(days: 7)),
  endTime: marketingHostReportEvent.endTime.add(const Duration(days: 7)),
);

List<Object> _marketingAfterEventOverrides() {
  final event = marketingHostReportEvent;
  final uid = _marketingAfterEventViewerUid;
  final attendeeIds = [
    for (final profile in _marketingAfterEventProfiles) profile.uid,
  ];
  return <Object>[
    uidProvider.overrideWith((ref) => Stream.value(uid)),
    eventHostPhotoAlbumProvider(
      event.id,
    ).overrideWith((ref) async => EventHostPhotoAlbum.empty(event.id)),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream<UserProfile?>.value(_marketingAfterEventViewer),
    ),
    eventRecapViewModelProvider(event.id).overrideWith(
      (ref) => AsyncData<EventRecapViewModel?>(
        EventRecapViewModel(
          event: event,
          attendeeIds: attendeeIds,
          checkedInCount: attendeeIds.length + 1,
        ),
      ),
    ),
    publicProfilesByIdsProvider(
      PublicProfilesQuery(attendeeIds),
    ).overrideWithValue(
      AsyncData({
        for (final profile in _marketingAfterEventProfiles)
          profile.uid: profile,
      }),
    ),
    watchOrganizerProvider(
      marketingHostOrganizer.id,
    ).overrideWith((ref) => Stream.value(marketingHostOrganizer)),
    watchEventParticipationProvider(event.id, uid).overrideWith(
      (ref) => Stream.value(
        buildEventParticipation(
          event: event,
          uid: uid,
          status: EventParticipationStatus.attended,
          createdAt: event.startTime,
        ),
      ),
    ),
    watchUserEventSuccessFeedbackProvider(
      eventId: event.id,
      uid: uid,
    ).overrideWith((ref) => Stream<EventSuccessFeedback?>.value(null)),
    watchUserEventSuccessAssignmentProvider(
      eventId: event.id,
      uid: uid,
    ).overrideWith((ref) => Stream<EventSuccessAssignment?>.value(null)),
    eventChatAccessProvider(event.id).overrideWith(
      (ref) async => EventChatAccess(
        eventId: event.id,
        title: event.title,
        organizerId: event.organizerId,
        roomStatus: 'open',
        roomRevision: 1,
        membershipStatus: 'joined',
        membershipRevision: 1,
        canManage: false,
        canJoin: true,
        canReadMessages: true,
        closesAtMillis: event.endTime
            .add(const Duration(days: 7))
            .millisecondsSinceEpoch,
        profileClaimRequired: false,
        termsVersion: 'event-chat-v1',
      ),
    ),
    watchActiveEventsForOrganizerProvider(
      ActiveOrganizerEventsQuery(
        organizerId: event.organizerId,
        day: _marketingAfterEventNow,
      ),
    ).overrideWith((ref) => Stream.value([_marketingAfterEventNext])),
    currentUserFollowedOrganizerIdsProvider.overrideWithValue(
      const AsyncData(<String>{}),
    ),
  ];
}
