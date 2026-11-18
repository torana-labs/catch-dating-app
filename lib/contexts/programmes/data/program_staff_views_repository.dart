import 'dart:async';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_staff_views.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/live_paged_query.dart';
import 'package:catch_platform/streams/clocked_listener.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_staff_views_repository.g.dart';

/// The administrators' staff list, read through a listener (#1339) from
/// `programStaffViews` instead of `listProgramStaff`. The read is gated on the
/// account's programme administration duty, so cached rows stop at the
/// instant it ends. Granting and revoking stay callables fenced by the
/// grant's revision; the list shows their result when the trigger-kept row
/// changes. Each member's status is derived from the row's facts and the app
/// clock, so a duty ending changes the list on screen with no new snapshot.
class ProgramStaffViewsRepository {
  const ProgramStaffViewsRepository(this._firestore, this._access, this._clock);

  /// Rows are read in pages of this many, up to [maxRows] (the callable
  /// listed 50 a page).
  static const pageSize = 50;
  static const maxRows = 500;

  final FirebaseFirestore _firestore;
  final ProgramAccessRepository _access;
  final AppClock _clock;

  static const _context = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load program staff',
    resource: 'programStaffViews',
  );

  Stream<ProgramStaffList> watchStaff(String programId, String uid) {
    final source = _access.gated<List<Map<Object?, Object?>>>(
      programId,
      uid,
      needs: const {},
      allows: (state) => state.view!.holdsDuty(
        ProgramStaffDuty.programAdmin,
        state.evaluatedAt,
      ),
      scopeOf: (state) => 'staff',
      data: (state) => _rows(programId),
    );
    return clockedListener<
          List<Map<Object?, Object?>>,
          ({ProgramStaffList list, DateTime? next})
        >(
          source,
          clock: _clock,
          build: (rows, now) => (
            list: programStaffListFromViews(programId, rows, now),
            next: nextStaffStatusChange(rows, now),
          ),
          nextRebuildAt: (built) => built.next,
        )
        .map((built) => built.list);
  }

  Stream<List<Map<Object?, Object?>>> _rows(String programId) => _pages(
    _firestore
        .collection('programStaffViews')
        .where('programId', isEqualTo: programId),
  );

  /// Every row of [rows], a page at a time in document id order (no
  /// composite index: the only filter is an equality).
  Stream<List<Map<Object?, Object?>>> _pages(Query<Map<String, dynamic>> rows) {
    final pager = LivePagedQuery<Map<String, dynamic>, Map<Object?, Object?>>(
      query: rows.orderBy(FieldPath.documentId),
      pageSize: pageSize,
      maxRows: maxRows,
      convert: (doc) => doc.data(),
      errorContext: _context,
    );
    // The team shows everyone, so each next page opens as soon as the one
    // before it has arrived.
    return pager.pages.map((pages) {
      if (pages.hasMore &&
          !pages.loadingMore &&
          pages.nextPageError == null &&
          pages.items.length < maxRows) {
        pager.loadMore();
      }
      return pages.items;
    });
  }
}

// keepalive: a stateless repository over account-free SDK singletons.
@Riverpod(keepAlive: true)
ProgramStaffViewsRepository programStaffViewsRepository(Ref ref) =>
    ProgramStaffViewsRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(programAccessRepositoryProvider),
      ref.watch(appClockProvider),
    );

/// The programme's staff, live.
@riverpod
Stream<ProgramStaffList> programStaffStream(Ref ref, String programId) {
  final uid = ref.watch(uidProvider).asData?.value;
  if (uid == null || uid.isEmpty) {
    return Stream.error(const SignInRequiredException('view the team'));
  }
  return ref
      .watch(programStaffViewsRepositoryProvider)
      .watchStaff(programId, uid);
}
