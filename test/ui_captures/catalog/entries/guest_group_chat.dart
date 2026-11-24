// Marketing capture `guest_group_chat`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_dating_app/pages/chat/event_chat_controller.dart';
import 'package:catch_dating_app/pages/chat/event_chat_screen.dart';
import 'package:catch_platform/cache/app_clock.dart';

import '../../fixtures/sales_demo_synthetic_fixtures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/capture_fixtures.dart';
import '../shared/marketing_guest_story.dart';
import '../shared/marketing_host_report_event.dart';

// Saturday Trivia Social's group chat on the guest's phone the morning
// after: the host's thank-you, guests making plans for next week.
final guestGroupChatCapture = ScreenCaptureEntry(
  id: 'guest_group_chat',
  routeIds: const <String>['eventChatScreen'],
  device: CaptureDevice.genericPhone,
  marketingFixtureKeys: const <String>['hostMarketingIndia.guest.groupChat'],
  disableAnimations: true,
  providerOverrides: <Object>[
    appClockProvider.overrideWithValue(AppClock.custom(() => _now)),
    uidProvider.overrideWith((ref) => Stream.value(_uid)),
    eventChatControllerProvider(
      _event.id,
    ).overrideWith(() => _StoryEventChat(_chatState())),
  ],
  builder: (context) => EventChatScreen(eventId: _event.id),
);

final _event = marketingHostReportEvent;
final _now = hostMarketingIndiaScenario.clock('followUp');
final _uid = marketingGuestViewer.uid;
final _hostUid = hostMarketingIndiaScenario.scenario.host.uid;
final _hostName = hostMarketingIndiaScenario.scenario.host.firstName;

/// The checked-in guests other than the viewer, in check-in order.
final _guests = [
  for (final guest in hostMarketingIndiaScenario.guestsAt('followUp'))
    if (guest.checkedInAt != null &&
        guest.personaId != hostMarketingIndiaScenario.scenario.viewerPersonaId)
      captureFixtures.publicProfile(guest.personaId),
];

String _firstName(String name) => name.split(' ').first;

EventChatState _chatState() {
  // Oldest first here; the screen lists the newest at the bottom.
  final lines = <({String uid, String name, int minute, String text})>[
    (
      uid: _hostUid,
      name: _hostName,
      minute: 0,
      text:
          'Thank you for coming last night, everyone! Same table next '
          'Saturday, and the music round is only getting harder.',
    ),
    (
      uid: _guests[0].uid,
      name: _firstName(_guests[0].name),
      minute: 6,
      text: 'That music round was brutal. Still thinking about the 90s one.',
    ),
    (
      uid: _guests[1].uid,
      name: _firstName(_guests[1].name),
      minute: 9,
      text: 'Our table is keeping the team name. Same four next week?',
    ),
    (
      uid: _guests[2].uid,
      name: _firstName(_guests[2].name),
      minute: 14,
      text: 'In. Booked already.',
    ),
    (
      uid: _guests[3].uid,
      name: _firstName(_guests[3].name),
      minute: 21,
      text: 'Came on my own and left with a team. Thanks for the welcome!',
    ),
    (
      uid: _uid,
      name: _firstName(marketingGuestViewer.name),
      minute: 26,
      text: 'Same here. See you all on Saturday!',
    ),
  ];
  final start = _now.subtract(const Duration(hours: 1));
  final messages = [
    for (final (index, line) in lines.indexed)
      EventChatMessage(
        messageId: 'marketing-chat-$index',
        sequence: index + 1,
        sentAt: start.add(Duration(minutes: line.minute)),
        senderUid: line.uid,
        senderName: line.name,
        available: true,
        text: line.text,
        reply: null,
        // No reactions: their emoji need a font the capture doesn't load.
        reactionCounts: const {},
        myReaction: null,
        myReactionRevision: 0,
      ),
  ].reversed;
  return EventChatState(
    uid: _uid,
    access: EventChatAccess(
      eventId: _event.id,
      title: _event.name,
      organizerId: _event.organizerId,
      roomStatus: 'open',
      roomRevision: 1,
      membershipStatus: 'joined',
      membershipRevision: 1,
      canManage: false,
      canJoin: true,
      canReadMessages: true,
      closesAtMillis: _event.endTime
          .add(const Duration(days: 7))
          .millisecondsSinceEpoch,
      profileClaimRequired: false,
      termsVersion: 'event-chat-v1',
    ),
    messages: messages,
    typing: const [],
    nextBeforeSequence: null,
    receivedAt: _now,
    serverTimeMillis: _now.millisecondsSinceEpoch,
  );
}

/// The chat's controller with the story's messages and no reads.
class _StoryEventChat extends EventChatController {
  _StoryEventChat(this._state);

  final EventChatState _state;

  @override
  Future<EventChatState> build(String eventId) async => _state;
}
