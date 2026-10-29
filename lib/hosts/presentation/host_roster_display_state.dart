import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';

class HostParticipantsMutationDisplayState {
  const HostParticipantsMutationDisplayState({
    required this.requestActionPendingIds,
    required this.waitlistOfferPendingIds,
    required this.bulkWaitlistOfferPending,
    required this.attendanceActionPendingIds,
    required this.opsReportExportPending,
    required this.revenueReportExportPending,
    this.participantActionError,
    this.reportExportError,
  });

  factory HostParticipantsMutationDisplayState.resolve({
    required Set<String> markAttendancePendingIds,
    required Set<String> approveJoinRequestPendingIds,
    required Set<String> declineJoinRequestPendingIds,
    required Set<String> createWaitlistOfferPendingIds,
    required bool bulkWaitlistOfferPending,
    required bool opsReportPending,
    required bool revenueReportPending,
    Object? markAttendanceError,
    Object? approveJoinRequestError,
    Object? declineJoinRequestError,
    Object? createWaitlistOfferError,
    Object? opsReportError,
    Object? revenueReportError,
  }) {
    return HostParticipantsMutationDisplayState(
      requestActionPendingIds: Set.unmodifiable({
        ...approveJoinRequestPendingIds,
        ...declineJoinRequestPendingIds,
      }),
      waitlistOfferPendingIds: Set.unmodifiable(createWaitlistOfferPendingIds),
      bulkWaitlistOfferPending: bulkWaitlistOfferPending,
      attendanceActionPendingIds: Set.unmodifiable(markAttendancePendingIds),
      opsReportExportPending: opsReportPending,
      revenueReportExportPending: revenueReportPending,
      participantActionError:
          markAttendanceError ??
          approveJoinRequestError ??
          declineJoinRequestError ??
          createWaitlistOfferError,
      reportExportError: opsReportError ?? revenueReportError,
    );
  }

  final Set<String> requestActionPendingIds;
  final Set<String> waitlistOfferPendingIds;
  final bool bulkWaitlistOfferPending;
  final Set<String> attendanceActionPendingIds;
  final bool opsReportExportPending;
  final bool revenueReportExportPending;
  final Object? participantActionError;
  final Object? reportExportError;

  bool get requestActionPending => requestActionPendingIds.isNotEmpty;
  bool get waitlistOfferPending =>
      bulkWaitlistOfferPending || waitlistOfferPendingIds.isNotEmpty;
  bool get attendanceActionPending => attendanceActionPendingIds.isNotEmpty;

  bool isRequestActionPending(String uid) =>
      requestActionPendingIds.contains(uid);

  bool isWaitlistOfferPending(String uid) =>
      bulkWaitlistOfferPending || waitlistOfferPendingIds.contains(uid);

  bool isAttendanceActionPending(String uid) =>
      attendanceActionPendingIds.contains(uid);
}

class HostParticipantLifecycleActions {
  const HostParticipantLifecycleActions({
    required this.openProfile,
    required this.approveJoinRequest,
    required this.declineJoinRequest,
    required this.toggleAttendance,
    required this.createWaitlistOffers,
    required this.shareOpsReport,
    required this.shareRevenueReport,
  });

  final void Function(String uid) openProfile;
  final void Function(String uid) approveJoinRequest;
  final void Function(String uid) declineJoinRequest;
  final void Function(String uid) toggleAttendance;
  final void Function(List<String> userIds) createWaitlistOffers;
  final Future<void> Function() shareOpsReport;
  final Future<void> Function() shareRevenueReport;

  void createWaitlistOffer(String uid) => createWaitlistOffers([uid]);
}

enum HostParticipantProfilesLookupStatus { ready, loading, error }

class HostParticipantProfilesLookupState {
  const HostParticipantProfilesLookupState({
    required this.status,
    required this.profileIds,
    required this.profiles,
    this.error,
  });

