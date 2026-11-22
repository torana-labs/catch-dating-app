import 'dart:async';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/organizer_program_views.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_access_view.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/live_paged_query.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/streams/dependent_listeners.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'organizer_program_views_repository.g.dart';

/// The planner's programme read through listeners (#1339): one programme's
/// setup view and the organiser's programme list from
/// `organizerProgramViews`, instead of the settings, schedule and setup lists
/// of `getOrganizerProgram` and the rows of `listOrganizerPrograms`. A list
/// row carries the guest, replied and flying-in counts the server keeps on
/// the view (#2306); the detail's rollup counts stay on `getOrganizerProgram`.
///
/// Rules admit the programme's creator, the organiser's current managers and a
/// live programme administration duty, and end the reads online. Offline the
/// phone applies the same authority from the account's access views, which
/// carry the organiser manager flag (#2175): the detail is gated on its
/// programme's view, and the list shows only the rows whose programme's view
/// lists it. The list reads the whole organiser while one of those views
/// says the account manages it, and otherwise only the programmes the
/// account created, the one list query the rules admit a creator.
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
  ) =>
      dependentListeners<
        List<ProgramAccessView>,
        List<Map<Object?, Object?>>,
        List<Map<Object?, Object?>>
      >(
        _access.watchOrganizerViews(organizerId, uid, limit: maxRows),
        keyOf: (views) => views.any((view) => view.organizerManager)
            ? _organizerWide
            : _createdByAccount,
        secondaryFor: (key) => _programmes(
          organizerId,
          createdBy: key == _createdByAccount ? uid : null,
        ),
        combine: (views, rows) =>
            organizerProgramRowsListed(rows ?? const [], views, _clock.now()),
      );

  static const _organizerWide = 'organizer';
  static const _createdByAccount = 'createdBy';

  Stream<List<Map<Object?, Object?>>> _programmes(
    String organizerId, {
    String? createdBy,
  }) {
    var rows = _firestore
        .collection(collection)
        .where('organizerId', isEqualTo: organizerId);
    if (createdBy != null) {
      // firestore-index: organizerProgramViews(organizerId:ASCENDING, createdBy:ASCENDING, startsAtMillis:DESCENDING, __name__:DESCENDING)
      rows = rows.where('createdBy', isEqualTo: createdBy);
    }
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

  /// How long the create confirmation waits for a new programme's view.
  static const createdViewDeadline = Duration(seconds: 20);

  /// The view of the programme [uid] just created, once its trigger has
  /// written it, or null when it has not appeared by [deadline]. A get on a
  /// view that does not exist yet is denied, so this listens to the query
  /// the rules admit a creator: its organiser, its creator and its id.
  Future<Map<Object?, Object?>?> createdProgramme({
    required String organizerId,
    required String uid,
    required String programId,
    Duration deadline = createdViewDeadline,
  }) {
    final found = Completer<Map<Object?, Object?>?>();
    final timer = _clock.timer(deadline, () {
      if (!found.isCompleted) found.complete(null);
    });
    final subscription =
        withBackendErrorStream(
          () => _firestore
              .collection(collection)
              .where('organizerId', isEqualTo: organizerId)
              .where('createdBy', isEqualTo: uid)
              .where('programId', isEqualTo: programId)
              .limit(ReadLimitPolicy.lookup)
              .snapshots(),
          context: _context,
        ).listen(
          (snapshot) {
            if (snapshot.docs.isEmpty || found.isCompleted) return;
            found.complete(snapshot.docs.first.data());
          },
          onError: (Object error, StackTrace stackTrace) {
            if (!found.isCompleted) found.completeError(error, stackTrace);
          },
        );
    return found.future.whenComplete(() {
      timer.cancel();
      unawaited(subscription.cancel());
    });
  }
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

/// The organiser's programmes as list rows with their counts, live: the
/// planner home and the Events tab.
@riverpod
Stream<List<OrganizerProgramListRow>> organizerProgramRowsStream(
  Ref ref,
  String organizerId,
) async* {
  final uid = await ref.watch(uidProvider.future);
  if (uid == null || uid.isEmpty) {
    throw const SignInRequiredException('view your programs');
  }
  yield* ref
      .watch(organizerProgramViewsRepositoryProvider)
      .watchProgrammes(organizerId, uid)
      .map(
        (rows) => [
          for (final row in rows) organizerProgramListRowFromView(row, uid),
        ],
      );
}
