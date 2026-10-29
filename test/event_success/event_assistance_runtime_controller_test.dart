import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_runtime_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_result.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_setting.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_editor.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_provider.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_runtime_fixtures.dart';

void main() {
  late _Repository repository;
  late StreamController<String?> auth;
  late ProviderContainer container;
  final provider = eventAssistanceRuntimeProvider(runtimeScope());
  late ProviderSubscription<AsyncValue<AssistanceRuntimeSession>>
  pageSubscription;
  setUp(() {
    repository = _Repository();
    auth = StreamController<String?>.broadcast();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventAssistanceRuntimeRepositoryProvider.overrideWith(
          (ref) => repository,
        ),
      ],
    );
    pageSubscription = container.listen(provider, (_, _) {});
  });
  tearDown(() async {
    container.dispose();
    await auth.close();
  });
  Future<void> signIn(String? uid) async {
    final expected = repository.reads.length + 1;
    auth.add(uid);
    await container.pump();
    if (uid != null) await repository.waitForReads(expected);
    await container.pump();
  }

  Future<void> complete(int index) async {
    final read = repository.reads[index];
    read.result.complete(runtimeView(eventId: read.scope.eventId));
    await container.pump();
  }

  Future<AssistanceRuntimeSession> session() async {
    await signIn('host-1');
    await complete(0);
    return container.read(provider).requireValue;
  }

  AssistanceRuntimeResult confirmation(int index) {
    final change = repository.writes[index].change;
    return AssistanceRuntimeResult.fromCallableData(
      runtimeResponse(
        outcome: 'applied',
        operationRevision: 1,
        revision: 1,
        runtime: runtimeRecord(
          paused: change.command is AssistanceRuntimePause,
          configuration: change.command is AssistanceRuntimeConfigure
              ? (change.command as AssistanceRuntimeConfigure).configuration
                    .toJson()
              : change.snapshot.runtime?.configuration?.toJson(),
        ),
        status: change.command is AssistanceRuntimePause
            ? 'paused'
            : 'configured',
      ),
      expectedScope: change.snapshot.scope,
      expectedChange: change,
    );
  }

  test(
    'loading, sign-out and authentication failures remove private state',
    () async {
      expect(container.read(provider).isLoading, isTrue);
      expect(repository.reads, isEmpty);
      await session();
      await signIn(null);
      expect(container.read(provider).hasValue, isFalse);
      expect(container.read(provider).error, isA<SignInRequiredException>());
      container.read(provider.notifier).reload();
      await container.pump();
      expect(repository.reads, hasLength(1));
      auth.addError(StateError('auth unavailable'));
      await container.pump();
      expect(container.read(provider).hasValue, isFalse);
    },
  );

  test(
    'delayed old-account reads and same-UID re-entry cannot restore a prior review',
    () async {
      await signIn('host-1');
      await signIn('host-2');
      await complete(0);
      expect(container.read(provider).hasValue, isFalse);
      await complete(1);
      final old = container.read(provider).requireValue;
      await signIn(null);
      await signIn('host-2');
      expect(container.read(provider).hasValue, isFalse);
      await complete(2);
      expect(
        identical(old.account, container.read(provider).requireValue.account),
        isFalse,
      );
    },
  );

  test(
    'event reads are isolated and explicit refresh fences older completion',
    () async {
      await signIn('host-1');
      container.listen(
        eventAssistanceRuntimeProvider(runtimeScope(eventId: 'event-2')),
        (_, _) {},
      );
      await container.pump();
      await repository.waitForReads(2);
      expect(repository.reads, hasLength(2));
      container.read(provider.notifier).reload();
      await container.pump();
      await repository.waitForReads(3);
      expect(repository.reads, hasLength(3));
      await complete(2);
      final current = container.read(provider).requireValue;
      await complete(0);
      expect(container.read(provider).requireValue, same(current));
      await complete(1);
    },
  );

  test(
    'configuration requires an explicit choice; duplicate saves share one frozen request',
    () async {
      final review = await session();
      final editor = eventAssistanceRuntimeEditorProvider(review.view.scope);
      container.listen(editor, (_, _) {});
      final notifier = container.read(editor.notifier);
      notifier.open(review);
      expect(
        (container.read(editor) as AssistanceRuntimeForm).decision,
        isNull,
      );
      await expectLater(notifier.submit(), throwsA(isA<ValidationException>()));
      expect(repository.writes, isEmpty);
      notifier.select(AssistanceRuntimeConfigure(runtimeConfig()));
      final first = notifier.submit();
      final duplicate = notifier.submit();
      expect(identical(first, duplicate), isTrue);
      notifier.select(const AssistanceRuntimePause());
      expect(repository.writes, hasLength(1));
      expect(
        repository.writes.single.change.command,
        isA<AssistanceRuntimeConfigure>(),
      );
      final receipt = confirmation(0);
      repository.writes[0].result.complete(receipt);
      expect(await first, same(receipt));
      await container.pump();
      expect(
        (container.read(editor) as AssistanceRuntimeForm).phase,
        AssistanceRuntimeEditorPhase.saved,
      );
      expect(await notifier.submit(), same(receipt));
      expect(repository.writes, hasLength(1));
      await repository.waitForReads(2);
      expect(repository.reads, hasLength(2));
      expect(container.read(provider).hasValue, isFalse);
    },
  );

  test(
    'uncertain saves retain the request and reject edits until exact retry',
    () async {
      final review = await session();
      final editor = eventAssistanceRuntimeEditorProvider(review.view.scope);
      container.listen(editor, (_, _) {});
      final notifier = container.read(editor.notifier);
      notifier.open(review);
      notifier.select(const AssistanceRuntimePause());
      final first = notifier.submit();
      final failed = expectLater(first, throwsA(isA<StateError>()));
      repository.writes[0].result.completeError(StateError('unknown result'));
      await failed;
      expect(
        (container.read(editor) as AssistanceRuntimeForm).phase,
        AssistanceRuntimeEditorPhase.retryRequired,
      );
      notifier.select(AssistanceRuntimeConfigure(runtimeConfig()));
      final retry = notifier.retry();
      expect(repository.writes[1].change, same(repository.writes[0].change));
      repository.writes[1].result.complete(confirmation(1));
      await retry;
    },
  );

  test('a conflict requires new review, never a rebased retry', () async {
    final review = await session();
    final editor = eventAssistanceRuntimeEditorProvider(review.view.scope);
    container.listen(editor, (_, _) {});
    final notifier = container.read(editor.notifier);
    notifier.open(review);
    notifier.select(const AssistanceRuntimePause());
    final pending = notifier.submit();
    final failed = expectLater(
      pending,
      throwsA(isA<BackendOperationException>()),
    );
    repository.writes.single.result.completeError(
      const BackendOperationException(
        code: 'aborted',
        message: 'Changed',
        context: BackendErrorContext(
          service: BackendService.functions,
          action: 'save event automation',
          resource: 'eventAssistanceRuntimeConfigs',
        ),
      ),
    );
    await failed;
    expect(
      (container.read(editor) as AssistanceRuntimeForm).phase,
      AssistanceRuntimeEditorPhase.refreshRequired,
    );
    await expectLater(notifier.submit(), throwsA(isA<ValidationException>()));
    expect(repository.writes, hasLength(1));
  });

  test(
    'an account change revokes the old review even when its save completes',
    () async {
      final review = await session();
      final editor = eventAssistanceRuntimeEditorProvider(review.view.scope);
      container.listen(editor, (_, _) {});
      final notifier = container.read(editor.notifier);
      notifier.open(review);
      notifier.select(const AssistanceRuntimePause());
      final pending = notifier.submit();
      final failed = expectLater(
        pending,
        throwsA(isA<BackendOperationException>()),
      );
      await signIn(null);
      await signIn('host-1');
      expect(container.read(editor), isA<AssistanceRuntimeIdle>());
      repository.writes.single.result.complete(confirmation(0));
      await failed;
      await complete(1);
      expect(container.read(editor), isA<AssistanceRuntimeIdle>());
      await expectLater(
        notifier.submit(),
        throwsA(isA<BackendOperationException>()),
      );
      expect(repository.writes, hasLength(1));
    },
  );
  test(
    'a retired settings page cannot authorize a new choice or save',
    () async {
      final review = await session();
      final editor = eventAssistanceRuntimeEditorProvider(review.view.scope);
      final sub = container.listen(editor, (_, _) {});
      addTearDown(sub.close);
      final notifier = container.read(editor.notifier)..open(review);
      notifier.select(const AssistanceRuntimePause());
      container.read(provider.notifier).reload();
      await container.pump();
      expect(review.isCurrent, isFalse);
      expect(
        (container.read(editor) as AssistanceRuntimeForm).canSubmit,
        isFalse,
      );
      await expectLater(notifier.submit(), throwsA(isA<ValidationException>()));
      expect(() => notifier.open(review), throwsA(isA<ValidationException>()));
      expect(repository.writes, isEmpty);
    },
  );

  test(
    'a hidden pending save survives page replacement and confirms the same command',
    () async {
      final review = await session();
      final editor = eventAssistanceRuntimeEditorProvider(review.view.scope);
      var sub = container.listen(editor, (_, _) {});
      final notifier = container.read(editor.notifier)..open(review);
      notifier.select(const AssistanceRuntimePause());
      final first = notifier.submit();
      final failure = expectLater(first, throwsA(isA<NetworkException>()));
      final original = repository.writes.single.change;
      sub.close();
      await container.pump();
      repository.writes.single.result.completeError(
        const NetworkException('unavailable', 'Lost reply'),
      );
      await failure;
      container.read(provider.notifier).reload();
      await container.pump();
      await repository.waitForReads(2);
      await complete(1);
      sub = container.listen(editor, (_, _) {});
      notifier.open(container.read(provider).requireValue);
      notifier.reload();
      expect(
        (container.read(editor) as AssistanceRuntimeForm).change,
        same(original),
      );
      expect(
        (container.read(editor) as AssistanceRuntimeForm).canReload,
        isFalse,
      );
      await expectLater(notifier.submit(), throwsA(isA<ValidationException>()));
      final retry = notifier.retry();
      expect(notifier.retry(), same(retry));
      expect(repository.writes.last.change, same(original));
      repository.writes.last.result.complete(confirmation(1));
      await retry;
      sub.close();
    },
  );

  for (final transition in ['signOut', 'sameUidReturn', 'authError']) {
    test('a detached uncertain setting cannot survive $transition', () async {
      final review = await session();
      final editor = eventAssistanceRuntimeEditorProvider(review.view.scope);
      var sub = container.listen(editor, (_, _) {});
      final notifier = container.read(editor.notifier)..open(review);
      notifier.select(const AssistanceRuntimePause());
      final first = notifier.submit();
      final failure = expectLater(first, throwsA(isA<NetworkException>()));
      repository.writes.single.result.completeError(
        const NetworkException('unavailable', 'Lost reply'),
      );
      await failure;
      sub.close();
      pageSubscription.close();
      await container.pump();
      if (transition == 'authError') {
        auth.addError(StateError('Auth unavailable'));
      } else {
        auth.add(null);
      }
      await container.pump();
      if (transition == 'sameUidReturn') {
        auth.add('host-1');
        await container.pump();
      }
      sub = container.listen(editor, (_, _) {});
      expect(container.read(editor), isNot(isA<AssistanceRuntimeForm>()));
      expect(
        () => container.read(editor.notifier).open(review),
        throwsA(isA<BackendOperationException>()),
      );
      await expectLater(
        container.read(editor.notifier).retry(),
        throwsA(isA<BackendOperationException>()),
      );
      expect(repository.writes, hasLength(1));
      sub.close();
    });
  }

  test(
    'a response from another event remains uncertain at the state owner',
    () async {
      final review = await session();
      final editor = eventAssistanceRuntimeEditorProvider(review.view.scope);
      final sub = container.listen(editor, (_, _) {});
      addTearDown(sub.close);
      final notifier = container.read(editor.notifier)..open(review);
      notifier.select(const AssistanceRuntimePause());
      final first = notifier.submit();
      final failure = expectLater(first, throwsFormatException);
      final other = runtimeView(eventId: 'event-2').prepareChange(
        requestId: 'other',
        command: const AssistanceRuntimePause(),
      );
      repository.writes.single.result.complete(
        AssistanceRuntimeResult.fromCallableData(
          runtimeResponse(
            outcome: 'applied',
            operationRevision: 1,
            revision: 1,
            eventId: 'event-2',
            status: 'paused',
            runtime: runtimeRecord(eventId: 'event-2', paused: true),
          ),
          expectedScope: other.snapshot.scope,
          expectedChange: other,
        ),
      );
      await failure;
      expect(
        (container.read(editor) as AssistanceRuntimeForm).canRetry,
        isTrue,
      );
      final retry = notifier.retry();
      repository.writes.last.result.complete(confirmation(1));
      await retry;
    },
  );
  test(
    'a receipt naming another manager cannot acknowledge this host',
    () async {
      final review = await session();
      final editor = eventAssistanceRuntimeEditorProvider(review.view.scope);
      final sub = container.listen(editor, (_, _) {});
      addTearDown(sub.close);
      final notifier = container.read(editor.notifier)..open(review);
      notifier.select(const AssistanceRuntimePause());
      final first = notifier.submit();
      final failure = expectLater(first, throwsFormatException);
      final change = repository.writes.single.change;
      repository.writes.single.result.complete(
        AssistanceRuntimeResult.fromCallableData(
          runtimeResponse(
            outcome: 'applied',
            operationRevision: 1,
            revision: 1,
            status: 'paused',
            runtime: {...runtimeRecord(paused: true), 'updatedBy': 'host-2'},
          ),
          expectedScope: change.snapshot.scope,
          expectedChange: change,
        ),
      );
      await failure;
      expect(
        (container.read(editor) as AssistanceRuntimeForm).canRetry,
        isTrue,
      );
    },
  );

  test('retry from the visible error starts a new active future', () async {
    final review = await session();
    final editor = eventAssistanceRuntimeEditorProvider(review.view.scope);
    Future<AssistanceRuntimeResult>? retry;
    final sub = container.listen(editor, (_, next) {
      if (next is AssistanceRuntimeForm && next.canRetry && retry == null) {
        retry = container.read(editor.notifier).retry();
      }
    });
    addTearDown(sub.close);
    final notifier = container.read(editor.notifier)..open(review);
    notifier.select(const AssistanceRuntimePause());
    final first = notifier.submit();
    final failure = expectLater(first, throwsA(isA<NetworkException>()));
    repository.writes.first.result.completeError(
      const NetworkException('unavailable', 'Lost reply'),
    );
    await failure;
    expect(repository.writes, hasLength(2));
    expect(retry, isNot(same(first)));
    expect(repository.writes.last.change, same(repository.writes.first.change));
    repository.writes.last.result.complete(confirmation(1));
    await retry;
  });
}

class _Repository extends Fake implements EventAssistanceRuntimeRepository {
  Completer<void> _changed = Completer<void>();
  Future<void> waitForReads(int count) async {
    while (reads.length < count) {
      await _changed.future.timeout(const Duration(seconds: 10));
    }
  }

  final reads =
      <
        ({
          EventAssistanceRuntimeScope scope,
          Completer<AssistanceRuntimeView> result,
        })
      >[];
  final writes =
      <
        ({
          AssistanceRuntimeChange change,
          Completer<AssistanceRuntimeResult> result,
        })
      >[];
  @override
  Future<AssistanceRuntimeView> fetch(EventAssistanceRuntimeScope scope) {
    final result = Completer<AssistanceRuntimeView>();
    reads.add((scope: scope, result: result));
    final previous = _changed;
    _changed = Completer<void>();
    previous.complete();
    return result.future;
  }

  @override
  Future<AssistanceRuntimeResult> apply(AssistanceRuntimeChange change) {
    final result = Completer<AssistanceRuntimeResult>();
    writes.add((change: change, result: result));
    return result.future;
  }
}
