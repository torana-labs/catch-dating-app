import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_invite_link.dart';
import 'package:catch_dating_app/contexts/events/domain/event_private_access.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_invite_link_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_roster_display_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_roster_row_state.dart';
import 'package:catch_dating_app/kernel/brand.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

final _l10n = AppLocalizationsEn();

void main() {
  test(
    'HostEventManageScreenState resolves lifecycle workspace and roster',
    () {
      final now = DateTime(2026, 8, 15, 12);
      final upcoming = buildEvent(
        startTime: now.add(const Duration(hours: 2)),
        endTime: now.add(const Duration(hours: 3)),
      );
      final runtime = buildEvent(
        startTime: now.add(const Duration(minutes: 5)),
        endTime: now.add(const Duration(hours: 2)),
      );
      final past = buildEvent(
        startTime: now.subtract(const Duration(hours: 5)),
        endTime: now.subtract(const Duration(hours: 3)),
      );

      final preparation = HostEventManageScreenState.resolve(
        event: upcoming,
        requestedSection: HostEventManageSection.setup,
        now: now,
      );
      final liveRoster = HostEventManageScreenState.resolve(
        event: runtime,
        requestedSection: HostEventManageSection.guests,
        now: now,
      );
      final recap = HostEventManageScreenState.resolve(
        event: past,
        requestedSection: HostEventManageSection.live,
        now: now,
      );

      expect(preparation.phase, HostEventWorkspacePhase.preparation);
      expect(preparation.eventTitle, upcoming.title);
      expect(preparation.openRosterInitially, isFalse);
      expect(liveRoster.phase, HostEventWorkspacePhase.runtime);
      expect(liveRoster.openRosterInitially, isTrue);
      expect(recap.phase, HostEventWorkspacePhase.recap);
      expect(recap.openRosterInitially, isFalse);
    },
  );

  test('legacy Host Event Manage route sections keep stable labels', () {
    expect(HostEventManageSection.setup.label(_l10n), 'Setup');
    expect(HostEventManageSection.guests.label(_l10n), 'Guests');
    expect(HostEventManageSection.live.label(_l10n), 'Live');
    expect(HostEventManageSection.report.label(_l10n), 'Report');
  });

  test('Host Event Manage renders exactly one lifecycle workspace', () {
    final now = DateTime(2026, 8, 15, 12);
    final upcoming = buildEvent(
      startTime: now.add(const Duration(hours: 2)),
      endTime: now.add(const Duration(hours: 3)),
    );
    final runtime = buildEvent(
      startTime: now.add(const Duration(minutes: 5)),
      endTime: now.add(const Duration(hours: 2)),
    );
    final ended = buildEvent(
      startTime: now.subtract(const Duration(hours: 5)),
      endTime: now.subtract(const Duration(hours: 3)),
    );
    final cancelled = buildEvent(
      startTime: now.add(const Duration(days: 1)),
      endTime: now.add(const Duration(days: 1, hours: 2)),
      status: EventLifecycleStatus.cancelled,
    );

    expect(
      hostEventWorkspacePhaseFor(event: upcoming, now: now),
      HostEventWorkspacePhase.preparation,
    );
    expect(
      hostEventWorkspacePhaseFor(event: runtime, now: now),
      HostEventWorkspacePhase.runtime,
    );
    expect(
      hostEventWorkspacePhaseFor(event: ended, now: now),
      HostEventWorkspacePhase.recap,
    );
    expect(
      hostEventWorkspacePhaseFor(event: cancelled, now: now),
      HostEventWorkspacePhase.recap,
    );
  });

  test('HostEventManageActionEffect maps action destinations', () {
    final event = buildEvent(id: 'event-action', clubId: 'club-action');

    final edit = HostEventManageActionEffect.resolve(
      intent: HostEventManageActionIntent.editEvent,
      event: event,
    );
    final cancel = HostEventManageActionEffect.resolve(
      intent: HostEventManageActionIntent.cancelEvent,
      event: event,
    );
    final delete = HostEventManageActionEffect.resolve(
      intent: HostEventManageActionIntent.deleteEvent,
      event: event,
    );

    expect(edit.destination, HostEventManageActionDestination.editEventRoute);
    expect(edit.pathParameters, {
      'organizerId': 'club-action',
      'eventId': 'event-action',
    });
    expect(edit.event, event);
    expect(
      cancel.destination,
      HostEventManageActionDestination.cancelConfirmation,
    );
    expect(cancel.pathParameters, isEmpty);
    expect(
      delete.destination,
      HostEventManageActionDestination.deleteConfirmation,
    );
    expect(delete.pathParameters, isEmpty);
  });

  test('HostEventActionDisplayState maps destructive action policy', () {
    final emptyActive = HostEventActionDisplayState.resolve(
      event: buildEvent(id: 'event-empty'),
      roster: null,
      l10n: _l10n,
      cancelEventPending: false,
      deleteEventPending: false,
    );
    final bookedActive = HostEventActionDisplayState.resolve(
      event: buildEvent(id: 'event-booked', bookedCount: 1),
      roster: null,
      l10n: _l10n,
      cancelEventPending: true,
      deleteEventPending: false,
    );
    final cancelled = HostEventActionDisplayState.resolve(
      event: buildEvent(
        id: 'event-cancelled',
        status: EventLifecycleStatus.cancelled,
      ),
      roster: null,
      l10n: _l10n,
      cancelEventPending: false,
      deleteEventPending: false,
    );

    expect(emptyActive.hasKnownActivity, isFalse);
    expect(emptyActive.showEditAction, isTrue);
    expect(emptyActive.showCancelAction, isTrue);
    expect(emptyActive.showDeleteAction, isTrue);
    expect(emptyActive.deleteDetail, 'Permanent removal');
    expect(bookedActive.hasKnownActivity, isTrue);
    expect(bookedActive.isMutating, isTrue);
    expect(bookedActive.showDeleteAction, isFalse);
    expect(bookedActive.cancelDetail, 'Cancelling...');
    expect(cancelled.showEditAction, isFalse);
    expect(cancelled.showCancelledState, isTrue);
    expect(cancelled.showCancelAction, isFalse);
    expect(cancelled.showDeleteAction, isFalse);
  });

  test('HostPrivateLinkActionState maps share link display state', () {
    final organizer = buildOrganizer();
    final event = buildEvent(id: 'event-private');
    final access = EventPrivateAccess(
      id: 'access-1',
      eventId: event.id,
      clubId: organizer.id,
      inviteCode: ' CATCH-DELHI ',
      createdAt: DateTime(2026, 7),
    );
    final inviteLink = EventInviteLink(
      id: 'link-1',
      eventId: event.id,
      clubId: organizer.id,
      hostUid: 'host-1',
      label: 'Instagram',
      createdAt: DateTime(2026, 7),
      updatedAt: DateTime(2026, 7),
    );

    final ready = HostPrivateLinkActionState.resolve(
      l10n: _l10n,
      accessState: CatchAsyncState.data(access),
      inviteLinksState: CatchAsyncState.data([inviteLink]),
      inviteLink:
          '${Brand.webOrigin}/organizers/${organizer.id}/events/${event.id}?invite=CATCH-DELHI',
      sharePending: false,
    );
    final loading = HostPrivateLinkActionState.resolve(
      l10n: _l10n,
      accessState: const CatchAsyncState.loading(),
      inviteLinksState: null,
      inviteLink: null,
      sharePending: false,
    );
    final errored = HostPrivateLinkActionState.resolve(
      l10n: _l10n,
      accessState: CatchAsyncState.error(StateError('missing')),
      inviteLinksState: null,
      inviteLink: null,
      sharePending: false,
    );
    final pending = HostPrivateLinkActionState.resolve(
      l10n: _l10n,
      accessState: CatchAsyncState.data(access),
      inviteLinksState: CatchAsyncState.data([inviteLink]),
      inviteLink:
          '${Brand.webOrigin}/organizers/${organizer.id}/events/${event.id}?invite=CATCH-DELHI',
      sharePending: true,
    );

    expect(ready.inviteCode, 'CATCH-DELHI');
    expect(
      ready.inviteLink,
      '${Brand.webOrigin}/organizers/${organizer.id}/events/${event.id}?invite=CATCH-DELHI',
    );
    expect(ready.shareDetail, '1 invite link');
    expect(ready.canShare, isTrue);
    expect(loading.shareDetail, 'Loading link');
    expect(loading.canShare, isFalse);
    expect(errored.shareDetail, 'Invite setup unavailable');
    expect(errored.canShare, isFalse);
    expect(pending.shareDetail, 'Sharing...');
    expect(pending.canShare, isFalse);
  });

  test('HostPrivateAccessDisplayState maps card copy and rows', () {
    final organizer = buildOrganizer();
    final event = buildEvent(id: 'event-private');
    final access = EventPrivateAccess(
      id: 'access-1',
      eventId: event.id,
      clubId: organizer.id,
      inviteCode: 'CATCH-DELHI',
      createdAt: DateTime(2026, 7),
    );

    final ready = HostPrivateAccessDisplayState.resolve(
      l10n: _l10n,
      access: access,
      inviteLinksState: const CatchAsyncState.data([]),
      inviteLink: 'https://catch.test/events/event-1?invite=CATCH-DELHI',
      sharePending: false,
    );
    final missing = HostPrivateAccessDisplayState.resolve(
      l10n: _l10n,
      access: null,
      inviteLinksState: const CatchAsyncState.data([]),
      inviteLink: null,
      sharePending: false,
    );

    expect(ready.hasInviteCode, isTrue);
    expect(
      ready.description,
      'This event can stay listed; only people with this code or private link can book.',
    );
    expect(ready.linkAction.inviteCode, 'CATCH-DELHI');
    expect(ready.linkAction.shareDetail, '0 invite links');
    expect(ready.linkAction.canShare, isTrue);
    expect(missing.hasInviteCode, isFalse);
    expect(
      missing.description,
      'This event requires an invite, but no host-readable access code was found.',
    );
    expect(missing.linkAction.inviteLink, isNull);
    expect(missing.linkAction.canShare, isFalse);
  });

  test(
    'HostParticipantsMutationDisplayState maps pending and error policy',
    () {
      HostParticipantsMutationDisplayState resolve({
        Set<String> markAttendancePendingIds = const <String>{},
        Set<String> approveJoinRequestPendingIds = const <String>{},
        Set<String> declineJoinRequestPendingIds = const <String>{},
        Set<String> createWaitlistOfferPendingIds = const <String>{},
        bool bulkWaitlistOfferPending = false,
        bool opsReportPending = false,
        bool revenueReportPending = false,
        Object? markAttendanceError,
        Object? approveJoinRequestError,
        Object? declineJoinRequestError,
        Object? createWaitlistOfferError,
        Object? opsReportError,
        Object? revenueReportError,
      }) {
        return HostParticipantsMutationDisplayState.resolve(
          markAttendancePendingIds: markAttendancePendingIds,
          approveJoinRequestPendingIds: approveJoinRequestPendingIds,
          declineJoinRequestPendingIds: declineJoinRequestPendingIds,
          createWaitlistOfferPendingIds: createWaitlistOfferPendingIds,
          bulkWaitlistOfferPending: bulkWaitlistOfferPending,
          opsReportPending: opsReportPending,
          revenueReportPending: revenueReportPending,
          markAttendanceError: markAttendanceError,
          approveJoinRequestError: approveJoinRequestError,
          declineJoinRequestError: declineJoinRequestError,
          createWaitlistOfferError: createWaitlistOfferError,
          opsReportError: opsReportError,
          revenueReportError: revenueReportError,
        );
      }

      final idle = resolve();
      final approvePending = resolve(
        approveJoinRequestPendingIds: const {'runner-1'},
      );
      final declinePending = resolve(
        declineJoinRequestPendingIds: const {'runner-2'},
      );
      final waitlistPending = resolve(
        createWaitlistOfferPendingIds: const {'runner-3'},
      );
      final bulkWaitlistPending = resolve(bulkWaitlistOfferPending: true);
      final attendancePending = resolve(
        markAttendancePendingIds: const {'runner-4'},
      );
      final reportsPending = resolve(
        opsReportPending: true,
        revenueReportPending: true,
      );

      expect(idle.requestActionPending, isFalse);
      expect(idle.waitlistOfferPending, isFalse);
      expect(idle.attendanceActionPending, isFalse);
      expect(idle.isRequestActionPending('runner-1'), isFalse);
      expect(idle.isWaitlistOfferPending('runner-3'), isFalse);
      expect(idle.isAttendanceActionPending('runner-4'), isFalse);
      expect(idle.opsReportExportPending, isFalse);
      expect(idle.revenueReportExportPending, isFalse);
      expect(idle.participantActionError, isNull);
      expect(idle.reportExportError, isNull);
      expect(approvePending.requestActionPending, isTrue);
      expect(approvePending.isRequestActionPending('runner-1'), isTrue);
      expect(approvePending.isRequestActionPending('runner-2'), isFalse);
      expect(declinePending.requestActionPending, isTrue);
      expect(declinePending.isRequestActionPending('runner-2'), isTrue);
      expect(waitlistPending.waitlistOfferPending, isTrue);
      expect(waitlistPending.isWaitlistOfferPending('runner-3'), isTrue);
      expect(waitlistPending.isWaitlistOfferPending('runner-4'), isFalse);
      expect(bulkWaitlistPending.waitlistOfferPending, isTrue);
      expect(bulkWaitlistPending.isWaitlistOfferPending('runner-3'), isTrue);
      expect(bulkWaitlistPending.isWaitlistOfferPending('runner-4'), isTrue);
      expect(attendancePending.attendanceActionPending, isTrue);
      expect(attendancePending.isAttendanceActionPending('runner-4'), isTrue);
      expect(attendancePending.isAttendanceActionPending('runner-5'), isFalse);
      expect(reportsPending.opsReportExportPending, isTrue);
      expect(reportsPending.revenueReportExportPending, isTrue);

      final markError = StateError('mark');
      final approveError = StateError('approve');
      final declineError = StateError('decline');
      final offerError = StateError('offer');
      final opsError = StateError('ops');
      final revenueError = StateError('revenue');
      final errors = resolve(
        markAttendanceError: markError,
        approveJoinRequestError: approveError,
        declineJoinRequestError: declineError,
        createWaitlistOfferError: offerError,
        opsReportError: opsError,
        revenueReportError: revenueError,
      );

      expect(errors.participantActionError, same(markError));
      expect(
        resolve(
          approveJoinRequestError: approveError,
          declineJoinRequestError: declineError,
          createWaitlistOfferError: offerError,
        ).participantActionError,
        same(approveError),
      );
      expect(
        resolve(
          declineJoinRequestError: declineError,
          createWaitlistOfferError: offerError,
        ).participantActionError,
        same(declineError),
      );
      expect(
        resolve(createWaitlistOfferError: offerError).participantActionError,
        same(offerError),
      );
      expect(errors.reportExportError, same(opsError));
      expect(
        resolve(revenueReportError: revenueError).reportExportError,
        same(revenueError),
      );
    },
  );

  test('HostReportSummaryDisplayState maps report summary copy', () {
    final state = HostReportSummaryDisplayState.resolve(
      totalCount: 6,
      checkedInCount: 4,
      waitlistCount: 2,
      priceInPaise: 50000,
      currencyCode: 'INR',
    );

    expect(state.grossEstimateInPaise, 300000);
    expect(state.checkedInCount, 4);
    expect(state.noShowCount, 2);
    expect(state.waitlistCount, 2);
    expect(
      state.summary(_l10n),
      '₹3,000 gross estimate · 4 attended · 2 no-shows · 2 waitlisted.',
    );
  });

  test('HostParticipantProfilesLookupState maps profile provider branches', () {
    final error = StateError('profiles failed');
    const profiles = {
      'uid-a': ('Asha Mehta', 'https://example.com/a.jpg'),
      'uid-b': ('Bina Shah', null),
    };

    final empty = HostParticipantProfilesLookupState.resolve(
      profileIds: const [],
      profilesState: null,
    );
    final loading = HostParticipantProfilesLookupState.resolve(
      profileIds: const ['uid-a'],
      profilesState: const CatchAsyncState.loading(),
    );
    final ready = HostParticipantProfilesLookupState.resolve(
      profileIds: const ['uid-a', 'uid-b'],
      profilesState: const CatchAsyncState.data(profiles),
    );
    final errored = HostParticipantProfilesLookupState.resolve(
      profileIds: const ['uid-a'],
      profilesState: CatchAsyncState.error(error),
    );

    expect(empty.status, HostParticipantProfilesLookupStatus.ready);
    expect(empty.shouldWatchProfiles, isFalse);
    expect(empty.profiles, isEmpty);
    expect(loading.status, HostParticipantProfilesLookupStatus.loading);
    expect(loading.shouldWatchProfiles, isTrue);
    expect(loading.profiles, isEmpty);
    expect(ready.status, HostParticipantProfilesLookupStatus.ready);
    expect(ready.profiles, profiles);
    expect(errored.status, HostParticipantProfilesLookupStatus.error);
    expect(errored.error, same(error));
    expect(errored.profileIds, const ['uid-a']);
  });

  test('HostInviteLinksListDisplayState maps mutation modes', () {
    final idle = HostInviteLinksListDisplayState.resolve(
      createPending: false,
      copyPending: false,
      disablePending: false,
    );
    final creating = HostInviteLinksListDisplayState.resolve(
      createPending: true,
      copyPending: true,
      disablePending: true,
    );
    final copying = HostInviteLinksListDisplayState.resolve(
      createPending: false,
      copyPending: true,
      disablePending: true,
    );
    final disabling = HostInviteLinksListDisplayState.resolve(
      createPending: false,
      copyPending: false,
      disablePending: true,
    );

    expect(idle.mutationMode, HostInviteLinksMutationMode.idle);
    expect(idle.isMutating, isFalse);
    expect(idle.createPending, isFalse);
    expect(idle.emptyCopy, contains('Instagram bio'));
    expect(creating.mutationMode, HostInviteLinksMutationMode.creating);
    expect(creating.isMutating, isTrue);
    expect(creating.createPending, isTrue);
    expect(copying.mutationMode, HostInviteLinksMutationMode.copying);
    expect(disabling.mutationMode, HostInviteLinksMutationMode.disabling);
  });

  test('HostInviteLinkRowDisplayState maps URL, stats, and row actions', () {
    final event = buildEvent(id: 'event-private');
    final active = EventInviteLink(
      id: 'link-1',
      eventId: event.id,
      clubId: event.clubId,
      hostUid: 'host-1',
      label: 'Instagram',
      source: 'instagram',
      openCount: 10,
      requestCount: 4,
      confirmedCount: 3,
      checkedInCount: 2,
      catcherCount: 1,
      chatStartedCount: 5,
      createdAt: DateTime(2026, 7),
      updatedAt: DateTime(2026, 7),
    );
    final disabled = active.copyWith(disabledAt: DateTime(2026, 7, 2));

    final activeState = HostInviteLinkRowDisplayState.resolve(
      link: active,
      url:
          '${Brand.webOrigin}/organizers/${event.clubId}/events/${event.id}?invite=CATCH-DELHI&il=link-1',
      actionsDisabled: false,
    );
    final disabledState = HostInviteLinkRowDisplayState.resolve(
      link: disabled,
      url:
          '${Brand.webOrigin}/organizers/${event.clubId}/events/${event.id}?invite=CATCH-DELHI&il=link-1',
      actionsDisabled: true,
    );

    expect(activeState.label, 'Instagram');
    expect(activeState.source, 'instagram');
    expect(
      activeState.url,
      '${Brand.webOrigin}/organizers/${event.clubId}/events/${event.id}?invite=CATCH-DELHI&il=link-1',
    );
    expect(
      activeState.stats,
      '10 opens | 4 requests | 3 confirmed | 2 checked in | 1 caught | 5 chats',
    );
    expect(activeState.actionsDisabled, isFalse);
    expect(activeState.showDisabledBadge, isFalse);
    expect(activeState.showDisableAction, isTrue);
    expect(disabledState.actionsDisabled, isTrue);
    expect(disabledState.showDisabledBadge, isTrue);
    expect(disabledState.showDisableAction, isFalse);
  });

  test('HostRosterDisplayState maps setup filters and waitlist offers', () {
    final event = buildEvent(capacityLimit: 3);
    final participations = [
      buildEventParticipation(event: event, uid: 'booked-a'),
      buildEventParticipation(
        event: event,
        uid: 'wait-a',
        status: EventParticipationStatus.waitlisted,
      ),
      buildEventParticipation(
        event: event,
        uid: 'wait-b',
        status: EventParticipationStatus.waitlisted,
      ),
      buildEventParticipation(
        event: event,
        uid: 'offered',
        status: EventParticipationStatus.waitlisted,
        waitlistOfferStatus: EventWaitlistOfferStatus.active,
      ),
    ];
    final participationsByUid = {
      for (final participation in participations)
        participation.uid: participation,
    };

    final state = HostRosterDisplayState.setup(
      l10n: _l10n,
      usesRequestApproval: false,
      attendeeIds: const ['booked-a'],
      waitlistedIds: const ['wait-a', 'wait-b', 'offered'],
      totalCount: 1,
      capacityLimit: event.capacityLimit,
      waitlistCount: 3,
      participationsByUid: participationsByUid,
      profiles: const {
        'booked-a': ('Bina Shah', null),
        'wait-a': ('Asha Mehta', null),
        'wait-b': ('Nina Patel', null),
        'offered': ('Omar Khan', null),
      },
      searchQuery: 'nina',
      selectedFilter: HostRosterFilter.waitlist,
    );
    final slotsState = HostRosterDisplayState.setup(
      l10n: _l10n,
      usesRequestApproval: false,
      attendeeIds: const ['booked-a'],
      waitlistedIds: const ['wait-a', 'wait-b', 'offered'],
      totalCount: 1,
      capacityLimit: event.capacityLimit,
      waitlistCount: 3,
      participationsByUid: participationsByUid,
      profiles: const {},
      searchQuery: '',
      selectedFilter: HostRosterFilter.slots,
    );

    expect(state.activeFilter, HostRosterFilter.waitlist);
    expect(
      state.filters.map((spec) => '${spec.label}:${spec.value}').toList(),
      const ['All:4', 'Booked:1', 'Waitlist:3', 'Slots:2'],
    );
    expect(state.rowIds, const ['wait-b']);
    expect(state.bulkOfferCount, 2);
    expect(state.bulkOfferIds, const ['wait-a', 'wait-b']);
    expect(slotsState.rowIds, isEmpty);
    expect(slotsState.emptyTitle, 'Open slots are not people');
    expect(slotsState.emptyMessage, contains('capacity left'));
  });

  test('HostRosterDisplayState maps manual approval setup requests', () {
    final event = buildEvent(capacityLimit: 4);
    final request = buildEventParticipation(
      event: event,
      uid: 'request-a',
      status: EventParticipationStatus.waitlisted,
    );

    final state = HostRosterDisplayState.setup(
      l10n: _l10n,
      usesRequestApproval: true,
      attendeeIds: const ['booked-a'],
      waitlistedIds: const ['request-a'],
      totalCount: 1,
      capacityLimit: event.capacityLimit,
      waitlistCount: 1,
      participationsByUid: {request.uid: request},
      profiles: const {},
      searchQuery: '',
      selectedFilter: HostRosterFilter.requests,
    );

    expect(state.activeFilter, HostRosterFilter.requests);
    expect(
      state.filters.map((spec) => '${spec.label}:${spec.value}').toList(),
      const ['All:2', 'Booked:1', 'Requests:1', 'Slots:3'],
    );
    expect(state.rowIds, const ['request-a']);
    expect(state.showBulkOfferAction, isFalse);
  });

  test('HostRosterDisplayState maps live and report roster filters', () {
    final event = buildEvent(capacityLimit: 4);
    final waitlisted = buildEventParticipation(
      event: event,
      uid: 'wait-a',
      status: EventParticipationStatus.waitlisted,
    );

    final live = HostRosterDisplayState.live(
      l10n: _l10n,
      usesRequestApproval: false,
      attendeeIds: const ['due-a', 'checked-a'],
      attendedIds: const {'checked-a'},
      waitlistedIds: const ['wait-a'],
      totalCount: 2,
      capacityLimit: event.capacityLimit,
      participationsByUid: {waitlisted.uid: waitlisted},
      profiles: const {},
      searchQuery: '',
      selectedFilter: HostRosterFilter.due,
    );
    final allCheckedIn = HostRosterDisplayState.live(
      l10n: _l10n,
      usesRequestApproval: false,
      attendeeIds: const ['checked-a'],
      attendedIds: const {'checked-a'},
      waitlistedIds: const [],
      totalCount: 1,
      capacityLimit: event.capacityLimit,
      participationsByUid: const {},
      profiles: const {},
      searchQuery: '',
      selectedFilter: HostRosterFilter.due,
    );
    final report = HostRosterDisplayState.report(
      l10n: _l10n,
      attendeeIds: const ['due-a', 'checked-a'],
      attendedIds: const {'checked-a'},
      waitlistedIds: const ['wait-a'],
      totalCount: 2,
      waitlistCount: 1,
      profiles: const {},
      searchQuery: '',
      selectedFilter: HostRosterFilter.noShow,
    );

    expect(live.rowIds, const ['due-a']);
    expect(live.bulkOfferIds, const ['wait-a']);
    expect(
      live.filters.map((spec) => '${spec.label}:${spec.value}').toList(),
      const ['All:3', 'Due:1', 'In:1', 'Waitlist:1'],
    );
    expect(allCheckedIn.rowIds, isEmpty);
    expect(allCheckedIn.emptyTitle, 'Everyone visible is checked in');
    expect(report.rowIds, const ['due-a']);
    expect(
      report.filters.map((spec) => '${spec.label}:${spec.value}').toList(),
      const ['All:3', 'Attended:1', 'No-show:1', 'Waitlist:1'],
    );
  });

  test('HostSetupRosterRowDisplayState maps setup row policy', () {
    final event = buildEvent();
    final request = buildEventParticipation(
      event: event,
      uid: 'request-a',
      status: EventParticipationStatus.waitlisted,
    );
    final offered = buildEventParticipation(
      event: event,
      uid: 'wait-a',
      status: EventParticipationStatus.waitlisted,
      waitlistOfferStatus: EventWaitlistOfferStatus.active,
    );
    final booked = buildEventParticipation(event: event, uid: 'booked-a');

    final requestRow = HostSetupRosterRowDisplayState.resolve(
      l10n: _l10n,
      participation: request,
      usesRequestApproval: true,
    );
    final offeredRow = HostSetupRosterRowDisplayState.resolve(
      l10n: _l10n,
      participation: offered,
      usesRequestApproval: false,
    );
    final bookedRow = HostSetupRosterRowDisplayState.resolve(
      l10n: _l10n,
      participation: booked,
      usesRequestApproval: false,
    );

    expect(requestRow.signal, 'Request');
    expect(requestRow.meta, 'View profile');
    expect(requestRow.showRequestActions, isTrue);
    expect(requestRow.showWaitlistOfferAction, isFalse);
    expect(offeredRow.signal, 'Offered');
    expect(offeredRow.meta, 'Offer sent');
    expect(offeredRow.showRequestActions, isFalse);
    expect(offeredRow.showWaitlistOfferAction, isTrue);
    expect(bookedRow.signal, 'Booked');
    expect(bookedRow.meta, 'Approved');
  });

  test('HostLiveRosterRowDisplayState maps live row policy', () {
    final event = buildEvent();
    final signedUp = buildEventParticipation(event: event, uid: 'booked-a');
    final waitlisted = buildEventParticipation(
      event: event,
      uid: 'wait-a',
      status: EventParticipationStatus.waitlisted,
    );
    final attended = buildEventParticipation(
      event: event,
      uid: 'checked-a',
      status: EventParticipationStatus.attended,
    );

    final due = HostLiveRosterRowDisplayState.resolve(
      l10n: _l10n,
      participation: signedUp,
      attended: false,
      usesRequestApproval: false,
    );
    final checkedIn = HostLiveRosterRowDisplayState.resolve(
      l10n: _l10n,
      participation: attended,
      attended: true,
      usesRequestApproval: false,
    );
    final waitlist = HostLiveRosterRowDisplayState.resolve(
      l10n: _l10n,
      participation: waitlisted,
      attended: false,
      usesRequestApproval: false,
    );

    expect(due.signal, 'Due');
    expect(due.meta, 'Booked');
    expect(due.showAttendanceToggle, isTrue);
    expect(due.attendanceButtonLabel, 'Check in');
    expect(due.attendanceButtonPrimary, isTrue);
    expect(checkedIn.signal, 'In');
    expect(checkedIn.meta, contains(':'));
    expect(checkedIn.attendanceButtonLabel, 'Undo');
    expect(checkedIn.attendanceButtonPrimary, isFalse);
    expect(waitlist.signal, 'Wait');
    expect(waitlist.meta, 'Waitlisted');
    expect(waitlist.showAttendanceToggle, isFalse);
    expect(waitlist.showWaitlistOfferAction, isTrue);
  });

  test('HostReportRosterRowDisplayState maps report row policy', () {
    final event = buildEvent(priceInPaise: 12500);
    final attended = buildEventParticipation(
      event: event,
      uid: 'checked-a',
      status: EventParticipationStatus.attended,
    );
    final noShow = buildEventParticipation(event: event, uid: 'booked-a');
    final waitlisted = buildEventParticipation(
      event: event,
      uid: 'wait-a',
      status: EventParticipationStatus.waitlisted,
      waitlistOfferStatus: EventWaitlistOfferStatus.expired,
    );

    final attendedRow = HostReportRosterRowDisplayState.resolve(
      l10n: _l10n,
      participation: attended,
      attended: true,
      priceInPaise: event.priceInPaise,
      currencyCode: event.currency,
    );
    final noShowRow = HostReportRosterRowDisplayState.resolve(
      l10n: _l10n,
      participation: noShow,
      attended: false,
      priceInPaise: 0,
      currencyCode: event.currency,
    );
    final waitlistRow = HostReportRosterRowDisplayState.resolve(
      l10n: _l10n,
      participation: waitlisted,
      attended: false,
      priceInPaise: event.priceInPaise,
      currencyCode: event.currency,
    );

    expect(attendedRow.signal, 'Attended');
    expect(attendedRow.meta, 'Booked');
    expect(attendedRow.payment, contains('125'));
    expect(noShowRow.signal, 'No-show');
    expect(noShowRow.payment, 'Free');
    expect(waitlistRow.signal, 'Expired');
    expect(waitlistRow.meta, 'Offer expired');
    expect(waitlistRow.payment, '-');
  });
}
