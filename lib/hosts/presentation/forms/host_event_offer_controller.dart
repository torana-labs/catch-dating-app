import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_event_offer_gateway.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/persistence/command_journal_provider.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart'
    show HostEventOfferGateway, HostOfferCommitOutbox, HostOfferMutationOutbox;

part 'host_event_offer_controller.g.dart';

/// The gateway is bound to manager-only callables after shared contracts land.
/// No client-supplied authority flags, seat holds or provider state are accepted.
enum HostOfferFlowStatus {
  idle,
  previewing,
  review,
  committing,
  committed,
  failure,
}

@immutable
class HostOfferFlowView {
  const HostOfferFlowView({
    required this.status,
    this.draft,
    this.preview,
    this.receipt,
    this.pendingRequestId,
    this.error,
    this.actorAvailable = true,
  });

  final HostOfferFlowStatus status;
  final HostOfferBatchDraft? draft;
  final HostOfferPreview? preview;
  final HostOfferCommitReceipt? receipt;
  final String? pendingRequestId;
  final Object? error;
  final bool actorAvailable;

  bool get canCommit =>
      actorAvailable &&
      status == HostOfferFlowStatus.review &&
      draft != null &&
      preview != null;
}

/// Holds one reviewed batch from preview through idempotent commit. A changed
/// source, CRM contact, event or terms requires a fresh preview.
typedef HostEventOfferScope = ({
  String? accountId,
  String organizerId,
  Object sourceId,
});

class HostEventOfferDependencies {
  const HostEventOfferDependencies({
    required this.gateway,
    this.outbox,
    this.mutationOutbox,
    this.currentAccountId,
  });
  final HostEventOfferGateway gateway;
  final HostOfferCommitOutbox? outbox;
  final HostOfferMutationOutbox? mutationOutbox;
  final String? Function()? currentAccountId;
}

@riverpod
HostEventOfferDependencies hostEventOfferDependencies(Ref ref) {
  final gateway = CallableHostEventOfferGateway(
    ref.watch(firebaseFunctionsProvider),
  );
  final storage = ref.watch(commandJournalStorageProvider);
  String? currentAccountId() =>
      ref.mounted ? ref.read(firebaseAuthProvider).currentUser?.uid : null;
  return HostEventOfferDependencies(
    gateway: gateway,
    currentAccountId: currentAccountId,
    outbox: JournalHostOfferCommitOutbox(
      storage: storage,
      currentAccountId: currentAccountId,
      gateway: gateway,
    ),
    mutationOutbox: JournalHostOfferMutationOutbox.forGateway(
      storage: storage,
      currentAccountId: currentAccountId,
      gateway: gateway,
    ),
  );
}

@riverpod
class HostEventOfferController extends _$HostEventOfferController {
  @override
  HostOfferFlowView build(HostEventOfferScope scope) {
    ref.watch(hostEventOfferDependenciesProvider);
    ref.listen(uidProvider, (_, next) {
      if (next.asData?.value != scope.accountId) invalidateActor();
    });
    return const HostOfferFlowView(status: HostOfferFlowStatus.idle);
  }

  HostEventOfferDependencies get _dependencies =>
      ref.read(hostEventOfferDependenciesProvider);
  HostEventOfferGateway get _gateway => _dependencies.gateway;
  HostOfferCommitOutbox? get _outbox => _dependencies.outbox;
  HostOfferMutationOutbox? get _mutationOutbox => _dependencies.mutationOutbox;
  String? get _accountId => scope.accountId;
  HostOfferFlowView get _view => state;
  int _generation = 0;
  bool get _active {
    if (!ref.mounted || !state.actorAvailable) return false;
    final actor = _dependencies.currentAccountId;
    if (actor != null && actor() != scope.accountId) {
      invalidateActor();
      return false;
    }
    return true;
  }

  void invalidateActor() {
    if (!ref.mounted) return;
    _generation++;
    state = const HostOfferFlowView(
      status: HostOfferFlowStatus.idle,
      actorAvailable: false,
    );
  }

