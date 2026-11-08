import 'package:catch_dating_app/contexts/programmes/data/program_inventory_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_message_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_planner_repository.g.dart';

/// The planner's programme-wide reads and commands that are not setup:
/// planned messages (programme moments) and how guest pages look. Reads are callables, like every
/// programme read.
class ProgramPlannerRepository {
  const ProgramPlannerRepository(this._functions);

  final FirebaseFunctions _functions;

  static Map<String, Object?> _scope(String programId) => {
    'kind': 'program',
    'programId': programId,
  };

  /// The programme's planned messages with what each has sent and when it
  /// runs next.
  Future<ProgramPlannedMessages> listMessages(String programId) => _call(
    name: 'listOrganizerMoments',
    payload: ListOrganizerMomentsCallableRequest(
      scope: _scope(programId),
    ).toJson(),
    action: 'load the planned messages',
    parse: ProgramPlannedMessages.fromCallableData,
  );

  /// Saves [draft] as a draft moment (or revises [momentId]) and returns
  /// the moment id. With [approve], it is armed under the caller's
  /// approval, so it is scheduled.
  Future<String> saveMessage({
    required String programId,
    required String senderConnectionId,
    required ProgramMessageDraft draft,
    String? momentId,
    bool approve = false,
  }) async {
    final saved = await _call(
      name: 'upsertOrganizerMoment',
      payload: UpsertOrganizerMomentCallableRequest(
        scope: _scope(programId),
        momentId: momentId,
        name: draft.name,
        initiation: draft.initiationJson(),
        sense: 'audience',
        audience: draft.audienceJson(),
        action: {
          'kind': 'sendTemplate',
          'connectionId': senderConnectionId,
          'templateId': draft.template.key,
          'variables': <String, String>{},
        },
        anchor: draft.anchorJson(),
      ).toJson(),
      action: 'save the planned message',
      parse: _momentId,
    );
    if (!approve) return saved;
    return _call(
      name: 'armOrganizerMoment',
      payload: OrganizerMomentActionCallableRequest(
        scope: _scope(programId),
        momentId: saved,
      ).toJson(),
      action: 'schedule the planned message',
      parse: _momentId,
    );
  }

  /// Saves how the guest pages look, fenced by the programme revision.
  Future<int> saveBranding({
    required String programId,
    required int expectedRevision,
    required ProgramBranding branding,
  }) => _call(
    name: 'updateOrganizerProgram',
    payload: UpdateOrganizerProgramCallableRequest(
      programId: programId,
      expectedRevision: expectedRevision,
      branding: branding.toJson(),
    ).toJson(),
    action: 'save how guest pages look',
    parse: (data) => ProgramMutationResult.fromCallableData(data).revision,
  );

  /// Mints a driver (`driverTrip`, subject = trip id) or vendor
  /// (`vendorRunSheet`, subject = vendor id) web link token. The website
  /// pages that open it are P4.10.
  Future<({String token, DateTime expiresAt})> issueWebLink({
    required String programId,
    required ProgramWebLinkKind kind,
    required String subjectId,
  }) => _call(
    name: 'issueProgramWebLink',
    payload: IssueProgramWebLinkCallableRequest(
      programId: programId,
      kind: kind.name,
      subjectId: subjectId,
    ).toJson(),
    action: 'share the link',
    parse: (data) {
      final map = requiredMap(data, 'web link');
      return (
        token: requiredString(map, 'token'),
        expiresAt: requiredDateTime(map, 'expiresAtMillis'),
      );
    },
  );

  static String _momentId(Object? data) {
    if (data is Map<Object?, Object?> &&
        data['moment'] is Map<Object?, Object?>) {
      final id = (data['moment']! as Map<Object?, Object?>)['momentId'];
      if (id is String && id.isNotEmpty) return id;
    }
    throw const FormatException('Invalid planned message payload.');
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

/// Who a programme web link is for.
enum ProgramWebLinkKind { driverTrip, vendorRunSheet }

// keepalive: one stateless callable facade shared by the planner screens.
@Riverpod(keepAlive: true)
ProgramPlannerRepository programPlannerRepository(Ref ref) =>
    ProgramPlannerRepository(ref.watch(firebaseFunctionsProvider));

@riverpod
Future<ProgramPlannedMessages> programPlannedMessages(
  Ref ref,
  String programId,
) => ref.read(programPlannerRepositoryProvider).listMessages(programId);

/// The planner home: the organiser's programmes with their overview
/// numbers, from the first `listOrganizerPrograms` page.
@riverpod
Future<OrganizerProgramInventoryPage> programmesOverview(
  Ref ref,
  String organizerId,
) => ref.read(programInventoryRepositoryProvider).listPage(organizerId);
