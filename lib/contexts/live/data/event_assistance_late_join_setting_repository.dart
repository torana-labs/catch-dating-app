import 'package:catch_dating_app/contexts/live/data/event_assistance_guest_views.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_view_support.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting_result.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/streams/clocked_listener.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_late_join_setting_repository.g.dart';

/// The late-join setting through a manager listener on
/// `hostEventAssistanceSettingViews`; saving stays a manager-authorized
/// command, without sends.
class EventAssistanceLateJoinSettingRepository {
  const EventAssistanceLateJoinSettingRepository(
    this._functions,
    this._firestore, {
    this._clock = const AppClock(),
  });
  final FirebaseFunctions _functions;
  final FirebaseFirestore _firestore;

  /// Stamps each delivered snapshot with the read instant. A setting
  /// compares the clock with no instant, so it is rebuilt per delivery only.
  final AppClock _clock;

  Stream<LateJoinSettingView> watch(EventAssistanceGroupScope scope) =>
      withBackendErrorStream(
        () => clockedListener<Map<String, Object?>?, LateJoinSettingView>(
          _firestore
              .collection(EventAssistanceGuestViews.settings)
              .doc(lateJoinSettingViewId(scope))
              .snapshots()
              .map((snapshot) => snapshot.data()),
          clock: _clock,
          build: (data, clock) => LateJoinSettingResult.fromCallableData(
            lateJoinSettingReadResponse(
              data,
              scope: scope,
              now: liveViewNow(clock, [data]),
            ),
            expectedScope: scope,
          ).view,
          nextRebuildAt: (_) => null,
        ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch late arrival settings',
          resource: EventAssistanceGuestViews.settings,
        ),
      );

  Future<LateJoinSettingResult> apply(LateJoinSettingChange change) =>
      withBackendErrorContext(
        () async {
          final response = await _functions
              .httpsCallable('setEventAssistanceSetting')
              .call<Object?>(change.toJson());
          return LateJoinSettingResult.fromCallableData(
            response.data,
            expectedScope: change.snapshot.scope,
            expectedChange: change,
          );
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'save late arrival settings',
          resource: 'eventAssistanceSettings',
        ),
        mapper: mapMissingCallableAsUnavailable,
      );
}

/// Typed mutation seam used by the late-arrival setting editor.
final class EventAssistanceLateJoinSettingCommands {
  const EventAssistanceLateJoinSettingCommands(this._repository);

  final EventAssistanceLateJoinSettingRepository _repository;

  Future<LateJoinSettingResult> apply(LateJoinSettingChange change) =>
      _repository.apply(change);
}

@riverpod
EventAssistanceLateJoinSettingRepository
eventAssistanceLateJoinSettingRepository(Ref ref) =>
    EventAssistanceLateJoinSettingRepository(
      ref.watch(firebaseFunctionsProvider),
      ref.watch(firebaseFirestoreProvider),
      clock: ref.watch(appClockProvider),
    );

@riverpod
EventAssistanceLateJoinSettingCommands eventAssistanceLateJoinSettingCommands(
  Ref ref,
) => EventAssistanceLateJoinSettingCommands(
  ref.watch(eventAssistanceLateJoinSettingRepositoryProvider),
);
