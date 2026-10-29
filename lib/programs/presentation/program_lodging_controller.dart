import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_lodging_providers.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_lodging_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_board.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_review.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_setup.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_lodging_controller.g.dart';

class ProgramLodgingView {
  const ProgramLodgingView({
    required this.setup,
    this.review,
    this.busy = false,
    this.error,
    this.retryAction,
    this.retryHotelId,
  });
  final ProgramLodgingSetup setup;
  final ProgramLodgingReview? review;
  final bool busy;
  final Object? error;
  final ProgramLodgingAction? retryAction;
  final String? retryHotelId;

  ProgramLodgingView pending() => ProgramLodgingView(
    setup: setup,
    review: review,
    busy: true,
    retryAction: retryAction,
    retryHotelId: retryHotelId,
  );
}

class _LodgingPendingCommand {
  _LodgingPendingCommand(
    this.proposal,
    this.action,
    this.revision,
    this.hotelId,
  ) : operationId =
          'lodging_${List.generate(4, (_) => Random.secure().nextInt(1 << 32).toRadixString(16).padLeft(8, '0')).join()}';
  final ProgramLodgingProposal proposal;
  final ProgramLodgingAction action;
  final int revision;
  final String operationId;
  final String? hotelId;
  bool saved = false;
}

/// One state owner fences every async result and retains an uncertain command
/// verbatim for retry. Authority loss/disposal clears private planning data.
@riverpod
class ProgramLodgingController extends _$ProgramLodgingController {
  var _epoch = 0;
  _LodgingPendingCommand? _command;
  late String _programId;

  ProgramLodgingRepository get _repository =>
      ref.read(programLodgingRepositoryProvider);

  @override
  Future<ProgramLodgingView> build(String programId) async {
    _programId = programId;
    _epoch++;
    _command = null;
    ref.onDispose(() => _epoch++);
    final accountState = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final account = accountState.isSettledData ? accountState.value : null;
    if (account == null || account.isEmpty) {
      throw const SignInRequiredException('manage hotel rooms');
    }
    ref.watch(programLodgingRepositoryProvider);
    final view = await readWithProgramAuthority(
      ref,
      account,
      programId,
      () => _readView(_epoch),
      onAuthorityChanged: () {
        _epoch++;
        _command = null;
      },
    );
    retainProgramProjection(
      ref,
      view.setup.accessExpiresAt,
      onExpiry: () {
        _epoch++;
        _command = null;
      },
    );
    return view;
  }

  ProgramLodgingView _current([String? proposalId]) {
    final view = state.asData?.value;
    if (view == null ||
        view.busy ||
        (proposalId != null && view.review?.proposal.id != proposalId)) {
      throw programReadSuperseded;
    }
    if (!isProgramProjectionActive(
      programProjectionDeadline(
        view.setup.accessExpiresAt,
        view.review?.accessExpiresAt,
      ),
      ref.read(programProjectionClockProvider)(),
    )) {
      throw const PermissionException(
        'Program access expired. Refresh this view.',
      );
    }
    return view;
  }

  void _ensureEditing() {
    if (_command != null) {
      throw StateError('Retry the pending lodging decision first.');
    }
  }

  Future<T> _run<T>(
    ProgramLodgingView view,
    Future<T> Function() operation,
    ProgramLodgingView Function(T) next,
  ) async {
    final epoch = ++_epoch;
    state = AsyncData(view.pending());
    try {
      final result = await operation();
      if (!ref.mounted || epoch != _epoch) throw programReadSuperseded;
      state = AsyncData(next(result));
      return result;
    } catch (error, stack) {
      if (ref.mounted && epoch == _epoch) {
        if (isDefinitiveLodgingRejection(error)) {
          // A domain rejection cannot have published this command. Its old
          // source is unusable; offer a new read, not an endless stale retry.
          _command = null;
          _hideStaleView(error, stack);
          rethrow;
        }
        state = AsyncData(
          ProgramLodgingView(
            setup: view.setup,
            review: view.review,
            error: error,
            retryAction: _command?.action,
            retryHotelId: _command?.hotelId,
          ),
        );
      }
      rethrow;
    }
  }

  void refresh() {
    _ensureEditing();
    // Expired projections may request a new read; busy/uncertain commands
    // still cannot discard their acknowledgement identity.
    if (!state.hasError &&
        (state.asData?.value == null || state.requireValue.busy)) {
      throw programReadSuperseded;
    }
    ref.invalidateSelf(asReload: true);
  }

  Future<void> regenerate() async {
    _ensureEditing();
    await _run(
      _current(),
      () => _repository.preview(_programId, regenerate: true),
      _reviewView,
    );
  }

  Future<List<ProgramLodgingDestination>> destinations(
    String proposalId,
    String partyId,
  ) {
    _ensureEditing();
    final view = _current(proposalId);
    return _run(
      view,
      () => _repository.destinations(
        _programId,
        view.review!.proposal,
        partyId,
        expectedRevisions: lodgingJsonMap(view.review!.snapshot['revisions']),
      ),
      (_) => view,
    );
  }

  Future<void> move(
    String proposalId,
    String partyId,
    String inventoryId,
  ) async {
    _ensureEditing();
    final view = _current(proposalId);
    final proposal = view.review!.proposal;
    if (!view.review!.parties.any((p) => p.id == partyId && p.canMove)) {
      throw StateError('This room-sharing party is locked.');
    }
    await _run(
      view,
      () => _repository.propose(
        _programId,
        proposal,
        proposal.moving(partyId, inventoryId),
        expectedRevisions: lodgingJsonMap(view.review!.snapshot['revisions']),
      ),
      _reviewView,
    );
  }

