import 'dart:async';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_shell_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_access_view.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_door_live_views.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_live_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/live_paged_query.dart';
import 'package:catch_platform/streams/clocked_listener.dart';
import 'package:catch_platform/streams/combine_latest.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_door_live_repository.g.dart';

typedef _Rows = List<Map<Object?, Object?>>;
typedef _Journal = List<({String id, Map<Object?, Object?> data})>;

/// The door of one function and the live board, read through listeners
/// (#1339) instead of `getProgramFunctionDoorView`, `getProgramLiveBoard` and
/// `listProgramStaffAttention`. Both reads are gated on the account's
/// authority, so cached rows stop at the instant a duty does; the door's
/// offline outbox and journal writes are unchanged.
class ProgramDoorLiveRepository {
  const ProgramDoorLiveRepository(
    this._firestore,
    this._access,
    this._shell,
    this._clock,
  );

  /// The door roster is read in pages of this many rows, up to [doorMaxRows].
  static const doorPageSize = 100;
  static const doorMaxRows = 500;

  /// The door shows this many of the newest journal entries.
  static const journalTail = 60;

  /// The board shows this many alerts.
  static const alertLimit = 150;

  final FirebaseFirestore _firestore;
  final ProgramAccessRepository _access;
  final ProgramWorkShellRepository _shell;
  final AppClock _clock;

