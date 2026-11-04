import 'package:catch_dating_app/contexts/live/data/event_assistance_guest_views.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_view_support.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_result.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_setting.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callables/get_event_assistance_runtime_config_callable_request.g.dart';
import 'package:catch_platform/streams/clocked_listener.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_runtime_repository.g.dart';

/// The event's automation through a manager listener on
/// `hostEventRuntimeViews`. The sender picker pages through the
/// `getEventAssistanceRuntimeConfig` callable, and saving stays a command.
class EventAssistanceRuntimeRepository {
  const EventAssistanceRuntimeRepository(
    this._functions,
    this._firestore, {
    this._clock = const AppClock(),
  });
  final FirebaseFunctions _functions;
  final FirebaseFirestore _firestore;

  /// Applies time to the view on every delivered snapshot and again when
  /// the event ends or a configured window expires.
  final AppClock _clock;

  /// The automation without sender choices; [fetchSenderPage] supplies them.
  Stream<AssistanceRuntimeView> watch(EventAssistanceRuntimeScope scope) =>
      withBackendErrorStream(
        () =>
            clockedListener<
                  Map<String, Object?>?,
                  ({AssistanceRuntimeView view, DateTime? next})
                >(
                  _firestore
                      .collection(EventAssistanceGuestViews.runtimes)
                      .doc(runtimeViewId(scope))
                      .snapshots()
                      .map((snapshot) => snapshot.data()),
                  clock: _clock,
                  build: (data, clock) {
                    final now = liveViewNow(clock, [data]);
                    final view = AssistanceRuntimeResult.fromCallableData(
                      runtimeReadResponse(data, scope: scope, now: now),
                      expectedScope: scope,
                    ).view;
                    return (view: view, next: runtimeNextRebuild(data, now));
                  },
                  nextRebuildAt: (built) => built.next,
                )
                .map((built) => built.view),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch event automation',
          resource: EventAssistanceGuestViews.runtimes,
        ),
      );

  /// One page of sender choices per route after [cursors]; no cursors is
  /// the first page of every route.
  Future<AssistanceRuntimeView> fetchSenderPage(
    EventAssistanceRuntimeScope scope, {
    required Map<AssistanceMessageRoute, String> cursors,
  }) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('getEventAssistanceRuntimeConfig')
          .call<Object?>(
            GetEventAssistanceRuntimeConfigCallableRequest(
              context: scope.context,
              senderCursors: cursors.map(
                (key, value) => MapEntry(key.name, value),
              ),
            ).toJson(),
          );
      final view = AssistanceRuntimeResult.fromCallableData(
        response.data,
        expectedScope: scope,
      ).view;
      if (view.senderSetup == null) {
        throw const FormatException('Event sender discovery is unavailable.');
      }
      view.senderSetup!.requireAdvancing(cursors);
      return view;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'load event sender choices',
      resource: 'eventAssistanceRuntimeConfigs',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );

  Future<AssistanceRuntimeResult> apply(AssistanceRuntimeChange change) =>
      withBackendErrorContext(
        () async {
          final response = await _functions
              .httpsCallable('setEventAssistanceRuntimeConfig')
              .call<Object?>(change.toJson());
          return AssistanceRuntimeResult.fromCallableData(
            response.data,
            expectedScope: change.snapshot.scope,
            expectedChange: change,
          );
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'save event automation',
          resource: 'eventAssistanceRuntimeConfigs',
        ),
        mapper: mapMissingCallableAsUnavailable,
      );
}

/// Typed command and pagination seam used by runtime presentation state.
final class EventAssistanceRuntimeCommands {
  const EventAssistanceRuntimeCommands(this._repository);

  final EventAssistanceRuntimeRepository _repository;

  Future<AssistanceRuntimeResult> apply(AssistanceRuntimeChange change) =>
      _repository.apply(change);

  Future<AssistanceRuntimeView> fetchSenderPage(
    EventAssistanceRuntimeScope scope, {
    required Map<AssistanceMessageRoute, String> cursors,
  }) => _repository.fetchSenderPage(scope, cursors: cursors);
}

@riverpod
EventAssistanceRuntimeRepository eventAssistanceRuntimeRepository(Ref ref) =>
    EventAssistanceRuntimeRepository(
      ref.watch(firebaseFunctionsProvider),
      ref.watch(firebaseFirestoreProvider),
      clock: ref.watch(appClockProvider),
    );

@riverpod
EventAssistanceRuntimeCommands eventAssistanceRuntimeCommands(Ref ref) =>
    EventAssistanceRuntimeCommands(
      ref.watch(eventAssistanceRuntimeRepositoryProvider),
    );
