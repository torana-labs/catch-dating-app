import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_cases_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_case_editor.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_cases_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_pending_cases.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_cases_fixtures.dart';
import 'event_assistance_cases_test_repository.dart';

void main() {
  late CasesTestRepository repository;
  late StreamController<String?> auth;
  late ProviderContainer container;
  late EventAssistanceCaseReview review;
  late EventAssistanceCaseEditor editor;
  late ProviderSubscription<AssistanceCaseEditorState> subscription;
  final queue = eventAssistanceCasesProvider(caseQuery());
  final owner = eventAssistanceCaseEditorProvider(
    caseQuery().scopeFor('case:one'),
  );

  Future<EventAssistanceCaseReview> finishRead() async {
    repository.reads.last.result.complete(casesPage());
    await container.pump();
    final session = container.read(queue).requireValue;
    return session.review(session.page.cases.single as AssistanceOpenHostCase);
  }

  setUp(() async {
    repository = CasesTestRepository();
    auth = StreamController<String?>.broadcast();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventAssistanceCasesRepositoryProvider.overrideWith(
          (ref) => repository,
        ),
      ],
    );
    container.listen(queue, (_, _) {});
    auth.add('host-1');
    await container.pump();
    await repository.waitForReads(1);
    review = await finishRead();
    subscription = container.listen(owner, (_, _) {});
    editor = container.read(owner.notifier)..open(review);
  });
  tearDown(() async {
    container.dispose();
    await auth.close();
  });
  AssistanceCaseForm form() => container.read(owner) as AssistanceCaseForm;
  Future<void> fail() async {
    editor.select(const AssistanceCaseDecision.resolve());
    final result = editor.submit();
    final failure = expectLater(result, throwsA(isA<NetworkException>()));
    repository.writes.last.result.completeError(
      const NetworkException('unavailable', 'Offline'),
    );
    await failure;
  }

  test(
    'closure and refreshed pages retain the same unresolved case decision',
    () async {
      await fail();
      final change = repository.writes.single.change;
      subscription.close();
      await container.pump();
      expect(container.exists(owner), isTrue);
      expect(container.read(eventAssistancePendingCasesProvider), {
        review.request.scope,
      });
      container.read(queue.notifier).reload();
      await container.pump();
      await repository.waitForReads(2);
      final next = await finishRead();
      expect(review.isCurrent, isFalse);
      container.listen(owner, (_, _) {});
      expect(container.read(owner.notifier), same(editor));
      editor.open(next);
      editor.select(const AssistanceCaseDecision.decline());
      editor.reload();
      expect(form().change, same(change));
      expect(form().canReload, isFalse);
      final retry = editor.retry();
      expect(repository.writes.last.change, same(change));
      repository.writes.last.result.complete(
        caseResult(change, outcome: 'replayed'),
      );
      await retry;
      expect(form().phase, AssistanceCaseEditorPhase.saved);
      expect(container.read(eventAssistancePendingCasesProvider), isEmpty);
    },
  );
  test('pending discovery survives an empty open queue', () async {
    await fail();
    subscription.close();
    container.read(queue.notifier).reload();
    await container.pump();
    await repository.waitForReads(2);
    repository.reads.last.result.complete(casesPage(rows: []));
    await container.pump();
    expect(container.read(queue).requireValue.page.cases, isEmpty);
    final scopes = container.read(eventAssistancePendingCasesProvider);
    expect(scopes, {review.request.scope});
    final recovered = eventAssistanceCaseEditorProvider(scopes.single);
    container.listen(recovered, (_, _) {});
    final retry = container.read(recovered.notifier).retry();
    final change = repository.writes.first.change;
    expect(repository.writes.last.change, same(change));
    repository.writes.last.result.complete(
      caseResult(change, outcome: 'replayed'),
    );
    await retry;
    expect(container.read(eventAssistancePendingCasesProvider), isEmpty);
  });
  test('settling one case preserves discovery and retry for another', () async {
    container.read(queue.notifier).reload();
    await container.pump();
    await repository.waitForReads(2);
    repository.reads.last.result.complete(
      casesPage(
        rows: [
          caseRow(),
          caseRow(caseId: 'case:two'),
        ],
      ),
    );
    await container.pump();
    final session = container.read(queue).requireValue;
    editor.open(
      session.review(session.page.cases.first as AssistanceOpenHostCase),
    );
    final otherReview = session.review(
      session.page.cases.last as AssistanceOpenHostCase,
    );
    final otherOwner = eventAssistanceCaseEditorProvider(
      otherReview.request.scope,
    );
    container.listen(otherOwner, (_, _) {});
    final other = container.read(otherOwner.notifier)..open(otherReview);
    editor.select(const AssistanceCaseDecision.resolve());
    other.select(const AssistanceCaseDecision.decline());
    final first = editor.submit();
    final second = other.submit();
    expect(container.read(eventAssistancePendingCasesProvider), {
      review.request.scope,
      otherReview.request.scope,
    });
    final failure = expectLater(second, throwsA(isA<NetworkException>()));
    repository.writes.last.result.completeError(
      const NetworkException('unavailable', 'Offline'),
    );
    await failure;
    repository.writes.first.result.complete(
      caseResult(repository.writes.first.change),
    );
    await first;
    expect(container.read(eventAssistancePendingCasesProvider), {
      otherReview.request.scope,
    });
    final retry = other.retry();
    expect(repository.writes.last.change, same(repository.writes[1].change));
    repository.writes.last.result.complete(
      caseResult(repository.writes[1].change),
    );
    await retry;
    expect(container.read(eventAssistancePendingCasesProvider), isEmpty);
  });
  test('an unsubmitted draft cannot act after its page is retired', () async {
    editor.select(const AssistanceCaseDecision.resolve());
    container.read(queue.notifier).reload();
    await container.pump();
    expect(review.isCurrent, isFalse);
    expect(form().canSubmit, isFalse);
    await expectLater(editor.submit(), throwsA(isA<ValidationException>()));
    expect(() => editor.open(review), throwsA(isA<ValidationException>()));
    expect(repository.writes, isEmpty);
  });
  test('reentrant retry publishes exactly one new operation attempt', () async {
    Future<EventAssistanceCaseResult>? retry;
    container.listen(owner, (_, state) {
      if (state is AssistanceCaseForm && state.canRetry) retry = editor.retry();
    });
    await fail();
    expect(repository.writes, hasLength(2));
    expect(editor.retry(), same(retry));
    expect(repository.writes.first.change, same(repository.writes.last.change));
    repository.writes.last.result.complete(
      caseResult(repository.writes.first.change),
    );
    await retry;
  });
  for (final mode in ['signOut', 'switchBack', 'authError']) {
    test('a detached uncertain request loses authority after $mode', () async {
      await fail();
      subscription.close();
      await container.pump();
      if (mode == 'authError') {
        auth.addError(StateError('Auth unavailable'));
      } else {
        auth.add(mode == 'signOut' ? null : 'host-2');
      }
      await container.pump();
      auth.add('host-1');
      await container.pump();
      container.listen(owner, (_, _) {});
      expect(container.read(owner), isNot(isA<AssistanceCaseForm>()));
      await expectLater(
        editor.retry(),
        throwsA(isA<BackendOperationException>()),
      );
      expect(
        () => editor.open(review),
        throwsA(isA<BackendOperationException>()),
      );
      expect(repository.writes, hasLength(1));
      expect(container.read(eventAssistancePendingCasesProvider), isEmpty);
    });
  }
  test(
    'a foreign typed result stays uncertain instead of confirming this case',
    () async {
      editor.select(const AssistanceCaseDecision.resolve());
      final pending = editor.submit();
      final invalid = expectLater(pending, throwsFormatException);
      final other = EventAssistanceCaseChange(
        snapshot:
            casesPage(rows: [caseRow(caseId: 'case:other')]).cases.single
                as AssistanceOpenHostCase,
        actorUid: 'host-1',
        operationId: 'other',
        decision: const AssistanceCaseDecision.resolve(),
      );
      repository.writes.single.result.complete(caseResult(other));
      await invalid;
      expect(form().canRetry, isTrue);
      expect(form().change, same(repository.writes.single.change));
    },
  );
}