  static const _doorContext = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load the door roster',
    resource: 'programDoorRows',
  );
  static const _boardContext = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load the live board',
    resource: 'programAlertViews',
  );

  Stream<ProgramDoorView> watchDoorView(
    String programId,
    String functionId,
    String uid,
  ) => _access
      .gated<
        ({
          ProgramAccessView access,
          Map<Object?, Object?> header,
          _Rows rows,
          _Journal journal,
        })
      >(
        programId,
        uid,
        needs: const {},
        allows: (state) =>
            state.view!.coversDoor(functionId, state.evaluatedAt),
        scopeOf: (state) => functionId,
        data: (state) => combineLatest(
          combineLatest(
            _header(functionId),
            _rows(programId, functionId),
            (header, rows) => (header: header, rows: rows),
          ),
          _journal(programId, functionId),
          (partial, journal) => (
            access: state.view!,
            header: partial.header,
            rows: partial.rows,
            journal: journal,
          ),
        ),
      )
      .map(
        (source) => programDoorViewFromViews(
          access: source.access,
          functionId: functionId,
          header: source.header,
          rows: source.rows,
          journal: source.journal,
          now: _clock.now(),
        ),
      );

  Stream<Map<Object?, Object?>> _header(String functionId) =>
      withBackendErrorStream(
        () => _firestore
            .collection('programDoorFunctions')
            .doc(functionId)
            .snapshots()
            .map(
              (snapshot) =>
                  snapshot.data() ??
                  (throw const DocumentNotFoundException('door function')),
            ),
        context: _doorContext,
      );

  /// Every roster row, a page at a time, each page its own live listener.
  // firestore-index: programDoorRows(programId:ASCENDING, functionId:ASCENDING, displayName:ASCENDING, __name__:ASCENDING)
  Stream<_Rows> _rows(String programId, String functionId) {
    final pager = LivePagedQuery<Map<String, dynamic>, Map<Object?, Object?>>(
      query: _firestore
          .collection('programDoorRows')
          .where('programId', isEqualTo: programId)
          .where('functionId', isEqualTo: functionId)
          .orderBy('displayName')
          .orderBy(FieldPath.documentId),
      pageSize: doorPageSize,
      maxRows: doorMaxRows,
      convert: (doc) => doc.data(),
      errorContext: _doorContext,
    );
    // The header counts need every row, so each next page opens as soon as
    // the one before it has arrived.
    return pager.pages.map((pages) {
      if (pages.hasMore &&
          !pages.loadingMore &&
          pages.nextPageError == null &&
          pages.items.length < doorMaxRows) {
        pager.loadMore();
      }
      return pages.items;
    });
  }

  // firestore-index: programDoorJournalViews(programId:ASCENDING, functionId:ASCENDING, occurredAtMillis:DESCENDING, __name__:DESCENDING)
  Stream<_Journal> _journal(String programId, String functionId) =>
      withBackendErrorStream(
        () => _firestore
            .collection('programDoorJournalViews')
            .where('programId', isEqualTo: programId)
            .where('functionId', isEqualTo: functionId)
            .orderBy('occurredAtMillis', descending: true)
            .orderBy(FieldPath.documentId, descending: true)
            .limit(journalTail)
            .snapshots()
            .map(
              (snapshot) => [
                for (final doc in snapshot.docs) (id: doc.id, data: doc.data()),
              ],
            ),
        context: _doorContext,
      );

  /// The live board for the account's duties: function labels, the alerts it
  /// may read, the travel counts full reach reads, and the schedule phased
  /// by the app clock.
  Stream<ProgramLiveBoard> watchLiveBoard(String programId, String uid) {
    final source = _access
        .gated<
          ({
            ProgramAccessView access,
            Map<Object?, Object?> summary,
            _Rows functions,
            _Rows alerts,
            Map<Object?, Object?>? travel,
          })
        >(
          programId,
          uid,
          needs: const {},
          allows: (state) => state.view!.holdsDuty(
            ProgramStaffDuty.functionLead,
            state.evaluatedAt,
          ),
          scopeOf: (state) =>
              '${state.view!.workScopeKey}|${state.view!.hasFullReach(state.evaluatedAt)}|${state.view!.liveDutyNames(state.evaluatedAt).toList()..sort()}',
          data: (state) {
            final access = state.view!;
            final now = state.evaluatedAt;
            return combineLatest(
              combineLatest(
                _summary(programId),
                _shell.watchResources(
                  programId,
                  'function',
                  access.workFunction,
                  access,
                  activeOnly: false,
                ),
                (summary, functions) =>
                    (summary: summary, functions: functions),
              ),
              combineLatest(
                _alerts(programId, access, now),
                _travel(programId, access, now),
                (alerts, travel) => (alerts: alerts, travel: travel),
              ),
              (a, b) => (
                access: access,
                summary: a.summary,
                functions: a.functions,
                alerts: b.alerts,
                travel: b.travel,
              ),
            );
          },
        );
    return clockedListener<
          ({
            ProgramAccessView access,
            Map<Object?, Object?> summary,
            _Rows functions,
            _Rows alerts,
            Map<Object?, Object?>? travel,
          }),
          ({ProgramLiveBoard board, DateTime? next})
        >(
          source,
          clock: _clock,
          build: (raw, now) {
            final board = programLiveBoardFromViews(
              programId: programId,
              uid: uid,
              timezone: requiredString(raw.summary, 'timezone'),
              functions: raw.functions,
              alerts: raw.alerts,
              travel: raw.travel,
              now: now,
            );
            DateTime? next = nextPhaseChangeAfter(board.tonight, now);
            for (final alert in raw.alerts) {
              final ends = alert['expiresAtMillis'];
              if (ends is int) {
                final at = DateTime.fromMillisecondsSinceEpoch(ends);
                if (at.isAfter(now) && (next == null || at.isBefore(next))) {
                  next = at;
                }
              }
            }
            return (board: board, next: next);
          },
          nextRebuildAt: (built) => built.next,
        )
        .map((built) => built.board);
  }

  Stream<Map<Object?, Object?>> _summary(String programId) =>
      withBackendErrorStream(
        () => _firestore
            .collection(ProgramWorkShellRepository.summaries)
            .doc(programId)
            .snapshots()
            .map(
              (snapshot) =>
                  snapshot.data() ??
                  (throw const DocumentNotFoundException('program work')),
            ),
        context: _boardContext,
      );

  /// Full reach reads every alert in one query; a function lead reads the
  /// alerts stamped for each duty it holds, one listener per duty.
  // firestore-index: programAlertViews(programId:ASCENDING, createdAtMillis:DESCENDING, __name__:DESCENDING)
  // firestore-index: programAlertViews(programId:ASCENDING, duty:ASCENDING, createdAtMillis:DESCENDING, __name__:DESCENDING)
  Stream<_Rows> _alerts(
    String programId,
    ProgramAccessView access,
    DateTime now,
  ) {
    Query<Map<String, dynamic>> base() => _firestore
        .collection('programAlertViews')
        .where('programId', isEqualTo: programId);
    Stream<_Rows> list(Query<Map<String, dynamic>> query) =>
        withBackendErrorStream(
          () => query
              .orderBy('createdAtMillis', descending: true)
              .orderBy(FieldPath.documentId, descending: true)
              .limit(alertLimit)
              .snapshots()
              .map((snapshot) => [for (final doc in snapshot.docs) doc.data()]),
          context: _boardContext,
        );
    if (access.isManager || access.hasFullReach(now)) return list(base());
    final duties = access.liveDutyNames(now).toList()..sort();
    if (duties.isEmpty) return Stream.value(const []);
    var combined = list(base().where('duty', isEqualTo: duties.first));
    for (final duty in duties.skip(1)) {
      combined = combineLatest<_Rows, _Rows, _Rows>(
        combined,
        list(base().where('duty', isEqualTo: duty)),
        (a, b) => [...a, ...b],
      );
    }
    return combined;
  }

  Stream<Map<Object?, Object?>?> _travel(
    String programId,
    ProgramAccessView access,
    DateTime now,
  ) {
    if (!(access.isManager || access.hasFullReach(now))) {
      return Stream.value(null);
    }
    return withBackendErrorStream(
      () => _firestore
          .collection('programTravelCountViews')
          .doc(programId)
          .snapshots()
          .map((snapshot) => snapshot.data()),
      context: _boardContext,
    );
  }
}

// keepalive: account-free: a stateless repository over account-free SDK
// singletons.
@Riverpod(keepAlive: true)
ProgramDoorLiveRepository programDoorLiveRepository(Ref ref) =>
    ProgramDoorLiveRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(programAccessRepositoryProvider),
      ref.watch(programWorkShellRepositoryProvider),
      ref.watch(appClockProvider),
    );

/// The door of one function, live.
@riverpod
Stream<ProgramDoorView> programDoorViewStream(
  Ref ref,
  String programId,
  String functionId,
) {
  final uid = ref.watch(uidProvider).asData?.value;
  if (uid == null || uid.isEmpty) {
    return Stream.error(const SignInRequiredException('view the door'));
  }
  return ref
      .watch(programDoorLiveRepositoryProvider)
      .watchDoorView(programId, functionId, uid);
}

/// The live board for the signed-in account, live.
@riverpod
Stream<ProgramLiveBoard> programLiveBoardStream(Ref ref, String programId) {
  final uid = ref.watch(uidProvider).asData?.value;
  if (uid == null || uid.isEmpty) {
    return Stream.error(const SignInRequiredException('view the live board'));
  }
  return ref
      .watch(programDoorLiveRepositoryProvider)
      .watchLiveBoard(programId, uid);
}
