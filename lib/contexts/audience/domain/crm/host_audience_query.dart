import 'package:collection/collection.dart';

enum HostAudienceSegment {
  newToOrganizer('new_to_organizer'),
  pastAttendee('past_attendee'),
  firstTimeAttendee('first_time_attendee'),
  repeatAttendee('repeat_attendee'),
  regular('regular'),
  lapsedRegular('lapsed_regular'),
  reliableAttendee('reliable_attendee'),
  needsConfirmation('needs_confirmation'),
  advocate('advocate'),
  highImpactAdvocate('high_impact_advocate'),
  whatsappReachable('whatsapp_reachable'),
  smsReachable('sms_reachable');

  const HostAudienceSegment(this.wireValue);

  final String wireValue;

  static HostAudienceSegment? fromWireValue(String value) {
    for (final segment in values) {
      if (segment.wireValue == value) return segment;
    }
    return null;
  }
}

enum HostAudienceSort {
  lastSeen('lastSeen'),
  mostAttended('mostAttended'),
  name('name');

  const HostAudienceSort(this.wireValue);

  final String wireValue;
}

class HostAudienceQuery {
  const HostAudienceQuery({
    this.search,
    this.segment,
    this.manualTagId,
    this.segments = const {},
    this.manualTagIds = const {},
    this.sort = HostAudienceSort.lastSeen,
    this.cursor,
  });

  final String? search;
  final HostAudienceSegment? segment;
  final String? manualTagId;
  final Set<HostAudienceSegment> segments;
  final Set<String> manualTagIds;
  final HostAudienceSort sort;
  final String? cursor;

  HostAudienceQuery copyWith({
    String? search,
    HostAudienceSegment? segment,
    String? manualTagId,
    Set<HostAudienceSegment>? segments,
    Set<String>? manualTagIds,
    HostAudienceSort? sort,
    String? cursor,
    bool clearSegment = false,
    bool clearManualTag = false,
    bool clearCursor = false,
  }) => HostAudienceQuery(
    search: search ?? this.search,
    segment: clearSegment ? null : segment ?? this.segment,
    manualTagId: clearManualTag ? null : manualTagId ?? this.manualTagId,
    segments: clearSegment ? const {} : segments ?? this.segments,
    manualTagIds: clearManualTag ? const {} : manualTagIds ?? this.manualTagIds,
    sort: sort ?? this.sort,
    cursor: clearCursor ? null : cursor ?? this.cursor,
  );

  @override
  bool operator ==(Object other) =>
      other is HostAudienceQuery &&
      other.search == search &&
      other.segment == segment &&
      other.manualTagId == manualTagId &&
      const SetEquality<HostAudienceSegment>().equals(
        other.segments,
        segments,
      ) &&
      const SetEquality<String>().equals(other.manualTagIds, manualTagIds) &&
      other.sort == sort &&
      other.cursor == cursor;

  @override
  int get hashCode => Object.hash(
    search,
    segment,
    manualTagId,
    sort,
    cursor,
    Object.hashAllUnordered(segments),
    Object.hashAllUnordered(manualTagIds),
  );
}
