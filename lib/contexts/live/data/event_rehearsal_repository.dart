import 'dart:async';

import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_operation_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_settings_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_staff.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_staff_change.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_rehearsal_repository.g.dart';

class EventRehearsalRepository {
  const EventRehearsalRepository(this._functions);

  final FirebaseFunctions _functions;

  /// Server evidence only; failures remain errors rather than false completion.
  Future<bool> hasCompletedRehearsal(String organizerId) => _call(
    name: 'getEventRehearsalSummary',
    payload: GetEventRehearsalSummaryCallableRequest(
      organizerId: organizerId,
    ).toJson(),
    action: 'load rehearsal completion',
    parse: (data) {
      if (data is Map<Object?, Object?> &&
          data['hasCompletedRehearsal'] is bool) {
        return data['hasCompletedRehearsal']! as bool;
      }
      throw const FormatException('Rehearsal completion must be a boolean.');
    },
  );

  Future<EventRehearsalCreated> create({
    required String organizerId,
    required String? sourceEventId,
    required EventRehearsalScenario scenario,
    required int seed,
    required int actorCount,
    EventRehearsalSetup? setup,
    String guestSource = 'simulated',
    bool startImmediately = false,
  }) => _call(
    name: 'createEventRehearsal',
    payload: CreateEventRehearsalCallableRequest(
      organizerId: organizerId,
      sourceEventId: sourceEventId,
      scenarioId: scenario.name,
      seed: seed,
      actorCount: actorCount,
      setup: setup?.toJson(),
      guestSource: guestSource,
      startImmediately: startImmediately,
    ).toJson(),
    action: 'create an event dress rehearsal',
    parse: EventRehearsalCreated.fromCallableData,
  );

  Future<EventRehearsalBootstrap> fetch(String sessionId) => _call(
    name: 'getEventRehearsalBootstrap',
    payload: GetEventRehearsalBootstrapCallableRequest(
      sessionId: sessionId,
    ).toJson(),
    action: 'load an event dress rehearsal',
    parse: EventRehearsalBootstrap.fromCallableData,
  );

  Future<EventRehearsalBootstrap> fetchPracticeRole({
    required String sessionId,
    required String practiceOperatorId,
    required String hostUid,
  }) => _call(
    name: 'getEventRehearsalBootstrap',
    payload: GetEventRehearsalBootstrapCallableRequest(
      sessionId: sessionId,
      practiceOperatorId: rehearsalOperatorId(practiceOperatorId),
    ).toJson(),
    action: 'review a practice staff role',
    parse: (data) {
      final result = EventRehearsalBootstrap.fromCallableData(data);
      if (result.session.id != sessionId ||
          result.staffReview?.hostUid != hostUid ||
          result.staffReview?.practiceOperatorId != practiceOperatorId) {
        throw const FormatException(
          'Practice review returned a different role.',
        );
      }
      return result;
    },
  );

  Future<EventRehearsalBootstrap> applyStaff(RehearsalStaffChange change) =>
      _call(
        name: 'controlEventRehearsal',
        payload: change.toJson(),
        action: 'configure practice staff',
        parse: (data) {
          final result = EventRehearsalBootstrap.fromCallableData(data);
          change.requireResult(result);
          return result;
        },
      );

  Future<EventRehearsalBootstrap> applySettings(
    RehearsalSettingsChange change,
  ) => _call(
    name: 'controlEventRehearsal',
    payload: change.toJson(),
    action: 'configure practice updates',
    parse: (data) {
      final result = EventRehearsalBootstrap.fromCallableData(data);
      change.requireResult(result);
      return result;
    },
  );

  Stream<EventRehearsalBootstrap> watch(String sessionId) async* {
    while (true) {
      yield await fetch(sessionId);
      await Future<void>.delayed(const Duration(milliseconds: 1200));
    }
  }

