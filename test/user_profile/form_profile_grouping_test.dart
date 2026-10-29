import 'package:catch_dating_app/contexts/profiles/domain/form_profile.dart';
import 'package:flutter_test/flutter_test.dart';

FormProfileSummary row(String id, String organizer, int day) =>
    FormProfileSummary(
      responseId: id,
      organizerId: organizer,
      organizerName: 'Shared organizer name',
      formTitle: id,
      submittedAt: DateTime(2026, 9, day),
      claimedAt: null,
      cardFieldCount: 0,
    );

void main() {
  test('same-name organizers stay separate; each group shows newest first', () {
    final rows = [
      row('old', 'a', 1),
      row('foreign', 'b', 4),
      row('new', 'a', 3),
    ];
    final page = FormProfilePage(items: rows, nextCursor: 'more');
    expect(
      page.organizerGroups.map((group) => group.map((r) => r.responseId)),
      [
        ['new', 'old'],
        ['foreign'],
      ],
    );
    expect(page.items.map((r) => r.responseId), ['old', 'foreign', 'new']);
    expect(page.nextCursor, 'more');
    expect(() => page.organizerGroups.first.clear(), throwsUnsupportedError);
  });
}
