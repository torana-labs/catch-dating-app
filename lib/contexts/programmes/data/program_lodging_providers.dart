import 'package:catch_dating_app/contexts/programmes/data/program_lodging_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_hotel_board.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_lodging_providers.g.dart';

@riverpod
ProgramLodgingRepository programLodgingRepository(Ref ref) {
  final auth = ref.watch(firebaseAuthProvider);
  return ProgramLodgingRepository(
    ref.watch(firebaseFunctionsProvider),
    ref.watch(programReadSnapshotStoreProvider),
    () => auth.currentUser?.uid,
  );
}

/// One hotel's read-only room list, read once each time the view opens.
/// Live-only: it is never written to the offline snapshot store.
@riverpod
Future<ProgramLodgingHotelBoard> programLodgingHotelBoard(
  Ref ref,
  String programId,
  String hotelId,
) => ref.watch(programLodgingRepositoryProvider).hotelBoard(programId, hotelId);
