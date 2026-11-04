import 'dart:async';

import 'package:catch_dating_app/contexts/live/data/event_assistance_deliveries_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_deliveries_page.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_delivery_queue_fixtures.dart';

class DeliveryUiLive extends Fake
    implements EventAssistanceDeliveriesRepository {
  String stage = 'uncertain';
  Object? readError;
  final _listeners =
      <
        ({
          EventAssistanceDeliveryQuery query,
          StreamController<EventAssistanceDeliveriesPage> controller,
        })
      >[];
  final writes =
      <
        ({
          EventAssistanceDeliveryChange change,
          Completer<EventAssistanceDeliveryResult> result,
        })
      >[];

  @override
  Stream<EventAssistanceDeliveriesPage> watchPage(
    EventAssistanceDeliveryQuery query,
  ) {
    final controller = StreamController<EventAssistanceDeliveriesPage>();
    final listener = (query: query, controller: controller);
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
      EventAssistanceDeliveryQuery query,
      StreamController<EventAssistanceDeliveriesPage> controller,
    })
    listener,
  ) {
    final error = readError;
    if (error != null) {
      listener.controller.addError(error);
      return;
    }
    listener.controller.add(
      deliveryQueuePageFor(deliveryQueueFixture(stage), listener.query),
    );
  }

  /// What the delivery view trigger does after a write: every open listener
  /// receives the current stage.
  void deliverToListeners() {
    for (final listener in [..._listeners]) {
      _deliver(listener);
    }
  }

  @override
  Future<EventAssistanceDeliveryResult> apply(
    EventAssistanceDeliveryChange change,
  ) {
    final result = Completer<EventAssistanceDeliveryResult>();
    writes.add((change: change, result: result));
    return result.future;
  }

  void confirm() {
    final raw = deliveryQueueFixture('handedOff');
    raw['outcome'] = 'replayed';
    writes.last.result.complete(
      EventAssistanceDeliveryResult.fromCallableData(
        raw,
        expectedChange: writes.last.change,
      ),
    );
  }
}

class DeliveryUiPractice extends Fake implements EventRehearsalRepository {
  EventRehearsalBootstrap snapshot = practiceDeliveryQueue('uncertain');
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
    snapshot = EventRehearsalBootstrap.fromCallableData(
      practiceDeliveryQueueResult(writes.last.change),
    );
    writes.last.result.complete(snapshot);
  }
}
