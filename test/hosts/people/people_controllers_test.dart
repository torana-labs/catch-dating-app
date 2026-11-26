import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
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
import 'package:catch_dating_app/hosts/people/saved_group_state.dart';
import 'package:catch_dating_app/pages/inbox/chats_list_view_model.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_test_support/events_test_helpers.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'people_fixtures.dart';

const _org = 'organizer-1';

class _Contacts extends Fake implements HostContactsRepository {
  final queries = <HostAudienceQuery>[];
  final pageSizes = <int>[];
  final pager = _Pager();

  @override
  Stream<HostContactDirectory> watchDirectory(String organizerId) =>
      Stream.value(
        const HostContactDirectory({
          'summary': {
            'organizerId': _org,
            'contactCount': 1284,
            'pastAttendeeCount': 900,
            'repeatAttendeeCount': 300,
            'advocateCount': 0,
            'highImpactAdvocateCount': 0,
            'linkedAccountCount': 800,
            'importedContactCount': 100,
            'whatsappOptInCount': 600,
            'smsOptInCount': 0,
            'truncated': false,
            'readiness': {
              'inApp': 'currentEventOnly',
              'whatsapp': 'currentEventOnly',
              'sms': 'providerSetupRequired',
            },
          },
          'segmentCounts': {
            'regular': 84,
            'new_to_organizer': 148,
            'lapsed_regular': 37,
          },
        }),
      );

  @override
  LivePager<HostAudienceContact> watchContacts(
    String organizerId, {
    required HostAudienceQuery query,
    int pageSize = hostPeoplePageSize,
  }) {
    queries.add(query);
    pageSizes.add(pageSize);
    return pager;
  }
}

/// Two pages: two people, then a third with nothing after it.
class _Pager implements LivePager<HostAudienceContact> {
  final _controller = StreamController<LivePages<HostAudienceContact>>();
  var loadMoreCalls = 0;

  @override
  Stream<LivePages<HostAudienceContact>> get pages {
    _controller.add(
      LivePages(items: peopleContacts.take(2).toList(), hasMore: true),
    );
    return _controller.stream;
  }

  @override
  void loadMore() {
    loadMoreCalls++;
    _controller
      ..add(
        LivePages(
          items: peopleContacts.take(2).toList(),
          hasMore: true,
          loadingMore: true,
        ),
      )
      ..add(LivePages(items: peopleContacts.take(3).toList(), hasMore: false));
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
          (ref) => Stream.value(
            HostSavedAudienceSummaryPage(
              audiences: [_summary('a', 'active'), _summary('b', 'archived')],
              nextCursor: null,
            ),
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
    // More rows opens one more page on the same pager.
    await _settle(container);
    state = container.read(hostPeopleControllerProvider(request));
    expect(state.people.map((person) => person.contactId), ['rk', 'dp', 'as']);
    expect(state.canLoadMore, isFalse);
    expect(contacts.pager.loadMoreCalls, 1);
    expect(contacts.pageSizes, [hostPeoplePageSize]);
  });