  Future<void> recoverPending({
    required String organizerId,
    required String eventId,
    bool Function()? isCurrent,
  }) async {
    if (!_active) return;
    final outbox = _outbox;
    final accountId = _accountId;
    if (outbox == null || accountId == null) return;
    if (!_active) return;
    final generation = ++_generation;
    final pending = await outbox.pending(
      accountId: accountId,
      organizerId: organizerId,
      eventId: eventId,
    );
    if (!_isCurrent(generation) ||
        isCurrent?.call() == false ||
        pending == null) {
      return;
    }
    _publish(
      HostOfferFlowView(
        status: HostOfferFlowStatus.failure,
        draft: pending.draft,
        preview: pending.preview,
        pendingRequestId: pending.requestId,
        error: StateError('Resolve the saved offer operation before editing.'),
      ),
    );
  }

  Future<void> preview({
    required HostOfferBatchDraft draft,
    required DateTime now,
    required DateTime eventStartsAt,
  }) async {
    if (!_active) return;
    final generation = ++_generation;
    final outbox = _outbox;
    final accountId = _accountId;
    if (outbox != null &&
        accountId != null &&
        await outbox.pending(
              accountId: accountId,
              organizerId: draft.organizerId,
              eventId: draft.eventId,
            ) !=
            null) {
      throw StateError('Resolve the saved offer operation before editing.');
    }
    if (!_isCurrent(generation)) return;
    _publish(
      HostOfferFlowView(status: HostOfferFlowStatus.previewing, draft: draft),
    );
    try {
      draft.validate(now: now, eventStartsAt: eventStartsAt);
      final preview = await _gateway.preview(draft);
      if (!_isCurrent(generation)) return;
      if (preview.rows.length != draft.rows.length ||
          preview.rows.any((row) => row.status != 'new')) {
        throw const FormatException('Offer preview is not a new batch.');
      }
      _publish(
        HostOfferFlowView(
          status: HostOfferFlowStatus.review,
          draft: draft,
          preview: preview,
        ),
      );
    } on Object catch (error) {
      if (!_isCurrent(generation)) return;
      _publish(
        HostOfferFlowView(
          status: HostOfferFlowStatus.failure,
          draft: draft,
          error: error,
        ),
      );
    }
  }

  Future<void> commit(String requestId) async {
    if (!_active) return;
    final outbox = _outbox;
    final accountId = _accountId;
    if (outbox == null || accountId == null || accountId.isEmpty) {
      throw StateError('Durable offer storage is required before committing.');
    }
    final current = _view;
    if (current.draft == null ||
        current.preview == null ||
        (current.status != HostOfferFlowStatus.review &&
            current.status != HostOfferFlowStatus.failure) ||
        current.pendingRequestId != null &&
            current.pendingRequestId != requestId ||
        !RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{7,99}$').hasMatch(requestId)) {
      throw StateError('Review the current offer batch before committing.');
    }
    final generation = _generation;
    _publish(
      HostOfferFlowView(
        status: HostOfferFlowStatus.committing,
        draft: current.draft,
        preview: current.preview,
        pendingRequestId: requestId,
      ),
    );
    try {
      final receipt = await outbox.submit(
        accountId: accountId,
        draft: current.draft!,
        preview: current.preview!,
        requestId: requestId,
      );
      if (!_isCurrent(generation)) return;
      if (receipt == null) {
        throw StateError('Offer result is uncertain; retry the saved request.');
      }
      if (receipt.requestId != requestId ||
          receipt.organizerId != current.draft!.organizerId ||
          receipt.eventId != current.draft!.eventId ||
          receipt.results.length != current.draft!.rows.length) {
        throw const FormatException('Offer receipt does not match the review.');
      }
      _publish(
        HostOfferFlowView(
          status: HostOfferFlowStatus.committed,
          draft: current.draft,
          preview: current.preview,
          receipt: receipt,
          pendingRequestId: requestId,
        ),
      );
    } on Object catch (error) {
      if (!_isCurrent(generation)) return;
      // Preserve the exact request ID for an uncertain network retry.
      _publish(
        HostOfferFlowView(
          status: HostOfferFlowStatus.failure,
          draft: current.draft,
          preview: current.preview,
          pendingRequestId: requestId,
          error: error,
        ),
      );
    }
  }

