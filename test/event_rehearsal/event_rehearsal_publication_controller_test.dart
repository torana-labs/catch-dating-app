import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_destination.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_publication.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_editor.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_movement_view_model.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_assistance_fixtures.dart';
import 'event_rehearsal_movement_fixtures.dart';

void main() {
  late ProviderContainer container;
  late StreamController<String?> auth;
  late _Repository repository;
  late RehearsalAssistanceReview review;
  late RehearsalMovementPage movement;
  final query = eventRehearsalAssistanceProvider('session-1');
  setUp(() {
    auth = StreamController<String?>.broadcast();
    repository = _Repository();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventRehearsalRepositoryProvider.overrideWith((ref) => repository),
      ],
    );
  });
  tearDown(() async {
    container.dispose();
    await auth.close();
  });
  Future<void> load(String name) async {
    repository.sample = name;
    final assistanceLoaded = Completer<RehearsalAssistanceReview>();
    container.listen(query, (_, next) {
      if (next.asData?.value case final value?
          when !assistanceLoaded.isCompleted) {
        assistanceLoaded.complete(value);
      }
    }, fireImmediately: true);
    auth.add('host-1');
    review = await assistanceLoaded.future.timeout(const Duration(seconds: 10));
    final selection = review.snapshot.movementReview!.selection;
    final movementLoaded = Completer<RehearsalMovementPage>();
    container.listen(eventRehearsalMovementProvider(selection), (_, next) {
      if (next.asData?.value case final value?
          when !movementLoaded.isCompleted) {
        movementLoaded.complete(value);
      }
    }, fireImmediately: true);
    movement = await movementLoaded.future.timeout(const Duration(seconds: 10));
  }

  EventRehearsalAssistanceEditor editor() {
    final provider = eventRehearsalAssistanceEditorProvider(
      review.snapshot.session.id,
    );
    container.listen(provider, (_, _) {});
    return container.read(provider.notifier)..open(review);
  }

  RehearsalAssistanceForm form() =>
      container.read(
            eventRehearsalAssistanceEditorProvider(review.snapshot.session.id),
          )
          as RehearsalAssistanceForm;
  RehearsalPublicationDraft draft({
    DateTime? deadline,
    RehearsalMovementReview? source,
  }) => RehearsalPublicationDraft(
    actorId: 'actor-01',
    joiningPoint: rehearsalDefaultJoiningPoint(source ?? movement.snapshot)!,
    rules: practiceRules(destination: const LateJoinConfirmedProgress()),
    routes: practicePlan().routes,
    deliveryPolicy: practicePlan().deliveryPolicy,
    responseDeadline: deadline,
  );
  void confirm(int index, {Map<String, Object?>? automation}) {
    final write = repository.writes[index];
    final raw = movementBootstrap(repository.sample)..remove('movementReview');
    movementObjectAt(raw, ['session']).addAll({
      'runtimeRevision': review.snapshot.session.runtimeRevision + 1,
      'actionCount': review.snapshot.session.actionCount + 1,
    });
    raw['actions'] = [practiceReceipt(write.change)];
    if (automation != null) {
      movementObjectAt(raw, ['actors', 0])['assistanceAutomation'] = automation;
    }
    write.result.complete(EventRehearsalBootstrap.fromCallableData(raw));
  }

  test(
    'publication binds current confirmed movement and the reviewed generation',
    () async {
      await load('departed');
      final actions = editor();
      actions.selectPublication(
        draft(deadline: review.snapshot.session.virtualNow),
        movement,
      );
      expect(form().error, isA<FormatException>());
      expect(form().canSubmit, isFalse);
      actions.selectPublication(draft(), movement);
      final change = form().change!;
      final command = change.command as RehearsalPublishInstruction;
      expect(
        command.plan.guidance.materialKey,
        movement.snapshot.guidance!.materialKey,
      );
      expect(command.plan.guidance.text, movement.snapshot.guidance!.text);
      expect(command.plan.departureConfirmed, isTrue);
      expect(change.toJson()['expectedSetupRevision'], 0);
      final pending = actions.submit();
      actions.selectPublication(draft(), movement);
      expect(form().change, same(change));
      expect(repository.writes.single.change, same(change));
      confirm(0);
      await pending;
      await container.pump();
      expect(form().phase, RehearsalAssistancePhase.applied);
      expect(movement.isCurrent, isFalse);
    },
  );

  test(
    'predeparture automation freezes routes, plan and script through an uncertain retry',
    () async {
      await load('initial');
      final actions = editor();
      final input = draft();
      actions.selectPublication(input, movement);
      expect(form().canSubmit, isFalse);
      actions.selectAutomation(input, [], movement);
      expect(form().error, isA<FormatException>());
      final script = <RehearsalDeliveryOutcome>[
        const RehearsalDeliveryUnknown(RehearsalDeliveryUncertainty.timeout),
        const RehearsalDeliveryConfirmed(RehearsalConfirmedDelivery.delivered),
      ];
      actions.selectAutomation(input, script, movement);
      script.clear();
      final change = form().change!;
      final command = change.command as RehearsalConfigureAutomation;
      expect(command.plan.departureConfirmed, isFalse);
      expect(command.outcomes, hasLength(2));
      final pending = actions.submit();
      expect(actions.submit(), same(pending));
      final failure = expectLater(pending, throwsA(isA<NetworkException>()));
      repository.writes.single.result.completeError(
        const NetworkException('unavailable', 'Offline'),
      );
      await failure;
      actions.selectAutomation(input, [], movement);
      expect(form().change, same(change));
      final retry = actions.submit();
      expect(repository.writes.last.change, same(change));
      expect(repository.writes.last.change.toJson(), change.toJson());
      final automation = practiceAutomation()
        ..addAll({
          'clockId': movement.snapshot.scope.clockId,
          'plan': command.plan.toJson(),
        });
      confirm(1, automation: automation);
      final result = await retry;
      expect(result.actors.first.assistanceAutomation!.remainingOutcomes, 2);
      expect(form().phase, RehearsalAssistancePhase.applied);
    },
  );

  test(
    'a separate movement snapshot cannot replace the reviewed source',
    () async {
      await load('departed');
      final actions = editor();
      actions.selectPublication(
        draft(source: movementReview('departed')),
        movement,
      );
      expect(form().error, same(rehearsalReviewExpired));
      expect(form().canSubmit, isFalse);
      expect(repository.writes, isEmpty);
    },
  );

  test(
    'refreshing movement retires a selected, unsubmitted instruction',
    () async {
      await load('departed');
      final actions = editor()..selectPublication(draft(), movement);
      container
          .read(
            eventRehearsalMovementProvider(
              movement.snapshot.selection,
            ).notifier,
          )
          .reload();
      await container.pump();
      expect(movement.isCurrent, isFalse);
      await expectLater(
        actions.submit(),
        throwsA(same(rehearsalReviewExpired)),
      );
      expect(form().phase, RehearsalAssistancePhase.refreshRequired);
      expect(repository.writes, isEmpty);
    },
  );

  test(
    'a refreshed page cannot select a new plan from retired movement',
    () async {
      await load('departed');
      final actions = editor();
      container
          .read(
            eventRehearsalMovementProvider(
              movement.snapshot.selection,
            ).notifier,
          )
          .reload();
      await container.pump();
      actions.selectAutomation(draft(), [
        const RehearsalDeliveryConfirmed(RehearsalConfirmedDelivery.delivered),
      ], movement);
      expect(form().error, same(rehearsalReviewExpired));
      expect(form().canSubmit, isFalse);
      expect(repository.writes, isEmpty);
    },
  );
}

class _Repository extends Fake implements EventRehearsalRepository {
  String sample = 'initial';
  final writes =
      <
        ({
          RehearsalAssistanceChange change,
          Completer<EventRehearsalBootstrap> result,
        })
      >[];
  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) async =>
      movementSnapshot(sample);
  @override
  Future<RehearsalMovementReview> fetchMovement({
    required EventRehearsalBootstrap snapshot,
    required RehearsalMovementSelection selection,
    required String actorUid,
  }) async => RehearsalMovementReview.fromJson(
    movementSample(sample)['review'],
    session: snapshot.session,
    actors: snapshot.actors,
    selection: selection,
    expectedActorUid: actorUid,
  );
  @override
  Future<EventRehearsalBootstrap> applyAssistance(
    RehearsalAssistanceChange change,
  ) {
    final result = Completer<EventRehearsalBootstrap>();
    writes.add((change: change, result: result));
    return result.future.then((value) {
      change.requireResult(value);
      return value;
    });
  }
}
