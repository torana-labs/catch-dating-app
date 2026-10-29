import 'dart:async';

import 'package:catch_dating_app/contexts/live/data/event_assistance_cases_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_cases_page.dart';
import 'package:flutter_test/flutter_test.dart';

class CasesTestRepository extends Fake
    implements EventAssistanceCasesRepository {
  Completer<void> _changed = Completer<void>();
  final reads =
      <
        ({
          EventAssistanceCaseQuery query,
          Completer<EventAssistanceCasesPage> result,
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
  Future<EventAssistanceCasesPage> fetch(EventAssistanceCaseQuery query) {
    final result = Completer<EventAssistanceCasesPage>();
    reads.add((query: query, result: result));
    _notify();
    return result.future;
  }

  @override
  Future<EventAssistanceCaseResult> apply(EventAssistanceCaseChange change) {
    final result = Completer<EventAssistanceCaseResult>();
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
