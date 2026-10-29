import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_people.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../events/events_test_helpers.dart';
import 'host_inbox_test_fixtures.dart';

void main() {
  HostInboxPeople compose({
    List<ChatThreadPreview> catches = const [],
    List<HostWhatsappThreadSummary> whatsapp = const [],
    HostInboxScope scope = const HostInboxScope.general(),
    String query = '',
  }) => composeHostInboxPeople(
    organizerId: 'org',
    scope: scope,
    segment: HostInboxAudienceSegment.booked,
    catchThreads: catches,
    whatsappThreads: whatsapp,
    participations: null,
    query: query,
  );

  test('joins only verified account ids and retains source endpoints', () {
    final result = compose(
      catches: [preview('c1', 'one'), preview('c2', 'one')],
      whatsapp: [wa('w1', 'contact', uid: 'one')],
    );
    expect(result.people, hasLength(1));
    final person = result.people.single;
    expect(person.personId, 'uid:one');
    expect(person.catchThreads, hasLength(2));
    expect(person.whatsappThreads.single.threadId, 'w1');
    expect(person.knownUnreadCount, 4);
    expect(person.unreadCountIsComplete, isFalse);
    expect(person.previewText, 'WhatsApp w1');
  });
  test('identical names and missing or conflicting links never merge', () {
    final result = compose(
      catches: [preview('c1', 'one')],
      whatsapp: [
        wa('w1', 'contact1'),
        wa('w2', 'contact2', uid: 'two'),
      ],
    );
    expect(result.people, hasLength(3));
    expect(result.people.map((p) => p.key).toSet(), hasLength(3));
  });
  test('scope and organizer eligibility precede identity joining', () {
    final result = compose(
      catches: [
        preview('c1', 'one', events: ['event']),
        preview('c2', 'two', org: 'different'),
        preview('c3', 'one'),
      ],
      whatsapp: [
        wa('w1', 'contact', uid: 'one', events: ['other']),
      ],
    );
    expect(result.people, hasLength(1));
    expect(result.people.single.catchThreads.single.matchId, 'c3');
    expect(result.people.single.whatsappThreads, isEmpty);
  });
  test(
    'unknown classification stays visible and is never counted prospective',
    () {
      final result = compose(
        whatsapp: [
          wa('w1', 'contact', events: ['event']),
        ],
        scope: const HostInboxScope.event('event'),
      );
      expect(result.people, hasLength(1));
      expect(result.people.single.booked, isNull);
      expect(result.prospectiveCount, 0);
      expect(result.unclassifiedCount, 1);
    },
  );
  test('counts distinct people before search using authoritative roster', () {
    final event = buildEvent(id: 'event');
    final result = composeHostInboxPeople(
      organizerId: 'org',
      scope: const HostInboxScope.event('event'),
      segment: HostInboxAudienceSegment.booked,
      catchThreads: [
        preview('c1', 'one', events: ['event']),
        preview('c2', 'one', events: ['event']),
      ],
      whatsappThreads: [
        wa('w1', 'contact', uid: 'one', events: ['event']),
      ],
      participations: [buildEventParticipation(event: event, uid: 'one')],
      query: 'not present',
    );
    expect(result.bookedCount, 1);
    expect(result.people, isEmpty);
  });
  test(
    'identity changes split a previous join without recycling person keys',
    () {
      final before = compose(
        catches: [preview('c1', 'one')],
        whatsapp: [wa('w1', 'contact', uid: 'one')],
      );
      final after = compose(
        catches: [preview('c1', 'one')],
        whatsapp: [wa('w1', 'contact')],
      );
      expect(before.people, hasLength(1));
      expect(after.people, hasLength(2));
      expect(
        after.people
            .singleWhere((p) => p.personId == 'uid:one')
            .whatsappThreads,
        isEmpty,
      );
    },
  );

  group('program scope', () {
    const audience = HostInboxProgramAudience(
      contactIds: {'contact-a', 'contact-b'},
      linkedUids: {'guest-uid'},
    );
    const scope = HostInboxScope.program('program-1');

    HostInboxPeople programCompose({
      List<ChatThreadPreview> catches = const [],
      List<HostWhatsappThreadSummary> whatsapp = const [],
      HostInboxProgramAudience? audience = audience,
      String query = '',
    }) => composeHostInboxPeople(
      organizerId: 'org',
      scope: scope,
      segment: HostInboxAudienceSegment.booked,
      catchThreads: catches,
      whatsappThreads: whatsapp,
      participations: null,
      query: query,
      programAudience: audience,
    );

    test('shared guest membership proves no historical message purpose', () {
      for (final programId in ['program-a', 'program-b']) {
        final result = composeHostInboxPeople(
          organizerId: 'org',
          scope: HostInboxScope.program(programId),
          segment: HostInboxAudienceSegment.booked,
          catchThreads: [preview('private-a', 'guest-uid')],
          whatsappThreads: [
            wa(
              'private-a',
              'contact-a',
              uid: 'guest-uid',
              events: ['event-a', 'event-b'],
            ),
          ],
          participations: null,
          programAudience: audience,
        );
        expect(result.people, isEmpty, reason: programId);
        expect(result.bookedCount, 0);
        expect(result.prospectiveCount, 0);
        expect(result.unclassifiedCount, 0);
      }
    });

    test('missing audience yields an empty inbox, never all threads', () {
      final result = programCompose(
        catches: [preview('c1', 'guest-uid')],
        whatsapp: [wa('w1', 'contact-a', uid: 'guest-uid')],
        audience: null,
      );
      expect(result.people, isEmpty);
    });

    test('search still applies inside a program audience', () {
      final result = programCompose(
        whatsapp: [wa('w1', 'contact-a'), wa('w2', 'contact-b')],
        query: 'nothing matches',
      );
      expect(result.people, isEmpty);
    });
  });

  test('audience derives linked uids only from guest contacts', () {
    final audience = hostInboxProgramAudience(
      guestContactIds: ['contact-a', null],
      whatsappThreads: [
        wa('w1', 'contact-a', uid: 'guest-uid'),
        wa('w2', 'contact-z', uid: 'stranger'),
        wa('w3', 'contact-b'),
      ],
    );
    expect(audience.contactIds, {'contact-a'});
    expect(audience.linkedUids, {'guest-uid'});
  });
}
