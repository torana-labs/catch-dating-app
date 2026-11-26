import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_board.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_review.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_setup.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:cloud_functions/cloud_functions.dart';

/// Live-only private planning data. Never persists affinity or functional
/// requirements to the operational offline cache. Every response is bound
/// to the account and authority generation that initiated its call.
class ProgramLodgingRepository {
  const ProgramLodgingRepository(
    this._functions,
    this._snapshots,
    this._currentAccountId,
  );

  final FirebaseFunctions _functions;
  final ProgramReadSnapshotStore _snapshots;
  final String? Function() _currentAccountId;

  Future<ProgramLodgingMembership> readMembership(
    String programId,
    String guestId,
  ) => _call(
    programId,
    {'action': 'readMembership', 'guestId': guestId},
    (value) => ProgramLodgingMembership.fromMap(
      _kind(value, 'membership'),
      programId: programId,
      guestId: guestId,
    ),
  );

  Future<int> decideMembership(
    ProgramLodgingMembership membership,
    List<String> groupIds,
  ) => _call(
    membership.programId,
    {
      'action': 'decideMembership',
      'guestId': membership.guestId,
      'expectedRevision': membership.revision,
      'groupIds': List<String>.of(groupIds),
    },
    (value) {
      final map = _kind(value, 'membershipSaved');
      final revision = requiredInt(map, 'revision');
      if (map['guestId'] != membership.guestId ||
          revision <= membership.revision) {
        throw const FormatException('Saved membership identity differs.');
      }
      return revision;
    },
  );

  Future<ProgramLodgingReview> preview(
    String programId, {
    bool regenerate = false,
  }) => _call(programId, {
    'action': 'preview',
    if (regenerate) 'regenerate': true,
  }, ProgramLodgingReview.fromCallableData);

  Future<ProgramLodgingSetup> readSetup(String programId) => _call(
    programId,
    {'action': 'readSetup'},
    (value) {
      final map = _kind(value, 'readSetup');
      return ProgramLodgingSetup(
        catalog: ProgramLodgingCatalog.fromMap(
          map['catalog'],
          programId: programId,
        ),
        configuration: map['configuration'] == null
            ? null
            : lodgingJsonMap(map['configuration']),
        accessExpiresAt: requiredNullableDateTime(map, 'accessExpiresAtMillis'),
      );
    },
  );

  Future<({int startsAtMillis, int endsAtMillis})> resolveDates(
    String programId,
    String timezone,
    String arrival,
    String departure,
  ) => _call(
    programId,
    {'action': 'resolveDates', 'arrival': arrival, 'departure': departure},
    (value) {
      final map = _kind(value, 'resolvedDates');
      if (map['timezone'] != timezone ||
          map['arrival'] != arrival ||
          map['departure'] != departure) {
        throw const FormatException(
          'Lodging date context changed. Refresh setup.',
        );
      }
      final start = requiredInt(map, 'startsAtMillis');
      final end = requiredInt(map, 'endsAtMillis');
      if (start >= end) {
        throw const FormatException('Invalid lodging date window.');
      }
      return (startsAtMillis: start, endsAtMillis: end);
    },
  );

  Future<int> saveSetup(
    String programId,
    Map<String, Object?> setup,
    int expectedRevision, {
    List<Map<String, Object?>> adoptions = const [],
  }) => _call(programId, {
    'action': 'setup',
    'setup': lodgingJsonMap(setup),
    'expectedConfigurationRevision': expectedRevision,
    'adoptions': adoptions.map(lodgingJsonMap).toList(growable: false),
  }, (value) => requiredInt(_kind(value, 'setup'), 'revision'));

  Future<ProgramLodgingReview> propose(
    String programId,
    ProgramLodgingProposal current,
    List<Map<String, Object?>> placements, {
    Map<String, Object?>? expectedRevisions,
  }) {
    _scope(current, programId);
    return _call(programId, {
      'action': 'propose',
      'expectedRevisions': lodgingJsonMap(
        expectedRevisions ?? current.revisions,
      ),
      'placements': placements.map(lodgingJsonMap).toList(growable: false),
    }, ProgramLodgingReview.fromCallableData);
  }

