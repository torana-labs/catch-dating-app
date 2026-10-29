import 'package:catch_dating_app/contexts/programmes/data/program_lodging_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
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
