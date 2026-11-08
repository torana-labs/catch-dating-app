import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The guest inbox and assistant settings commands, so the screens never
/// reach into the repository themselves.
final programmeInboxCommandsProvider = Provider<ProgramWorkRepository>(
  (ref) => ref.watch(programWorkRepositoryProvider),
);
