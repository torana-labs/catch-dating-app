import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_screen_state.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_view_model.dart';
import 'package:catch_l10n/generated/app_localizations_en.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

final _l10n = AppLocalizationsEn();
final _now = DateTime(2026, 11, 11, 12);

void main() {
  group('after-event screen state', () {
    test('maps loading, error and missing event branches', () {
      expect(
        _state(
          viewModel: const CatchAsyncState<EventRecapViewModel?>.loading(),
        ),
        isA<EventRecapLoading>(),
      );

      final error = StateError('recap failed');
      final errored = _state(
        viewModel: CatchAsyncState<EventRecapViewModel?>.error(error),
      );
      expect(errored, isA<EventRecapError>());
      expect((errored as EventRecapError).error, error);
      expect(errored.retryIntent.eventId, 'recap-event');

      expect(
        _state(viewModel: const CatchAsyncState.data(null)),
        isA<EventRecapMissingEvent>(),
      );
    });

    test('names the organiser in the kicker and the rating note', () {
      final ready = _ready(organizerName: 'Lantern Lane Social');

      expect(ready.kicker, 'Tuesday Trivia Night · Lantern Lane Social');
      expect(
        ready.rating.privacyNote,
        'Only Lantern Lane Social sees this, as part of a summary.',
      );
      expect(ready.rating.rating, 0);
      expect(ready.organizerName, 'Lantern Lane Social');
    });

    test('falls back to the event title before the organiser loads', () {
      final ready = _ready();

      expect(ready.kicker, 'Tuesday Trivia Night');
      expect(
        ready.rating.privacyNote,
        'Only the organizer sees this, as part of a summary.',
      );
      expect(ready.following, isNull);
    });

    test('lists your team first, with the team name', () {
      final ready = _ready(
        assignment: _assignment(peers: const ['dev'], title: 'Harbour Lights'),
      );

      expect(ready.people.rows.map((row) => row.attendeeId), [
        'dev',
        'rhea',
        'tara',
      ]);
      expect(ready.people.rows.first.subtitle, 'Your team · Harbour Lights');
      expect(ready.people.rows[1].subtitle, 'Mumbai · 29');
      expect(ready.people.rows[1].body, 'Product designer');
      expect(
        ready.people.countNote,
        '3 people from Tuesday Trivia Night, by your filters',
      );
    });

    test('marks people picked on this screen', () {
      final ready = _ready(pickedIds: const {'tara'});

      expect(
        ready.people.rows.where((row) => row.picked).map((r) => r.attendeeId),
        ['tara'],
      );
    });

    test('keeps picks open for 24 hours after the event', () {
      expect(_ready().people.canPick, isTrue);
      expect(_ready().people.windowNote, startsWith('Picks open until'));

      final closed = _ready(endedAgo: const Duration(hours: 25));
      expect(closed.people.canPick, isFalse);
      expect(closed.people.windowNote, 'Picks have closed');
    });

    test('shows the group chat with its closing date', () {
      final ready = _ready(chat: _chat(closesAt: DateTime(2026, 11, 18, 12)));

      expect(ready.chat?.title, 'Tuesday Trivia Night');
      expect(ready.chat?.subtitle, contains('then read-only'));
    });

    test('hides the group chat the guest cannot open', () {
      expect(_ready(chat: _chat(canRead: false, canJoin: false)).chat, isNull);
      expect(_ready().chat, isNull);
    });

    test('offers the organiser\'s next event, soonest first', () {
      final later = buildEvent(
        id: 'later',
        organizerId: 'org',
        name: 'Later night',
        startTime: _now.add(const Duration(days: 14)),
        endTime: _now.add(const Duration(days: 14, hours: 2)),
      );
      final sooner = buildEvent(
        id: 'sooner',
        organizerId: 'org',
        name: 'Next Tuesday',
        startTime: _now.add(const Duration(days: 7)),
        endTime: _now.add(const Duration(days: 7, hours: 2)),
      );

      final ready = _ready(organizerEvents: [later, sooner]);

      expect(ready.next?.eventId, 'sooner');
      expect(ready.next?.title, 'Next Tuesday');
      expect(ready.next?.kicker, startsWith('Next · '));
    });

    test('explains an empty list without dating language', () {
      final ready = _ready(attendeeIds: const []);

      final empty = ready.people.empty;
      expect(empty, isNotNull);
      for (final text in [empty!.title, empty.message]) {
        expect(text.toLowerCase(), isNot(contains('catch')));
        expect(text.toLowerCase(), isNot(contains('match')));
      }
    });
  });
}