  Future<List<ProgramLodgingDestination>> destinations(
    String programId,
    ProgramLodgingProposal current,
    String partyId, {
    Map<String, Object?>? expectedRevisions,
  }) {
    _scope(current, programId);
    final revisions = lodgingJsonMap(expectedRevisions ?? current.revisions);
    return _call(
      programId,
      {
        'action': 'destinations',
        'partyId': partyId,
        'expectedRevisions': revisions,
        'placements': current.placements,
      },
      (value) {
        final map = _kind(value, 'destinations');
        final returnedRevisions = requiredMap(map['revisions'], 'revisions');
        if (!revisions.entries.every(
          (e) => returnedRevisions[e.key] == e.value,
        )) {
          throw const FormatException('Destination revisions differ.');
        }
        final options = mapList(map['destinations'], 'destinations')
            .map((item) {
              if (item['allowed'] is! bool) {
                throw const FormatException(
                  'Invalid destination availability.',
                );
              }
              return ProgramLodgingDestination(
                inventoryId: requiredString(item, 'inventoryId'),
                allowed: item['allowed']! as bool,
                explanation: requiredString(item, 'explanation'),
              );
            })
            .toList(growable: false);
        if (options.map((o) => o.inventoryId).toSet().length !=
            options.length) {
          throw const FormatException('Duplicate lodging destination.');
        }
        return List.unmodifiable(options);
      },
    );
  }

  Future<ProgramLodgingProposal> save(
    String programId,
    ProgramLodgingProposal proposal,
  ) {
    _scope(proposal, programId);
    return _call(programId, {'action': 'save', 'proposal': proposal.json}, (
      value,
    ) {
      final saved = ProgramLodgingProposal.fromMap(
        _kind(value, 'saved')['proposal'],
      );
      if (saved.id != proposal.id || saved.scope['programId'] != programId) {
        throw const FormatException('Saved lodging identity differs.');
      }
      return saved;
    });
  }

  Future<Map<String, Object?>> transition(
    String programId, {
    required ProgramLodgingProposal proposal,
    required String operationId,
    required int expectedWorkflowRevision,
    required ProgramLodgingAction action,
    String? hotelId,
  }) {
    _scope(proposal, programId);
    return _call(programId, {
      'action': 'transition',
      'command': {
        'proposalId': proposal.id,
        'operationId': operationId,
        'expectedWorkflowRevision': expectedWorkflowRevision,
        'action': action.name,
        'hotelId': hotelId,
      },
    }, (value) => lodgingJsonMap(_kind(value, 'transition')));
  }

  Future<List<Map<String, Object?>>> hotelBoard(
    String programId,
    String hotelId,
  ) => _call(
    programId,
    {'action': 'hotelBoard', 'hotelId': hotelId},
    (value) => List.unmodifiable(
      mapList(_kind(value, 'hotelBoard')['rows'], 'rows').map(lodgingJsonMap),
    ),
  );

  Future<T> _call<T>(
    String programId,
    Map<String, Object?> fields,
    T Function(Object?) parse,
  ) async {
    final account = _currentAccountId();
    if (account == null || account.isEmpty) {
      throw const SignInRequiredException('manage hotel rooms');
    }
    final generation = _snapshots.generation(account, programId);
    try {
      return await withBackendErrorContext(
        () async {
          final result = await _functions
              .httpsCallable('manageProgramLodging')
              .call<Object?>({'programId': programId, ...fields});
          if (_currentAccountId() != account) {
            throw const SignInRequiredException('manage hotel rooms');
          }
          if (_snapshots.generation(account, programId) != generation) {
            throw const PermissionException(
              'Program access changed. Refresh this view.',
            );
          }
          return parse(result.data);
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'manage hotel rooms',
          resource: 'manageProgramLodging',
        ),
      );
    } on AppException catch (error) {
      if (error is PermissionException ||
          error is SignInRequiredException ||
          error is DocumentNotFoundException) {
        await _snapshots.clearProgram(account, programId);
      }
      rethrow;
    }
  }
}

void _scope(ProgramLodgingProposal proposal, String programId) {
  if (proposal.scope['programId'] != programId) {
    throw const FormatException('Lodging proposal belongs to another program.');
  }
}

Map<Object?, Object?> _kind(Object? value, String kind) {
  final map = requiredMap(value, 'lodging response');
  if (map['kind'] != kind) {
    throw const FormatException('Wrong lodging response kind.');
  }
  return map;
}

/// Only known domain CAS rejections prove that the pending command was not
/// applied. Generic transport/precondition failures remain uncertain and keep
/// their original receipt identity. Never classify by user-facing error copy.
bool isDefinitiveLodgingRejection(Object error) {
  final identity = backendCallableErrorIdentity(error);
  if (identity == null) return false;
  return switch ((identity.code, identity.message)) {
    ('aborted', 'Record changed since you loaded it. Reload and retry.') =>
      true,
    (
      'failed-precondition',
      'Stale lodging proposal; regenerate against current data.',
    ) =>
      true,
    ('failed-precondition', 'Stale lodging workflow revision.') => true,
    _ => false,
  };
}
