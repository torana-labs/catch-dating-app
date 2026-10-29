import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/programs/domain/program_calendar.dart';
import 'package:catch_dating_app/programs/domain/program_models.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_inventory_repository.g.dart';

/// Typed adapters for the Events inventory and recoverable first-save command.
/// Existing detail, editing and constituent repositories remain their owners.
class ProgramInventoryRepository {
  const ProgramInventoryRepository(this._functions);
  final FirebaseFunctions _functions;

  Future<OrganizerProgramInventoryPage> listPage(
    String organizerId, {
    String? cursor,
    String? programId,
  }) => _call(
    name: 'listOrganizerPrograms',
    payload: ListOrganizerProgramsCallableRequest(
      organizerId: organizerId,
      cursor: cursor,
      programId: programId,
    ).toJson(),
    action: 'load your programs',
    parse: OrganizerProgramInventoryPage.fromCallableData,
  );

  Future<ProgramMutationResult> create({
    required String organizerId,
    required String requestId,
    required String kind,
    required String title,
    required String timezone,
    required DateTime startsAt,
    required DateTime endsAt,
  }) {
    return _call(
      name: 'createOrganizerProgram',
      payload: CreateOrganizerProgramCallableRequest(
        organizerId: organizerId,
        requestId: requestId,
        kind: kind,
        title: title.trim(),
        timezone: timezone.trim(),
        startsAtMillis: programCalendarDateInstant(
          startsAt,
          timezone,
        ).millisecondsSinceEpoch,
        endsAtMillis: programCalendarDateInstant(
          endsAt,
          timezone,
        ).millisecondsSinceEpoch,
        capabilities: const ['arrivalsTransport'],
      ).toJson(),
      action: 'create your program',
      parse: ProgramMutationResult.fromCallableData,
    );
  }

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

@riverpod
ProgramInventoryRepository programInventoryRepository(Ref ref) =>
    ProgramInventoryRepository(ref.watch(firebaseFunctionsProvider));
