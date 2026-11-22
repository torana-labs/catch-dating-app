import 'dart:convert';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/cursor_page.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/streams/combine_latest.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_guest_directory_repository.g.dart';

/// The programme guest directory read from `programGuestDirectoryViews`
/// (#2306) instead of the `listProgramGuests` callable: one row per guest
/// (its fields and function rows), household and group, kept by triggers.
/// The trigger resolves names, phones and emails from the workspace field
/// assertions, so the phone never holds that evidence.
///
/// Rules admit the programme owner and a guest relations duty from one
/// assignment covering the whole programme. Offline the listener is gated on
/// the account's access view by the same instants
/// ([ProgramAccessView.holdsGuestDirectory]), so cached rows stop when the
/// duty does. Guest, household and RSVP writes stay callables fenced by the
/// revisions the rows carry; the list shows their result once the trigger
/// rewrites the row.
class ProgramGuestDirectoryRepository {
  const ProgramGuestDirectoryRepository(this._firestore, this._access);

  static const collection = 'programGuestDirectoryViews';

  /// Guests are read this many at a time, in name order (the callable's
  /// page size).
  static const pageSize = 200;

  /// The programme's households and groups, each listed whole up to this
  /// many (the callables' inventory caps).
  static const maxJoinRows = 500;

  final FirebaseFirestore _firestore;
  final ProgramAccessRepository _access;

  static const _context = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load program guests',
    resource: collection,
  );

  /// The first page of guests with the households, function rows and groups
  /// they name, live, while the account holds the guest directory.
  Stream<ProgramGuestListPage> watchFirstPage(String programId, String uid) =>
      _access.gated<ProgramGuestListPage>(
        programId,
        uid,
        needs: const {},
        allows: (state) => state.view!.holdsGuestDirectory(state.evaluatedAt),
        scopeOf: (state) => 'guestDirectory',
        data: (state) => _firstPage(programId),
      );

  Stream<ProgramGuestListPage> _firstPage(String programId) {
    // One more guest than the page says whether more follow.
    final guests = _snapshots(_guests(programId), limit: pageSize + 1);
    final households = _snapshots(
      _kind(programId, 'household'),
      limit: maxJoinRows,
    );
    final groups = _snapshots(_kind(programId, 'group'), limit: maxJoinRows);
    return combineLatest(
      guests,
      combineLatest(households, groups, (h, g) => (households: h, groups: g)),
      (guestDocs, joins) {
        final visible = guestDocs.take(pageSize).toList(growable: false);
        return ProgramGuestListPage.fromDirectoryRows(
          programId: programId,
          guests: [for (final doc in visible) doc.data()],
          households: [for (final doc in joins.households) doc.data()],
          groups: [for (final doc in joins.groups) doc.data()],
          nextCursor: guestDocs.length > pageSize ? visible.last.id : null,
        );
      },
    );
  }

  /// One page of guests in name order, read once, for the programme inbox
  /// audience. [cursor] is the previous page's [CursorPage.nextCursor]: the
  /// last guest's name and id, so a page resumes even if that guest has since
  /// gone.
  Future<CursorPage<ProgramGuestRow, String>> guestPage(
    String programId, {
    int limit = pageSize,
    String? cursor,
  }) => withBackendErrorContext(() async {
    var query = _guests(programId);
    if (cursor != null) query = query.startAfter(_cursorValues(cursor));
    final snapshot = await query.limit(limit + 1).get();
    final visible = snapshot.docs.take(limit).toList(growable: false);
    final hasMore = snapshot.docs.length > limit && visible.isNotEmpty;
    return CursorPage(
      items: [
        for (final doc in visible) programGuestRowFromDirectory(doc.data()),
      ],
      hasMore: hasMore,
      nextCursor: hasMore ? _cursorOf(visible.last) : null,
    );
  }, context: _context);

  static String _cursorOf(QueryDocumentSnapshot<Map<String, dynamic>> doc) {
    final guest = programGuestRowFromDirectory(doc.data());
    return jsonEncode([guest.displayName, guest.guestId]);
  }

  static List<Object?> _cursorValues(String cursor) {
    final values = jsonDecode(cursor);
    if (values is! List ||
        values.length != 2 ||
        values.any((value) => value is! String)) {
      throw const FormatException('Unknown guest page cursor.');
    }
    return values;
  }

  /// Guests in name order; equal names follow their guest id, which is
  /// unique within the kind, so a cursor never skips or repeats one.
  // firestore-index: programGuestDirectoryViews(programId:ASCENDING, kind:ASCENDING, guest.displayName:ASCENDING, sourceId:ASCENDING)
  Query<Map<String, dynamic>> _guests(String programId) => _firestore
      .collection(collection)
      .where('programId', isEqualTo: programId)
      .where('kind', isEqualTo: 'guest')
      .orderBy('guest.displayName')
      .orderBy('sourceId');

  /// Every household or group row of the programme; equality filters only,
  /// so no composite index.
  Query<Map<String, dynamic>> _kind(String programId, String kind) => _firestore
      .collection(collection)
      .where('programId', isEqualTo: programId)
      .where('kind', isEqualTo: kind);

  /// [rows] live, at most [limit] of them.
  Stream<List<QueryDocumentSnapshot<Map<String, dynamic>>>> _snapshots(
    Query<Map<String, dynamic>> rows, {
    required int limit,
  }) => withBackendErrorStream(
    () => rows.limit(limit).snapshots().map((snapshot) => snapshot.docs),
    context: _context,
  );
}

// keepalive: account-free: a stateless repository over account-free SDK
// singletons.
@Riverpod(keepAlive: true)
ProgramGuestDirectoryRepository programGuestDirectoryRepository(Ref ref) =>
    ProgramGuestDirectoryRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(programAccessRepositoryProvider),
    );

/// The programme's first guest page with its households, function rows and
/// groups, live. `programGuestListProvider` reads it for the guest list, the
/// guest desk and the planner.
@riverpod
Stream<ProgramGuestListPage> programGuestDirectoryStream(
  Ref ref,
  String programId,
) {
  final uid = ref.watch(uidProvider).asData?.value;
  if (uid == null || uid.isEmpty) {
    return Stream.error(const SignInRequiredException('view program guests'));
  }
  return ref
      .watch(programGuestDirectoryRepositoryProvider)
      .watchFirstPage(programId, uid);
}
