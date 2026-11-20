import 'dart:async';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_access_view.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_work_shell.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/live_paged_query.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_photo_views_repository.g.dart';

/// The programme's photo records, read through a listener (#1339) from
/// `programPhotos` instead of `listProgramPhotos`, and the function labels
/// that name the albums from `programResourceViews`. Both reads are gated on
/// the communications duty (the owner holds it), so cached rows stop at the
/// instant it ends. Rules let that duty list every function label, so a
/// communications account whose work list reaches no function still sees
/// named albums (#2175). The records hold no file bytes: the signed URLs come
/// from `signProgramPhotoUrls`.
class ProgramPhotoViewsRepository {
  const ProgramPhotoViewsRepository(this._firestore, this._access);

  /// Records are read a page of 100 at a time, up to this many (the callable
  /// read 2,000; an album shows 60).
  static const pageSize = 100;
  static const maxRows = 1000;

  final FirebaseFirestore _firestore;
  final ProgramAccessRepository _access;

  static const _context = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load the photos',
    resource: 'programPhotos',
  );

  static const _labelsContext = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load the photo albums',
    resource: 'programResourceViews',
  );

  bool _holdsCommunications(ProgramAccessState state) =>
      state.view!.holdsDuty(ProgramStaffDuty.communications, state.evaluatedAt);

  Stream<List<Map<Object?, Object?>>> watchRows(String programId, String uid) =>
      _access.gated<List<Map<Object?, Object?>>>(
        programId,
        uid,
        needs: const {},
        allows: _holdsCommunications,
        scopeOf: (state) => 'photos',
        data: (state) => _pages(programId),
      );

  /// Every function of the programme, soonest first, for the album names.
  Stream<List<ProgramFunction>> watchFunctions(String programId, String uid) =>
      _access.gated<List<ProgramFunction>>(
        programId,
        uid,
        needs: const {},
        allows: _holdsCommunications,
        scopeOf: (state) => 'photoFunctions',
        data: (state) => withBackendErrorStream(
          // A programme's functions are a small set.
          () => _firestore
              .collection('programResourceViews')
              .where('programId', isEqualTo: programId)
              .where('kind', isEqualTo: 'function')
              .limit(ReadLimitPolicy.boundedWorkingSet)
              .snapshots()
              .map(
                (snapshot) => programFunctionsFromResourceViews([
                  for (final doc in snapshot.docs) doc.data(),
                ]),
              ),
          context: _labelsContext,
        ),
      );

  Stream<List<Map<Object?, Object?>>> _pages(String programId) {
    final pager = LivePagedQuery<Map<String, dynamic>, Map<Object?, Object?>>(
      query: _newest(
        _firestore
            .collection('programPhotos')
            .where('programId', isEqualTo: programId),
      ),
      pageSize: pageSize,
      maxRows: maxRows,
      convert: (doc) => doc.data(),
      errorContext: _context,
    );
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

  // firestore-index: programPhotos(programId:ASCENDING, createdAtMillis:DESCENDING, __name__:DESCENDING)
  Query<Map<String, dynamic>> _newest(Query<Map<String, dynamic>> rows) => rows
      .orderBy('createdAtMillis', descending: true)
      .orderBy(FieldPath.documentId, descending: true);
}

// keepalive: a stateless repository over account-free SDK singletons.
@Riverpod(keepAlive: true)
ProgramPhotoViewsRepository programPhotoViewsRepository(Ref ref) =>
    ProgramPhotoViewsRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(programAccessRepositoryProvider),
    );

/// The programme's functions, soonest first, live, for the album names.
@riverpod
Stream<List<ProgramFunction>> programPhotoFunctionsStream(
  Ref ref,
  String programId,
) {
  final uid = ref.watch(uidProvider).asData?.value;
  if (uid == null || uid.isEmpty) {
    return Stream.error(const SignInRequiredException('view the photos'));
  }
  return ref
      .watch(programPhotoViewsRepositoryProvider)
      .watchFunctions(programId, uid);
}

/// The programme's photo records, newest first, live.
@riverpod
Stream<List<Map<Object?, Object?>>> programPhotoRowsStream(
  Ref ref,
  String programId,
) {
  final uid = ref.watch(uidProvider).asData?.value;
  if (uid == null || uid.isEmpty) {
    return Stream.error(const SignInRequiredException('view the photos'));
  }
  return ref
      .watch(programPhotoViewsRepositoryProvider)
      .watchRows(programId, uid);
}
