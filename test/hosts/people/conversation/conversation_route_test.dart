import 'package:catch_dating_app/hosts/people/compose_screen.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_people.dart';
import 'package:catch_dating_app/hosts/people/messages_screen.dart';
import 'package:catch_dating_app/routing/host_router.dart' as app_router;
import 'package:flutter_test/flutter_test.dart';

void main() {
  HostMessagesScreen messages(String uri, {String? organizerId}) =>
      app_router.hostMessagesScreenForUri(
            Uri.parse(uri),
            initialOrganizerId: organizerId,
          )
          as HostMessagesScreen;

  test('a thread link opens Messages on the conversation and its scope', () {
    final event = messages(
      '/host/inbox?organizerId=org-1&threadId=uid:guest&eventId=event-1',
    );
    expect(event.initialOrganizerId, 'org-1');
    expect(event.threadId, 'uid:guest');
    expect(event.threadScope, const HostInboxScope.event('event-1'));
    expect(event.initialScope, isNull);

    final general = messages('/host/inbox?threadId=match-2&scope=general');
    expect(general.threadId, 'match-2');
    expect(general.threadScope, const HostInboxScope.general());

    // A Today attention link names only the thread; its scope is read from
    // the conversation itself.
    final bare = messages('/host/inbox?threadId=wa-3', organizerId: 'org-2');
    expect(bare.threadScope, isNull);
    expect(bare.initialOrganizerId, 'org-2');
  });

  test('an event wins over a programme in a thread link', () {
    final screen = messages(
      '/host/inbox?threadId=uid:guest&eventId=event-1&programId=program-1',
    );
    expect(screen.threadScope, const HostInboxScope.event('event-1'));
  });

  test('a programme link opens Messages on the programme scope', () {
    final screen = messages(
      '/host/inbox?programId=program-1&organizerId=org-2&segment=prospective',
    );
    expect(screen.threadId, isNull);
    expect(screen.initialScope, const HostInboxScope.program('program-1'));
    expect(screen.initialSegment, HostInboxAudienceSegment.prospective);
    expect(screen.initialOrganizerId, 'org-2');
  });

  test('an event link without a thread still opens the compose screen', () {
    final screen = app_router.hostMessagesScreenForUri(
      Uri.parse('/host/inbox?eventId=event-1&organizerId=org-1'),
    );
    expect(screen, isA<HostComposeScreen>());
    final compose = screen as HostComposeScreen;
    expect(compose.eventId, 'event-1');
    expect(compose.organizerId, 'org-1');
  });

  test('plain and inbox-workspace links open Messages', () {
    expect(messages('/host/inbox').threadId, isNull);
    expect(messages('/host/inbox?workspace=inbox').threadId, isNull);
  });
}