  factory HostParticipantProfilesLookupState.resolve({
    required List<String> profileIds,
    required CatchAsyncState<Map<String, (String, String?)>>? profilesState,
  }) {
    if (profileIds.isEmpty) {
      return const HostParticipantProfilesLookupState(
        status: HostParticipantProfilesLookupStatus.ready,
        profileIds: <String>[],
        profiles: <String, (String, String?)>{},
      );
    }
    final profiles = profilesState?.value;
    if (profiles != null) {
      return HostParticipantProfilesLookupState(
        status: HostParticipantProfilesLookupStatus.ready,
        profileIds: profileIds,
        profiles: profiles,
      );
    }
    if (profilesState?.status == CatchAsyncStatus.error) {
      return HostParticipantProfilesLookupState(
        status: HostParticipantProfilesLookupStatus.error,
        profileIds: profileIds,
        profiles: const <String, (String, String?)>{},
        error: profilesState!.error,
      );
    }
    return HostParticipantProfilesLookupState(
      status: HostParticipantProfilesLookupStatus.loading,
      profileIds: profileIds,
      profiles: const <String, (String, String?)>{},
    );
  }

  final HostParticipantProfilesLookupStatus status;
  final List<String> profileIds;
  final Map<String, (String, String?)> profiles;
  final Object? error;

  bool get shouldWatchProfiles => profileIds.isNotEmpty;
}

enum HostRosterFilter {
  all,
  booked,
  waitlist,
  slots,
  requests,
  due,
  checkedIn,
  attended,
  noShow,
}

class HostRosterFilterSpec {
  const HostRosterFilterSpec({
    required this.filter,
    required this.label,
    required this.value,
    required this.tone,
  });

  final HostRosterFilter filter;
  final String label;
  final int value;
  final CatchBadgeTone tone;
}

class HostRosterDisplayState {
  HostRosterDisplayState._({
    required List<HostRosterFilterSpec> filters,
    required this.activeFilter,
    required List<String> rowIds,
    required List<String> offerableWaitlistIds,
    required this.bulkOfferCount,
    required this.emptyTitle,
    required this.emptyMessage,
  }) : filters = List.unmodifiable(filters),
       rowIds = List.unmodifiable(rowIds),
       offerableWaitlistIds = List.unmodifiable(offerableWaitlistIds);

  factory HostRosterDisplayState.setup({
    required AppLocalizations l10n,
    required bool usesRequestApproval,
    required List<String> attendeeIds,
    required List<String> waitlistedIds,
    required int totalCount,
    required int capacityLimit,
    required int waitlistCount,
    required Map<String, EventParticipation> participationsByUid,
    required Map<String, (String, String?)> profiles,
    required String searchQuery,
    required HostRosterFilter selectedFilter,
  }) {
    final requestIds = usesRequestApproval ? waitlistedIds : const <String>[];
    final bookedIds = attendeeIds;
    final displayWaitlistedIds = usesRequestApproval
        ? const <String>[]
        : waitlistedIds;
    final allIds = [...requestIds, ...bookedIds, ...displayWaitlistedIds];
    final remainingSlots = (capacityLimit - totalCount)
        .clamp(0, capacityLimit)
        .toInt();
    final offerableWaitlistIds = _offerableWaitlistIds(
      displayWaitlistedIds,
      participationsByUid,
    );
    final bulkOfferCount = _bulkOfferCount(
      offerableWaitlistIds,
      remainingSlots,
    );
    final filters = [
      HostRosterFilterSpec(
        filter: HostRosterFilter.all,
        label: l10n.hostsHostEventManageScreenStateLabelAll,
        value: allIds.length,
        tone: CatchBadgeTone.neutral,
      ),
      HostRosterFilterSpec(
        filter: HostRosterFilter.booked,
        label: l10n.hostsHostEventManageScreenStateLabelBooked,
        value: bookedIds.length,
        tone: CatchBadgeTone.success,
      ),
      HostRosterFilterSpec(
        filter: usesRequestApproval
            ? HostRosterFilter.requests
            : HostRosterFilter.waitlist,
        label: usesRequestApproval
            ? l10n.hostsHostEventManageScreenStateLabelRequests
            : l10n.hostsHostEventManageScreenStateLabelWaitlist,
        value: waitlistCount,
        tone: usesRequestApproval
            ? CatchBadgeTone.brand
            : CatchBadgeTone.warning,
      ),
      HostRosterFilterSpec(
        filter: HostRosterFilter.slots,
        label: l10n.hostsHostEventManageScreenStateLabelSlots,
        value: remainingSlots,
        tone: CatchBadgeTone.neutral,
      ),
    ];
    final activeFilter = _effectiveFilter(selectedFilter, filters);
    final visibleIds = switch (activeFilter) {
      HostRosterFilter.booked => bookedIds,
      HostRosterFilter.waitlist => displayWaitlistedIds,
      HostRosterFilter.requests => requestIds,
      HostRosterFilter.slots => const <String>[],
      _ => allIds,
    };
    final rowIds = _matchingIds(
      visibleIds,
      profiles: profiles,
      searchQuery: searchQuery,
    );
    final hasSearch = searchQuery.trim().isNotEmpty;
    return HostRosterDisplayState._(
      filters: filters,
      activeFilter: activeFilter,
      rowIds: rowIds,
      offerableWaitlistIds: offerableWaitlistIds,
      bulkOfferCount: bulkOfferCount,
      emptyTitle: hasSearch
          ? l10n.hostsHostEventManageScreenStateEmptytitleNoMatches
          : activeFilter == HostRosterFilter.slots
          ? l10n.hostsHostEventManageScreenStateEmptytitleOpenSlotsAreNot
          : l10n.hostsHostEventManageScreenStateEmptytitleNoParticipantsYet,
      emptyMessage: hasSearch
          ? l10n.hostsHostEventManageScreenStateVisiblecopyNoPeopleMatchThis
          : activeFilter == HostRosterFilter.slots
          ? l10n.hostsHostEventManageScreenStateVisiblecopySlotsShowCapacityLeft
          : l10n.hostsHostEventManageScreenStateVisiblecopyBookedAndWaitlistedPeople,
    );
  }

