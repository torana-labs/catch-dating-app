import 'dart:math';

import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_live_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final _random = Random.secure();

/// A fresh `resolveProgramAlert` request id for one tap.
String staffAlertRequestId() =>
    'alert-${DateTime.now().microsecondsSinceEpoch}-${_random.nextInt(1 << 30)}';

/// Runs [action] on [alert] through `resolveProgramAlert`, then reads the
/// live board again. Returns false when the server refused it (for
/// example, someone else changed the alert first).
Future<bool> resolveStaffAlert(
  WidgetRef ref,
  String programId,
  ProgramLiveAlert alert,
  ProgramAlertAction action,
) async {
  try {
    await ref
        .read(programWorkRepositoryProvider)
        .resolveAlert(
          programId: programId,
          alert: alert,
          action: action,
          requestId: staffAlertRequestId(),
        );
    return true;
  } on Object {
    return false;
  } finally {
    ref.invalidate(programLiveBoardViewProvider(programId));
  }
}
