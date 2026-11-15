import 'package:catch_ui/catch_ui.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('CatchAccordionController keeps at most one field expanded', () {
    final accordion = CatchAccordionController(initialExpanded: 'name');
    addTearDown(accordion.dispose);
    var notifications = 0;
    accordion.addListener(() => notifications += 1);

    expect(accordion.expanded, 'name');
    expect(accordion.isExpanded('name'), isTrue);

    accordion.toggle('description');
    expect(accordion.expanded, 'description');
    expect(accordion.isExpanded('name'), isFalse);

    accordion.toggle('description');
    expect(accordion.expanded, isNull);

    accordion.collapse();
    expect(notifications, 2);
  });
}
