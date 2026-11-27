import 'package:flutter/foundation.dart';

enum HostCustomerTag {
  newToOrganizer,
  firstTime,
  repeat,
  regular,
  atRisk,
  reliable,
  needsConfirmation,
  advocate,
  highImpactAdvocate,
  whatsappReachable,
  smsReachable,
  activeMember,
  lapsedMember,
  memberNoRecentAttendance,
  frequentNonMember,
}

enum HostCustomerFilter {
  all,
  newToOrganizer,
  attended,
  firstTime,
  repeat,
  regular,
  atRisk,
  reliable,
  needsConfirmation,
  advocate,
  highImpactAdvocate,
  whatsappReachable,
  smsReachable,
  activeMember,
  lapsedMember,
  memberNoRecentAttendance,
  frequentNonMember;

  HostCustomerTag? get tag => switch (this) {
    HostCustomerFilter.all => null,
    HostCustomerFilter.newToOrganizer => HostCustomerTag.newToOrganizer,
    HostCustomerFilter.attended => null,
    HostCustomerFilter.firstTime => HostCustomerTag.firstTime,
    HostCustomerFilter.repeat => HostCustomerTag.repeat,
    HostCustomerFilter.regular => HostCustomerTag.regular,
    HostCustomerFilter.atRisk => HostCustomerTag.atRisk,
    HostCustomerFilter.reliable => HostCustomerTag.reliable,
    HostCustomerFilter.needsConfirmation => HostCustomerTag.needsConfirmation,
    HostCustomerFilter.advocate => HostCustomerTag.advocate,
    HostCustomerFilter.highImpactAdvocate => HostCustomerTag.highImpactAdvocate,
    HostCustomerFilter.whatsappReachable => HostCustomerTag.whatsappReachable,
    HostCustomerFilter.smsReachable => HostCustomerTag.smsReachable,
    HostCustomerFilter.activeMember => HostCustomerTag.activeMember,
    HostCustomerFilter.lapsedMember => HostCustomerTag.lapsedMember,
    HostCustomerFilter.memberNoRecentAttendance =>
      HostCustomerTag.memberNoRecentAttendance,
    HostCustomerFilter.frequentNonMember => HostCustomerTag.frequentNonMember,
  };
}

enum HostCustomerFilterGroup {
  attendance,
  reliability,
  advocacy,
  reachable,
  membership,
}

enum HostCustomerSort { lastSeen, mostAttended, name }

@immutable
class HostCustomerSegmentCountRequest {
  const HostCustomerSegmentCountRequest({
    required this.organizerId,
    required this.filter,
    this.search,
  });

  final String organizerId;
  final HostCustomerFilter filter;
  final String? search;

  @override
  bool operator ==(Object other) =>
      other is HostCustomerSegmentCountRequest &&
      other.organizerId == organizerId &&
      other.filter == filter &&
      other.search == search;

  @override
  int get hashCode => Object.hash(organizerId, filter, search);
}

@immutable
class HostCustomerSegmentCount {
  const HostCustomerSegmentCount({required this.count, required this.coverage});

  final int count;
  final HostCustomerMatchCountCoverage coverage;
}

@immutable
class HostCustomersDirectoryRequest {
  const HostCustomersDirectoryRequest({
    required this.organizerId,
    this.search,
    this.filter = HostCustomerFilter.all,
    this.manualTagId,
    this.filters = const {},
    this.manualTagIds = const {},
    this.sort = HostCustomerSort.lastSeen,
  });

  final String organizerId;
  final String? search;
  final HostCustomerFilter filter;
  final String? manualTagId;
  final Set<HostCustomerFilter> filters;
  final Set<String> manualTagIds;
  final HostCustomerSort sort;

  @override
  bool operator ==(Object other) =>
      other is HostCustomersDirectoryRequest &&
      other.organizerId == organizerId &&
      other.search == search &&
      other.filter == filter &&
      other.manualTagId == manualTagId &&
      setEquals(other.filters, filters) &&
      setEquals(other.manualTagIds, manualTagIds) &&
      other.sort == sort;

  @override
  int get hashCode => Object.hash(
    organizerId,
    search,
    filter,
    manualTagId,
    sort,
    Object.hashAllUnordered(filters),
    Object.hashAllUnordered(manualTagIds),
  );
}

@immutable
class HostCustomersDirectoryState {
  const HostCustomersDirectoryState({
    required this.contacts,
    required this.nextCursor,
    required this.matchCount,
    required this.matchCountCoverage,
    this.manualTagVocabulary = const [],
    required this.sourceCoverage,
    required this.projectionVersion,
    this.loadingMore = false,
    this.loadMoreError,
  });

