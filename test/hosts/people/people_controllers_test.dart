import 'package:catch_dating_app/chats/chats.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/hosts/people/automations_controller.dart';
import 'package:catch_dating_app/hosts/people/automations_state.dart';
import 'package:catch_dating_app/hosts/people/compose_controller.dart';
import 'package:catch_dating_app/hosts/people/compose_state.dart';
import 'package:catch_dating_app/hosts/people/messages_controller.dart';
import 'package:catch_dating_app/hosts/people/messages_state.dart';
import 'package:catch_dating_app/hosts/people/people_controller.dart';
import 'package:catch_dating_app/hosts/people/people_state.dart';
import 'package:catch_dating_app/hosts/people/person_controller.dart';
import 'package:catch_dating_app/hosts/people/person_state.dart';
import 'package:catch_dating_app/hosts/people/saved_group_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../events/events_test_helpers.dart';
import '../../test_pump_helpers.dart';
import 'people_fixtures.dart';

const _org = 'organizer-1';

class _Contacts extends Fake implements HostContactsRepository {
  final queries = <HostAudienceQuery>[];

  @override
  Future<HostCrmSummary> getSummary(String organizerId) async =>
      const HostCrmSummary(
        organizerId: _org,
        contactCount: 1284,
        pastAttendeeCount: 900,
        repeatAttendeeCount: 300,
        linkedAccountCount: 800,
        importedContactCount: 100,
        whatsappOptInCount: 600,
        smsOptInCount: 0,
        truncated: false,
        inAppReadiness: HostCrmChannelReadiness.currentEventOnly,
        whatsappReadiness: HostCrmChannelReadiness.currentEventOnly,
        smsReadiness: HostCrmChannelReadiness.providerSetupRequired,
      );

  @override
  Future<({int count, HostAudienceMatchCountCoverage coverage})> countContacts(
    String organizerId, {
    HostAudienceQuery query = const HostAudienceQuery(),
  }) async => (
    count: switch (query.segment) {
      HostAudienceSegment.regular => 84,
      HostAudienceSegment.newToOrganizer => 148,
      _ => 37,
    },
    coverage: HostAudienceMatchCountCoverage.exact,
  );

  @override
  Future<HostAudiencePage> listContacts(
    String organizerId, {
    HostAudienceQuery query = const HostAudienceQuery(),
    int limit = 0,
  }) async {
    queries.add(query);
    final first = query.cursor == null;
    return HostAudiencePage(
      organizerId: organizerId,
      contacts: first
          ? peopleContacts.take(2).toList()
          : peopleContacts.skip(2).take(1).toList(),
      nextCursor: first ? 'page-2' : null,
      matchCount: 3,
      matchCountCoverage: HostAudienceMatchCountCoverage.exact,
      sourceCoverage: HostAudienceSourceCoverage.exact,
      projectionVersion: 1,
    );
  }
}

class _Groups extends Fake implements HostSavedAudienceRepository {
  HostSavedAudienceDefinition? saved;

  @override
  Future<HostSavedAudience> upsertSavedAudience({
    required String organizerId,
    required String requestId,
    required String name,
    required HostSavedAudienceDefinition definition,
    String? audienceId,
    int? expectedRevision,
  }) async {
    saved = definition;
    return savedGroupAudience;
  }
}

HostSavedAudienceSummary _summary(String id, String status) =>
    HostSavedAudienceSummary(
      organizerId: _org,
      audienceId: id,
      name: 'Group $id',
      status: status,
      isStatic: false,
      revision: 1,
      lastPreviewMatchCount: 12,
      lastPreviewAt: null,
      updatedAt: DateTime(2026, 10),
    );

Future<void> _settle(ProviderContainer container) => flushTestEventQueue();

HostWhatsappThreadSummary _whatsapp(
  String id, {
  String? linkedUid,
  List<String> eventIds = const [],
  HostWhatsappMessageDirection direction = HostWhatsappMessageDirection.inbound,
  required DateTime at,
}) => HostWhatsappThreadSummary(
  threadId: id,
  contactId: 'contact-$id',
  linkedUid: linkedUid,
  displayName: 'Person $id',
  eventIds: eventIds,
  lastMessageBody: 'Body $id',
  lastMessageDirection: direction,
  lastMessageAt: at,
  lastInboundAt: at,
  serviceWindowExpiresAt: at,
  serviceWindowOpen: true,
);

