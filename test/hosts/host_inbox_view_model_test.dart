import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

void main() {
  final now = DateTime(2026, 7, 10, 18);
  final live = buildEvent(
    id: 'live',
    startTime: now.subtract(const Duration(minutes: 30)),
    endTime: now.add(const Duration(minutes: 30)),
  );
  final upcoming = buildEvent(
    id: 'upcoming',
    startTime: now.add(const Duration(hours: 2)),
    endTime: now.add(const Duration(hours: 3)),
  );

  group('resolveHostInboxScope', () {
    test('defaults live first, then nearest upcoming', () {
      expect(
        resolveHostInboxScope(events: [upcoming, live], now: now),
        const HostInboxScope.event('live'),
      );
      expect(
        resolveHostInboxScope(events: [upcoming], now: now),
        const HostInboxScope.event('upcoming'),
      );
    });

    test('explicit event wins and General stays explicit', () {
      expect(
        resolveHostInboxScope(
          events: [live, upcoming],
          now: now,
          initialEventId: 'upcoming',
          preferGeneral: true,
        ),
        const HostInboxScope.event('upcoming'),
      );
      expect(
        resolveHostInboxScope(
          events: [live],
          now: now,
          requestedScope: const HostInboxScope.general(),
        ),
        const HostInboxScope.general(),
      );
    });

    test('unknown event id falls back to the default event', () {
      expect(
        resolveHostInboxScope(
          events: [upcoming],
          now: now,
          initialEventId: 'not-hosted',
        ),
        const HostInboxScope.event('upcoming'),
      );
    });

    test('requested program scope survives a truncated or loading menu', () {
      final programs = [_program('program-1')];
      expect(
        resolveHostInboxScope(
          events: [upcoming],
          now: now,
          requestedScope: const HostInboxScope.program('program-1'),
          programs: programs,
        ),
        const HostInboxScope.program('program-1'),
      );
      expect(
        resolveHostInboxScope(
          events: [upcoming],
          now: now,
          requestedScope: const HostInboxScope.program('foreign'),
          programs: programs,
        ),
        const HostInboxScope.program('foreign'),
      );
      expect(
        resolveHostInboxScope(
          events: [upcoming],
          now: now,
          requestedScope: const HostInboxScope.program('program-1'),
        ),
        const HostInboxScope.program('program-1'),
      );
    });

    test('scope equality distinguishes program from event and general', () {
      expect(
        const HostInboxScope.program('program-1'),
        const HostInboxScope.program('program-1'),
      );
      expect(
        const HostInboxScope.program('program-1'),
        isNot(const HostInboxScope.program('program-2')),
      );
      expect(
        const HostInboxScope.program('program-1'),
        isNot(const HostInboxScope.event('program-1')),
      );
      expect(const HostInboxScope.program('program-1').isGeneral, isFalse);
    });
  });

  group('HostInboxViewModel.compose', () {
    test('keeps roster audience counts separate from thread counts', () {
      final inbox = _inbox([
        _preview(uid: 'booked-1', eventIds: ['live'], name: 'Asha'),
        _preview(uid: 'waitlisted-1', eventIds: ['live'], name: 'Mira'),
        _preview(uid: 'inquiry-1', eventIds: ['live'], name: 'Kabir'),
        _preview(uid: 'other-event', eventIds: ['upcoming'], name: 'Other'),
        _preview(uid: 'general', eventIds: const [], name: 'General'),
        _preview(
          uid: 'other-organizer',
          eventIds: ['live'],
          name: 'Other organizer',
          clubId: 'club-2',
        ),
      ]);
      final participations = [
        buildEventParticipation(event: live, uid: 'booked-1'),
        buildEventParticipation(event: live, uid: 'booked-2'),
        buildEventParticipation(
          event: live,
          uid: 'booked-3',
          status: EventParticipationStatus.attended,
        ),
        buildEventParticipation(
          event: live,
          uid: 'waitlisted-1',
          status: EventParticipationStatus.waitlisted,
          hostApprovalStatus: EventJoinRequestStatus.pending,
        ),
        buildEventParticipation(
          event: live,
          uid: 'waitlisted-2',
          status: EventParticipationStatus.waitlisted,
        ),
      ];

      final booked = HostInboxViewModel.compose(
        events: [live, upcoming],
        inbox: inbox,
        participations: participations,
        selectedOrganizerId: 'club-1',
        selectedScope: const HostInboxScope.event('live'),
        selectedSegment: HostInboxAudienceSegment.booked,
        query: '',
        now: now,
      );
      expect(booked.bookedThreadCount, 1);
      expect(booked.bookedAudienceCount, 3);
      expect(booked.prospectiveThreadCount, 2);
      expect(booked.prospectiveAudienceCount, 2);
      expect(booked.selectedAudienceCount, 3);
      expect(booked.threads.single.statusLabel, 'Booked');

      final prospective = HostInboxViewModel.compose(
        events: [live, upcoming],
        inbox: inbox,
        participations: participations,
        selectedOrganizerId: 'club-1',
        selectedScope: const HostInboxScope.event('live'),
        selectedSegment: HostInboxAudienceSegment.prospective,
        query: '',
        now: now,
      );
      expect(prospective.threads.map((row) => row.preview.otherUid), [
        'waitlisted-1',
        'inquiry-1',
      ]);
      expect(prospective.threads.map((row) => row.statusLabel), [
        'Requested',
        'Inquiry',
      ]);
      expect(prospective.everyoneAudienceCount, 5);
    });

    test('General contains only eventless personal inquiries', () {
      final workspace = HostInboxViewModel.compose(
        events: [live],
        inbox: _inbox([
          _preview(uid: 'general', eventIds: const [], name: 'General'),
          _preview(uid: 'event', eventIds: ['live'], name: 'Event'),
        ]),
        participations: const [],
        selectedOrganizerId: 'club-1',
        selectedScope: const HostInboxScope.general(),
        selectedSegment: HostInboxAudienceSegment.booked,
        query: '',
        now: now,
      );

      expect(workspace.isGeneral, isTrue);
      expect(workspace.threads.single.preview.otherUid, 'general');
      expect(workspace.threads.single.statusLabel, 'General inquiry');
      expect(workspace.selectedAudienceCount, 0);
    });

    test('search applies after event and audience classification', () {
      final workspace = HostInboxViewModel.compose(
        events: [live],
        inbox: _inbox([
          _preview(uid: 'one', eventIds: ['live'], name: 'Asha Guest'),
          _preview(uid: 'two', eventIds: ['live'], name: 'Mira Guest'),
        ]),
        participations: [
          buildEventParticipation(event: live, uid: 'one'),
          buildEventParticipation(event: live, uid: 'two'),
        ],
        selectedScope: const HostInboxScope.event('live'),
        selectedOrganizerId: 'club-1',
        selectedSegment: HostInboxAudienceSegment.booked,
        query: 'mira',
        now: now,
      );

      expect(workspace.bookedThreadCount, 2);
      expect(workspace.unfilteredSelectedThreadCount, 2);
      expect(workspace.threads.single.preview.displayName, 'Mira Guest');
    });

    test(
      'classifies waitlist offer state without making inquiry a recipient',
      () {
        final workspace = HostInboxViewModel.compose(
          events: [live],
          inbox: _inbox([
            _preview(uid: 'offered', eventIds: ['live'], name: 'Offered'),
            _preview(uid: 'inquiry', eventIds: ['live'], name: 'Inquiry'),
          ]),
          participations: [
            buildEventParticipation(
              event: live,
              uid: 'offered',
              status: EventParticipationStatus.waitlisted,
              waitlistOfferStatus: EventWaitlistOfferStatus.active,
            ),
          ],
          selectedScope: const HostInboxScope.event('live'),
          selectedOrganizerId: 'club-1',
          selectedSegment: HostInboxAudienceSegment.prospective,
          query: '',
          now: now,
        );

        expect(workspace.prospectiveThreadCount, 2);
        expect(workspace.prospectiveAudienceCount, 1);
        expect(workspace.threads.map((row) => row.statusLabel), [
          'Offered',
          'Inquiry',
        ]);
      },
    );

    test('program scope with linked guests withholds unresolved history', () {
      final workspace = HostInboxViewModel.compose(
        events: [live],
        inbox: _inbox([
          _preview(uid: 'guest-uid', eventIds: const [], name: 'Guest'),
          _preview(uid: 'stranger', eventIds: const [], name: 'Stranger'),
        ]),
        participations: const [],
        selectedOrganizerId: 'club-1',
        selectedScope: const HostInboxScope.program('program-1'),
        selectedSegment: HostInboxAudienceSegment.booked,
        query: '',
        now: now,
        programs: [_program('program-1'), _program('program-2')],
        programAudience: const HostInboxProgramAudience(
          contactIds: {'contact-1'},
          linkedUids: {'guest-uid'},
        ),
      );

      expect(workspace.isProgram, isTrue);
      expect(workspace.isGeneral, isFalse);
      expect(workspace.selectedProgram?.programId, 'program-1');
      expect(workspace.threads, isEmpty);
      expect(workspace.unfilteredSelectedThreadCount, 0);
      expect(
        workspace.scopeOptions,
        containsAll([
          const HostInboxScope.event('live'),
          const HostInboxScope.program('program-1'),
          const HostInboxScope.program('program-2'),
          const HostInboxScope.general(),
        ]),
      );
    });

    test('unverified program scope never shows general threads', () {
      final workspace = HostInboxViewModel.compose(
        events: [live],
        inbox: _inbox([
          _preview(uid: 'general', eventIds: const [], name: 'General'),
          _preview(uid: 'event', eventIds: ['live'], name: 'Event'),
        ]),
        participations: const [],
        selectedOrganizerId: 'club-1',
        selectedScope: const HostInboxScope.program('deleted-program'),
        selectedSegment: HostInboxAudienceSegment.booked,
        query: '',
        now: now,
        programs: [_program('program-1')],
      );

      expect(
        workspace.selectedScope,
        const HostInboxScope.program('deleted-program'),
      );
      expect(workspace.threads, isEmpty);
    });
  });
}