  factory HostRosterDisplayState.live({
    required AppLocalizations l10n,
    required bool usesRequestApproval,
    required List<String> attendeeIds,
    required Set<String> attendedIds,
    required List<String> waitlistedIds,
    required int totalCount,
    required int capacityLimit,
    required Map<String, EventParticipation> participationsByUid,
    required Map<String, (String, String?)> profiles,
    required String searchQuery,
    required HostRosterFilter selectedFilter,
  }) {
    final checkedInBaseIds = attendeeIds
        .where(attendedIds.contains)
        .toList(growable: false);
    final needsCheckInBaseIds = attendeeIds
        .where((uid) => !attendedIds.contains(uid))
        .toList(growable: false);
    final remainingSlots = (capacityLimit - totalCount)
        .clamp(0, capacityLimit)
        .toInt();
    final offerableWaitlistIds = _offerableWaitlistIds(
      waitlistedIds,
      participationsByUid,
    );
    final bulkOfferCount = _bulkOfferCount(
      offerableWaitlistIds,
      remainingSlots,
    );
    final allBaseIds = [
      ...needsCheckInBaseIds,
      ...checkedInBaseIds,
      ...waitlistedIds,
    ];
    final filters = [
      HostRosterFilterSpec(
        filter: HostRosterFilter.all,
        label: l10n.hostsHostEventManageScreenStateLabelAll,
        value: allBaseIds.length,
        tone: CatchBadgeTone.neutral,
      ),
      HostRosterFilterSpec(
        filter: HostRosterFilter.due,
        label: l10n.hostsHostEventManageScreenStateLabelDue,
        value: needsCheckInBaseIds.length,
        tone: CatchBadgeTone.brand,
      ),
      HostRosterFilterSpec(
        filter: HostRosterFilter.checkedIn,
        label: l10n.hostsHostEventManageScreenStateLabelIn,
        value: checkedInBaseIds.length,
        tone: CatchBadgeTone.success,
      ),
      HostRosterFilterSpec(
        filter: usesRequestApproval
            ? HostRosterFilter.requests
            : HostRosterFilter.waitlist,
        label: usesRequestApproval
            ? l10n.hostsHostEventManageScreenStateLabelRequests
            : l10n.hostsHostEventManageScreenStateLabelWaitlist,
        value: waitlistedIds.length,
        tone: CatchBadgeTone.warning,
      ),
    ];
    final activeFilter = _effectiveFilter(selectedFilter, filters);
    final visibleIds = switch (activeFilter) {
      HostRosterFilter.due => needsCheckInBaseIds,
      HostRosterFilter.checkedIn => checkedInBaseIds,
      HostRosterFilter.waitlist || HostRosterFilter.requests => waitlistedIds,
      _ => allBaseIds,
    };
    final rowIds = _matchingIds(
      visibleIds,
      profiles: profiles,
      searchQuery: searchQuery,
    );
    final hasRoster = totalCount > 0;
    final hasSearch = searchQuery.trim().isNotEmpty;
    return HostRosterDisplayState._(
      filters: filters,
      activeFilter: activeFilter,
      rowIds: rowIds,
      offerableWaitlistIds: offerableWaitlistIds,
      bulkOfferCount: bulkOfferCount,
      emptyTitle: hasSearch
          ? l10n.hostsHostEventManageScreenStateEmptytitleNoMatches
          : _liveEmptyTitle(activeFilter, hasRoster, l10n),
      emptyMessage: hasSearch
          ? l10n.hostsHostEventManageScreenStateVisiblecopyNoLiveRosterRows
          : _liveEmptyMessage(activeFilter, hasRoster, l10n),
    );
  }