  factory HostCustomersDirectoryState.fromPageData({
    required Iterable<HostCustomerDirectoryContact> contacts,
    required String? nextCursor,
    required int matchCount,
    required HostCustomerMatchCountCoverage matchCountCoverage,
    Iterable<HostCustomerManualTag> manualTagVocabulary = const [],
    required HostCustomerDirectoryCoverage sourceCoverage,
    required int projectionVersion,
  }) => HostCustomersDirectoryState(
    contacts: List.unmodifiable(contacts),
    nextCursor: nextCursor,
    matchCount: matchCount,
    matchCountCoverage: matchCountCoverage,
    manualTagVocabulary: List.unmodifiable(manualTagVocabulary),
    sourceCoverage: sourceCoverage,
    projectionVersion: projectionVersion,
  );

  final List<HostCustomerDirectoryContact> contacts;
  final String? nextCursor;
  final int matchCount;
  final HostCustomerMatchCountCoverage matchCountCoverage;
  final List<HostCustomerManualTag> manualTagVocabulary;
  final HostCustomerDirectoryCoverage sourceCoverage;
  final int projectionVersion;
  final bool loadingMore;
  final Object? loadMoreError;

  bool get canLoadMore => nextCursor != null && !loadingMore;

  HostCustomersDirectoryState copyWith({
    List<HostCustomerDirectoryContact>? contacts,
    String? nextCursor,
    bool clearNextCursor = false,
    int? matchCount,
    HostCustomerMatchCountCoverage? matchCountCoverage,
    List<HostCustomerManualTag>? manualTagVocabulary,
    bool? loadingMore,
    Object? loadMoreError,
    bool clearLoadMoreError = false,
  }) => HostCustomersDirectoryState(
    contacts: contacts ?? this.contacts,
    nextCursor: clearNextCursor ? null : nextCursor ?? this.nextCursor,
    matchCount: matchCount ?? this.matchCount,
    matchCountCoverage: matchCountCoverage ?? this.matchCountCoverage,
    manualTagVocabulary: manualTagVocabulary ?? this.manualTagVocabulary,
    sourceCoverage: sourceCoverage,
    projectionVersion: projectionVersion,
    loadingMore: loadingMore ?? this.loadingMore,
    loadMoreError: clearLoadMoreError
        ? null
        : loadMoreError ?? this.loadMoreError,
  );
}

@immutable
class HostCustomerManualTag {
  const HostCustomerManualTag({required this.tagId, required this.label});

  final String tagId;
  final String label;

  @override
  bool operator ==(Object other) =>
      other is HostCustomerManualTag &&
      other.tagId == tagId &&
      other.label == label;

  @override
  int get hashCode => Object.hash(tagId, label);
}

@immutable
class HostCustomerFilterSelection {
  const HostCustomerFilterSelection.computed(this.filter)
    : manualTag = null,
      filters = const {},
      manualTags = const [];
  const HostCustomerFilterSelection.manual(this.manualTag)
    : filter = HostCustomerFilter.all,
      filters = const {},
      manualTags = const [];
  const HostCustomerFilterSelection.multiple({
    this.filters = const {},
    this.manualTags = const [],
  }) : filter = HostCustomerFilter.all,
       manualTag = null;

  final HostCustomerFilter filter;
  final HostCustomerManualTag? manualTag;
  final Set<HostCustomerFilter> filters;
  final List<HostCustomerManualTag> manualTags;
  Set<HostCustomerFilter> get allFilters => {
    ...filters,
    if (filter != HostCustomerFilter.all) filter,
  };
  List<HostCustomerManualTag> get allManualTags => [...manualTags, ?manualTag];
}

enum HostCustomerDirectoryCoverage { exact, partial, insufficientData }

enum HostCustomerMatchCountCoverage { exact, atLeast }

@immutable
class HostCustomerDirectoryContact {
  const HostCustomerDirectoryContact({
    required this.contactId,
    required this.displayName,
    required this.attendedEventCount,
    required this.lastAttendedAt,
    required this.tags,
    this.manualTags = const [],
    required this.hasAmbiguousIdentity,
    required this.whatsappOptedIn,
    required this.whatsappAdminSuppressed,
  });

  final String contactId;
  final String displayName;
  final int attendedEventCount;
  final DateTime? lastAttendedAt;
  final Set<HostCustomerTag> tags;
  final List<HostCustomerManualTag> manualTags;
  final bool hasAmbiguousIdentity;
  final bool whatsappOptedIn;
  final bool whatsappAdminSuppressed;
}
