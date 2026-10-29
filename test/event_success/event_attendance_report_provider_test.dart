import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_attendance_disposition_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_attendance_report_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_attendance_disposition.dart';
import 'package:catch_dating_app/event_success/presentation/event_attendance_disposition_editor.dart';
import 'package:catch_dating_app/event_success/presentation/event_attendance_disposition_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_attendance_report_provider.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_attendance_disposition_fixtures.dart';
import 'event_attendance_report_fixtures.dart';

void main() {
  late AttendanceReportTestRepository repository;
  late AttendanceTestRepository decisions;
  late StreamController<String?> auth;
  late ProviderContainer container;
  final provider = eventAttendanceReportProvider(reportScope());
  const choice = AttendanceDecision.record(
    AttendanceNoShowEvidence.hostConfirmed(),
  );

  Future<void> signIn(String? uid) async {
    final expected = repository.reads.length + 1;
    auth.add(uid);
    await container.pump();
    if (uid != null) await repository.waitForReads(expected);
    await container.pump();
  }

  Future<EventAttendanceDispositionEditor> openEditor() async {
    final guest = eventAttendanceDispositionProvider(attendanceScope());
    container.listen(guest, (_, _) {});
    await decisions.waitForReads(1);
    decisions.reads.single.result.complete(attendanceView());
    await container.pump();
    final edit = eventAttendanceDispositionEditorProvider(
      container.read(guest).requireValue,
    );
    container.listen(edit, (_, _) {});
    return container.read(edit.notifier);
  }

  setUp(() {
    repository = AttendanceReportTestRepository();
    decisions = AttendanceTestRepository();
    auth = StreamController<String?>.broadcast();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventAttendanceReportRepositoryProvider.overrideWith(
          (ref) => repository,
        ),
        eventAttendanceDispositionRepositoryProvider.overrideWith(
          (ref) => decisions,
        ),
      ],
    );
    container.listen(provider, (_, _) {});
  });
  tearDown(() async {
    container.dispose();
    await auth.close();
  });

  test(
    'loading, reload, errors and sign-out never expose old totals',
    () async {
      expect(container.read(provider).isLoading, isTrue);
      expect(repository.reads, isEmpty);
      await signIn('host-1');
      repository.reads.single.result.complete(reportView());
      await container.pump();
      final first = container.read(provider).requireValue;
      expect(first.account.uid, 'host-1');
      container.read(provider.notifier).reload();
      await container.pump();
      await repository.waitForReads(2);
      expect(container.read(provider).isLoading, isTrue);
      expect(container.read(provider).hasValue, isFalse);
      const failure = NetworkException('unavailable', 'Offline');
      repository.reads.last.result.completeError(failure);
      await container.pump();
      expect(container.read(provider).error, same(failure));
      expect(container.read(provider).hasValue, isFalse);
      await container.pump();
      expect(repository.reads, hasLength(2));
      container.read(provider.notifier).reload();
      await repository.waitForReads(3);
      repository.reads.last.result.complete(reportView());
      await container.pump();
      expect(
        container.read(provider).requireValue.account,
        same(first.account),
      );
      await signIn(null);
      expect(container.read(provider).hasValue, isFalse);
      expect(container.read(provider).error, isA<SignInRequiredException>());
    },
  );

  test(
    'late reads cannot cross accounts or restore an earlier login period',
    () async {
      await signIn('host-1');
      final first = repository.reads.single;
      await signIn('host-2');
      repository.reads.last.result.complete(
        reportView(viewPatch: {'sourceHash': 'b' * 64}),
      );
      await container.pump();
      final second = container.read(provider).requireValue;
      first.result.complete(reportView());
      await container.pump();
      expect(container.read(provider).requireValue, same(second));
      await signIn(null);
      await signIn('host-2');
      expect(container.read(provider).hasValue, isFalse);
      repository.reads.last.result.complete(reportView());
      await container.pump();
      expect(container.read(provider).requireValue.account.uid, 'host-2');
      expect(
        container.read(provider).requireValue.account,
        isNot(same(second.account)),
      );
      final revoked = eventAttendanceReportForAccountProvider(
        reportScope(),
        account: second.account,
      );
      container.listen(revoked, (_, _) {});
      await container.pump();
      expect(container.read(revoked).hasValue, isFalse);
      expect(container.read(revoked).error, isA<BackendOperationException>());
      expect(repository.reads, hasLength(3));
    },
  );

  test(
    'auth failure hides the report and same-UID recovery requires a fresh read',
    () async {
      await signIn('host-1');
      repository.reads.single.result.complete(reportView());
      await container.pump();
      final account = container.read(provider).requireValue.account;
      auth.addError(StateError('Authentication failed'));
      await container.pump();
      expect(container.read(provider).hasValue, isFalse);
      expect(container.read(provider).hasError, isTrue);
      await signIn('host-1');
      expect(container.read(provider).hasValue, isFalse);
      repository.reads.last.result.complete(reportView());
      await container.pump();
      expect(
        container.read(provider).requireValue.account,
        isNot(same(account)),
      );
    },
  );

  test('reload is isolated to the exact event', () async {
    await signIn('host-1');
    repository.reads.single.result.complete(reportView());
    final scope = reportScope(eventId: 'event-2');
    final other = eventAttendanceReportProvider(scope);
    container.listen(other, (_, _) {});
    await repository.waitForReads(2);
    repository.reads.last.result.complete(reportView(scope: scope));
    await container.pump();
    final second = container.read(other).requireValue;
    container.read(provider.notifier).reload();
    await repository.waitForReads(3);
    expect(repository.reads.last.scope, reportScope());
    expect(container.read(other).requireValue, same(second));
    expect(container.read(provider).hasValue, isFalse);
  });

  test(
    'only a confirmed decision refreshes its event report, with no optimistic totals',
    () async {
      await signIn('host-1');
      repository.reads.single.result.complete(reportView());
      await container.pump();
      final before = container.read(provider).requireValue;
      final editor = await openEditor();
      editor.select(choice);
      final pending = editor.submit();
      expect(container.read(provider).requireValue, same(before));
      final error = expectLater(pending, throwsA(isA<NetworkException>()));
      decisions.writes.single.result.completeError(
        const NetworkException('unavailable', 'Offline'),
      );
      await error;
      expect(repository.reads, hasLength(1));
      final retry = editor.submit();
      final write = decisions.writes.last;
      write.result.complete(
        attendanceResult(write.change, outcome: 'replayed'),
      );
      await retry;
      await repository.waitForReads(2);
      expect(repository.reads.last.scope, reportScope());
      expect(container.read(provider).hasValue, isFalse);
      repository.reads.last.result.complete(
        reportView(
          viewPatch: {
            'sourceHash': 'b' * 64,
            'counts': reportCounts(unreviewed: 0, recorded: 1),
            'members': [
              reportMember(
                classification: {
                  'kind': 'recordedNoShow',
                  'evidence': 'hostConfirmed',
                },
              ),
            ],
          },
        ),
      );
      await container.pump();
      expect(
        container.read(provider).requireValue.view.counts.recordedNoShowTotal,
        1,
      );
      expect(
        container.read(provider).requireValue.view.counts.unresolvedTotal,
        0,
      );
    },
  );

  test(
    'a late old-account commit cannot refresh the new account report',
    () async {
      await signIn('host-1');
      repository.reads.single.result.complete(reportView());
      final editor = await openEditor();
      editor.select(choice);
      final pending = editor.submit();
      final result = expectLater(
        pending,
        throwsA(isA<BackendOperationException>()),
      );
      final write = decisions.writes.single;
      await signIn('host-2');
      repository.reads.last.result.complete(reportView());
      await container.pump();
      final current = container.read(provider).requireValue;
      write.result.complete(attendanceResult(write.change));
      await result;
      await container.pump();
      expect(repository.reads, hasLength(2));
      expect(container.read(provider).requireValue, same(current));
      expect(current.account.uid, 'host-2');
    },
  );
}
