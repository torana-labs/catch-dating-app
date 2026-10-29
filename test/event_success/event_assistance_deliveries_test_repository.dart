import 'dart:async';

import 'package:catch_dating_app/contexts/live/data/event_assistance_deliveries_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_deliveries_page.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:flutter_test/flutter_test.dart';

class DeliveriesTestRepository extends Fake
    implements EventAssistanceDeliveriesRepository {
  Completer<void> _changed = Completer<void>();
  final reads =
      <
        ({
          EventAssistanceDeliveryQuery query,
          Completer<EventAssistanceDeliveriesPage> result,
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
  Future<EventAssistanceDeliveriesPage> fetch(
    EventAssistanceDeliveryQuery query,
  ) {
    final result = Completer<EventAssistanceDeliveriesPage>();
    reads.add((query: query, result: result));
    _notify();
    return result.future;
  }

  @override
  Future<EventAssistanceDeliveryResult> apply(
    EventAssistanceDeliveryChange change,
  ) {
    final result = Completer<EventAssistanceDeliveryResult>();
    writes.add((change: change, result: result));
    _notify();
    return result.future;
  }

  Future<void> waitForReads(int count) async {
    while (reads.length < count) {
      await _changed.future.timeout(const Duration(seconds: 10));
    }
  }

  void _notify() {
    final previous = _changed;
    _changed = Completer<void>();
    previous.complete();
  }
}
