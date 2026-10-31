import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'event_attendee.freezed.dart';
part 'event_attendee.g.dart';

enum EventAttendeeSource {
  catchBooking,
  hostImport,
  hostManual,
  webOtp,
  providerSync,
}

enum EventAttendeeStatus {
  invited,
  registered,
  waitlisted,
  checkedIn,
  cancelled,
}

enum EventSuccessAccountabilityResolution { returned, departed }

enum EventAttendeeImportFormat { csv, xlsx, manual }

enum EventAttendeeRevenueSource { hostImport, hostEstimate, providerOrder }

enum EventAttendeeRevenueAllocation { perAttendee, sharedOrder }

@freezed
abstract class EventAttendee with _$EventAttendee {
  const EventAttendee._();

  const factory EventAttendee({
    @JsonKey(includeToJson: false) required String id,
    required String eventId,
    required String organizerId,
    required String organizerId,
    required String displayName,
    required String searchName,
    required EventAttendeeSource source,
    required EventAttendeeStatus status,
    String? linkedUid,
    String? phoneE164,
    String? email,
    String? externalReference,
    String? arrivalGroup,
    String? ticketType,
    int? revenueAmountMinor,
    String? revenueCurrency,
    EventAttendeeRevenueSource? revenueSource,
    EventAttendeeRevenueAllocation? revenueAllocation,
    String? revenueOrderReference,
    int? revenueOrderAmountMinor,
    String? importId,
    String? sourceRowId,
    ExternalBookingProvider? provider,
    String? providerConnectionId,
    String? providerGuestId,
    @NullableTimestampConverter() DateTime? providerSyncedAt,
    @Default(0) int providerDataRevision,
    @TimestampConverter() required DateTime createdAt,
    @TimestampConverter() required DateTime updatedAt,
    @NullableTimestampConverter() DateTime? registeredAt,
    @NullableTimestampConverter() DateTime? waitlistedAt,
    @NullableTimestampConverter() DateTime? checkedInAt,
    @NullableTimestampConverter() DateTime? cancelledAt,
    String? checkedInBy,
    @NullableTimestampConverter() DateTime? linkedAt,
    @Default(0) int attendanceRevision,
    EventAttendeeStatus? preCheckInStatus,
    EventSuccessAccountabilityResolution? accountabilityResolution,
    @NullableTimestampConverter() DateTime? accountabilityResolvedForCheckInAt,
    @NullableTimestampConverter() DateTime? accountabilityResolvedAt,
    String? accountabilityResolvedBy,
  }) = _EventAttendee;

  factory EventAttendee.fromJson(Map<String, dynamic> json) =>
      _$EventAttendeeFromJson(json);

  bool get isCheckedIn => status == EventAttendeeStatus.checkedIn;
  bool get hasEventIdentity => linkedUid != null;

  EventSuccessAccountabilityResolution? get currentAccountabilityResolution {
    final checkIn = checkedInAt;
    final resolvedFor = accountabilityResolvedForCheckInAt;
    if (checkIn == null || resolvedFor == null) return null;
    return checkIn.isAtSameMomentAs(resolvedFor)
        ? accountabilityResolution
        : null;
  }
}

class EventAttendeeImportRow {
  const EventAttendeeImportRow({
    required this.rowId,
    required this.displayName,
    required this.status,
    this.phone,
    this.email,
    this.cityMarketId,
    this.externalReference,
    this.arrivalGroup,
    this.ticketType,
    this.revenueAmountMinor,
    this.revenueCurrency,
    this.revenueSource,
  });

  final String rowId;
  final String displayName;
  final EventAttendeeStatus status;
  final String? phone;
  final String? email;
  final String? cityMarketId;
  final String? externalReference;
  final String? arrivalGroup;
  final String? ticketType;
  final int? revenueAmountMinor;
  final String? revenueCurrency;
  final EventAttendeeRevenueSource? revenueSource;

  Map<String, Object?> toJson() => {
    'rowId': rowId,
    'displayName': displayName,
    'status': status.name,
    'phone': phone,
    'email': email,
    'cityMarketId': cityMarketId,
    'externalReference': externalReference,
    'arrivalGroup': arrivalGroup,
    'ticketType': ticketType,
    'revenueAmountMinor': revenueAmountMinor,
    'revenueCurrency': revenueCurrency,
    'revenueSource': revenueSource?.name,
  };
}

class EventAttendeeImportError {
  const EventAttendeeImportError({
    required this.rowId,
    required this.code,
    required this.message,
  });

  final String rowId;
  final String code;
  final String message;
}

class EventAttendeeImportResult {
  const EventAttendeeImportResult({
    required this.importId,
    required this.status,
    required this.rowCount,
    required this.createdCount,
    required this.updatedCount,
    required this.skippedCount,
    required this.errors,
    required this.replayed,
  });

  factory EventAttendeeImportResult.fromCallableData(Object? value) {
    if (value case final Map<Object?, Object?> data) {
      final rawErrors = data['errors'];
      return EventAttendeeImportResult(
        importId: data['importId'] as String,
        status: data['status'] as String,
        rowCount: (data['rowCount'] as num).toInt(),
        createdCount: (data['createdCount'] as num).toInt(),
        updatedCount: (data['updatedCount'] as num).toInt(),
        skippedCount: (data['skippedCount'] as num).toInt(),
        errors: rawErrors is List
            ? rawErrors
                  .map((raw) {
                    final error = raw as Map<Object?, Object?>;
                    return EventAttendeeImportError(
                      rowId: error['rowId'] as String,
                      code: error['code'] as String,
                      message: error['message'] as String,
                    );
                  })
                  .toList(growable: false)
            : const [],
        replayed: data['replayed'] as bool? ?? false,
      );
    }
    throw const FormatException('Invalid event attendee import response.');
  }

  final String importId;
  final String status;
  final int rowCount;
  final int createdCount;
  final int updatedCount;
  final int skippedCount;
  final List<EventAttendeeImportError> errors;
  final bool replayed;
}

enum EventRosterHandoffChannelStatus { available, providerSetupRequired }

class EventRosterHandoffInstructions {
  const EventRosterHandoffInstructions({
    required this.eventId,
    required this.expiresAt,
    required this.emailStatus,
    required this.emailAlias,
    required this.whatsappStatus,
    required this.whatsappNumber,
    required this.whatsappMessage,
  });

  factory EventRosterHandoffInstructions.fromCallableData(Object? value) {
    if (value case final Map<Object?, Object?> data) {
      return EventRosterHandoffInstructions(
        eventId: data['eventId'] as String,
        expiresAt: DateTime.fromMillisecondsSinceEpoch(
          (data['expiresAtMillis'] as num).toInt(),
        ),
        emailStatus: EventRosterHandoffChannelStatus.values.byName(
          data['emailStatus'] as String,
        ),
        emailAlias: data['emailAlias'] as String?,
        whatsappStatus: EventRosterHandoffChannelStatus.values.byName(
          data['whatsappStatus'] as String,
        ),
        whatsappNumber: data['whatsappNumber'] as String?,
        whatsappMessage: data['whatsappMessage'] as String?,
      );
    }
    throw const FormatException('Invalid event roster handoff response.');
  }

  final String eventId;
  final DateTime expiresAt;
  final EventRosterHandoffChannelStatus emailStatus;
  final String? emailAlias;
  final EventRosterHandoffChannelStatus whatsappStatus;
  final String? whatsappNumber;
  final String? whatsappMessage;

  bool get hasAvailableChannel =>
      emailStatus == EventRosterHandoffChannelStatus.available ||
      whatsappStatus == EventRosterHandoffChannelStatus.available;
}
