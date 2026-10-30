import 'package:catch_dating_app/contexts/events/domain/organizer_moment.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'organizer_moments_repository.g.dart';

abstract interface class OrganizerMomentsRepository {
  Future<List<OrganizerMoment>> listMoments(OrganizerMomentScope scope);

  Future<OrganizerMoment> upsertMoment({
    required OrganizerMomentScope scope,
    String? momentId,
    required String name,
    required OrganizerMomentInitiation initiation,
    required OrganizerMomentSense sense,
    required OrganizerMomentAudience audience,
    required OrganizerMomentAction action,
  });

  Future<OrganizerMoment> armMoment(
    OrganizerMomentScope scope,
    String momentId,
  );

  Future<OrganizerMoment> pauseMoment(
    OrganizerMomentScope scope,
    String momentId,
  );

  Future<OrganizerMoment> resumeMoment(
    OrganizerMomentScope scope,
    String momentId,
  );

  Future<String> runMoment(
    OrganizerMomentScope scope,
    String momentId, {
    required String requestKey,
  });
}

class FirebaseOrganizerMomentsRepository implements OrganizerMomentsRepository {
  const FirebaseOrganizerMomentsRepository(this._functions);

  final FirebaseFunctions _functions;

  @override
  Future<List<OrganizerMoment>> listMoments(OrganizerMomentScope scope) =>
      _call(
        name: 'listOrganizerMoments',
        payload: ListOrganizerMomentsCallableRequest(
          scope: scope.toJson(),
        ).toJson(),
        action: 'load organizer moments',
        parse: (data) {
          final map = _requiredMap(data);
          final raw = map['moments'];
          if (raw is! List<Object?>) {
            throw const FormatException('Invalid organizer moments payload.');
          }
          return raw
              .map(OrganizerMoment.fromCallableData)
              .toList(growable: false);
        },
      );

  @override
  Future<OrganizerMoment> upsertMoment({
    required OrganizerMomentScope scope,
    String? momentId,
    required String name,
    required OrganizerMomentInitiation initiation,
    required OrganizerMomentSense sense,
    required OrganizerMomentAudience audience,
    required OrganizerMomentAction action,
  }) => _call(
    name: 'upsertOrganizerMoment',
    payload: UpsertOrganizerMomentCallableRequest(
      scope: scope.toJson(),
      momentId: momentId,
      name: name,
      initiation: initiation.toJson(),
      sense: sense.name,
      audience: audience.toJson(),
      action: action.toJson(),
    ).toJson(),
    action: 'save organizer moment',
    parse: _parseMomentResponse,
  );

  @override
  Future<OrganizerMoment> armMoment(
    OrganizerMomentScope scope,
    String momentId,
  ) => _call(
    name: 'armOrganizerMoment',
    payload: _actionPayload(scope, momentId),
    action: 'arm organizer moment',
    parse: _parseMomentResponse,
  );

  @override
  Future<OrganizerMoment> pauseMoment(
    OrganizerMomentScope scope,
    String momentId,
  ) => _call(
    name: 'pauseOrganizerMoment',
    payload: _actionPayload(scope, momentId),
    action: 'pause organizer moment',
    parse: _parseMomentResponse,
  );

  @override
  Future<OrganizerMoment> resumeMoment(
    OrganizerMomentScope scope,
    String momentId,
  ) => _call(
    name: 'resumeOrganizerMoment',
    payload: _actionPayload(scope, momentId),
    action: 'resume organizer moment',
    parse: _parseMomentResponse,
  );

  @override
  Future<String> runMoment(
    OrganizerMomentScope scope,
    String momentId, {
    required String requestKey,
  }) => _call(
    name: 'runOrganizerMoment',
    payload: RunOrganizerMomentCallableRequest(
      scope: scope.toJson(),
      momentId: momentId,
      requestKey: requestKey,
    ).toJson(),
    action: 'run organizer moment',
    parse: (data) {
      final map = _requiredMap(data);
      final runId = map['runId'];
      if (runId is! String || runId.isEmpty) {
        throw const FormatException('Invalid organizer moment run payload.');
      }
      return runId;
    },
  );

  Map<String, Object?> _actionPayload(
    OrganizerMomentScope scope,
    String momentId,
  ) => OrganizerMomentActionCallableRequest(
    scope: scope.toJson(),
    momentId: momentId,
  ).toJson();

  static OrganizerMoment _parseMomentResponse(Object? data) =>
      OrganizerMoment.fromMap(_requiredMap(_requiredMap(data)['moment']));

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

// keepalive: one stateless callable facade is shared by every Moments route.
@Riverpod(keepAlive: true)
OrganizerMomentsRepository organizerMomentsRepository(Ref ref) =>
    FirebaseOrganizerMomentsRepository(ref.watch(firebaseFunctionsProvider));

Map<Object?, Object?> _requiredMap(Object? value) {
  if (value is Map<Object?, Object?>) return value;
  throw const FormatException('Invalid organizer moment payload.');
}
