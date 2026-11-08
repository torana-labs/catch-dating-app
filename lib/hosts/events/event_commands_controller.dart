import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/bookings/data/host_attendance_outbox.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/data/event_publication_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/hosts/events/event_plan_state.dart';
import 'package:catch_platform/device/connectivity_service.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_commands_controller.g.dart';

/// The commands the event screens commit. Every one is an existing
/// command; none invalidates a read, since each screen reads through a
/// listener that delivers the result.
@riverpod
class HostEventCommands extends _$HostEventCommands {
  static final savePlanMutation = Mutation<void>();
  static final publicationMutation = Mutation<void>();
  static final attendanceMutation = Mutation<void>();
  static final defaultsMutation = Mutation<void>();

  @override
  void build() {}

  /// Saves the night's options through the live guide's own plan save,
  /// fenced on the plan's last update. It is not a progressive event setup
  /// command: the plan lives beside the event, not in it.
  Future<void> savePlan(
    EventSuccessPlan plan,
    Map<HostEventPlanOption, bool> options,
  ) async {
    requireSignedInUid(ref, action: 'save the plan');
    await ref
        .read(eventSuccessRepositoryProvider)
        .savePlan(
          plan.copyWith(
            wingmanRequestsEnabled:
                options[HostEventPlanOption.introductions] ??
                plan.wingmanRequestsEnabled,
            contextualOpenersEnabled:
                options[HostEventPlanOption.openers] ??
                plan.contextualOpenersEnabled,
            compatibilityAffectsRanking:
                options[HostEventPlanOption.answersPair] ??
                plan.compatibilityAffectsRanking,
          ),
          expectedUpdatedAt: plan.updatedAt,
        );
  }

  /// Publishes the event or makes it private again through the
  /// progressive setup publication command, fenced on its setup revision.
  Future<void> setPublication({
    required String organizerId,
    required String eventId,
    required int expectedSetupRevision,
    required bool published,
  }) async {
    requireSignedInUid(ref, action: 'change who can see the event');
    await ref
        .read(eventPublicationRepositoryProvider)
        .set(
          EventPublicationRequest(
            organizerId: organizerId,
            eventId: eventId,
            requestId: hostEventRequestId(),
            expectedSetupRevision: expectedSetupRevision,
            publicationState: published ? 'published' : 'private',
          ),
        );
  }

  /// Records whether a guest came, through the attendance outbox as the
  /// door does: an absolute state fenced on the attendee's revision, kept
  /// on the device until the server takes it.
  Future<void> setAttendance({
    required EventAttendee attendee,
    required bool came,
  }) async {
    final accountId = requireSignedInUid(ref, action: 'record attendance');
    await ref
        .read(hostAttendanceOutboxProvider)
        .enqueueAndAttempt(
          accountId: accountId,
          entry: HostAttendanceOutboxEntry(
            eventId: attendee.eventId,
            attendeeId: attendee.id,
            desiredCheckedIn: came,
            expectedRevision: attendee.attendanceRevision,
            clientOperationId: hostEventRequestId(),
            createdAt: DateTime.now(),
            status: HostAttendanceOutboxStatus.pending,
          ),
          offline: ref.read(isObviouslyOfflineProvider),
        );
  }

  /// Saves the organizer's event defaults through the progressive setup
  /// defaults command, fenced on their revision and reviewed hash.
  Future<void> updateDefaults({
    required ManagerEventSetupDefaults current,
    required ManagerEventSetupPreferences next,
  }) async {
    requireSignedInUid(ref, action: 'save event defaults');
    await ref
        .read(managerEventSetupDefaultsRepositoryProvider)
        .update(
          ManagerEventSetupDefaultsUpdateRequest.forChange(
            current: current,
            requestId: hostEventRequestId(),
            next: next,
          ),
        );
  }
}

final _random = Random.secure();

/// A fresh idempotency key in the shape the setup commands accept.
String hostEventRequestId() {
  final suffix = List.generate(
    12,
    (_) => _random.nextInt(36).toRadixString(36),
  ).join();
  return 'host-${DateTime.now().microsecondsSinceEpoch}-$suffix';
}
