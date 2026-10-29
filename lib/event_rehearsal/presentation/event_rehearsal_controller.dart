import 'dart:convert';

import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_operation_change.dart';
import 'package:catch_dating_app/platform/device/clipboard.dart';
import 'package:catch_dating_app/platform/device/external_share.dart';
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
    ref.invalidate(eventRehearsalProvider(session.id));
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
    ref.invalidate(eventRehearsalProvider(session.id));
  }

  Future<EventRehearsalBootstrap> applyAssistance(
    RehearsalAssistanceChange change,
  ) async {
    final result = await ref
        .read(eventRehearsalRepositoryProvider)
        .applyAssistance(change);
    if (ref.mounted) ref.invalidate(eventRehearsalProvider(change.session.id));
    return result;
  }

  Future<EventRehearsalBootstrap> applyOperation(
    RehearsalOperationChange change,
  ) async {
    final result = await ref
        .read(eventRehearsalRepositoryProvider)
        .applyOperation(change);
    if (ref.mounted) {
      ref.invalidate(eventRehearsalProvider(change.snapshot.session.id));
    }
    return result;
  }

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
    ref.invalidate(eventRehearsalProvider(session.id));
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
    ref.invalidate(eventRehearsalProvider(session.id));
  }

  Future<void> reset(String sessionId) async {
    await ref
        .read(eventRehearsalRepositoryProvider)
        .reset(sessionId: sessionId);
    ref.invalidate(eventRehearsalProvider(sessionId));
  }

  Future<EventRehearsalCreated> fork(String sessionId) =>
      ref.read(eventRehearsalRepositoryProvider).fork(sessionId: sessionId);

  Future<void> rotateGuestLink(String sessionId) async {
    await ref.read(eventRehearsalRepositoryProvider).rotateGuestLink(sessionId);
    ref.invalidate(eventRehearsalProvider(sessionId));
  }

  Future<void> complete(String sessionId) async {
    await ref.read(eventRehearsalRepositoryProvider).complete(sessionId);
    ref.invalidate(eventRehearsalProvider(sessionId));
  }

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
