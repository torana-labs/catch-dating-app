import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/domain/organizer_program_views.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/live_paged_query.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'organizer_program_views_repository.g.dart';

/// The planner's programme read through listeners (#1339): one programme's
/// setup view and the organiser's programme list from
/// `organizerProgramViews`, instead of the settings, schedule and setup lists
/// of `getOrganizerProgram` and the rows of `listOrganizerPrograms`. The
/// overview and rollup counts stay with those callables (server-trust).
///
/// Rules admit the programme's creator, the organiser's current managers and a
/// live programme administration duty. That authority is not only the access
/// view's (an organiser manager who did not create the programme has none), so
/// these reads are not gated on it: rules end them online.
class OrganizerProgramViewsRepository {
  const OrganizerProgramViewsRepository(this._firestore);

  static const collection = 'organizerProgramViews';

  /// A list of programmes is read a page of 50 at a time, up to this many.
  static const pageSize = 50;
  static const maxRows = 500;

  final FirebaseFirestore _firestore;

  static const _context = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load your programs',
    resource: collection,
  );

  Stream<Map<Object?, Object?>> watchProgramme(String programId) =>
      withBackendErrorStream(
        () => _firestore
            .collection(collection)
            .doc(programId)
            .snapshots()
            .map(
              (snapshot) =>
                  snapshot.data() ??
                  (throw const DocumentNotFoundException('program')),
            ),
        context: _context,
      );

  /// Every programme of [organizerId], soonest start first.
  Stream<List<Map<Object?, Object?>>> watchProgrammes(String organizerId) {
    final rows = _firestore
        .collection(collection)
        .where('organizerId', isEqualTo: organizerId);
    final pager = LivePagedQuery<Map<String, dynamic>, Map<Object?, Object?>>(
      query: _soonest(rows),
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

  // firestore-index: organizerProgramViews(organizerId:ASCENDING, startsAtMillis:DESCENDING, __name__:DESCENDING)
  Query<Map<String, dynamic>> _soonest(Query<Map<String, dynamic>> rows) => rows
      .orderBy('startsAtMillis', descending: true)
      .orderBy(FieldPath.documentId, descending: true);
}

// keepalive: a stateless repository over account-free SDK singletons.
@Riverpod(keepAlive: true)
OrganizerProgramViewsRepository organizerProgramViewsRepository(Ref ref) =>
    OrganizerProgramViewsRepository(ref.watch(firebaseFirestoreProvider));

/// One programme's setup view, live.
@riverpod
Stream<Map<Object?, Object?>> organizerProgramViewStream(
  Ref ref,
  String programId,
) => ref
    .watch(organizerProgramViewsRepositoryProvider)
    .watchProgramme(programId);

/// The organiser's programmes as lifecycle summaries, live.
@riverpod
Stream<List<OrganizerProgramSummary>> organizerProgramSummariesStream(
  Ref ref,
  String organizerId,
) => ref
    .watch(organizerProgramViewsRepositoryProvider)
    .watchProgrammes(organizerId)
    .map(
      (rows) => [for (final row in rows) organizerProgramSummaryFromView(row)],
    );
