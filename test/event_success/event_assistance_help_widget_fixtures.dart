import 'dart:async';

import 'package:catch_dating_app/contexts/live/data/event_assistance_cases_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_cases_page.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:flutter_test/flutter_test.dart';

import '../event_rehearsal/event_rehearsal_help_queue_fixtures.dart';
import 'event_assistance_help_queue_fixtures.dart';

class HelpUiLive extends Fake implements EventAssistanceCasesRepository {
  String stage = 'initial';
  Map<String, Object?>? pageOverride;
  Object? readError;
  final _listeners =
      <
        ({
          EventAssistanceCaseQuery query,
          String actorUid,
          StreamController<EventAssistanceCasesPage> controller,
        })
      >[];
  final writes =
      <
        ({
          EventAssistanceCaseChange change,
          Completer<EventAssistanceCaseResult> result,
        })
      >[];

  @override
  Stream<EventAssistanceCasesPage> watchPage(
    EventAssistanceCaseQuery query, {
    required String actorUid,
  }) {
    final controller = StreamController<EventAssistanceCasesPage>();
    final listener = (query: query, actorUid: actorUid, controller: controller);
    _listeners.add(listener);
    controller.onCancel = () {
      _listeners.remove(listener);
      unawaited(controller.close());
    };
    _deliver(listener);
    return controller.stream;
  }

  void _deliver(
    ({
      EventAssistanceCaseQuery query,
      String actorUid,
      StreamController<EventAssistanceCasesPage> controller,
    })
    listener,
  ) {
    final error = readError;
    if (error != null) {
      listener.controller.addError(error);
      return;
    }
    listener.controller.add(
      helpQueuePageFor(
        pageOverride ?? helpQueueFixture(stage),
        listener.query,
        actorUid: listener.actorUid,
      ),
    );
  }

  /// What the case view trigger does after a command: every open listener
  /// receives the current stage.
  void deliverToListeners() {
    for (final listener in [..._listeners]) {
      _deliver(listener);
    }
  }

  @override
  Future<EventAssistanceCaseResult> apply(EventAssistanceCaseChange change) {
    final result = Completer<EventAssistanceCaseResult>();
    writes.add((change: change, result: result));
    return result.future;
  }

  void confirm({bool replay = false}) {
    final write = writes.last;
    final transfer = write.change.decision is AssistanceCaseTransfer;
    stage = transfer ? 'assigned' : 'handled';
    final raw = helpQueueFixture(transfer ? 'transfer' : 'resolved');
    if (replay) raw['outcome'] = 'replayed';
    write.result.complete(
      EventAssistanceCaseResult.fromCallableData(
        raw,
        expectedChange: write.change,
      ),
    );
    deliverToListeners();
  }
}

class HelpUiPractice extends Fake implements EventRehearsalRepository {
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

  void confirm() {
    final write = writes.last;
    snapshot = EventRehearsalBootstrap.fromCallableData(
      practiceHelpResult(write.change),
    );
    write.result.complete(snapshot);
  }
}
