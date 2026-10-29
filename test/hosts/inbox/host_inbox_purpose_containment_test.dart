import 'dart:async';

import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_input.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_catch_pages_controller.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_person_page_body.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_program_audience_controller.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_person_conversation_page_body.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_reply_drafts.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../events/events_test_helpers.dart';
import '../../test_pump_helpers.dart';
import 'host_inbox_test_fixtures.dart';

class _Programs extends Fake implements ProgramSetupRepository {
  final details = <String, Completer<OrganizerProgramDetail>>{};
  final reads = <String>[];
  final guestReads = <String>[];

  @override
  Future<OrganizerProgramDetail> getProgram(String programId) {
    reads.add(programId);
    return details.putIfAbsent(programId, Completer.new).future;
  }

  @override
  Future<ProgramGuestListPage> listGuests(
    String programId, {
    int? limit,
    String? cursor,
  }) async {
    guestReads.add(programId);
    return ProgramGuestListPage(
      programId: programId,
      guests: const [
        ProgramGuestRow(
          guestId: 'shared-guest',
          displayName: 'Same name',
          contactId: 'contact',
          groupIds: [],
          invitationStatus: 'sent',
          rsvpStatus: 'unknown',
          revision: 1,
        ),
      ],
      households: const [],
      functionGuests: const [],
      groups: const [],
      nextCursor: 'truncated-guests',
    );
  }

  void allow(String id, {String organizer = 'org'}) {
    details
        .putIfAbsent(id, Completer.new)
        .complete(
          OrganizerProgramDetail(
            program: OrganizerProgramSettings(
              programId: id,
              organizerId: organizer,
              kind: ProgramKind.wedding,
              title: 'Program $id',
              timezone: 'Etc/UTC',
              status: ProgramStatus.active,
              startsAt: DateTime(2026),
              endsAt: DateTime(2027),
              capabilities: const [],
              revision: 1,
            ),
            functions: const [],
            pickupPoints: const [],
            hotels: const [],
            counts: const {},
          ),
        );
  }
}

class _Conversations extends Fake implements ConversationRepository {
  int markedRead = 0;
  @override
  Future<void> markRead({
    required String conversationId,
    required String uid,
  }) async {
    markedRead++;
  }
}