  Future<ProgramLodgingMembership> loadMembership(String guestId) {
    _ensureEditing();
    final view = _current();
    return _run(
      view,
      () => _repository.readMembership(_programId, guestId),
      (_) => view,
    );
  }

  Future<void> saveMembership(
    ProgramLodgingMembership membership,
    List<String> groupIds,
  ) async {
    _ensureEditing();
    final view = _current();
    if (membership.programId != _programId ||
        !isProgramProjectionActive(
          membership.accessExpiresAt,
          ref.read(programProjectionClockProvider)(),
        )) {
      throw programReadSuperseded;
    }
    await _run(view, () async {
      final actionEpoch = _epoch;
      try {
        await _repository.decideMembership(membership, groupIds);
      } catch (error, stack) {
        // A membership CAS is not a publication receipt. An uncertain write
        // needs a current read, never an automatic repeat of an old revision.
        if (ref.mounted && actionEpoch == _epoch) _hideStaleView(error, stack);
        rethrow;
      }
      if (!ref.mounted || actionEpoch != _epoch) throw programReadSuperseded;
      return _reloadAcknowledgedWrite(actionEpoch);
    }, (next) => next);
  }

  Future<ProgramLodgingSetup> loadSetup() {
    _ensureEditing();
    final view = _current();
    return _run(
      view,
      () => _repository.readSetup(_programId),
      (setup) => ProgramLodgingView(setup: setup, review: view.review),
    );
  }

  Future<({int startsAtMillis, int endsAtMillis})> resolveDates(
    String timezone,
    String arrival,
    String departure,
  ) {
    _ensureEditing();
    final view = _current();
    return _run(
      view,
      () => _repository.resolveDates(_programId, timezone, arrival, departure),
      (_) => view,
    );
  }

  Future<void> saveDraft(
    ProgramLodgingDraft draft, {
    List<Map<String, Object?>> adoptions = const [],
  }) async {
    _ensureEditing();
    final view = _current();
    if (draft.catalog.programId != _programId) throw programReadSuperseded;
    await _run(view, () async {
      final actionEpoch = _epoch;
      await _repository.saveSetup(
        _programId,
        draft.setup,
        draft.expectedRevision,
        adoptions: adoptions,
      );
      if (!ref.mounted || actionEpoch != _epoch) throw programReadSuperseded;
      return _reloadAcknowledgedWrite(actionEpoch);
    }, (next) => next);
  }

  Future<void> saveSetup(Map<String, Object?> fields) async {
    _ensureEditing();
    final view = _current();
    final revision = view.setup.configuration?['revision'];
    await _run(view, () async {
      final actionEpoch = _epoch;
      await _repository.saveSetup(
        _programId,
        fields,
        revision == null ? 0 : (revision as num).toInt(),
      );
      if (!ref.mounted || actionEpoch != _epoch) throw programReadSuperseded;
      return _reloadAcknowledgedWrite(actionEpoch);
    }, (next) => next);
  }

  Future<void> decide(ProgramLodgingAction action, {String? hotelId}) async {
    final view = _current();
    final review = view.review;
    if (review == null) throw programReadSuperseded;
    if (action == ProgramLodgingAction.confirmHotel) {
      if (hotelId == null || !review.allocatedHotelIds.contains(hotelId)) {
        throw StateError('Choose a hotel allocated by this exact proposal.');
      }
    } else if (hotelId != null) {
      throw StateError('Only hotel confirmation accepts a hotel choice.');
    }
    if (_command != null &&
        (_command!.action != action || _command!.hotelId != hotelId)) {
      throw StateError('Retry the pending lodging decision first.');
    }
    final command = _command ??= _LodgingPendingCommand(
      review.proposal,
      action,
      review.workflowRevision,
      hotelId,
    );
    await _run(view, () async {
      final actionEpoch = _epoch;
      // A successful publication advances source revisions. Its uncertain
      // retry must go straight to the receipt boundary, never stale save().
      if (action == ProgramLodgingAction.approve && !command.saved) {
        await _repository.save(_programId, command.proposal);
        command.saved = true;
      }
      if (!ref.mounted || actionEpoch != _epoch) throw programReadSuperseded;
      await _repository.transition(
        _programId,
        proposal: command.proposal,
        operationId: command.operationId,
        expectedWorkflowRevision: command.revision,
        action: command.action,
        hotelId: command.hotelId,
      );
      if (!ref.mounted || actionEpoch != _epoch) throw programReadSuperseded;
      _command = null;
      return _reloadAcknowledgedWrite(actionEpoch);
    }, (next) => next);
  }

  void _hideStaleView(Object error, StackTrace stack) {
    _epoch++;
    state = AsyncError(error, stack);
  }

  Future<ProgramLodgingView> _readView(int actionEpoch) async {
    final setup = await _repository.readSetup(_programId);
    if (!ref.mounted || actionEpoch != _epoch) throw programReadSuperseded;
    if (setup.configuration == null) return ProgramLodgingView(setup: setup);
    final review = await _repository.preview(_programId);
    if (!ref.mounted || actionEpoch != _epoch) throw programReadSuperseded;
    return _reviewView(review);
  }

  Future<ProgramLodgingView> _reloadAcknowledgedWrite(int actionEpoch) async {
    try {
      return await _readView(actionEpoch);
    } catch (error, stack) {
      // The write was acknowledged. An unavailable new projection must never
      // restore the prior revision or offer to repeat the successful write.
      if (ref.mounted && actionEpoch == _epoch) {
        _hideStaleView(error, stack);
      }
      rethrow;
    }
  }
}

ProgramLodgingView _reviewView(ProgramLodgingReview review) =>
    ProgramLodgingView(
      setup: ProgramLodgingSetup(
        configuration: review.configuration,
        accessExpiresAt: review.accessExpiresAt,
      ),
      review: review,
    );