void main() {
  test('People composes everyone, the segment counts, the active saved '
      'groups and the first directory page, then appends the next', () async {
    final contacts = _Contacts();
    final container = ProviderContainer.test(
      overrides: [
        hostContactsRepositoryProvider.overrideWithValue(contacts),
        hostAllSavedAudienceSummariesProvider(_org).overrideWith(
          (ref) async => HostSavedAudienceSummaryPage(
            audiences: [_summary('a', 'active'), _summary('b', 'archived')],
            nextCursor: null,
          ),
        ),
      ],
    );
    const request = HostPeopleRequest(organizerId: _org);
    container.listen(hostPeopleControllerProvider(request), (_, _) {});
    expect(
      container.read(hostPeopleControllerProvider(request)).status,
      HostPeopleStatus.loading,
    );
    await _settle(container);

    var state = container.read(hostPeopleControllerProvider(request));
    expect(state.status, HostPeopleStatus.ready);
    expect(state.total, 1284);
    expect(
      {for (final option in state.filters) option.filter: option.count},
      {
        HostPeopleFilter.everyone: 1284,
        HostPeopleFilter.regulars: 84,
        HostPeopleFilter.newFaces: 148,
        HostPeopleFilter.drifting: 37,
      },
    );
    expect(state.groups.map((group) => group.audienceId), ['a']);
    expect(state.people.map((person) => person.contactId), ['rk', 'dp']);
    expect(state.canLoadMore, isTrue);

    await container
        .read(hostPeopleDirectoryProvider(request).notifier)
        .loadMore();
    state = container.read(hostPeopleControllerProvider(request));
    expect(state.people.map((person) => person.contactId), ['rk', 'dp', 'as']);
    expect(state.canLoadMore, isFalse);
    expect(contacts.queries.last.cursor, 'page-2');
  });

  test('a filter asks the directory for its segment', () async {
    final contacts = _Contacts();
    final container = ProviderContainer.test(
      overrides: [
        hostContactsRepositoryProvider.overrideWithValue(contacts),
        hostAllSavedAudienceSummariesProvider(_org).overrideWith(
          (ref) async => const HostSavedAudienceSummaryPage(
            audiences: [],
            nextCursor: null,
          ),
        ),
      ],
    );
    const request = HostPeopleRequest(
      organizerId: _org,
      filter: HostPeopleFilter.drifting,
    );
    container.listen(hostPeopleControllerProvider(request), (_, _) {});
    await _settle(container);
    expect(contacts.queries.single.segment, HostAudienceSegment.lapsedRegular);
  });

  test('a person reads the record with its history', () async {
    final container = ProviderContainer.test(
      overrides: [
        hostAudienceContactHistoryProvider(
          _org,
          'rk',
        ).overrideWith((ref) async => peopleDetail()),
      ],
    );
    container.listen(hostPersonControllerProvider(_org, 'rk'), (_, _) {});
    await _settle(container);
    final state = container.read(hostPersonControllerProvider(_org, 'rk'));
    expect(state.status, HostPersonStatus.ready);
    expect(state.nights, 6);
    expect(state.spentMinor, 349400);
    expect(state.since, DateTime(2026, 3, 3, 19, 30));
    expect(state.nightsWithYou.first.eventId, 'e1');
  });

  test('Automatic messages groups the rules and counts this month', () async {
    final month = DateTime(2026, 10);
    final container = ProviderContainer.test(
      overrides: [
        hostMessagingSetupProvider(_org).overrideWith(
          (ref) async => const HostMessagingSetup(
            organizerId: _org,
            providerConfigured: true,
            embeddedSignup: HostWhatsappEmbeddedSignupConfig(
              appId: null,
              configId: null,
              graphVersion: null,
            ),
            connection: null,
            templates: [],
          ),
        ),
        hostPeopleAutomationsProvider(_org).overrideWith(
          (ref) async => HostFormAutomationPage(
            rules: [
              peopleRule(
                'a',
                'Thanks',
                HostFormAutomationTrigger.eventAttended,
              ),
              peopleRule(
                'b',
                'Welcome',
                HostFormAutomationTrigger.responseSubmitted,
                enabled: false,
              ),
            ],
            runs: [
              for (final (index, day) in [3, 9, 30].indexed)
                HostFormAutomationRun(
                  runId: 'run-$index',
                  ruleId: 'a',
                  ruleRevision: 1,
                  responseId: null,
                  eventKind: 'eventAttended',
                  status: HostFormAutomationRunStatus.succeeded,
                  attemptCount: 1,
                  actionResults: const [],
                  errorMessage: null,
                  createdAt: DateTime(2026, day == 30 ? 9 : 10, day),
                  completedAt: null,
                ),
            ],
            nextCursor: null,
          ),
        ),
      ],
    );
    container.listen(hostAutomationsControllerProvider(_org, month), (_, _) {});
    await _settle(container);
    final state = container.read(
      hostAutomationsControllerProvider(_org, month),
    );
    expect(state.status, HostAutomationsStatus.ready);
    expect(state.whatsappOn, isFalse);
    expect(state.aroundEvents.single.ruleId, 'a');
    expect(state.keepingPeople.single.ruleId, 'b');
    expect(state.onCount, 1);
    expect(state.sentThisMonth, 2);
  });

  test('Compose starts on the next event and counts its audiences', () async {
    final now = DateTime(2026, 10, 27, 12);
    final past = buildEvent(
      id: 'past',
      organizerId: _org,
      startTime: DateTime(2026, 10, 20, 19),
      endTime: DateTime(2026, 10, 20, 22),
    );
    final later = buildEvent(
      id: 'later',
      organizerId: _org,
      startTime: DateTime(2026, 11, 3, 19),
      endTime: DateTime(2026, 11, 3, 22),
    );
    final next = buildEvent(
      id: 'next',
      organizerId: _org,
      startTime: DateTime(2026, 10, 27, 19),
      endTime: DateTime(2026, 10, 27, 22),
    );
    final container = ProviderContainer.test(
      overrides: [
        watchEventsForOrganizerProvider(
          _org,
        ).overrideWith((ref) => Stream.value(<Event>[past, later, next])),
        watchEventParticipationsForEventProvider(
          'next',
        ).overrideWith((ref) => Stream.value(const <EventParticipation>[])),
      ],
    );
    final request = HostComposeRequest(organizerId: _org, now: now);
    container.listen(hostComposeControllerProvider(request), (_, _) {});
    await _settle(container);
    final state = container.read(hostComposeControllerProvider(request));
    expect(state.status, HostComposeStatus.ready);
    expect(state.event?.id, 'next');
    expect(state.events.map((event) => event.id), ['next', 'later']);
    expect(state.recipients(HostComposeAudience.everyone), 0);
  });

  test('Messages merges a person across sources, newest first, and keeps '
      'Unread and Tonight', () async {
    final day = DateTime(2026, 10, 27);
    final tonight = buildEvent(
      id: 'tonight',
      organizerId: _org,
      startTime: DateTime(2026, 10, 27, 19),
      endTime: DateTime(2026, 10, 27, 22),
    );
    final container = ProviderContainer.test(
      overrides: [
        chatsListViewModelProvider.overrideWithValue(
          const AsyncData(
            ChatsListViewModel(
              newMatches: [],
              conversations: [],
              totalThreadCount: 0,
            ),
          ),
        ),
        hostWhatsappThreadsProvider(_org).overrideWith(
          (ref) async => HostWhatsappThreadPage(
            organizerId: _org,
            threads: [
              _whatsapp('a', at: DateTime(2026, 10, 27, 9)),
              _whatsapp(
                'b',
                linkedUid: 'uid-b',
                eventIds: ['tonight'],
                direction: HostWhatsappMessageDirection.outbound,
                at: DateTime(2026, 10, 27, 11),
              ),
            ],
            nextCursor: null,
          ),
        ),
        watchEventsForOrganizerProvider(
          _org,
        ).overrideWith((ref) => Stream.value(<Event>[tonight])),
        hostMessagingSetupProvider(_org).overrideWith(
          (ref) => Future<HostMessagingSetup>.error(StateError('offline')),
        ),
        hostPeopleAutomationsProvider(_org).overrideWith(
          (ref) async => const HostFormAutomationPage(
            rules: [],
            runs: [],
            nextCursor: null,
          ),
        ),
      ],
    );
    final all = HostMessagesRequest(organizerId: _org, day: day);
    container.listen(hostMessagesControllerProvider(all), (_, _) {});
    await _settle(container);
    final state = container.read(hostMessagesControllerProvider(all));
    expect(state.status, HostMessagesStatus.ready);
    expect(state.threads.map((thread) => thread.personId), [
      'uid:uid-b',
      'contact:contact-a',
    ]);
    expect(state.threads.first.tonight, isTrue);
    expect(state.threads.first.unread, isFalse);
    expect(state.unreadCount, 1);
    expect(state.automationsOn, 0);

    final unread = HostMessagesRequest(
      organizerId: _org,
      day: day,
      filter: HostMessagesFilter.unread,
    );
    container.listen(hostMessagesControllerProvider(unread), (_, _) {});
    await _settle(container);
    expect(
      container
          .read(hostMessagesControllerProvider(unread))
          .threads
          .single
          .personId,
      'contact:contact-a',
    );
  });

  test(
    'saving a group changes the attendance rule and keeps the rest',
    () async {
      final groups = _Groups();
      await HostSavedGroupCommands(groups).save(
        organizerId: _org,
        requestId: 'r',
        name: 'Trivia regulars',
        atLeast: 5,
        audience: savedGroupAudience,
      );
      final predicates = groups.saved!.predicates;
      expect(predicates, hasLength(2));
      expect(
        (predicates.first as HostSavedAudienceAttendanceCount).eventCount,
        5,
      );
      expect(predicates.last, isA<HostSavedAudienceLastSeenWithinDays>());
    },
  );
}
