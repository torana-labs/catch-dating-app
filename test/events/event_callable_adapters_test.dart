import 'package:catch_dating_app/contexts/events/data/event_callable_adapters.dart';
import 'package:flutter_test/flutter_test.dart';

import 'events_test_helpers.dart';

void main() {
  test('published edits carry the revision from the loaded event', () {
    final event = buildEvent().copyWith(setupRevision: 7);
    expect(
      updateEventCallableRequestFromEvent(event).toJson(),
      containsPair('expectedSetupRevision', 7),
    );
    expect(
      updateEventCallableRequestFromEvent(buildEvent(id: 'legacy')).toJson(),
      isNot(contains('expectedSetupRevision')),
    );
  });
}
