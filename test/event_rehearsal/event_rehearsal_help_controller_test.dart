import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_help_requests.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_help_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_pending_help.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_help_queue_fixtures.dart';

void main() {
  late _Repository repository;
  late StreamController<String?> auth;
  late ProviderContainer container;
  late RehearsalAssistanceReview review;
  late RehearsalOpenHelpCase request;
  late RehearsalHelpScope scope;
  late EventRehearsalHelpController controller;
  late ProviderSubscription<RehearsalHelpEditorState> subscription;
  final query = eventRehearsalAssistanceProvider('practice-help');
  setUp(() async {
    repository = _Repository();
    auth = StreamController<String?>.broadcast();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventRehearsalRepositoryProvider.overrideWith((ref) => repository),
      ],
    );
    final ready = Completer<RehearsalAssistanceReview>();
    container.listen(query, (_, next) {
      if (ready.isCompleted || next.isLoading) return;
      if (next.hasError) {
        ready.completeError(next.error!, next.stackTrace!);
      } else {
        ready.complete(next.requireValue);
      }
    });
    await container.pump();
    auth.add('host-1');
    review = await ready.future.timeout(const Duration(seconds: 5));
    request =
        review.snapshot.helpRequests!.cases.single as RehearsalOpenHelpCase;
    scope = rehearsalHelpScope(review.snapshot, request);
    final provider = eventRehearsalHelpControllerProvider(scope);
    subscription = container.listen(provider, (_, _) {});
    controller = container.read(provider.notifier)..open(review, request);
  });
  tearDown(() async {
    container.dispose();
    await auth.close();
  });
  RehearsalHelpForm form() =>
      container.read(eventRehearsalHelpControllerProvider(scope))
          as RehearsalHelpForm;
  void confirm(int i, {bool later = false}) {
    final write = repository.writes[i];
    repository.snapshot = EventRehearsalBootstrap.fromCallableData(
      practiceHelpResult(write.change, laterResolution: later),
    );
    write.result.complete(repository.snapshot);
  }

  Future<void> uncertain(Future<EventRehearsalBootstrap> pending) async {
    final expectation = expectLater(pending, throwsA(isA<NetworkException>()));
    repository.writes.last.result.completeError(
      const NetworkException('unavailable', 'Offline'),
    );
    await expectation;
  }

  test(
    'only reviewed managers are selectable and duplicate taps apply once',
    () async {
      controller.select(AssistanceCaseDecision.transfer('foreign'));
      expect(form().canSubmit, isFalse);
      expect(repository.writes, isEmpty);
      controller.select(AssistanceCaseDecision.transfer('host-2'));
      final pending = controller.submit();
      expect(controller.submit(), same(pending));
      expect(form().canDismiss, isFalse);
      controller.select(const AssistanceCaseDecision.decline());
      expect(form().decision, isA<AssistanceCaseTransfer>());
      confirm(0);
      await pending;
      expect(form().phase, RehearsalHelpEditorPhase.saved);
      expect(container.read(eventRehearsalPendingHelpProvider), isEmpty);
    },
  );
  test(
    'missing open rows and closed sheets preserve one exact uncertain retry',
    () async {
      controller.select(const AssistanceCaseDecision.resolve());
      await uncertain(controller.submit());
      final original = repository.writes.single.change;
      subscription.close();
      await container.pump();
      repository.snapshot = practiceHelpSnapshot('resolved');
      container.read(query.notifier).reload();
      await container.pump();
      expect(review.isCurrent, isFalse);
      expect(
        container.read(eventRehearsalPendingHelpProvider),
        contains(scope),
      );
      expect(
        container.exists(eventRehearsalHelpControllerProvider(scope)),
        isTrue,
      );
      subscription = container.listen(
        eventRehearsalHelpControllerProvider(scope),
        (_, _) {},
      );
      expect(form().change, same(original));
      controller.reload();
      expect(form().phase, RehearsalHelpEditorPhase.retryRequired);
      final retry = controller.retry();
      expect(repository.writes.last.change, same(original));
      expect(controller.retry(), same(retry));
      confirm(1);
      await retry;
      expect(form().phase, RehearsalHelpEditorPhase.saved);
      expect(container.read(eventRehearsalPendingHelpProvider), isEmpty);
    },
  );
  test(
    'a parent receipt cannot hide a missing or different help outcome',
    () async {
      controller.select(const AssistanceCaseDecision.resolve());
      final pending = controller.submit();
      final write = repository.writes.single;
      final raw = practiceHelpResult(write.change);
      ((raw['helpRequests'] as Map)['cases'] as List).clear();
      final expectation = expectLater(pending, throwsFormatException);
      write.result.complete(EventRehearsalBootstrap.fromCallableData(raw));
      await expectation;
      expect(form().phase, RehearsalHelpEditorPhase.retryRequired);
      final retry = controller.retry();
      confirm(1);
      await retry;
      expect(form().phase, RehearsalHelpEditorPhase.saved);
    },
  );
  test(
    'exact retry retains a later resolution instead of restoring its handoff',
    () async {
      controller.select(AssistanceCaseDecision.transfer('host-2'));
      await uncertain(controller.submit());
      final retry = controller.retry();
      confirm(1, later: true);
      final result = await retry;
      expect(result.helpRequests!.cases.single, isA<RehearsalClosedHelpCase>());
    },
  );
  test(
    'detached sign-out and same-UID return cannot restore old authority',
    () async {
      controller.select(const AssistanceCaseDecision.resolve());
      await uncertain(controller.submit());
      subscription.close();
      await container.pump();
      auth.add(null);
      await container.pump();
      auth.add('host-1');
      await container.pump();
      subscription = container.listen(
        eventRehearsalHelpControllerProvider(scope),
        (_, _) {},
      );
      expect(container.read(eventRehearsalPendingHelpProvider), isEmpty);
      expect(
        container.read(eventRehearsalHelpControllerProvider(scope)),
        isNot(isA<RehearsalHelpForm>()),
      );
    },
  );
}

class _Repository implements EventRehearsalRepository {
  EventRehearsalBootstrap snapshot = practiceHelpSnapshot();
  final writes =
      <
        ({
          RehearsalAssistanceChange change,
          Completer<EventRehearsalBootstrap> result,
        })
      >[];
  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) async => snapshot;
  @override
  Future<EventRehearsalBootstrap> applyAssistance(
    RehearsalAssistanceChange change,
  ) {
    final result = Completer<EventRehearsalBootstrap>();
    writes.add((change: change, result: result));
    return result.future;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
