import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/programmes/domain/host_work_assignment.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_work_repository.g.dart';

/// The unified staff entry point: resolves the caller's live assignments
/// across event and program scopes and the shell the app should land them
/// in.
///
/// All authorization is server-side — this repository only transports the
/// resolved projection, and each destination re-checks its own grant.
abstract interface class HostWorkRepository {
  Future<HostWorkAssignments> listAssignments({bool includeExpired});
}

class FirebaseHostWorkRepository implements HostWorkRepository {
  const FirebaseHostWorkRepository(this._functions);

  final FirebaseFunctions _functions;

  @override
  Future<HostWorkAssignments> listAssignments({bool includeExpired = false}) =>
      _call(
        name: 'listMyHostAssignments',
        payload: ListMyHostAssignmentsCallableRequest(
          includeExpired: includeExpired,
        ).toJson(),
        action: 'load work assignments',
        parse: HostWorkAssignments.fromCallableData,
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
    mapper: mapMissingCallableAsUnavailable,
  );
}

// keepalive: one stateless callable facade is shared by every work route.
@Riverpod(keepAlive: true)
HostWorkRepository hostWorkRepository(Ref ref) =>
    FirebaseHostWorkRepository(ref.watch(firebaseFunctionsProvider));

/// The caller's live assignments. Refetches whenever the signed-in account
/// changes so a different OTP session never sees stale grants.
@riverpod
Future<HostWorkAssignments> hostWorkAssignments(Ref ref) {
  ref.watch(uidProvider);
  return ref.watch(hostWorkRepositoryProvider).listAssignments();
}
