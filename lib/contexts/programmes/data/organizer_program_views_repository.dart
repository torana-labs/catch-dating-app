import 'dart:async';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/organizer_program_views.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/live_paged_query.dart';
import 'package:catch_platform/streams/combine_latest.dart';
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
/// live programme administration duty, and end the reads online. Offline the
/// phone applies the same authority from the account's access views, which
/// carry the organiser manager flag (#2175): the detail is gated on its
/// programme's view, and the list shows only the rows whose programme's view
/// lists it.
class OrganizerProgramViewsRepository {
  const OrganizerProgramViewsRepository(
    this._firestore,
    this._access,
    this._clock,
  );

  static const collection = 'organizerProgramViews';

  /// A list of programmes is read a page of 50 at a time, up to this many.
  static const pageSize = 50;
  static const maxRows = 500;

  final FirebaseFirestore _firestore;
  final ProgramAccessRepository _access;
  final AppClock _clock;

  static const _context = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load your programs',
    resource: collection,
  );

  /// One programme's setup view while the account may open it
  /// ([ProgramAccessView.holdsSetup]).
  Stream<Map<Object?, Object?>> watchProgramme(String programId, String uid) =>
      _access.gatedSetup<Map<Object?, Object?>>(
        programId,
        uid,
        data: (state) => _programme(programId),
      );

  Stream<Map<Object?, Object?>> _programme(String programId) =>
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

  /// Every programme of [organizerId], soonest start first, that the
  /// account's own access views list ([ProgramAccessView.listsSetup]).
  Stream<List<Map<Object?, Object?>>> watchProgrammes(
    String organizerId,
    String uid,
  ) => combineLatest(
    _programmes(organizerId),
    _access.watchOrganizerViews(organizerId, uid, limit: maxRows),
    (rows, views) => organizerProgramRowsListed(rows, views, _clock.now()),
  );

  Stream<List<Map<Object?, Object?>>> _programmes(String organizerId) {
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

// keepalive: account-free: a stateless repository over account-free SDK
// singletons.
@Riverpod(keepAlive: true)
OrganizerProgramViewsRepository organizerProgramViewsRepository(Ref ref) =>
    OrganizerProgramViewsRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(programAccessRepositoryProvider),
      ref.watch(appClockProvider),
    );

/// One programme's setup view, live.
@riverpod
Stream<Map<Object?, Object?>> organizerProgramViewStream(
  Ref ref,
  String programId,
) {
  final uid = ref.watch(uidProvider).asData?.value;
  if (uid == null || uid.isEmpty) {
    return Stream.error(const SignInRequiredException('view the program'));
  }
  return ref
      .watch(organizerProgramViewsRepositoryProvider)
      .watchProgramme(programId, uid);
}

/// The organiser's programmes as lifecycle summaries, live.
@riverpod
Stream<List<OrganizerProgramSummary>> organizerProgramSummariesStream(
  Ref ref,
  String organizerId,
) {
  final uid = ref.watch(uidProvider).asData?.value;
  if (uid == null || uid.isEmpty) {
    return Stream.error(const SignInRequiredException('view your programs'));
  }
  return ref
      .watch(organizerProgramViewsRepositoryProvider)
      .watchProgrammes(organizerId, uid)
      .map(
        (rows) => [
          for (final row in rows) organizerProgramSummaryFromView(row),
        ],
      );
}
