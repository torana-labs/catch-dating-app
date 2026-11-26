import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/hosts/people/automations_controller.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_people.dart';
import 'package:catch_dating_app/hosts/people/messages_controller.dart';
import 'package:catch_dating_app/hosts/people/messages_state.dart';
import 'package:catch_dating_app/pages/inbox/chats_list_view_model.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_test_support/events_test_helpers.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _org = 'org';

ChatThreadPreview _catch(String uid, {List<String> events = const []}) {
  final match = Match(
    id: 'match-$uid',
    user1Id: 'host',
    user2Id: uid,
    organizerId: _org,
    conversationType: MatchConversationType.organizerHostInquiry,
    createdAt: DateTime(2026, 10, 2),
    eventIds: events,
  );
  return ChatThreadPreview(
    match: match,
    matchId: match.id,
    otherUid: uid,
    displayName: 'Person $uid',
    photoUrl: null,
    previewText: 'Catch $uid',
    timestamp: DateTime(2026, 10, 2, uid.codeUnitAt(0)),
    unreadCount: 0,
    hasConversation: true,
    eventIds: events,
  );
}

HostWhatsappThreadSummary _whatsapp(String contact, List<String> events) =>
    HostWhatsappThreadSummary(
      threadId: 'wa-$contact',
      contactId: contact,
      displayName: 'Contact $contact',
      eventIds: events,
      lastMessageBody: 'WhatsApp $contact',
      lastMessageDirection: HostWhatsappMessageDirection.inbound,
      lastMessageAt: DateTime(2026, 10, 3),
      lastInboundAt: DateTime(2026, 10, 3),
      serviceWindowExpiresAt: DateTime(2026, 10, 4),
      serviceWindowOpen: true,
    );

void main() {
  final day = DateTime(2026, 10, 27);
  final event = buildEvent(
    id: 'event',
    organizerId: _org,
    startTime: DateTime(2026, 10, 30, 19),
    endTime: DateTime(2026, 10, 30, 22),
  );

  ProviderContainer container({bool whatsappHasMore = false}) {
    final container = ProviderContainer.test(
      overrides: [
        uidProvider.overrideWithValue(const AsyncData('host')),
        chatsListViewModelProvider.overrideWithValue(
          AsyncData(
            ChatsListViewModel(
              newMatches: const [],
              conversations: [
                _catch('a', events: ['event']),
                _catch('b'),
                _catch('c', events: ['event']),
              ],
              totalThreadCount: 3,
            ),
          ),
        ),
        hostWhatsappThreadPagesProvider(_org).overrideWithBuild(
          (ref, notifier) => Stream.value(
            LivePages(
              items: [
                _whatsapp('x', ['event']),
              ],
              hasMore: whatsappHasMore,
            ),
          ),
        ),
        watchEventsForOrganizerProvider(
          _org,
        ).overrideWith((ref) => Stream.value([event])),
        watchEventParticipationsForEventProvider('event').overrideWith(
          (ref) => Stream.value([
            buildEventParticipation(event: event, uid: 'a'),
            buildEventParticipation(
              event: event,
              uid: 'c',
              status: EventParticipationStatus.waitlisted,
            ),
          ]),
        ),
        organizerProgramListProvider(
          _org,
        ).overrideWithValue(const AsyncData([])),
        hostMessagingSetupProvider(_org).overrideWith(
          (ref) => Future<HostMessagingSetup>.error(StateError('offline')),
        ),
        hostPeopleAutomationsProvider(_org).overrideWith(
          (ref) async =>
              const HostFormAutomationPage(rules: [], runs: [], hasMore: false),
        ),
      ],
    );
    addTearDown(container.dispose);
    return container;
  }

  Future<HostMessagesState> read(
    ProviderContainer container,
    HostMessagesRequest request,
  ) async {
    container.listen(hostMessagesControllerProvider(request), (_, _) {});
    await flushTestEventQueue();
    return container.read(hostMessagesControllerProvider(request));
  }

  test('an event scope splits booked from prospective and keeps unknown '
      'bookings in both', () async {
    final c = container();
    const scope = HostInboxScope.event('event');
    final booked = await read(
      c,
      HostMessagesRequest(organizerId: _org, day: day, scope: scope),
    );
    expect(booked.threads.map((t) => t.personId), ['uid:a', 'contact:x']);
    expect(booked.bookedCount, 1);
    expect(booked.prospectiveCount, 1);
    expect(booked.unclassifiedCount, 1);
    expect(
      booked.threads.firstWhere((t) => t.personId == 'contact:x').booked,
      isNull,
    );
    expect(booked.scopes.events.single.id, 'event');

    final prospective = await read(
      c,
      HostMessagesRequest(
        organizerId: _org,
        day: day,
        scope: scope,
        segment: HostInboxAudienceSegment.prospective,
      ),
    );
    expect(prospective.threads.map((t) => t.personId), ['uid:c', 'contact:x']);
  });

  test('General inquiries holds only conversations about no event', () async {
    final general = await read(
      container(),
      HostMessagesRequest(
        organizerId: _org,
        day: day,
        scope: const HostInboxScope.general(),
      ),
    );
    expect(general.threads.map((t) => t.personId), ['uid:b']);
    expect(general.unclassifiedCount, 0);
  });

  test('the name search narrows every scope', () async {
    final all = await read(
      container(),
      HostMessagesRequest(organizerId: _org, day: day, query: 'person c'),
    );
    expect(all.threads.map((t) => t.personId), ['uid:c']);
  });

  test('more WhatsApp pages mark the list partial and offer more', () async {
    final state = await read(
      container(whatsappHasMore: true),
      HostMessagesRequest(organizerId: _org, day: day),
    );
    expect(state.partial, isTrue);
    expect(state.partialFailed, isFalse);
    expect(state.moreWhatsapp, HostMessagesMore.more);
    expect(state.bookedCount, isNull);
  });
}
