import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/audience/data/host_provider_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/host_roster_file_parser.dart';
import 'package:catch_dating_app/contexts/audience/data/host_roster_file_service.dart';
import 'package:catch_dating_app/contexts/audience/data/host_roster_intake_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/host_attendance_outbox.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/data/event_runtime_claim_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_runtime_claim_request.dart';
import 'package:catch_dating_app/platform/device/connectivity_service.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_operational_roster_controller.g.dart';

@riverpod
HostOperationalRosterController hostOperationalRosterController(Ref ref) =>
    HostOperationalRosterController(ref);

class HostOperationalRosterController {
  const HostOperationalRosterController(this._ref);

  final Ref _ref;

  Future<HostRosterTable?> pickRosterFile({
    ExternalBookingProvider? providerHint,
  }) async {
    final file = await _ref
        .read(hostRosterFileServiceProvider)
        .pickRosterFile();
    if (file == null) return null;
    return parseHostRosterFile(
      fileName: file.name,
      bytes: file.bytes,
      providerHint: providerHint,
    );
  }

  Future<EventAttendeeImportResult> importAttendees({
    required String eventId,
    required String importKey,
    required String fileName,
    required EventAttendeeImportFormat format,
    required List<EventAttendeeImportRow> rows,
  }) => _ref
      .read(eventAttendeeRepositoryProvider)
      .importAttendees(
        eventId: eventId,
        importKey: importKey,
        fileName: fileName,
        format: format,
        rows: rows,
      );

  Future<HostRosterIntakeReview> startRosterIntake({
    required String eventId,
    required String organizerId,
    required HostRosterImportPlan plan,
  }) => _ref
      .read(hostRosterIntakeRepositoryProvider)
      .start(eventId: eventId, organizerId: organizerId, plan: plan);

  Future<HostRosterIntakeReview> setRosterIntakeExcludedRows(
    HostRosterIntakeReview review,
    Iterable<String> rowIds,
  ) => _ref
      .read(hostRosterIntakeRepositoryProvider)
      .setExcludedRows(review, rowIds);

  Future<HostRosterIntakeReview> resumeRosterIntake(String sessionId) =>
      _ref.read(hostRosterIntakeRepositoryProvider).resume(sessionId);

  Future<HostRosterIntakeReview> applyRosterIntake(
    HostRosterIntakeReview review,
  ) => _ref.read(hostRosterIntakeRepositoryProvider).apply(review);

  Future<HostAttendanceOutboxSummary> setAttendance({
    required String eventId,
    required EventAttendee attendee,
    required String clientOperationId,
  }) {
    final accountId = requireSignedInUid(
      _ref,
      action: 'record event attendance',
    );
    return _ref
        .read(hostAttendanceOutboxProvider)
        .enqueueAndAttempt(
          accountId: accountId,
          entry: HostAttendanceOutboxEntry(
            eventId: eventId,
            attendeeId: attendee.id,
            desiredCheckedIn: !attendee.isCheckedIn,
            expectedRevision: attendee.attendanceRevision,
            clientOperationId: clientOperationId,
            createdAt: DateTime.now(),
            status: HostAttendanceOutboxStatus.pending,
          ),
          offline: _ref.read(isObviouslyOfflineProvider),
        );
  }

  Future<HostAttendanceOutboxSummary> loadAttendanceOutbox(String eventId) {
    final accountId = requireSignedInUid(
      _ref,
      action: 'load pending event attendance',
    );
    return _ref
        .read(hostAttendanceOutboxProvider)
        .loadForEvent(accountId: accountId, eventId: eventId);
  }

  Future<HostAttendanceOutboxSummary> flushAttendanceOutbox(String eventId) {
    final accountId = requireSignedInUid(
      _ref,
      action: 'sync pending event attendance',
    );
    return _ref
        .read(hostAttendanceOutboxProvider)
        .flushEvent(accountId: accountId, eventId: eventId);
  }

  Future<HostAttendanceOutboxSummary> clearAttendanceConflicts(String eventId) {
    final accountId = requireSignedInUid(
      _ref,
      action: 'clear stale event attendance changes',
    );
    return _ref
        .read(hostAttendanceOutboxProvider)
        .clearNeedsReview(accountId: accountId, eventId: eventId);
  }

  Future<EventRuntimeClaimStatus> reviewRuntimeClaim({
    required String eventId,
    required String uid,
    required EventRuntimeClaimDecision decision,
    String? attendeeId,
  }) async {
    final status = await _ref
        .read(eventRuntimeClaimRepositoryProvider)
        .review(
          eventId: eventId,
          uid: uid,
          decision: decision,
          attendeeId: attendeeId,
        );
    _ref.invalidate(watchPendingEventRuntimeClaimsProvider(eventId));
    _ref.invalidate(watchEventAttendeesProvider(eventId));
    return status;
  }

  Future<EventRosterHandoffInstructions> createRosterHandoff({
    required String eventId,
  }) => _ref
      .read(eventAttendeeRepositoryProvider)
      .createRosterHandoff(eventId: eventId);

  Future<HostProviderSetup> getProviderSetup({
    required String organizerId,
    required String eventId,
  }) => _ref
      .read(hostProviderRepositoryProvider)
      .getSetup(organizerId: organizerId, eventId: eventId);

  Future<HostProviderEventChoices> listLumaEvents({
    required String organizerId,
    required String eventId,
    required String apiKey,
  }) => _ref
      .read(hostProviderRepositoryProvider)
      .listLumaEvents(
        organizerId: organizerId,
        eventId: eventId,
        apiKey: apiKey,
      );

  Future<HostProviderSetup> connectLuma({
    required String organizerId,
    required String eventId,
    required String externalEventId,
    required String apiKey,
  }) => _ref
      .read(hostProviderRepositoryProvider)
      .connectLuma(
        organizerId: organizerId,
        eventId: eventId,
        externalEventId: externalEventId,
        apiKey: apiKey,
      );

  Future<HostProviderSyncResult> syncProvider({
    required String organizerId,
    required String eventId,
    required String clientOperationId,
  }) => _ref
      .read(hostProviderRepositoryProvider)
      .syncEvent(
        organizerId: organizerId,
        eventId: eventId,
        clientOperationId: clientOperationId,
      );

  Future<HostProviderSetup> disconnectProvider({
    required String organizerId,
    required String eventId,
    required String connectionId,
  }) => _ref
      .read(hostProviderRepositoryProvider)
      .disconnect(
        organizerId: organizerId,
        eventId: eventId,
        connectionId: connectionId,
      );
}
