import 'package:catch_dating_app/hosts/people/conversation/conversation_drafts.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'retry retains its operation and duplicate activation cannot send twice',
    () {
      final drafts = HostReplyDrafts();
      addTearDown(drafts.dispose);
      const key = 'organizer/person/event/catch:thread';
      drafts.setText(key, 'Hello');
      final operation = drafts.begin(key, 'Hello')!;
      expect(drafts.begin(key, 'Hello'), isNull);
      drafts.finish(key, operation, succeeded: false);
      expect(drafts.text(key), 'Hello');
      expect(drafts.begin(key, 'Hello'), operation);
      drafts.finish(key, operation, succeeded: true);
      expect(drafts.text(key), isEmpty);
      expect(drafts.begin(key, 'Hello'), isNot(operation));
    },
  );

  test(
    'person, organizer, event and route drafts never overwrite one another',
    () {
      final drafts = HostReplyDrafts();
      addTearDown(drafts.dispose);
      final keys = [
        'org/person/event/catch:a',
        'org/person/event/whatsapp:b',
        'org/person/general/catch:a',
        'other/person/event/catch:a',
        'org/other/event/catch:a',
      ];
      for (final key in keys) {
        drafts.setText(key, key);
      }
      for (final key in keys) {
        expect(drafts.text(key), key);
      }
      final operation = drafts.begin(keys.first, keys.first)!;
      drafts.setText(keys.first, 'New draft');
      drafts.finish(keys.first, operation, succeeded: true);
      expect(drafts.text(keys.first), 'New draft');
      for (final key in keys.skip(1)) {
        expect(drafts.text(key), key);
      }
    },
  );

  test('account reset and disposal invalidate pending completion', () {
    final drafts = HostReplyDrafts();
    drafts.setText('person/route', 'Hello');
    final operation = drafts.begin('person/route', 'Hello')!;
    drafts.clear();
    drafts.setText('person/route', 'Different account');
    drafts.finish('person/route', operation, succeeded: true);
    expect(drafts.text('person/route'), 'Different account');
    drafts.dispose();
    expect(
      () => drafts.finish('person/route', operation, succeeded: false),
      returnsNormally,
    );
  });
}