EventRecapScreenState _state({
  required CatchAsyncState<EventRecapViewModel?> viewModel,
  Map<String, PublicProfile> profiles = const {},
  String? organizerName,
  EventSuccessAssignment? assignment,
  EventChatAccess? chat,
  List<dynamic> organizerEvents = const [],
  Set<String> pickedIds = const {},
}) => buildEventRecapScreenState(
  eventId: 'recap-event',
  l10n: _l10n,
  now: _now,
  inputs: EventRecapInputs(
    viewModel: viewModel,
    rosterProfiles: CatchAsyncState.data(profiles),
    organizerName: organizerName,
    assignment: assignment,
    chatAccess: chat,
    organizerEvents: organizerEvents.cast(),
    pickedIds: pickedIds,
  ),
);

EventRecapReady _ready({
  String? organizerName,
  EventSuccessAssignment? assignment,
  EventChatAccess? chat,
  List<dynamic> organizerEvents = const [],
  Set<String> pickedIds = const {},
  List<String> attendeeIds = const ['rhea', 'tara', 'dev'],
  Duration endedAgo = const Duration(hours: 2),
}) {
  final event = buildEvent(
    id: 'recap-event',
    organizerId: 'org',
    name: 'Tuesday Trivia Night',
    startTime: _now.subtract(endedAgo + const Duration(hours: 2)),
    endTime: _now.subtract(endedAgo),
  );
  final profiles = {
    'rhea': buildPublicProfile(
      uid: 'rhea',
      name: 'Rhea',
      age: 29,
    ).copyWith(city: 'Mumbai', occupation: 'Product designer'),
    'tara': buildPublicProfile(uid: 'tara', name: 'Tara', age: 31),
    'dev': buildPublicProfile(uid: 'dev', name: 'Dev', age: 27),
  };
  return _state(
        viewModel: CatchAsyncState.data(
          EventRecapViewModel(
            event: event,
            attendeeIds: attendeeIds,
            checkedInCount: attendeeIds.length + 1,
          ),
        ),
        profiles: profiles,
        organizerName: organizerName,
        assignment: assignment,
        chat: chat,
        organizerEvents: organizerEvents,
        pickedIds: pickedIds,
      )
      as EventRecapReady;
}

EventSuccessAssignment _assignment({
  required List<String> peers,
  required String title,
}) => EventSuccessAssignment(
  id: 'assignment',
  eventId: 'recap-event',
  organizerId: 'org',
  uid: 'viewer',
  moduleId: 'microPods',
  label: 'Team 4',
  displayTitle: title,
  peerUids: peers,
  source: 'test',
  createdAt: _now,
  updatedAt: _now,
);

EventChatAccess _chat({
  bool canRead = true,
  bool canJoin = true,
  DateTime? closesAt,
}) => EventChatAccess(
  eventId: 'recap-event',
  title: 'Tuesday Trivia Night',
  organizerId: 'org',
  roomStatus: 'open',
  roomRevision: 1,
  membershipStatus: 'joined',
  membershipRevision: 1,
  canManage: false,
  canJoin: canJoin,
  canReadMessages: canRead,
  closesAtMillis: closesAt?.millisecondsSinceEpoch,
  profileClaimRequired: false,
  termsVersion: 'event-chat-v1',
);
