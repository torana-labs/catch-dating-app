import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_check_in_qr_payload.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show
        GetEventTicketCodeCallableRequest,
        ResolveEventTicketCodeCallableRequest;
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_ticket_code_repository.g.dart';

/// The guest's ticket code and the door's lookup of a scanned one.
class EventTicketCodeRepository {
  const EventTicketCodeRepository(this._functions);

  final FirebaseFunctions _functions;

  /// The caller's own signed ticket for [eventId], as the QR it shows.
  Future<EventTicketQrPayload> getTicketCode(String eventId) =>
      withBackendErrorContext(
        () async {
          final result = await _functions
              .httpsCallable('getEventTicketCode')
              .call<Object?>(
                GetEventTicketCodeCallableRequest(eventId: eventId).toJson(),
              );
          return eventTicketFromCallableData(result.data);
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'get event ticket code',
          resource: 'eventAttendees',
        ),
      );

  /// The attendee a scanned [ticketCode] names. It checks nobody in.
  Future<EventTicketResolution> resolveTicketCode({
    required String eventId,
    required String ticketCode,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('resolveEventTicketCode')
          .call<Object?>(
            ResolveEventTicketCodeCallableRequest(
              eventId: eventId,
              ticketCode: ticketCode,
            ).toJson(),
          );
      return EventTicketResolution.fromCallableData(result.data);
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'resolve event ticket code',
      resource: 'eventAttendees',
    ),
  );
}

/// Decodes `GetEventTicketCodeCallableResponse` strictly.
EventTicketQrPayload eventTicketFromCallableData(Object? value) {
  if (value case {
    'eventId': final String eventId,
    'attendeeId': String _,
    'ticketCode': final String ticketCode,
  } when (value as Map).length == 3) {
    return EventTicketQrPayload(eventId: eventId, ticketCode: ticketCode);
  }
  throw const FormatException('Invalid event ticket code response.');
}

/// The attendee row a scanned ticket names, as
/// `ResolveEventTicketCodeCallableResponse` returns it.
class EventTicketResolution {
  const EventTicketResolution({
    required this.eventId,
    required this.attendeeId,
    required this.displayName,
    required this.status,
    required this.attendanceRevision,
    required this.partySize,
  });

  factory EventTicketResolution.fromCallableData(Object? value) {
    if (value case {
      'eventId': final String eventId,
      'attendeeId': final String attendeeId,
      'displayName': final String displayName,
      'status': final String status,
      'attendanceRevision': final num attendanceRevision,
      'partySize': final num partySize,
    } when (value as Map).length == 6) {
      final parsed = EventAttendeeStatus.values.asNameMap()[status];
      if (parsed != null && parsed != EventAttendeeStatus.cancelled) {
        return EventTicketResolution(
          eventId: eventId,
          attendeeId: attendeeId,
          displayName: displayName,
          status: parsed,
          attendanceRevision: attendanceRevision.toInt(),
          partySize: partySize.toInt(),
        );
      }
    }
    throw const FormatException('Invalid event ticket lookup response.');
  }

  final String eventId;
  final String attendeeId;
  final String displayName;
  final EventAttendeeStatus status;
  final int attendanceRevision;

  /// Places the ticket holds at the door.
  final int partySize;

  bool get isCheckedIn => status == EventAttendeeStatus.checkedIn;
}

// keepalive: One Firebase-backed repository instance serves every event.
@Riverpod(keepAlive: true)
EventTicketCodeRepository eventTicketCodeRepository(Ref ref) =>
    EventTicketCodeRepository(ref.watch(firebaseFunctionsProvider));

/// The signed-in guest's ticket for [eventId]. It fails when they hold no
/// place or ticket codes are not available, and the ticket then shows
/// without a code.
@riverpod
Future<EventTicketQrPayload> eventTicketCode(Ref ref, String eventId) =>
    ref.watch(eventTicketCodeRepositoryProvider).getTicketCode(eventId);