  Future<HostEventOffer> recordReference({
    required HostEventOffer offer,
    required String reference,
    required String requestId,
  }) {
    if (!_active) throw StateError('Offer session is no longer active.');
    final normalized = reference.trim();
    if (offer.manualPayment.status != HostManualPaymentStatus.none ||
        normalized.length < 3 ||
        normalized.length > 240 ||
        RegExp(r'^[a-z]+://', caseSensitive: false).hasMatch(normalized)) {
      throw ArgumentError('Enter a new payment reference, not a URL.');
    }
    if (!_active) throw StateError('Offer session is no longer active.');
    final outbox = _mutationOutbox;
    final accountId = _accountId;
    if (outbox == null || accountId == null || accountId.isEmpty) {
      throw StateError('Durable offer storage is required.');
    }
    return outbox.mutate(
      accountId: accountId,
      offer: offer,
      action: {
        'kind': 'recordEvidence',
        'requestId': requestId,
        'expectedRevision': offer.revision,
        'expectedGeneration': offer.generation,
        'evidenceReference': normalized,
      },
    );
  }

  Future<HostOfferPendingMutation?> recoverPendingMutation({
    required String organizerId,
    required String eventId,
  }) {
    if (!_active) throw StateError('Offer session is no longer active.');
    final outbox = _mutationOutbox;
    final accountId = _accountId;
    if (outbox == null || accountId == null || accountId.isEmpty) {
      return Future<HostOfferPendingMutation?>.value();
    }
    return outbox.pendingMutation(
      accountId: accountId,
      organizerId: organizerId,
      eventId: eventId,
    );
  }

  Future<HostEventOffer> retryPendingMutation({
    required String organizerId,
    required String eventId,
  }) {
    if (!_active) throw StateError('Offer session is no longer active.');
    final outbox = _mutationOutbox;
    final accountId = _accountId;
    if (outbox == null || accountId == null || accountId.isEmpty) {
      throw StateError('Durable offer storage is required.');
    }
    return outbox.replayMutation(
      accountId: accountId,
      organizerId: organizerId,
      eventId: eventId,
    );
  }

  Future<HostEventOffer> reviewReference({
    required HostEventOffer offer,
    required HostManualPaymentStatus decision,
    required String note,
    required bool bankReceiptChecked,
    required String requestId,
  }) {
    if (!_active) throw StateError('Offer session is no longer active.');
    final normalized = note.trim();
    if (offer.manualPayment.status !=
            HostManualPaymentStatus.evidenceSubmitted ||
        decision != HostManualPaymentStatus.hostAttestedReceived &&
            decision != HostManualPaymentStatus.rejected ||
        normalized.length < 3 ||
        normalized.length > 240 ||
        decision == HostManualPaymentStatus.hostAttestedReceived &&
            !bankReceiptChecked) {
      throw ArgumentError('Check bank evidence and record a review reason.');
    }
    if (!_active) throw StateError('Offer session is no longer active.');
    final outbox = _mutationOutbox;
    final accountId = _accountId;
    if (outbox == null || accountId == null || accountId.isEmpty) {
      throw StateError('Durable offer storage is required.');
    }
    return outbox.mutate(
      accountId: accountId,
      offer: offer,
      action: {
        'kind': 'reconcileEvidence',
        'requestId': requestId,
        'expectedRevision': offer.revision,
        'expectedGeneration': offer.generation,
        'decision': decision.name,
        'reviewNote': normalized,
        'bankReceiptChecked': bankReceiptChecked,
      },
    );
  }

  void _publish(HostOfferFlowView next) {
    if (_active) state = next;
  }

  bool _isCurrent(int generation) => _active && generation == _generation;
}