  Future<EventRehearsalBootstrap> updateSetup({
    required EventRehearsalSession session,
    required EventRehearsalSetup setup,
    required EventRehearsalScenario scenario,
    required int actorCount,
  }) => _call(
    name: 'updateEventRehearsalSetup',
    payload: UpdateEventRehearsalSetupCallableRequest(
      sessionId: session.id,
      expectedRevision: session.setupRevision,
      scenarioId: scenario.name,
      actorCount: actorCount,
      setup: setup.toJson(),
    ).toJson(),
    action: 'update event rehearsal setup',
    parse: EventRehearsalBootstrap.fromCallableData,
  );

  Future<EventRehearsalBootstrap> control({
    required EventRehearsalSession session,
    required EventRehearsalControlAction action,
    required String clientActionId,
    int? minutes,
  }) => _call(
    name: 'controlEventRehearsal',
    payload: ControlEventRehearsalCallableRequest(
      sessionId: session.id,
      expectedRevision: session.runtimeRevision,
      clientActionId: clientActionId,
      action: action.name,
      minutes: minutes,
    ).toJson(),
    action: 'control an event rehearsal',
    parse: EventRehearsalBootstrap.fromCallableData,
  );

  /// Reuse the reviewed command unchanged after an uncertain network result.
  Future<EventRehearsalBootstrap> applyAssistance(
    RehearsalAssistanceChange change,
  ) => _call(
    name: 'controlEventRehearsal',
    payload: change.toJson(),
    action: 'simulate event rehearsal assistance',
    parse: (data) {
      final result = EventRehearsalBootstrap.fromCallableData(data);
      change.requireResult(result);
      return result;
    },
  );

  Future<RehearsalMovementReview> fetchMovement({
    required EventRehearsalBootstrap snapshot,
    required RehearsalMovementSelection selection,
    required String actorUid,
  }) => _call(
    name: 'getEventRehearsalMovement',
    payload: GetEventRehearsalMovementCallableRequest(
      sessionId: selection.scope.sessionId,
      expectedSetupRevision: selection.scope.setupRevision,
      scope: selection.toJson(),
      practiceOperatorId: selection.practiceOperatorId,
    ).toJson(),
    action: 'review rehearsal group movement',
    parse: (data) => RehearsalMovementReview.fromJson(
      data,
      session: snapshot.session,
      actors: snapshot.actors,
      selection: selection,
      expectedActorUid: actorUid,
    ),
  );

  Future<EventRehearsalBootstrap> applyMovement(
    RehearsalMovementChange change,
  ) => _call(
    name: 'controlEventRehearsal',
    payload: change.toJson(),
    action: 'rehearse group departure or checkpoint reporting',
    parse: (data) {
      final result = EventRehearsalBootstrap.fromCallableData(data);
      change.requireResult(result);
      return result;
    },
  );

  Future<EventRehearsalBootstrap> inject({
    required EventRehearsalSession session,
    required String clientActionId,
    String? actorId,
    EventRehearsalBehavior? behavior,
    EventRehearsalFault fault = EventRehearsalFault.none,
  }) => _call(
    name: 'injectEventRehearsalBehavior',
    payload: InjectEventRehearsalBehaviorCallableRequest(
      sessionId: session.id,
      expectedRevision: session.runtimeRevision,
      clientActionId: clientActionId,
      actorId: actorId,
      behavior: behavior?.wireValue,
      faultId: fault.name,
    ).toJson(),
    action: 'simulate an event rehearsal behavior',
    parse: EventRehearsalBootstrap.fromCallableData,
  );

  Future<EventRehearsalBootstrap> controlSpatial({
    required EventRehearsalSession session,
    required String clientActionId,
    required String actorId,
    required EventRehearsalSpatialAction action,
    String? destinationUnitId,
    EventRehearsalSpatialScope? scope,
  }) => _call(
    name: 'controlEventRehearsalSpatial',
    payload: ControlEventRehearsalSpatialCallableRequest(
      sessionId: session.id,
      expectedRevision: session.runtimeRevision,
      clientActionId: clientActionId,
      actorId: actorId,
      action: action.name,
      destinationUnitId: destinationUnitId,
      scope: scope?.name,
    ).toJson(),
    action: 'change a rehearsal Room placement',
    parse: EventRehearsalBootstrap.fromCallableData,
  );

