import 'dart:convert';

import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_view.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/data/read_models/host_event_setup_default_view_reads.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/hosts/create/create_controller.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_plan_body.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_draft_controller.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../organizers/organizers_test_helpers.dart';

/// Records the draft and the create command; the command fails, so the
/// flow keeps its exact request for a retry.
class _FakeCommands extends CreateEventDraftController {
  final saved = <EventDraft>[];
  final creates = <({String requestId, PrivateEventBasics basics})>[];

  @override
  Future<EventDraft?> saveDraft(EventDraft draft) async {
    saved.add(draft);
    return draft;
  }

  @override
  Future<PrivateEventCreateReceipt> createPrivateEvent({
    required String organizerId,
    required String requestId,
    required PrivateEventBasics basics,
  }) async {
    creates.add((requestId: requestId, basics: basics));
    throw StateError('offline');
  }
}

class _NoDefaults extends HostEventSetupDefaultViewReads {
  _NoDefaults() : super(FakeFirebaseFirestore());

  @override
  Stream<ManagerEventSetupDefaultsView> watch(String organizerId) =>
      Stream.error(StateError('no defaults view'));
}

void main() {
  late _FakeCommands commands;
  late ProviderContainer container;
  late CreateFlowArgs args;

  CreateController controller() =>
      container.read(createControllerProvider(args).notifier);
  CreateFlowState state() => container.read(createControllerProvider(args));

  setUp(() {
    commands = _FakeCommands();
    container = ProviderContainer(
      overrides: [
        createEventDraftControllerProvider.overrideWith(() => commands),
        hostEventSetupDefaultViewReadsProvider.overrideWithValue(_NoDefaults()),
      ],
    );
    addTearDown(container.dispose);
    args = CreateFlowArgs(
      organizer: buildOrganizer(
        locationCityId: 'in-mh-mumbai',
        locationMarketId: 'in-mh-mumbai',
      ),
      userId: 'host-1',
    );
    container.listen(createControllerProvider(args), (_, _) {});
  });

  test('a new flow starts on the basics with an empty draft', () {
    expect(state().step, CreateStep.basics);
    expect(state().eventId, isNull);
    expect(state().draft.organizerId, 'club-1');
  });

  test('the basics need a name and a format before moving on', () async {
    await controller().next();
    expect(state().step, CreateStep.basics);
    expect(state().problems, {CreateProblem.name, CreateProblem.format});

    controller()
      ..edit((draft) => draft.copyWith(name: 'Tuesday Trivia Night'))
      ..setFormat(CreateFormat.quiz);
    expect(state().problems, isEmpty);
    expect(state().draft.activityKind, 'pubQuiz');
    await controller().next();
    expect(state().step, CreateStep.when);
    expect(commands.creates, isEmpty);
  });

  test('the end crosses midnight as a duration', () {
    controller()
      ..setStart(22, 0)
      ..setEnd(1, 30);
    expect(state().draft.durationMinutes, 210);
  });

  test('plan steps start where the one before ends', () {
    controller().useTemplate(createPlanTemplate(CreateFormat.quiz, 150));
    final main = state().plan[1];
    controller().putStep(main.copyWith(durationMinutes: 60));
    expect([for (final step in state().plan) step.offsetMinutes], [0, 30, 90]);
    controller().removeStep('doors');
    expect([for (final step in state().plan) step.offsetMinutes], [0, 60]);
  });

  test(
    'the create command keeps its request id and body across a failure',
    () async {
      controller()
        ..edit((draft) => draft.copyWith(name: 'Tuesday Trivia Night'))
        ..setFormat(CreateFormat.quiz);
      await controller().next();
      await controller().next();
      expect(state().problems, {CreateProblem.date, CreateProblem.start});

      controller()
        ..setDate(DateTime(2026, 11, 3))
        ..setStart(19, 30);
      await controller().next();

      expect(commands.creates, hasLength(1));
      final sent = commands.creates.single;
      expect(sent.basics.name, 'Tuesday Trivia Night');
      expect(sent.basics.localDate, '2026-11-03');
      expect(sent.basics.localStartTime, '19:30');
      // The draft holding the exact request was stored before the call.
      final stored = commands.saved.single;
      expect(stored.eventCreateRequestId, sent.requestId);
      expect(
        stored.eventCreatePayloadSignature,
        jsonEncode(sent.basics.toJson()),
      );
      expect(state().error, isA<StateError>());
      expect(state().step, CreateStep.when);
      expect(state().working, isFalse);

      await controller().next();
      expect(commands.creates, hasLength(2));
      expect(commands.creates.last.requestId, sent.requestId);
    },
  );

  test('back walks the steps and stops on the first', () async {
    controller().goTo(CreateStep.tickets);
    expect(controller().back(), isTrue);
    expect(state().step, CreateStep.when);
    expect(controller().back(), isTrue);
    expect(controller().back(), isFalse);
  });
}
