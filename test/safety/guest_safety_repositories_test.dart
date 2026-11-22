import 'package:catch_dating_app/contexts/safety/data/organizer_guest_safety_repository.dart';
import 'package:catch_dating_app/contexts/safety/data/safety_notice_repository.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

class _Functions extends Fake implements FirebaseFunctions {
  _Functions([this.responses = const {}]);

  final Map<String, Object?> responses;
  final callables = <String, _Callable>{};

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      callables.putIfAbsent(name, () => _Callable(responses[name]));
}

class _Callable extends Fake implements HttpsCallable {
  _Callable(this.response);

  final Object? response;
  final calls = <Object?>[];

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async {
    calls.add(parameters);
    return _Result<T>(response as T);
  }
}

class _Result<T> extends Fake implements HttpsCallableResult<T> {
  _Result(this.data);

  @override
  final T data;
}

void main() {
  group('OrganizerGuestSafetyRepository', () {
    test('reportGuest sends the event, the reason code and no notes', () async {
      final functions = _Functions();
      await OrganizerGuestSafetyRepository(functions).reportGuest(
        organizerId: 'org-harbour',
        eventId: 'event-1',
        targetUserId: 'guest-mira',
        reason: OrganizerGuestReportReason.unsafeBehaviour,
      );

      expect(functions.callables['reportGuest']?.calls, [
        {
          'organizerId': 'org-harbour',
          'eventId': 'event-1',
          'targetUserId': 'guest-mira',
          'reasonCode': 'unsafe_behaviour',
          'notes': null,
        },
      ]);
    });

    test('every report reason is a valid server reason code', () {
      final pattern = RegExp(r'^[a-z][a-z0-9_]{1,63}$');
      for (final reason in OrganizerGuestReportReason.values) {
        expect(pattern.hasMatch(reason.code), isTrue, reason: reason.code);
      }
    });

    test(
      'setGuestBlocked sends the organiser, the guest and the state',
      () async {
        final functions = _Functions();
        final repository = OrganizerGuestSafetyRepository(functions);
        await repository.setGuestBlocked(
          organizerId: 'org-harbour',
          uid: 'guest-mira',
          blocked: true,
        );
        await repository.setGuestBlocked(
          organizerId: 'org-harbour',
          uid: 'guest-mira',
          blocked: false,
        );

        expect(functions.callables['manageOrganizerGuestBlock']?.calls, [
          {'organizerId': 'org-harbour', 'uid': 'guest-mira', 'blocked': true},
          {'organizerId': 'org-harbour', 'uid': 'guest-mira', 'blocked': false},
        ]);
      },
    );

    test('listGuestBlocks reads names and dates and skips bad items', () async {
      final functions = _Functions({
        'listOrganizerGuestBlocks': {
          'items': [
            {
              'uid': 'guest-mira',
              'displayName': 'Mira Kapoor',
              'blockedByUid': 'host-1',
              'createdAtMillis': 1795000000000,
            },
            {
              'uid': 'guest-unnamed',
              'displayName': null,
              'blockedByUid': 'host-1',
              'createdAtMillis': 0,
            },
            {'displayName': 'No uid'},
            'not a map',
          ],
        },
      });

      final blocks = await OrganizerGuestSafetyRepository(
        functions,
      ).listGuestBlocks('org-harbour');

      expect(functions.callables['listOrganizerGuestBlocks']?.calls, [
        {'organizerId': 'org-harbour'},
      ]);
      expect(blocks.map((block) => block.uid), ['guest-mira', 'guest-unnamed']);
      expect(blocks.first.displayName, 'Mira Kapoor');
      expect(
        blocks.first.createdAt,
        DateTime.fromMillisecondsSinceEpoch(1795000000000),
      );
      expect(blocks.last.displayName, isNull);
      expect(blocks.last.createdAt, isNull);
    });
  });

  group('SafetyNotice', () {
    test('parses a stored notice', () {
      final notice = SafetyNotice.fromFirestore('notice-1', {
        'kind': 'restriction',
        'title': 'Your account is restricted',
        'body': 'You can’t book events for 7 days.',
        'actionId': 'action-12345',
        'appealable': true,
        'createdAt': Timestamp.fromMillisecondsSinceEpoch(1795000000000),
        'readAt': null,
      });

      expect(notice, isNotNull);
      expect(notice!.kind, SafetyNoticeKind.restriction);
      expect(notice.actionId, 'action-12345');
      expect(notice.canAppeal, isTrue);
      expect(
        notice.createdAt,
        DateTime.fromMillisecondsSinceEpoch(1795000000000),
      );
      expect(notice.readAt, isNull);
    });

    test('an unknown kind, no action or bad fields cannot be appealed', () {
      final notice = SafetyNotice.fromFirestore('notice-2', {
        'kind': 'somethingNew',
        'title': 'Thanks for your report',
        'body': 'We have it.',
        'actionId': null,
        'appealable': 'yes',
        'createdAt': 'yesterday',
      });

      expect(notice!.kind, SafetyNoticeKind.unknown);
      expect(notice.appealable, isFalse);
      expect(notice.canAppeal, isFalse);
      expect(notice.createdAt, isNull);
    });

    test('appealable without an action id cannot be appealed', () {
      final notice = SafetyNotice.fromFirestore('notice-3', {
        'kind': 'warning',
        'title': 'A warning',
        'body': 'Please follow the rules.',
        'appealable': true,
      });

      expect(notice!.canAppeal, isFalse);
    });

    test('a notice with no title or body is skipped', () {
      expect(SafetyNotice.fromFirestore('n', {'body': 'Body'}), isNull);
      expect(SafetyNotice.fromFirestore('n', {'title': 'Title'}), isNull);
      expect(
        SafetyNotice.fromFirestore('n', {'title': ' ', 'body': 'Body'}),
        isNull,
      );
    });
  });

  group('SafetyNoticeRepository', () {
    test('watchNotices lists the account notices newest first', () async {
      final firestore = FakeFirebaseFirestore();
      final items = firestore
          .collection('accountSafetyNotices')
          .doc('guest-mira')
          .collection('items');
      await items.doc('older').set({
        'kind': 'warning',
        'title': 'Older',
        'body': 'Older body',
        'actionId': null,
        'appealable': false,
        'createdAt': Timestamp.fromMillisecondsSinceEpoch(1000),
        'readAt': null,
      });
      await items.doc('newer').set({
        'kind': 'restriction',
        'title': 'Newer',
        'body': 'Newer body',
        'actionId': 'action-12345',
        'appealable': true,
        'createdAt': Timestamp.fromMillisecondsSinceEpoch(2000),
        'readAt': null,
      });

      final notices = await SafetyNoticeRepository(
        firestore,
        _Functions(),
      ).watchNotices(uid: 'guest-mira').first;

      expect(notices.map((notice) => notice.id), ['newer', 'older']);
    });

    test('submitAppeal sends the action and the text', () async {
      final functions = _Functions();
      await SafetyNoticeRepository(
        FakeFirebaseFirestore(),
        functions,
      ).submitAppeal(actionId: 'action-12345', text: 'I was not there.');

      expect(functions.callables['submitSafetyAppeal']?.calls, [
        {'actionId': 'action-12345', 'text': 'I was not there.'},
      ]);
    });
  });
}