  test('a filter asks the directory for its segment', () async {
    final contacts = _Contacts();
    final container = ProviderContainer.test(
      overrides: [
        hostContactsRepositoryProvider.overrideWithValue(contacts),
        hostAllSavedAudienceSummariesProvider(_org).overrideWith(
          (ref) => Stream.value(
            const HostSavedAudienceSummaryPage(audiences: [], nextCursor: null),
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

  test('a person reads their row, detail facts and newest note', () async {
    final detail = peopleDetail();
    final container = ProviderContainer.test(
      overrides: [
        hostContactSummaryRowProvider(_org, 'rk').overrideWith(
          (ref) => Stream.value((
            contact: HostAudienceContact(
              contactId: 'rk',
              displayName: detail.displayName,
              phoneE164: null,
              email: null,
              identityState: HostAudienceIdentityState.verified,
              identityConfidence: 'verified',
              ambiguousCandidateCount: 0,
              attendedEventCount: 6,
              expectedEventCount: 6,
              lastAttendedAt: null,
              segments: const {HostAudienceSegment.regular},
              manualTags: detail.manualTags,
              whatsappStatus: HostAudiencePermissionStatus.optedIn,
              whatsappAdminSuppressed: false,
              smsStatus: HostAudiencePermissionStatus.unknown,
              sourceCoverage: HostAudienceSourceCoverage.exact,
              revision: 3,
            ),
            linkedAccount: true,
          )),
        ),
        hostContactDetailFactsProvider(_org, 'rk').overrideWith(
          (ref) => Stream.value(
            HostContactDetailFacts(
              traits: detail.traits,
              revenue: detail.revenue,
              events: detail.events,
              eventsTruncated: false,
            ),
          ),
        ),
        hostContactNotesProvider(_org, 'rk').overrideWith(
          (ref) => Stream.value((notes: detail.notes, truncated: false)),
        ),
      ],
    );
    container.listen(hostPersonControllerProvider(_org, 'rk'), (_, _) {});
    await _settle(container);
    final state = container.read(hostPersonControllerProvider(_org, 'rk'));
    expect(state.status, HostPersonStatus.ready);
    expect(state.name, 'Rhea Kapoor');
    expect(state.nights, 6);
    expect(state.spentMinor, 349400);
    expect(state.since, DateTime(2026, 3, 3, 19, 30));
    expect(state.nightsWithYou.first.eventId, 'e1');
    expect(state.detail!.manualTags.map((tag) => tag.label), [
      'Trivia regular',
      'Brings friends',
      'Vegetarian',
    ]);
    expect(state.detail!.notes.single.noteId, 'n1');
    expect(state.detail!.revision, 3);
    expect(state.detail!.historyLoaded, isFalse);
  });

  test('a person whose detail view is missing shows the error', () async {
    final container = ProviderContainer.test(
      overrides: [
        hostContactSummaryRowProvider(
          _org,
          'rk',
        ).overrideWith((ref) => const Stream.empty()),
        hostContactDetailFactsProvider(_org, 'rk').overrideWith(
          (ref) => Stream.error(const FormatException('missing view')),
        ),
        hostContactNotesProvider(_org, 'rk').overrideWith(
          (ref) => Stream.value((notes: const [], truncated: false)),
        ),
      ],
      retry: (_, _) => null,
    );
    container.listen(hostPersonControllerProvider(_org, 'rk'), (_, _) {});
    await _settle(container);
    final state = container.read(hostPersonControllerProvider(_org, 'rk'));
    expect(state.status, HostPersonStatus.error);
    expect(state.error, isA<FormatException>());
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
            hasMore: false,
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
        uidProvider.overrideWithValue(const AsyncData('host')),
        organizerProgramListProvider(
          _org,
        ).overrideWithValue(const AsyncData([])),
        hostWhatsappThreadPagesProvider(_org).overrideWithBuild(
          (ref, notifier) => Stream.value(
            LivePages(
              items: [
                _whatsapp('a', at: DateTime(2026, 10, 27, 9)),
                _whatsapp(
                  'b',
                  linkedUid: 'uid-b',
                  eventIds: ['tonight'],
                  direction: HostWhatsappMessageDirection.outbound,
                  at: DateTime(2026, 10, 27, 11),
                ),
              ],
              hasMore: false,
            ),
          ),
        ),
        watchEventsForOrganizerProvider(
          _org,
        ).overrideWith((ref) => Stream.value(<Event>[tonight])),
        hostMessagingSetupProvider(_org).overrideWith(
          (ref) => Future<HostMessagingSetup>.error(StateError('offline')),
        ),
        hostPeopleAutomationsProvider(_org).overrideWith(
          (ref) async =>
              const HostFormAutomationPage(rules: [], runs: [], hasMore: false),
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

  test('a hand-picked group lists its people a page at a time, with no '
      'name for a contact that was merged away', () async {
    final audience = handPickedGroupAudience(32);
    List<HostSavedGroupMember> page(int from, int to) => [
      for (var i = from; i < to; i++)
        (contactId: 'p$i', displayName: i == 3 ? null : 'Guest $i'),
    ];
    final container = ProviderContainer.test(
      overrides: [
        hostSavedAudienceDetailProvider(
          _org,
          'picked',
        ).overrideWith((ref) => Stream.value(audience)),
        hostSavedGroupMembersProvider(
          _org,
          'picked',
          0,
        ).overrideWith((ref) => Stream.value(page(0, 30))),
        hostSavedGroupMembersProvider(
          _org,
          'picked',
          1,
        ).overrideWith((ref) => Stream.value(page(30, 32))),
      ],
    );
    container.listen(
      hostSavedGroupControllerProvider(_org, 'picked'),
      (_, _) {},
    );
    container.listen(
      hostSavedGroupControllerProvider(_org, 'picked', memberPages: 2),
      (_, _) {},
    );
    await _settle(container);

    final first = container.read(
      hostSavedGroupControllerProvider(_org, 'picked'),
    );
    expect(first.handPicked, isTrue);
    expect(first.preview, isNull);
    expect(first.members, hasLength(30));
    expect(first.members![3].displayName, isNull);
    expect(first.moreMembers, isTrue);

    final both = container.read(
      hostSavedGroupControllerProvider(_org, 'picked', memberPages: 2),
    );
    expect(both.members!.map((member) => member.contactId).last, 'p31');
    expect(both.moreMembers, isFalse);
    expect(both.membersFailed, isFalse);
  });
}
