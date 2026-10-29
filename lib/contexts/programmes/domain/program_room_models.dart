part of 'program_models.dart';

/// One reserved room block at the hotel, with live capacity computed
/// server-side from capacity-consuming stays.
class ProgramRoomBlock {
  const ProgramRoomBlock({
    required this.roomBlockId,
    required this.label,
    required this.roomType,
    required this.totalRooms,
    required this.assignedCount,
    required this.remainingRooms,
    required this.heldForGroupIds,
    required this.startsAt,
    required this.endsAt,
  });

  factory ProgramRoomBlock.fromMap(Map<Object?, Object?> map) {
    return ProgramRoomBlock(
      roomBlockId: requiredString(map, 'roomBlockId'),
      label: requiredString(map, 'label'),
      roomType: map['roomType'] as String?,
      totalRooms: requiredInt(map, 'totalRooms'),
      assignedCount: requiredInt(map, 'assignedCount'),
      remainingRooms: requiredInt(map, 'remainingRooms'),
      heldForGroupIds: stringList(map['heldForGroupIds']),
      startsAt: requiredDateTime(map, 'startsAtMillis'),
      endsAt: requiredDateTime(map, 'endsAtMillis'),
    );
  }

  final String roomBlockId;
  final String label;
  final String? roomType;
  final int totalRooms;
  final int assignedCount;
  final int remainingRooms;
  final List<String> heldForGroupIds;
  final DateTime startsAt;
  final DateTime endsAt;
}

/// One guest's stay at the hotel — block binding, room label, lifecycle.
class ProgramStay {
  const ProgramStay({
    required this.stayId,
    required this.guestId,
    required this.guestDisplayName,
    required this.roomBlockId,
    required this.roomLabel,
    required this.status,
    required this.startsAt,
    required this.endsAt,
    required this.roomReadyAt,
    required this.hotelArrivedAt,
    required this.revision,
  });

  factory ProgramStay.fromMap(Map<Object?, Object?> map) {
    return ProgramStay(
      stayId: requiredString(map, 'stayId'),
      guestId: requiredString(map, 'guestId'),
      guestDisplayName: requiredString(map, 'guestDisplayName'),
      roomBlockId: map['roomBlockId'] as String?,
      roomLabel: map['roomLabel'] as String?,
      status: ProgramStayStatus.values.byName(requiredString(map, 'status')),
      startsAt: requiredNullableDateTime(map, 'startsAtMillis'),
      endsAt: requiredNullableDateTime(map, 'endsAtMillis'),
      roomReadyAt: requiredNullableDateTime(map, 'roomReadyAtMillis'),
      hotelArrivedAt: requiredNullableDateTime(map, 'hotelArrivedAtMillis'),
      revision: requiredInt(map, 'revision'),
    );
  }

  final String stayId;
  final String guestId;
  final String guestDisplayName;
  final String? roomBlockId;
  final String? roomLabel;
  final ProgramStayStatus status;
  final DateTime? startsAt;
  final DateTime? endsAt;
  final DateTime? roomReadyAt;
  final DateTime? hotelArrivedAt;
  final int revision;

  bool get consumesRoom =>
      status == ProgramStayStatus.held ||
      status == ProgramStayStatus.confirmed ||
      status == ProgramStayStatus.checkedIn;
}

/// A guest routed to this hotel with no live stay — the desk's work queue.
class ProgramUnplacedGuest {
  const ProgramUnplacedGuest({
    required this.guestId,
    required this.displayName,
    required this.suggestedRoomBlockId,
  });

  factory ProgramUnplacedGuest.fromMap(Map<Object?, Object?> map) {
    return ProgramUnplacedGuest(
      guestId: requiredString(map, 'guestId'),
      displayName: requiredString(map, 'displayName'),
      suggestedRoomBlockId: map['suggestedRoomBlockId'] as String?,
    );
  }

  final String guestId;
  final String displayName;
  final String? suggestedRoomBlockId;
}

/// The hotel desk's room board for one property.
class ProgramHotelRooms {
  const ProgramHotelRooms({
    required this.programId,
    required this.hotelId,
    required this.hotelName,
    required this.accessExpiresAt,
    required this.generatedAt,
    required this.roomBlocks,
    required this.stays,
    required this.unplacedGuests,
  });

  factory ProgramHotelRooms.fromCallableData(Object? value) {
    final map = requiredMap(value, 'hotel rooms');
    return ProgramHotelRooms(
      programId: requiredString(map, 'programId'),
      hotelId: requiredString(map, 'hotelId'),
      hotelName: requiredString(map, 'hotelName'),
      accessExpiresAt: requiredNullableDateTime(map, 'accessExpiresAtMillis'),
      generatedAt: requiredDateTime(map, 'generatedAtMillis'),
      roomBlocks: mapList(
        map['roomBlocks'],
        'roomBlocks',
      ).map(ProgramRoomBlock.fromMap).toList(growable: false),
      stays: mapList(
        map['stays'],
        'stays',
      ).map(ProgramStay.fromMap).toList(growable: false),
      unplacedGuests: mapList(
        map['unplacedGuests'],
        'unplacedGuests',
      ).map(ProgramUnplacedGuest.fromMap).toList(growable: false),
    );
  }

  final String programId;
  final String hotelId;
  final String hotelName;
  final DateTime? accessExpiresAt;
  final DateTime generatedAt;
  final List<ProgramRoomBlock> roomBlocks;
  final List<ProgramStay> stays;
  final List<ProgramUnplacedGuest> unplacedGuests;
}
