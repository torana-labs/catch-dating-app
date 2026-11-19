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
/// [data] receives the state that authorized it, so it can open only the
/// sources the account's scopes reach.
///
/// [allows] adds a condition the keys cannot say, such as one of several
/// duties covering a function; it sees the state at the instant evaluated.
///
/// [scopeOf] names what the data listener was opened for (for example the
/// resources an account's scopes reach); when it changes the listener is
/// reopened, because widening can add sources to read.
///
/// [needs] are keys of [ProgramAccessView.liveKeys], or `'manager'`, which
/// satisfies any need.
///
/// [admits], when given, replaces the duty check entirely ([needs] and
/// [allows] are then ignored): the programme's setup reads admit an
/// organizer manager whose view holds no live duty, which the duty check
/// would deny.
Stream<T> gateByProgramAccess<T>({
  required Stream<ProgramAccessState> access,
  required Stream<T> Function(ProgramAccessState state) data,
  required Set<String> needs,
  Object? Function(ProgramAccessState state)? scopeOf,
  bool Function(ProgramAccessState state)? allows,
  bool Function(ProgramAccessState state)? admits,
}) {
  late final StreamController<T> controller;
  // ignore: cancel_subscriptions
  StreamSubscription<ProgramAccessState>? accessSubscription;
  // Both are cancelled together in onCancel and in closeData.
  // ignore: cancel_subscriptions
  StreamSubscription<T>? dataSubscription;
  int? openEpoch;
  Object? openScope;
  var denied = false;

  bool permits(ProgramAccessState state) {
    final admitted = admits;
    if (admitted != null) return admitted(state);
    return state.isLive &&
        (state.liveKeys.contains('manager') ||
            state.liveKeys.containsAll(needs)) &&
        (allows?.call(state) ?? true);
  }

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
        _ when admits != null => 'This account cannot open this programme.',
        ProgramAccessDenial.expired => 'Program access expired.',
        ProgramAccessDenial.revoked => 'Program access was removed.',
        ProgramAccessDenial.notYetActive => 'Program access has not begun.',
        _ => 'This account has no access to this programme work.',
      }),
    );
  }

  void open(ProgramAccessState state) {
    denied = false;
    final scope = scopeOf?.call(state);
    if (dataSubscription != null &&
        openEpoch == state.epoch &&
        openScope == scope) {
      return;
    }
    unawaited(closeData());
    openEpoch = state.epoch;
    openScope = scope;
    dataSubscription = data(
      state,
    ).listen(controller.add, onError: controller.addError);
  }

  controller = StreamController<T>(
    onListen: () {
      accessSubscription = access.listen(
        (state) => permits(state) ? open(state) : deny(state),
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
