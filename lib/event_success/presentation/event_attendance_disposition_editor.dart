import 'dart:math';

import 'package:catch_dating_app/contexts/live/data/event_attendance_disposition_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_attendance_disposition.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_account.dart';
import 'package:catch_dating_app/event_success/presentation/event_attendance_disposition_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_attendance_report_provider.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_attendance_disposition_editor.g.dart';

enum AttendanceDispositionEditorPhase {
  choosing,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
}

sealed class AttendanceDispositionEditorState {
  const AttendanceDispositionEditorState();
  bool get canDismiss => switch (this) {
    AttendanceDispositionForm(:final phase) =>
      phase != AttendanceDispositionEditorPhase.submitting,
    AttendanceDispositionFormUnavailable() => true,
  };
}

final class AttendanceDispositionFormUnavailable
    extends AttendanceDispositionEditorState {
  const AttendanceDispositionFormUnavailable._(this.error);
  final Object error;
}

final class AttendanceDispositionForm extends AttendanceDispositionEditorState {
  const AttendanceDispositionForm._({
    required this.review,
    this.decision,
    this.phase = AttendanceDispositionEditorPhase.choosing,
    this.change,
    this.result,
    this.error,
  });
  final EventAttendanceDispositionReview review;
  final AttendanceDecision? decision;
  final AttendanceDispositionEditorPhase phase;
  final EventAttendanceDispositionChange? change;
  final EventAttendanceDispositionResult? result;
  final Object? error;

  bool get canEdit =>
      phase == AttendanceDispositionEditorPhase.choosing &&
      (review.view.canRecord || review.view.canClear);
  bool get canSubmit =>
      (canEdit && decision != null) ||
      phase == AttendanceDispositionEditorPhase.retryRequired;
  bool get canReload =>
      canDismiss && phase != AttendanceDispositionEditorPhase.saved;

  AttendanceDispositionForm _after(
    AttendanceDispositionEditorPhase phase, {
    required EventAttendanceDispositionChange change,
    EventAttendanceDispositionResult? result,
    Object? error,
  }) => AttendanceDispositionForm._(
    review: review,
    decision: decision,
    phase: phase,
    change: change,
    result: result,
    error: error,
  );
}

/// One reviewed attendance decision. No implicit default, changed retry, or local
/// optimistic settlement; the response always supplies the current closeout state.
@riverpod
class EventAttendanceDispositionEditor
    extends _$EventAttendanceDispositionEditor {
  static final changeMutation = Mutation<EventAttendanceDispositionResult>();
  Future<EventAttendanceDispositionResult>? _inFlight;
  bool _revoked = false;

  @override
  AttendanceDispositionEditorState build(
    EventAttendanceDispositionReview review,
  ) {
    ref.listen(eventAssistanceAccountProvider, (_, next) {
      if (!identical(next.asData?.value, review.account) ||
          next.isLoading ||
          next.hasError) {
        _revoked = true;
        state = const AttendanceDispositionFormUnavailable._(
          attendanceReviewSessionChanged,
        );
      }
    });
    final current = ref.read(eventAssistanceAccountProvider);
    if (_revoked ||
        current.isLoading ||
        current.hasError ||
        !identical(current.asData?.value, review.account)) {
      _revoked = true;
      return const AttendanceDispositionFormUnavailable._(
        attendanceReviewSessionChanged,
      );
    }
    return AttendanceDispositionForm._(review: review);
  }

  AttendanceDispositionForm? get _form => switch (state) {
    final AttendanceDispositionForm form when !_revoked => form,
    AttendanceDispositionForm() ||
    AttendanceDispositionFormUnavailable() => null,
  };

  void select(AttendanceDecision decision) {
    final form = _form;
    if (form == null || !form.canEdit) return;
    requireAttendanceReviewAccount(ref, review.account);
    if (!review.view.permits(decision)) {
      throw const ValidationException(
        'This closeout decision is unavailable for the reviewed guest.',
      );
    }
    state = AttendanceDispositionForm._(review: review, decision: decision);
  }

  Future<EventAttendanceDispositionResult> submit() {
    final form = _form;
    if (form == null) return Future.error(attendanceReviewSessionChanged);
    if (_inFlight case final pending?) return pending;
    if (form.result case final result?) return Future.value(result);
    if (!form.canSubmit) {
      return Future.error(
        const ValidationException('Choose an attendance closeout decision.'),
      );
    }
    try {
      requireAttendanceReviewAccount(ref, review.account);
      final change =
          form.change ??
          review.view.prepareChange(
            actorUid: review.account.uid,
            operationId: _newOperationId(),
            decision: form.decision!,
          );
      final submitted = form._after(
        AttendanceDispositionEditorPhase.submitting,
        change: change,
      );
      state = submitted;
      final keepAlive = ref.keepAlive();
      late final Future<EventAttendanceDispositionResult> tracked;
      tracked = _submit(submitted, change).whenComplete(() {
        if (identical(_inFlight, tracked)) _inFlight = null;
        keepAlive.close();
      });
      _inFlight = tracked;
      return tracked;
    } catch (error, stackTrace) {
      return Future.error(error, stackTrace);
    }
  }

  Future<EventAttendanceDispositionResult> _submit(
    AttendanceDispositionForm submitted,
    EventAttendanceDispositionChange change,
  ) async {
    try {
      final result = await ref
          .read(eventAttendanceDispositionCommandsProvider)
          .apply(change);
      requireAttendanceReviewAccount(ref, review.account);
      if (_revoked) throw attendanceReviewSessionChanged;
      state = submitted._after(
        AttendanceDispositionEditorPhase.saved,
        change: change,
        result: result,
      );
      ref.invalidate(
        eventAttendanceDispositionForAccountProvider(
          review.view.scope,
          account: review.account,
        ),
      );
      ref.invalidate(
        eventAttendanceReportForAccountProvider(
          EventAssistanceRuntimeScope(
            organizerId: review.view.scope.organizerId,
            eventId: review.view.scope.eventId,
          ),
          account: review.account,
        ),
      );
      return result;
    } catch (error) {
      if (ref.mounted && !_revoked) {
        state = submitted._after(
          _needsFreshReview(error)
              ? AttendanceDispositionEditorPhase.refreshRequired
              : AttendanceDispositionEditorPhase.retryRequired,
          change: change,
          error: error,
        );
      }
      rethrow;
    }
  }
}

String _newOperationId() {
  final random = Random.secure();
  return 'attendance:${List.generate(16, (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0')).join()}';
}

bool _needsFreshReview(Object error) =>
    error is AppException &&
    {
      'aborted',
      'permission-denied',
      'sign-in-required',
      'session-changed',
      'failed-precondition',
      'not-found',
      'invalid-argument',
    }.contains(error.code);
