import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/domain/program_access_view.dart';
import 'package:catch_platform/errors/app_exception.dart';

/// Shows a programme read only while the signed-in account's authority holds.
///
/// Firestore rules enforce authority online. Offline, a listener serves rows
/// from the device cache with no rules check, so this gate enforces the same
/// instants on the phone: [data] is opened while [access] says the account
/// holds every key in [needs], and closed the moment it does not. Rows are
/// never replayed from a closed listener: when authority narrows, the data
/// listener is cancelled, the stream reports a [PermissionException], and
/// once authority holds again a fresh listener starts, so every row shown was
/// delivered under the epoch it is shown in. Authority that only widens keeps
/// the running listener.
///
/// [needs] are keys of [ProgramAccessView.liveKeys], or `'manager'`, which
/// satisfies any need.
Stream<T> gateByProgramAccess<T>({
  required Stream<ProgramAccessState> access,
  required Stream<T> Function() data,
  required Set<String> needs,
}) {
  late final StreamController<T> controller;
  // ignore: cancel_subscriptions
  StreamSubscription<ProgramAccessState>? accessSubscription;
  // Both are cancelled together in onCancel and in closeData.
  // ignore: cancel_subscriptions
  StreamSubscription<T>? dataSubscription;
  int? openEpoch;
  var denied = false;

  bool allows(ProgramAccessState state) =>
      state.isLive &&
      (state.liveKeys.contains('manager') || state.liveKeys.containsAll(needs));

  Future<void> closeData() async {
    final subscription = dataSubscription;
    dataSubscription = null;
    openEpoch = null;
    await subscription?.cancel();
  }

  void deny(ProgramAccessState state) {
    unawaited(closeData());
    if (denied) return;
    denied = true;
    controller.addError(
      PermissionException(switch (state.denial) {
        ProgramAccessDenial.expired => 'Program access expired.',
        ProgramAccessDenial.revoked => 'Program access was removed.',
        ProgramAccessDenial.notYetActive => 'Program access has not begun.',
        _ => 'This account has no access to this programme work.',
      }),
    );
  }

  void open(ProgramAccessState state) {
    denied = false;
    if (dataSubscription != null && openEpoch == state.epoch) return;
    unawaited(closeData());
    openEpoch = state.epoch;
    dataSubscription = data().listen(
      controller.add,
      onError: controller.addError,
    );
  }

  controller = StreamController<T>(
    onListen: () {
      accessSubscription = access.listen(
        (state) => allows(state) ? open(state) : deny(state),
        onError: controller.addError,
        onDone: () {
          unawaited(closeData());
          unawaited(controller.close());
        },
      );
    },
    onPause: () {
      accessSubscription?.pause();
      dataSubscription?.pause();
    },
    onResume: () {
      accessSubscription?.resume();
      dataSubscription?.resume();
    },
    // Both listeners are cancelled at once; neither waits on the other.
    onCancel: () => Future.wait<void>([
      closeData(),
      accessSubscription?.cancel() ?? Future<void>.value(),
    ]),
  );
  return controller.stream;
}