ChatsListViewModel _inbox(List<ChatThreadPreview> previews) =>
    ChatsListViewModel(
      newMatches: const [],
      conversations: previews,
      totalThreadCount: previews.length,
    );

OrganizerProgramSummary _program(String id) => OrganizerProgramSummary(
  programId: id,
  title: 'Program $id',
  kind: ProgramKind.wedding,
  status: ProgramStatus.active,
  revision: 1,
);

ChatThreadPreview _preview({
  required String uid,
  required List<String> eventIds,
  required String name,
  String clubId = 'club-1',
}) {
  final match = Match(
    id: 'match-$uid-${eventIds.join('-')}',
    user1Id: uid,
    user2Id: 'host-1',
    eventIds: eventIds,
    createdAt: DateTime(2026, 7, 10),
    lastMessageAt: DateTime(2026, 7, 10, 17),
    lastMessagePreview: 'Can you help?',
    lastMessageSenderId: uid,
    conversationType: MatchConversationType.clubHostInquiry,
    clubId: clubId,
  );
  return ChatThreadPreview(
    match: match,
    matchId: match.id,
    otherUid: uid,
    displayName: name,
    photoUrl: null,
    previewText: match.lastMessagePreview!,
    timestamp: match.lastMessageAt!,
    unreadCount: 0,
    hasConversation: true,
    eventIds: eventIds,
  );
}
