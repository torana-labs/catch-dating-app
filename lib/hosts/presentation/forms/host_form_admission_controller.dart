import 'dart:convert';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_form_admission_gateway.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_admission.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/persistence/command_journal_provider.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_form_admission_controller.freezed.dart';
part 'host_form_admission_controller.g.dart';

typedef HostFormAdmissionSession = ({
  String accountId,
  String organizerId,
  String eventId,
  String responseId,
  String contactId,
  String offerId,
});
HostFormAdmissionSession hostFormAdmissionSession(
  String accountId,
  HostFormAdmissionScope scope,
) => (
  accountId: accountId,
  organizerId: scope.organizerId,
  eventId: scope.eventId,
  responseId: scope.responseId,
  contactId: scope.contactId,
  offerId: scope.offerId,
);

class HostFormAdmissionDependencies {
  const HostFormAdmissionDependencies({
    required this.gateway,
    required this.outbox,
    required this.currentAccountId,
  });
  final HostFormAdmissionGateway gateway;
  final JournalHostFormAdmissionOutbox outbox;
  final String? Function() currentAccountId;
}

@riverpod
HostFormAdmissionDependencies hostFormAdmissionDependencies(Ref ref) {
  final gateway = CallableHostFormAdmissionGateway(
    ref.watch(firebaseFunctionsProvider),
  );
  final storage = ref.watch(commandJournalStorageProvider);
  String? currentAccountId() =>
      ref.mounted ? ref.read(firebaseAuthProvider).currentUser?.uid : null;
  return HostFormAdmissionDependencies(
    gateway: gateway,
    currentAccountId: currentAccountId,
    outbox: JournalHostFormAdmissionOutbox(
      storage: storage,
      gateway: gateway,
      currentAccountId: currentAccountId,
    ),
  );
}

@freezed
abstract class HostFormAdmissionState with _$HostFormAdmissionState {
  const factory HostFormAdmissionState({
    HostFormAdmissionPreview? preview,
    PendingFormAdmission? pending,
    HostFormAdmissionReceipt? receipt,
    Object? error,
    @Default(false) bool busy,
    @Default(true) bool actorAvailable,
  }) = _HostFormAdmissionState;
}

@riverpod
class HostFormAdmissionController extends _$HostFormAdmissionController {
  @override
  HostFormAdmissionState build(HostFormAdmissionSession session) {
    ref.watch(hostFormAdmissionDependenciesProvider);
    ref.listen(uidProvider, (_, next) {
      if (next.asData?.value != session.accountId) invalidateActor();
    });
    return const HostFormAdmissionState();
  }

  HostFormAdmissionDependencies get _dependencies =>
      ref.read(hostFormAdmissionDependenciesProvider);
  String get _accountId => session.accountId;
  HostFormAdmissionScope get _scope => HostFormAdmissionScope(
    organizerId: session.organizerId,
    eventId: session.eventId,
    responseId: session.responseId,
    contactId: session.contactId,
    offerId: session.offerId,
  );
  HostFormAdmissionGateway get _gateway => _dependencies.gateway;
  JournalHostFormAdmissionOutbox get _outbox => _dependencies.outbox;
  int _generation = 0;
  bool get _active {
    if (!ref.mounted || !state.actorAvailable) return false;
    if (_dependencies.currentAccountId() != _accountId) {
      invalidateActor();
      return false;
    }
    return true;
  }

  void invalidateActor() {
    if (!ref.mounted) return;
    _generation++;
    state = const HostFormAdmissionState(actorAvailable: false);
  }

  bool _current(int generation) => _active && generation == _generation;
  void _update(HostFormAdmissionState Function(HostFormAdmissionState) update) {
    if (_active) state = update(state);
  }

  HostFormAdmissionPreview? get _preview => state.preview;
  set _preview(HostFormAdmissionPreview? value) =>
      _update((s) => s.copyWith(preview: value));
  PendingFormAdmission? get _pending => state.pending;
  set _pending(PendingFormAdmission? value) =>
      _update((s) => s.copyWith(pending: value));
  set _receipt(HostFormAdmissionReceipt? value) =>
      _update((s) => s.copyWith(receipt: value));
  set _error(Object? value) => _update((s) => s.copyWith(error: value));
  bool get _busy => state.busy;
  set _busy(bool value) => _update((s) => s.copyWith(busy: value));
  Future<void> review() => _run((generation) async {
    final saved = await _outbox.pending(_accountId, _scope);
    if (!_current(generation)) return;
    _pending = saved;
    if (saved != null) return;
    final result = await _gateway.preview(_scope);
    if (_current(generation)) _preview = result;
  });

  Future<void> confirm() => _run((generation) async {
    final saved = _pending;
    final command =
        saved?.command ??
        _preview?.command(
          'admission_${base64UrlEncode(List.generate(18, (_) => Random.secure().nextInt(256)))}',
        );
    if (command == null || saved?.needsReview == true) {
      throw StateError('Review admission before confirming.');
    }
    final result = await _outbox.submit(_accountId, command);
    if (!_current(generation)) return;
    _receipt = result;
    _pending = null;
    _preview = null;
  });

  Future<void> reviewAgain() => _run((generation) async {
    await _outbox.reviewAgain(_accountId, _scope);
    if (!_current(generation)) return;
    _pending = null;
    final result = await _gateway.preview(_scope);
    if (_current(generation)) _preview = result;
  });

  Future<void> _run(Future<void> Function(int generation) action) async {
    if (!_active || _busy) return;
    final generation = ++_generation;
    _busy = true;
    _error = null;
    try {
      await action(generation);
    } on Object catch (failure) {
      if (_current(generation)) {
        _preview = null;
        _error = failure;
        try {
          final saved = await _outbox.pending(_accountId, _scope);
          if (_current(generation)) _pending = saved;
        } on Object catch (recoveryFailure) {
          if (_current(generation)) _error = recoveryFailure;
        }
      }
    } finally {
      if (_current(generation)) {
        _busy = false;
      }
    }
  }
}
