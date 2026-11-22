import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_travel_party_repository.g.dart';

/// Ride-together party membership commands. Parties are server-only
/// documents; every change goes through a callable.
class ProgramTravelPartyRepository {
  const ProgramTravelPartyRepository(this._functions);

  final FirebaseFunctions _functions;

  static const _name = 'detachProgramTravelLeg';

  /// Removes [legId] from its party, fenced by the journey's
  /// [expectedRevision]. The party keeps its label and vehicle setting; the
  /// result carries the journey's new revision.
  Future<ProgramMutationResult> detachLeg({
    required String programId,
    required String legId,
    required int expectedRevision,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable(_name)
          .call<Object?>(
            DetachProgramTravelLegCallableRequest(
              programId: programId,
              legId: legId,
              expectedRevision: expectedRevision,
            ).toJson(),
          );
      return ProgramMutationResult.fromCallableData(result.data);
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'detach the journey from its party',
      resource: _name,
    ),
  );
}

@riverpod
ProgramTravelPartyRepository programTravelPartyRepository(Ref ref) =>
    ProgramTravelPartyRepository(ref.watch(firebaseFunctionsProvider));
