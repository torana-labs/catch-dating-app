import 'dart:async';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_access_view.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_room_views_repository.g.dart';

/// The hotel desk's room board read through a listener (#1339) from
/// `programHotelRoomViews/{programId}__{hotelId}` instead of
/// `getProgramHotelRooms`. The read is gated on the hotel desk duty covering
/// the hotel (coordinators and the owner hold it), so a cached board stops at
/// the instant the duty does. Stays are still written by `upsertProgramStay`,
/// fenced by the stay revision the board carries; the board shows the result
/// when its trigger rewrites it.
class ProgramRoomViewsRepository {
  const ProgramRoomViewsRepository(this._firestore, this._access, this._clock);

  static const collection = 'programHotelRoomViews';

  final FirebaseFirestore _firestore;
  final ProgramAccessRepository _access;
  final AppClock _clock;

  static const _context = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load the room board',
    resource: collection,
  );

  /// One hotel's room board, live.
  Stream<ProgramHotelRooms> watchHotelRooms(
    String programId,
    String hotelId,
    String uid,
  ) => _access
      .gated<({ProgramAccessView access, Map<String, dynamic>? board})>(
        programId,
        uid,
        needs: const {},
        allows: (state) => state.view!.coversHotel(
          ProgramStaffDuty.hotelDesk,
          hotelId,
          state.evaluatedAt,
        ),
        scopeOf: (state) => hotelId,
        data: (state) => withBackendErrorStream(
          () => _firestore
              .collection(collection)
              .doc('${programId}__$hotelId')
              .snapshots()
              .map((snapshot) => (access: state.view!, board: snapshot.data())),
          context: _context,
        ),
      )
      .map(
        (source) => programHotelRoomsFromView(
          source.board,
          accessExpiresAt: source.access.expiresAt,
          generatedAt: _clock.now(),
        ),
      );
}

/// The room board from its view document. A missing board (a hotel the
/// trigger has not reached yet) and one past the callable's complete-read
/// caps are errors, as the callable answered them.
ProgramHotelRooms programHotelRoomsFromView(
  Map<String, dynamic>? board, {
  required DateTime? accessExpiresAt,
  required DateTime generatedAt,
}) {
  if (board == null) {
    throw const DocumentNotFoundException('the room board');
  }
  if (board['overflow'] == true) {
    throw const BackendOperationException(
      code: 'resource-exhausted',
      message: 'Room board exceeds the supported complete-read limit.',
      context: ProgramRoomViewsRepository._context,
    );
  }
  return ProgramHotelRooms.fromCallableData({
    ...board,
    'accessExpiresAtMillis': accessExpiresAt?.millisecondsSinceEpoch,
    'generatedAtMillis': generatedAt.millisecondsSinceEpoch,
  });
}

// keepalive: account-free: a stateless repository over account-free SDK
// singletons.
@Riverpod(keepAlive: true)
ProgramRoomViewsRepository programRoomViewsRepository(Ref ref) =>
    ProgramRoomViewsRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(programAccessRepositoryProvider),
      ref.watch(appClockProvider),
    );

/// One hotel's room board, live: block capacity, every stay with its
/// revision, and routed guests still needing a room.
@riverpod
Stream<ProgramHotelRooms> programHotelRooms(
  Ref ref,
  String programId,
  String hotelId,
) {
  final uid = ref.watch(uidProvider).asData?.value;
  if (uid == null || uid.isEmpty) {
    throw const SignInRequiredException('view the room board');
  }
  return ref
      .watch(programRoomViewsRepositoryProvider)
      .watchHotelRooms(programId, hotelId, uid);
}
