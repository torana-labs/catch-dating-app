import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_attendance_disposition_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_attendance_disposition.dart';
import 'package:catch_dating_app/event_success/presentation/event_attendance_disposition_editor.dart';
import 'package:catch_dating_app/event_success/presentation/event_attendance_disposition_provider.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_attendance_disposition_fixtures.dart';

void main() {
  late AttendanceTestRepository repository;
  late StreamController<String?> auth;
  late ProviderContainer container;
  late EventAttendanceDispositionReview review;
  late EventAttendanceDispositionEditor editor;
  late ProviderSubscription<AttendanceDispositionEditorState> subscription;
  final provider = eventAttendanceDispositionProvider(attendanceScope());
  const hostDecision = AttendanceDecision.record(
    AttendanceNoShowEvidence.hostConfirmed(),
  );

  Future<void> signIn(String? uid) async {
    final count = repository.reads.length + 1;
    auth.add(uid);
    await container.pump();
    if (uid != null) await repository.waitForReads(count);
    await container.pump();
  }

  EventAttendanceDispositionView view() => attendanceView(
    viewPatch: {
      'declineEvidence': {
        'kind': 'guestDeclined',
        'guestRevision': 1,
        'episodeId': 'episode:one',
      },
    },
  );

  setUp(() async {
    repository = AttendanceTestRepository();
    auth = StreamController<String?>.broadcast();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventAttendanceDispositionRepositoryProvider.overrideWith(
          (ref) => repository,
        ),
      ],
    );
    container.listen(provider, (_, _) {});
    await signIn('host-1');
    repository.reads.single.result.complete(view());
    await container.pump();
    review = container.read(provider).requireValue;
    final formProvider = eventAttendanceDispositionEditorProvider(review);
    subscription = container.listen(formProvider, (_, _) {});
    editor = container.read(formProvider.notifier);
  });
  tearDown(() async {
    container.dispose();
    await auth.close();
  });
  AttendanceDispositionEditorState state() =>
      container.read(eventAttendanceDispositionEditorProvider(review));
  AttendanceDispositionForm form() => state() as AttendanceDispositionForm;
  AttendanceDecision guestDecision() =>
      AttendanceDecision.record(review.view.declineEvidence!);

  test('starts without a default and rejects unsupported choices', () async {
    expect(form().decision, isNull);
    expect(form().canSubmit, isFalse);
    expect(form().canDismiss, isTrue);
    await expectLater(editor.submit(), throwsA(isA<ValidationException>()));
    expect(
      () => editor.select(
        const AttendanceDecision.clear(
          AttendanceClearReason.attendanceCorrected,
        ),
      ),
      throwsA(isA<ValidationException>()),
    );
    editor.select(hostDecision);
    expect(form().canSubmit, isTrue);
    editor.select(guestDecision());
    expect(
      (form().decision as AttendanceRecordNoShow).evidence,
      isA<AttendanceGuestDeclined>(),
    );
    expect(repository.writes, isEmpty);
  });

  test(
    'duplicate taps share a frozen action without optimistic attendance',
    () async {
      editor.select(hostDecision);
      final first = editor.submit();
      final second = editor.submit();
      expect(identical(first, second), isTrue);
      expect(repository.writes, hasLength(1));
      expect(form().phase, AttendanceDispositionEditorPhase.submitting);
      expect(form().canEdit, isFalse);
      expect(form().canDismiss, isFalse);
      expect(form().canReload, isFalse);
      expect(form().canSubmit, isFalse);
      editor.select(guestDecision());
      expect(form().decision, same(hostDecision));
      final write = repository.writes.single;
      expect(write.change.snapshot, same(review.view));
      expect(write.change.actorUid, 'host-1');
      expect(write.change.operationId, startsWith('attendance:'));
      expect(
        container.read(provider).requireValue.view.disposition,
        isA<AttendanceUnreviewed>(),
      );
      write.result.complete(attendanceResult(write.change));
      final result = await first;
      await second;
      await container.pump();
      await repository.waitForReads(2);
      expect(form().result, same(result));
      expect(form().phase, AttendanceDispositionEditorPhase.saved);
      expect(form().canSubmit, isFalse);
      expect(container.read(provider).hasValue, isFalse);
      expect(await editor.submit(), same(result));
      expect(repository.writes, hasLength(1));
    },
  );

  test('uncertainty allows only the identical command to retry', () async {
    final decision = guestDecision();
    editor.select(decision);
    final first = editor.submit();
    final failed = expectLater(first, throwsA(isA<NetworkException>()));
    repository.writes.single.result.completeError(
      const NetworkException('unavailable', 'Offline'),
    );
    await failed;
    final original = repository.writes.single.change;
    expect(form().phase, AttendanceDispositionEditorPhase.retryRequired);
    expect(form().canEdit, isFalse);
    expect(form().canSubmit, isTrue);
    expect(form().canReload, isTrue);
    editor.select(hostDecision);
    expect(form().decision, same(decision));
    final retry = editor.submit();
    final repeated = repository.writes.last;
    expect(repeated.change, same(original));
    expect(repeated.change.command, original.command);
    repeated.result.complete(attendanceResult(original, outcome: 'replayed'));
    expect((await retry).outcome, AttendanceDispositionOutcome.replayed);
    expect(form().phase, AttendanceDispositionEditorPhase.saved);
  });

  for (final code in [
    'aborted',
    'permission-denied',
    'failed-precondition',
    'invalid-argument',
    'not-found',
  ]) {
    test('$code requires new review instead of a changed retry', () async {
      editor.select(hostDecision);
      final pending = editor.submit();
      final failure = expectLater(
        pending,
        throwsA(isA<BackendOperationException>()),
      );
      repository.writes.single.result.completeError(
        BackendOperationException(
          code: code,
          message: 'Changed',
          context: const BackendErrorContext(
            service: BackendService.functions,
            action: 'record no-show',
          ),
        ),
      );
      await failure;
      expect(form().phase, AttendanceDispositionEditorPhase.refreshRequired);
      expect(form().canSubmit, isFalse);
      expect(form().canReload, isTrue);
      await expectLater(editor.submit(), throwsA(isA<ValidationException>()));
      expect(repository.writes, hasLength(1));
    });
  }

  test(
    'replay displays a later correction instead of the original no-show',
    () async {
      editor.select(hostDecision);
      final pending = editor.submit();
      final write = repository.writes.single;
      write.result.complete(
        attendanceResult(
          write.change,
          outcome: 'replayed',
          viewPatch: {
            'disposition': {
              'kind': 'cleared',
              'revision': 3,
              'reason': 'recordingMistake',
              'actorUid': 'host-2',
              'recordedAt': 2000,
            },
            'canClear': false,
          },
        ),
      );
      final result = await pending;
      expect(result.operationRevision, 1);
      expect(form().result!.view.disposition.revision, 3);
      expect(form().result!.view.disposition, isA<AttendanceDecisionCleared>());
    },
  );

  test('sign-out removes the form and the same UID cannot revive it', () async {
    editor.select(hostDecision);
    await signIn(null);
    expect(state(), isA<AttendanceDispositionFormUnavailable>());
    expect(state().canDismiss, isTrue);
    await signIn('host-1');
    expect(state(), isA<AttendanceDispositionFormUnavailable>());
    await expectLater(
      editor.submit(),
      throwsA(
        isA<BackendOperationException>().having(
          (e) => e.code,
          'code',
          'session-changed',
        ),
      ),
    );
    expect(repository.writes, isEmpty);
  });

  test(
    'account switches during submission cannot publish the old result',
    () async {
      editor.select(hostDecision);
      final pending = editor.submit();
      final write = repository.writes.single;
      final failure = expectLater(
        pending,
        throwsA(
          isA<BackendOperationException>().having(
            (e) => e.code,
            'code',
            'session-changed',
          ),
        ),
      );
      await signIn('host-2');
      expect(state(), isA<AttendanceDispositionFormUnavailable>());
      write.result.complete(attendanceResult(write.change));
      await failure;
      expect(state(), isA<AttendanceDispositionFormUnavailable>());
      expect(container.read(provider).hasValue, isFalse);
      repository.reads.last.result.complete(view());
      await container.pump();
      expect(container.read(provider).requireValue.account.uid, 'host-2');
    },
  );

  test('an auth error permanently revokes the old review', () async {
    editor.select(hostDecision);
    auth.addError(StateError('Authentication connection failed'));
    await container.pump();
    expect(state(), isA<AttendanceDispositionFormUnavailable>());
    await signIn('host-1');
    expect(state(), isA<AttendanceDispositionFormUnavailable>());
    await expectLater(
      editor.submit(),
      throwsA(isA<BackendOperationException>()),
    );
    expect(repository.writes, isEmpty);
  });

  test('a pending commit survives dismissal of its last observer', () async {
    editor.select(hostDecision);
    final pending = editor.submit();
    final write = repository.writes.single;
    subscription.close();
    await container.pump();
    write.result.complete(attendanceResult(write.change));
    expect((await pending).outcome, AttendanceDispositionOutcome.applied);
    await container.pump();
    await repository.waitForReads(2);
    expect(repository.writes, hasLength(1));
  });

  test('reloading creates a new review without inheriting the draft', () async {
    editor.select(hostDecision);
    container.read(provider.notifier).reload();
    await container.pump();
    await repository.waitForReads(2);
    repository.reads.last.result.complete(view());
    await container.pump();
    final nextReview = container.read(provider).requireValue;
    final next = eventAttendanceDispositionEditorProvider(nextReview);
    container.listen(next, (_, _) {});
    expect(
      (container.read(next) as AttendanceDispositionForm).decision,
      isNull,
    );
    expect(form().decision, same(hostDecision));
  });
}
