import 'dart:convert';

import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_operation_change.dart';
import 'package:catch_platform/device/clipboard.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_rehearsal_controller.g.dart';

@riverpod
class EventRehearsalController extends _$EventRehearsalController {
  static final createMutation = Mutation<EventRehearsalCreated>();
  static final setupMutation = Mutation<void>();
  static final controlMutation = Mutation<void>();
  static final assistanceMutation = Mutation<EventRehearsalBootstrap>();
  static final operationMutation = Mutation<EventRehearsalBootstrap>();
  static final behaviorMutation = Mutation<void>();
  static final spatialMutation = Mutation<void>();
  static final resetMutation = Mutation<void>();
  static final forkMutation = Mutation<EventRehearsalCreated>();
  static final guestLinkMutation = Mutation<void>();
  static final completeMutation = Mutation<void>();
  static final exportMutation = Mutation<String>();
  static final shareMutation = Mutation<void>();

  @override
  void build() {}

  Future<EventRehearsalCreated> create({
    required String organizerId,
    required String? sourceEventId,
    required EventRehearsalScenario scenario,
    required int actorCount,
    EventRehearsalSetup? setup,
    String guestSource = 'simulated',
    bool startImmediately = false,
  }) => ref
      .read(eventRehearsalRepositoryProvider)
      .create(
        organizerId: organizerId,
        sourceEventId: sourceEventId,
        scenario: scenario,
        seed: DateTime.now().millisecondsSinceEpoch.remainder(2147483646) + 1,
        actorCount: actorCount,
        setup: setup,
        guestSource: guestSource,
        startImmediately: startImmediately,
      );

  Future<void> updateSetup({
    required EventRehearsalSession session,
    required EventRehearsalSetup setup,
    required EventRehearsalScenario scenario,
    required int actorCount,
  }) async {
    await ref
        .read(eventRehearsalRepositoryProvider)
        .updateSetup(
          session: session,
          setup: setup,
          scenario: scenario,
          actorCount: actorCount,
        );
  }

  Future<void> control({
    required EventRehearsalSession session,
    required EventRehearsalControlAction action,
    int? minutes,
  }) async {
    await ref
        .read(eventRehearsalRepositoryProvider)
        .control(
          session: session,
          action: action,
          clientActionId: _clientActionId(),
          minutes: minutes,
        );
  }

  // The screen's listener delivers every command's result; no write here
  // refetches it.
  Future<EventRehearsalBootstrap> applyAssistance(
    RehearsalAssistanceChange change,
  ) => ref.read(eventRehearsalRepositoryProvider).applyAssistance(change);

  Future<EventRehearsalBootstrap> applyOperation(
    RehearsalOperationChange change,
  ) => ref.read(eventRehearsalRepositoryProvider).applyOperation(change);

  Future<void> inject({
    required EventRehearsalSession session,
    String? actorId,
    EventRehearsalBehavior? behavior,
    EventRehearsalFault fault = EventRehearsalFault.none,
  }) async {
    await ref
        .read(eventRehearsalRepositoryProvider)
        .inject(
          session: session,
          clientActionId: _clientActionId(),
          actorId: actorId,
          behavior: behavior,
          fault: fault,
        );
  }

  Future<void> controlSpatial({
    required EventRehearsalSession session,
    required String actorId,
    required EventRehearsalSpatialAction action,
    String? destinationUnitId,
    EventRehearsalSpatialScope? scope,
  }) async {
    await ref
        .read(eventRehearsalRepositoryProvider)
        .controlSpatial(
          session: session,
          clientActionId: _clientActionId(),
          actorId: actorId,
          action: action,
          destinationUnitId: destinationUnitId,
          scope: scope,
        );
  }

  Future<void> reset(String sessionId) =>
      ref.read(eventRehearsalRepositoryProvider).reset(sessionId: sessionId);

  Future<EventRehearsalCreated> fork(String sessionId) =>
      ref.read(eventRehearsalRepositoryProvider).fork(sessionId: sessionId);

  Future<void> rotateGuestLink(String sessionId) =>
      ref.read(eventRehearsalRepositoryProvider).rotateGuestLink(sessionId);

  Future<void> complete(String sessionId) =>
      ref.read(eventRehearsalRepositoryProvider).complete(sessionId);

  Future<void> copyGuestLink(String guestUrl) =>
      ref.read(clipboardControllerProvider).copyText(guestUrl);

  Future<void> shareGuestLink(String guestUrl) =>
      ref.read(externalShareControllerProvider).shareText(text: guestUrl);

  Future<String> exportReproduction(String sessionId) async {
    final data = await ref
        .read(eventRehearsalRepositoryProvider)
        .exportReproduction(sessionId);
    final encoded = const JsonEncoder.withIndent('  ').convert(data);
    await ref.read(clipboardControllerProvider).copyText(encoded);
    return encoded;
  }

  String _clientActionId() =>
      'host_${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}';
}