  factory HostRosterDisplayState.report({
    required AppLocalizations l10n,
    required List<String> attendeeIds,
    required Set<String> attendedIds,
    required List<String> waitlistedIds,
    required int totalCount,
    required int waitlistCount,
    required Map<String, (String, String?)> profiles,
    required String searchQuery,
    required HostRosterFilter selectedFilter,
  }) {
    final attendedBaseIds = attendeeIds
        .where(attendedIds.contains)
        .toList(growable: false);
    final noShowBaseIds = attendeeIds
        .where((uid) => !attendedIds.contains(uid))
        .toList(growable: false);
    final noShowCount = totalCount - attendedBaseIds.length;
    final allBaseIds = [...attendedBaseIds, ...noShowBaseIds, ...waitlistedIds];
    final filters = [
      HostRosterFilterSpec(
        filter: HostRosterFilter.all,
        label: l10n.hostsHostEventManageScreenStateLabelAll,
        value: allBaseIds.length,
        tone: CatchBadgeTone.neutral,
      ),
      HostRosterFilterSpec(
        filter: HostRosterFilter.attended,
        label: l10n.hostsHostEventManageScreenStateLabelAttended,
        value: attendedBaseIds.length,
        tone: CatchBadgeTone.success,
      ),
      HostRosterFilterSpec(
        filter: HostRosterFilter.noShow,
        label: l10n.hostsHostEventManageScreenStateLabelNoShow,
        value: noShowCount,
        tone: CatchBadgeTone.neutral,
      ),
      HostRosterFilterSpec(
        filter: HostRosterFilter.waitlist,
        label: l10n.hostsHostEventManageScreenStateLabelWaitlist,
        value: waitlistCount,
        tone: CatchBadgeTone.warning,
      ),
    ];
    final activeFilter = _effectiveFilter(selectedFilter, filters);
    final visibleIds = switch (activeFilter) {
      HostRosterFilter.attended => attendedBaseIds,
      HostRosterFilter.noShow => noShowBaseIds,
      HostRosterFilter.waitlist => waitlistedIds,
      _ => allBaseIds,
    };
    final rowIds = _matchingIds(
      visibleIds,
      profiles: profiles,
      searchQuery: searchQuery,
    );
    final hasSearch = searchQuery.trim().isNotEmpty;
    return HostRosterDisplayState._(
      filters: filters,
      activeFilter: activeFilter,
      rowIds: rowIds,
      offerableWaitlistIds: const [],
      bulkOfferCount: 0,
      emptyTitle: hasSearch
          ? l10n.hostsHostEventManageScreenStateEmptytitleNoMatches
          : _reportEmptyTitle(activeFilter, l10n),
      emptyMessage: hasSearch
          ? l10n.hostsHostEventManageScreenStateVisiblecopyNoReportRowsMatch
          : _reportEmptyMessage(activeFilter, l10n),
    );
  }

  final List<HostRosterFilterSpec> filters;
  final HostRosterFilter activeFilter;
  final List<String> rowIds;
  final List<String> offerableWaitlistIds;
  final int bulkOfferCount;
  final String emptyTitle;
  final String emptyMessage;

  List<String> get bulkOfferIds =>
      offerableWaitlistIds.take(bulkOfferCount).toList(growable: false);

  bool get showBulkOfferAction => bulkOfferCount > 0;
}

HostRosterFilter _effectiveFilter(
  HostRosterFilter selected,
  List<HostRosterFilterSpec> filters,
) {
  for (final filter in filters) {
    if (filter.filter == selected) return selected;
  }
  return HostRosterFilter.all;
}