void main() {
  const unavailable = 'Program conversations unavailable';
  final event = buildEvent(id: 'event', clubId: 'org');

  Future<
    ({
      ProviderContainer container,
      _Conversations conversations,
      HostReplyDrafts drafts,
    })
  >
  mount(
    WidgetTester tester,
    _Programs programs,
    ValueNotifier<({String organizer, HostInboxScope scope, String selection})>
    route, {
    bool includeWhatsapp = true,
  }) async {
    final source = preview('catch-a', 'guest', events: ['event']);
    final conversations = _Conversations();
    final drafts = HostReplyDrafts();
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWithValue(const AsyncData('host')),
        programSetupRepositoryProvider.overrideWithValue(programs),
        // Missing and truncated menus cannot prove or revoke exact-program authority.
        organizerProgramListProvider(
          'org',
        ).overrideWithValue(const AsyncData([])),
        watchEventsForClubProvider('org').overrideWithValue(AsyncData([event])),
        watchEventParticipationsForEventProvider('event').overrideWithValue(
          AsyncData([buildEventParticipation(event: event, uid: 'guest')]),
        ),
        hostInboxCatchViewModelProvider.overrideWithValue(
          AsyncData(
            ChatsListViewModel(
              newMatches: const [],
              conversations: [source],
              totalThreadCount: 1,
            ),
          ),
        ),
        hostWhatsappThreadsProvider('org').overrideWithValue(
          AsyncData(
            HostWhatsappThreadPage(
              organizerId: 'org',
              threads: [
                if (includeWhatsapp)
                  wa(
                    'wa-a',
                    'contact',
                    uid: 'guest',
                    events: ['event', 'other'],
                  ),
              ],
              nextCursor: null,
            ),
          ),
        ),
        matchStreamProvider(
          'catch-a',
        ).overrideWithValue(AsyncData(source.match)),
        watchConversationMessagesProvider('catch-a').overrideWithValue(
          AsyncData([
            ChatMessage(
              id: 'private-a',
              senderId: 'guest',
              text: 'Private event history',
              sentAt: DateTime(2026),
            ),
          ]),
        ),
        conversationRepositoryProvider.overrideWithValue(conversations),
      ],
    );
    addTearDown(container.dispose);
    addTearDown(drafts.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: ValueListenableBuilder(
              valueListenable: route,
              builder: (context, value, child) => HostInboxPersonPageBody(
                organizerId: value.organizer,
                selection: value.selection,
                scope: value.scope,
                now: DateTime(2026, 10, 26),
                segment: HostInboxAudienceSegment.booked,
                drafts: drafts,
                onBack: () {},
              ),
            ),
          ),
        ),
      ),
    );
    return (container: container, conversations: conversations, drafts: drafts);
  }

  ValueNotifier<({String organizer, HostInboxScope scope, String selection})>
  newRoute({String program = 'a', String selection = 'uid:guest'}) {
    final route = ValueNotifier((
      organizer: 'org',
      scope: HostInboxScope.program(program),
      selection: selection,
    ));
    addTearDown(route.dispose);
    return route;
  }

  void expectContained(_Conversations conversations) {
    expect(find.byType(HostPersonConversationPageBody), findsNothing);
    expect(find.byType(ChatInput), findsNothing);
    expect(find.text('Private event history'), findsNothing);
    expect(find.text('Same name'), findsNothing);
    expect(conversations.markedRead, 0);
  }

  for (final selection in ['uid:guest', 'catch-a', 'wa-a', 'contact:contact']) {
    testWidgets(
      'program direct link $selection never mounts history or actions',
      (tester) async {
        final programs = _Programs()
          ..allow('a')
          ..allow('b');
        final route = newRoute(selection: selection);
        final harness = await mount(tester, programs, route);
        await pumpFeatureUi(tester);
        expect(find.text(unavailable), findsOneWidget);
        expectContained(harness.conversations);
        for (final id in ['b', 'a', 'b']) {
          route.value = (
            organizer: 'org',
            scope: HostInboxScope.program(id),
            selection: selection,
          );
          await pumpFeatureUi(tester);
          expect(find.text(unavailable), findsOneWidget);
          expectContained(harness.conversations);
        }
        expect(programs.reads, containsAll(['a', 'b']));
      },
    );
  }

  testWidgets(
    'late program completion after workspace switch cannot mount old history',
    (tester) async {
      final programs = _Programs();
      final route = newRoute();
      final harness = await mount(tester, programs, route);
      await tester.pump();
      route.value = (
        organizer: 'org',
        scope: const HostInboxScope.program('b'),
        selection: 'catch-a',
      );
      await tester.pump();
      programs.allow('b');
      await pumpFeatureUi(tester);
      programs.allow('a');
      await pumpFeatureUi(tester);
      expect(find.text('Program b'), findsOneWidget);
      expect(find.text('Program a'), findsNothing);
      expectContained(harness.conversations);
    },
  );

  testWidgets(
    'denied or foreign exact program never requests guests or opens fallback',
    (tester) async {
      final programs = _Programs();
      final route = newRoute();
      final harness = await mount(tester, programs, route);
      await tester.pump();
      programs.details['a']!.completeError(StateError('denied'));
      await pumpFeatureUi(tester);
      expect(find.byType(CatchLocalizedErrorState), findsOneWidget);
      expect(programs.guestReads, isEmpty);
      expectContained(harness.conversations);
      route.value = (
        organizer: 'other-org',
        scope: const HostInboxScope.program('b'),
        selection: 'catch-a',
      );
      await tester.pump();
      programs.allow('b');
      await pumpFeatureUi(tester);
      expect(find.byType(CatchLocalizedErrorState), findsOneWidget);
      expect(programs.guestReads, isEmpty);
      expectContained(harness.conversations);
    },
  );

  testWidgets(
    'revoked exact-program read replaces safe state with scoped error',
    (tester) async {
      final programs = _Programs()..allow('a');
      final route = newRoute();
      final harness = await mount(tester, programs, route);
      await pumpFeatureUi(tester);
      programs.details['a'] = Completer();
      harness.container.invalidate(
        hostInboxProgramAudiencePagesProvider('org', 'a'),
      );
      await tester.pump();
      programs.details['a']!.completeError(StateError('revoked'));
      await pumpFeatureUi(tester);
      expect(find.byType(CatchLocalizedErrorState), findsOneWidget);
      expectContained(harness.conversations);
    },
  );

  testWidgets(
    'canonical event detail remains available after program containment',
    (tester) async {
      final programs = _Programs()..allow('a');
      final route = newRoute();
      final harness = await mount(
        tester,
        programs,
        route,
        includeWhatsapp: false,
      );
      await pumpFeatureUi(tester);
      expectContained(harness.conversations);
      route.value = (
        organizer: 'org',
        scope: const HostInboxScope.event('event'),
        selection: 'catch-a',
      );
      // Keep the positive control to a canonical Catch event endpoint.
      await pumpFeatureUi(tester);
      expect(find.byType(HostPersonConversationPageBody), findsOneWidget);
      expect(find.text('Private event history'), findsOneWidget);
      expect(harness.conversations.markedRead, 1);
      route.value = (
        organizer: 'org',
        scope: const HostInboxScope.program('a'),
        selection: 'catch-a',
      );
      await pumpFeatureUi(tester);
      expect(find.byType(ChatInput), findsNothing);
      expect(find.text('Private event history'), findsNothing);
      expect(harness.conversations.markedRead, 1);
    },
  );
}
