import 'dart:async';

import 'package:catch_dating_app/contexts/live/data/event_assistance_cases_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_cases_page.dart';
import 'package:flutter_test/flutter_test.dart';

/// One listener the test drives: [complete] delivers a page, [completeError]
/// ends it in an error.
final class TestPageFeed<T> {
  final _controller = StreamController<T>();
  bool get isListened => _controller.hasListener;
  Stream<T> get stream => _controller.stream;
  void complete(T page) => _controller.add(page);
  void completeError(Object error) => _controller.addError(error);
}

class CasesTestRepository extends Fake
    implements EventAssistanceCasesRepository {
  Completer<void> _changed = Completer<void>();
  final reads =
      <
        ({
          EventAssistanceCaseQuery query,
          String actorUid,
          TestPageFeed<EventAssistanceCasesPage> result,
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
    final result = TestPageFeed<EventAssistanceCasesPage>();
    reads.add((query: query, actorUid: actorUid, result: result));
    _notify();
    return result.stream;
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