List<String> _offerableWaitlistIds(
  List<String> ids,
  Map<String, EventParticipation> participationsByUid,
) {
  return [
    for (final uid in ids)
      if (_canCreateWaitlistOffer(participationsByUid[uid])) uid,
  ];
}

int _bulkOfferCount(List<String> offerableIds, int remainingSlots) {
  if (offerableIds.isEmpty || remainingSlots <= 0) return 0;
  return offerableIds.length < remainingSlots
      ? offerableIds.length
      : remainingSlots;
}

bool _canCreateWaitlistOffer(EventParticipation? participation) {
  if (participation?.status != EventParticipationStatus.waitlisted) {
    return false;
  }
  final offerStatus = participation?.waitlistOfferStatus;
  return offerStatus != EventWaitlistOfferStatus.active &&
      offerStatus != EventWaitlistOfferStatus.accepted;
}

List<String> _matchingIds(
  List<String> ids, {
  required Map<String, (String, String?)> profiles,
  required String searchQuery,
}) {
  final query = searchQuery.trim().toLowerCase();
  if (query.isEmpty) return ids;
  return [
    for (final uid in ids)
      if (_profileName(profiles, uid).toLowerCase().contains(query) ||
          uid.toLowerCase().contains(query))
        uid,
  ];
}

String _profileName(Map<String, (String, String?)> profiles, String uid) =>
    profiles[uid]?.$1 ?? 'Runner';

String _liveEmptyTitle(
  HostRosterFilter filter,
  bool hasRoster,
  AppLocalizations l10n,
) {
  return switch (filter) {
    HostRosterFilter.due when hasRoster =>
      l10n.hostsHostEventManageScreenStateVisiblecopyEveryoneVisibleIsChecked,
    HostRosterFilter.checkedIn =>
      l10n.hostsHostEventManageScreenStateVisiblecopyNoCheckedInPeople,
    HostRosterFilter.waitlist || HostRosterFilter.requests =>
      l10n.hostsHostEventManageScreenStateVisiblecopyNoWaitlistedPeople,
    _ => l10n.hostsHostEventManageScreenStateVisiblecopyRosterIsEmpty,
  };
}

String _liveEmptyMessage(
  HostRosterFilter filter,
  bool hasRoster,
  AppLocalizations l10n,
) {
  return switch (filter) {
    HostRosterFilter.due when hasRoster =>
      l10n.hostsHostEventManageScreenStateVisiblecopySwitchToInTo,
    HostRosterFilter.checkedIn =>
      l10n.hostsHostEventManageScreenStateVisiblecopyCheckedInPeopleWill,
    HostRosterFilter.waitlist || HostRosterFilter.requests =>
      l10n.hostsHostEventManageScreenStateVisiblecopyWaitlistedPeopleWillAppear,
    _ =>
      l10n.hostsHostEventManageScreenStateVisiblecopySignedUpParticipantsWill,
  };
}

String _reportEmptyTitle(HostRosterFilter filter, AppLocalizations l10n) {
  return switch (filter) {
    HostRosterFilter.attended =>
      l10n.hostsHostEventManageScreenStateVisiblecopyNoAttendedPeopleYet,
    HostRosterFilter.noShow =>
      l10n.hostsHostEventManageScreenStateVisiblecopyNoNoShowsYet,
    HostRosterFilter.waitlist =>
      l10n.hostsHostEventManageScreenStateVisiblecopyNoWaitlistedPeople,
    _ => l10n.hostsHostEventManageScreenStateVisiblecopyNoParticipantsYet,
  };
}

String _reportEmptyMessage(HostRosterFilter filter, AppLocalizations l10n) {
  return switch (filter) {
    HostRosterFilter.attended =>
      l10n.hostsHostEventManageScreenStateVisiblecopyCheckedInPeopleWill186cb6,
    HostRosterFilter.noShow =>
      l10n.hostsHostEventManageScreenStateVisiblecopyBookedPeopleWhoDid,
    HostRosterFilter.waitlist =>
      l10n.hostsHostEventManageScreenStateVisiblecopyWaitlistHistoryWillAppear,
    _ =>
      l10n.hostsHostEventManageScreenStateVisiblecopyAttendanceAndWaitlistHistory,
  };
}