  Future<EventRehearsalBootstrap> reset({
    required String sessionId,
    int? seed,
  }) => _call(
    name: 'resetEventRehearsal',
    payload: ResetEventRehearsalCallableRequest(
      sessionId: sessionId,
      fork: false,
      seed: seed,
    ).toJson(),
    action: 'reset an event rehearsal',
    parse: EventRehearsalBootstrap.fromCallableData,
  );

  Future<EventRehearsalCreated> fork({required String sessionId, int? seed}) =>
      _call(
        name: 'resetEventRehearsal',
        payload: ResetEventRehearsalCallableRequest(
          sessionId: sessionId,
          fork: true,
          seed: seed,
        ).toJson(),
        action: 'fork an event rehearsal',
        parse: EventRehearsalCreated.fromCallableData,
      );

  /// Reuse the frozen operation unchanged after an uncertain network result.
  Future<EventRehearsalBootstrap> applyOperation(
    RehearsalOperationChange change,
  ) => _call(
    name: 'controlEventRehearsal',
    payload: change.toJson(),
    action: 'apply a typed rehearsal operation',
    parse: (data) {
      final result = EventRehearsalBootstrap.fromCallableData(data);
      change.requireResult(result);
      return result;
    },
  );

  Future<EventRehearsalBootstrap> rotateGuestLink(String sessionId) => _call(
    name: 'rotateEventRehearsalGuestLink',
    payload: RotateEventRehearsalGuestLinkCallableRequest(
      sessionId: sessionId,
    ).toJson(),
    action: 'rotate an event rehearsal guest link',
    parse: EventRehearsalBootstrap.fromCallableData,
  );

  Future<EventRehearsalBootstrap> complete(String sessionId) => _call(
    name: 'completeEventRehearsal',
    payload: GetEventRehearsalBootstrapCallableRequest(
      sessionId: sessionId,
    ).toJson(),
    action: 'complete an event rehearsal',
    parse: EventRehearsalBootstrap.fromCallableData,
  );

  Future<Map<Object?, Object?>> exportReproduction(String sessionId) => _call(
    name: 'exportEventRehearsalReproduction',
    payload: GetEventRehearsalBootstrapCallableRequest(
      sessionId: sessionId,
    ).toJson(),
    action: 'export an event rehearsal reproduction',
    parse: (data) {
      if (data is Map<Object?, Object?>) return data;
      throw const FormatException('Rehearsal reproduction must be a map.');
    },
  );

  Future<T> _call<T>({
    required String name,
    required Map<String, Object?> payload,
    required String action,
    required T Function(Object?) parse,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable(name)
          .call<Object?>(payload);
      return parse(result.data);
    },
    context: BackendErrorContext(
      service: BackendService.functions,
      action: action,
      resource: name,
    ),
  );
}

/// Typed mutation seam used by the assistance editor.
final class EventRehearsalAssistanceCommands {
  const EventRehearsalAssistanceCommands(this._repository);

  final EventRehearsalRepository _repository;

  Future<EventRehearsalBootstrap> apply(RehearsalAssistanceChange change) =>
      _repository.applyAssistance(change);
}

/// Typed mutation seam for bounded non-messaging rehearsal operations.
final class EventRehearsalOperationCommands {
  const EventRehearsalOperationCommands(this._repository);

  final EventRehearsalRepository _repository;

  Future<EventRehearsalBootstrap> apply(RehearsalOperationChange change) =>
      _repository.applyOperation(change);
}

// keepalive: One callable client owns the isolated rehearsal domain.
@Riverpod(keepAlive: true)
EventRehearsalRepository eventRehearsalRepository(Ref ref) =>
    EventRehearsalRepository(ref.watch(firebaseFunctionsProvider));

@riverpod
EventRehearsalAssistanceCommands eventRehearsalAssistanceCommands(Ref ref) =>
    EventRehearsalAssistanceCommands(
      ref.watch(eventRehearsalRepositoryProvider),
    );

@riverpod
Stream<EventRehearsalBootstrap> eventRehearsal(Ref ref, String sessionId) =>
    ref.watch(eventRehearsalRepositoryProvider).watch(sessionId);
