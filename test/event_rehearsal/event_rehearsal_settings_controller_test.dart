import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_settings_change.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_settings_controller.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const sessionId = 'practice-room';
Map<String, Object?> sample(String name) =>
    (jsonDecode(
              File(
                'test/event_rehearsal/fixtures/settings_reviews.json',
              ).readAsStringSync(),
            )
            as Map)[name]
        as Map<String, Object?>;
EventRehearsalBootstrap snapshot(String name) =>
    EventRehearsalBootstrap.fromCallableData(sample(name));

void main() {
  late _Repository repository;
  late StreamController<String?> auth;
  late ProviderContainer container;
  final query = eventRehearsalAssistanceProvider(sessionId);
  final owner = eventRehearsalSettingsControllerProvider(sessionId);
  setUp(() {
    repository = _Repository();
    auth = StreamController<String?>.broadcast();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventRehearsalRepositoryProvider.overrideWith((ref) => repository),
      ],
    );
    container.listen(query, (_, _) {});
  });
  tearDown(() async {
    container.dispose();
    await auth.close();
  });
  Future<RehearsalAssistanceReview> review() async {
    auth.add('host-1');
    await container.pump();
    await repository.waitForReads(1);
    repository.reads.single.complete(snapshot('initial'));
    await container.pump();
    return container.read(query).requireValue;
  }

  EventRehearsalSettingsController edit(RehearsalAssistanceReview review) =>
      container.read(owner.notifier)..open(review);
  void select(EventRehearsalSettingsController editor) => editor.select(
    RehearsalConfigureUpdates(
      snapshot('configured').settingsReview!.runtime!.configuration,
    ),
  );
  RehearsalSettingsForm form() =>
      container.read(owner) as RehearsalSettingsForm;
  EventRehearsalBootstrap result(RehearsalSettingsChange change) {
    final raw = sample('configured');
    raw['actions'] = [
      {
        'clientActionId': change.clientActionId,
        'actorId': null,
        'kind': 'control',
        'name': 'settings:configure',
        'runtimeRevision': change.snapshot.session.runtimeRevision + 1,
        'virtualNowMillis':
            change.snapshot.session.virtualNow.millisecondsSinceEpoch,
      },
    ];
    return EventRehearsalBootstrap.fromCallableData(raw);
  }

  Future<void> fail(Future<EventRehearsalBootstrap> pending, int index) async {
    final expected = expectLater(pending, throwsA(isA<NetworkException>()));
    repository.writes[index].result.completeError(
      const NetworkException('unavailable', 'Offline'),
    );
    await expected;
  }

  test(
    'double taps share one decision and success verifies its exact receipt',
    () async {
      final r = await review();
      container.listen(owner, (_, _) {});
      final editor = edit(r);
      select(editor);
      final pending = editor.submit();
      expect(editor.submit(), same(pending));
      expect(form().canDismiss, isFalse);
      repository.writes.single.result.complete(
        result(repository.writes.single.change),
      );
      await pending;
      expect(form().phase, RehearsalSettingsPhase.saved);
      expect(await editor.submit(), same(form().result));
      expect(repository.writes, hasLength(1));
    },
  );
  test(
    'unknown save survives dismissal and cannot be replaced by another group',
    () async {
      final r = await review();
      final listener = container.listen(owner, (_, _) {});
      final editor = edit(r);
      select(editor);
      await fail(editor.submit(), 0);
      final frozen = form().change!;
      editor.close();
      listener.close();
      await container.pump();
      container.read(query.notifier).reload();
      await container.pump();
      await repository.waitForReads(2);
      repository.reads.last.complete(snapshot('configured'));
      await container.pump();
      container.listen(owner, (_, _) {});
      editor.open(container.read(query).requireValue, groupId: 'easy');
      editor.select(const RehearsalSetRule('easy', LateJoinDisabled()));
      editor.reload();
      expect(form().groupId, isNull);
      expect(form().change, same(frozen));
      final retry = editor.retry();
      expect(repository.writes.last.change, same(frozen));
      repository.writes.last.result.complete(result(frozen));
      await retry;
      expect(form().phase, RehearsalSettingsPhase.saved);
    },
  );
  test(
    'malformed success retains the original request for reconciliation',
    () async {
      final r = await review();
      container.listen(owner, (_, _) {});
      final editor = edit(r);
      select(editor);
      final pending = editor.submit();
      final expected = expectLater(pending, throwsFormatException);
      repository.writes.single.result.complete(snapshot('configured'));
      await expected;
      expect(form().phase, RehearsalSettingsPhase.retryRequired);
      final frozen = form().change!;
      final retry = editor.retry();
      expect(repository.writes.last.change, same(frozen));
      repository.writes.last.result.complete(result(frozen));
      await retry;
    },
  );
  test(
    'changed review retires editable choices and cannot retarget a rule',
    () async {
      final r = await review();
      container.listen(owner, (_, _) {});
      final editor = edit(r);
      select(editor);
      editor.select(const RehearsalSetRule('easy', LateJoinDisabled()));
      expect(form().canSubmit, isFalse);
      expect(form().error, isNotNull);
      select(editor);
      container.read(query.notifier).reload();
      await container.pump();
      expect(form().phase, RehearsalSettingsPhase.refreshRequired);
      expect(form().canSubmit, isFalse);
      expect(repository.writes, isEmpty);
    },
  );
  test(
    'a detached pending owner observes same-UID sign-out and rejects old callbacks',
    () async {
      final r = await review();
      final listener = container.listen(owner, (_, _) {});
      final editor = edit(r);
      select(editor);
      await fail(editor.submit(), 0);
      listener.close();
      await container.pump();
      auth.add(null);
      await container.pump();
      auth.add('host-1');
      await container.pump();
      final expected = expectLater(
        editor.retry(),
        throwsA(isA<AppException>()),
      );
      await expected;
      expect(repository.writes, hasLength(1));
      expect(container.read(owner), isNot(isA<RehearsalSettingsForm>()));
    },
  );
  test('the error callback can immediately start the exact retry', () async {
    final r = await review();
    container.listen(owner, (_, _) {});
    final editor = edit(r);
    select(editor);
    Future<EventRehearsalBootstrap>? retry;
    var retried = false;
    container.listen(owner, (_, next) {
      if (next is RehearsalSettingsForm && next.canRetry && !retried) {
        retried = true;
        retry = editor.retry();
      }
    });
    await fail(editor.submit(), 0);
    expect(retry, isNotNull);
    expect(repository.writes, hasLength(2));
    expect(repository.writes.last.change, same(repository.writes.first.change));
    repository.writes.last.result.complete(
      result(repository.writes.last.change),
    );
    await retry;
  });
}

class _Repository extends Fake implements EventRehearsalRepository {
  Completer<void> _changed = Completer<void>();
  Future<void> waitForReads(int count) async {
    while (reads.length < count) {
      await _changed.future.timeout(const Duration(seconds: 10));
    }
  }

  final reads = <Completer<EventRehearsalBootstrap>>[];
  final writes =
      <
        ({
          RehearsalSettingsChange change,
          Completer<EventRehearsalBootstrap> result,
        })
      >[];
  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) {
    final result = Completer<EventRehearsalBootstrap>();
    reads.add(result);
    _changed.complete();
    _changed = Completer<void>();
    return result.future;
  }

  @override
  Future<EventRehearsalBootstrap> applySettings(
    RehearsalSettingsChange change,
  ) {
    final result = Completer<EventRehearsalBootstrap>();
    writes.add((change: change, result: result));
    return result.future;
  }
}
