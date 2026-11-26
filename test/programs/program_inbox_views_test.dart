import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_inbox_views_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_inbox_views.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_whatsapp_models.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime.utc(2026, 11, 20, 10);
  int ms(Duration after) => now.add(after).millisecondsSinceEpoch;
  final hour = ms(const Duration(hours: 1));

  Map<String, Object?> access({
    String role = 'staff',
    Map<String, int>? duties,
    int? expiresAt,
  }) => {
    'programId': 'p1',
    'organizerId': 'o1',
    'uid': 'u1',
    'ownerUid': 'owner',
    'role': role,
    'status': 'active',
    'activeFromMillis': 0,
    'expiresAtMillis': role == 'manager' ? null : expiresAt ?? hour,
    'duties': duties ?? {},
    'pickupAll': <String, int>{},
    'pickupScoped': <String, int>{},
    'hotelAll': <String, int>{},
    'hotelScoped': <String, int>{},
    'functionAll': <String, int>{},
    'functionScoped': <String, int>{},
    'workPickup': <String, int>{},
    'workHotel': <String, int>{},
    'workFunction': <String, int>{},
    'arrivalRoutes': <String, int>{},
    'tripRoutes': <String, int>{},
    'assignments': <Map<String, Object?>>[],
    'grantExpiresAtMillis': role == 'manager' ? null : hour,
    'revision': 1,
    'version': 1,
  };

  Map<String, Object?> thread(
    String id, {
    String state = 'needsYou',
    required int lastMessageAt,
    int unread = 1,
    String? household = 'h1',
    int? windowEnds,
  }) => {
    'programId': 'p1',
    'organizerId': 'o1',
    'threadId': id,
    'householdId': household,
    'guestId': null,
    'displayName': 'Family $id',
    'sideLabel': 'Aditi',
    'unknownSender': household == null,
    'handledBy': 'assistant',
    'state': state,
    'language': null,
    'escalationReason': null,
    'lastMessagePreview': 'Is there a bus?',
    'lastMessageDirection': 'inbound',
    'lastMessageAuthor': 'guest',
    'lastMessageAtMillis': lastMessageAt,
    'lastInboundAtMillis': lastMessageAt,
    'serviceWindowExpiresAtMillis':
        windowEnds ?? lastMessageAt + const Duration(hours: 24).inMilliseconds,
    'unreadCount': unread,
    'householdLabel': household == null ? null : 'The Mehra family',
    'primaryContactName': 'Neha',
    'guestCount': 4,
    'revision': 2,
    'version': 1,
  };

  Map<String, Object?> message(
    String id,
    int at, {
    String author = 'guest',
    String? label,
  }) => {
    'programId': 'p1',
    'organizerId': 'o1',
    'threadId': 'p1_h1',
    'messageId': id,
    'direction': author == 'guest' ? 'inbound' : 'outbound',
    'kind': 'text',
    'text': 'Text $id',
    'author': author,
    'authorUid': author == 'planner' ? 'staff-1' : null,
    'authorLabel': label,
    'status': 'sent',
    'createdAtMillis': at,
  };

  Future<FakeFirebaseFirestore> seeded(Map<String, Object?> view) async {
    final firestore = FakeFirebaseFirestore();
    await firestore.collection('programAccessViews').doc('p1__u1').set(view);
    for (final row in [
      thread('p1_h1', lastMessageAt: ms(const Duration(minutes: -30))),
      thread(
        'p1_h2',
        state: 'handled',
        lastMessageAt: ms(const Duration(minutes: -10)),
        unread: 0,
      ),
      thread(
        'p1_h3',
        lastMessageAt: ms(const Duration(hours: -30)),
        household: null,
      ),
    ]) {
      await firestore
          .collection('programWhatsappThreadViews')
          .doc(row['threadId']! as String)
          .set(row);
    }
    for (final row in [
      message('m1', ms(const Duration(minutes: -40))),
      message(
        'm2',
        ms(const Duration(minutes: -35)),
        author: 'planner',
        label: 'Arjun',
      ),
      message('m3', ms(const Duration(minutes: -30))),
    ]) {
      await firestore
          .collection('programWhatsappMessages')
          .doc(row['messageId']! as String)
          .set(row);
    }
    await firestore.collection('programWhatsappMessages').doc('other').set({
      ...message('other', 1),
      'threadId': 'p1_h9',
    });
    for (final (id, order, archived) in [
      ('late', 2, false),
      ('early', 1, false),
      ('old', 0, true),
    ]) {
      await firestore
          .collection('programWhatsappCannedReplies')
          .doc('p1_$id')
          .set({
            'programId': 'p1',
            'organizerId': 'o1',
            'cannedReplyId': id,
            'label': id,
            'variants': [
              {'language': 'en', 'text': 'Hello $id'},
            ],
            'sortOrder': order,
            'archived': archived,
            'revision': 1,
          });
    }
    return firestore;
  }

  ProgramInboxViewsRepository repository(FakeFirebaseFirestore firestore) {
    final clock = AppClock.custom(() => now);
    return ProgramInboxViewsRepository(
      firestore,
      ProgramAccessRepository(firestore, clock),
      clock,
    );
  }

  test(
    'the communications and guest relations duties read every thread row',
    () async {
      for (final duty in ['communications', 'guestRelations']) {
        final firestore = await seeded(access(duties: {duty: hour}));
        final rows = await repository(
          firestore,
        ).watchThreadRows('p1', 'u1').first;
        expect(rows.map((row) => row['threadId']).toSet(), {
          'p1_h1',
          'p1_h2',
          'p1_h3',
        }, reason: duty);
      }
    },
  );

  test(
    'another duty is denied, and so is an expired communications duty',
    () async {
      final gone = ms(const Duration(seconds: -1));
      for (final view in [
        access(duties: {'hotelDesk': hour}),
        access(duties: {'functionCheckIn': hour}),
        access(duties: {'communications': gone}, expiresAt: gone),
      ]) {
        final firestore = await seeded(view);
        await expectLater(
          repository(firestore).watchThreadRows('p1', 'u1'),
          emitsError(isA<PermissionException>()),
        );
      }
    },
  );

  test(
    'a conversation holds its messages oldest first with author names',
    () async {
      final firestore = await seeded(access(role: 'manager'));
      final thread = await repository(
        firestore,
      ).watchThread('p1', 'p1_h1', 'u1').first;
      expect(thread.messages.map((m) => m.messageId), ['m1', 'm2', 'm3']);
      expect(thread.messages[1].authorName, 'Arjun');
      expect(thread.messages[0].authorName, isNull);
      expect(thread.truncated, isFalse);
      expect(thread.household!.label, 'The Mehra family');
      expect(thread.household!.guestCount, 4);
      expect(thread.summary.unreadCount, 1);
      expect(thread.summary.serviceWindowOpen, isTrue);
    },
  );

  test('the 24-hour window is the clock: closed past its instant', () async {
    final firestore = await seeded(access(role: 'manager'));
    final closed = await repository(
      firestore,
    ).watchThread('p1', 'p1_h3', 'u1').first;
    expect(closed.summary.serviceWindowOpen, isFalse);
    expect(closed.household, isNull);
  });

  test('the inbox splits segments and counts them from the rows', () {
    final rows = [
      thread('p1_h1', lastMessageAt: 10),
      thread('p1_h2', state: 'handled', lastMessageAt: 30),
      thread('p1_h3', lastMessageAt: 20),
    ];
    final inbox = programWhatsappInboxFromViews(
      programId: 'p1',
      filter: ProgramWhatsappFilter.needsYou,
      rows: rows,
      sender: null,
      now: now,
    );
    expect(inbox.needsYou, 2);
    expect(inbox.handled, 1);
    expect(inbox.all, 3);
    expect(inbox.threads.map((t) => t.threadId), ['p1_h3', 'p1_h1']);
  });

  test('saved replies list by sort order without the archived ones', () async {
    final firestore = await seeded(access(role: 'manager'));
    final replies = await repository(
      firestore,
    ).watchCannedReplies('p1', 'u1').first;
    expect(replies.map((reply) => reply.cannedReplyId), ['early', 'late']);
  });

  test('a new message arrives with no new subscription', () async {
    final firestore = await seeded(access(role: 'manager'));
    final seen = <int>[];
    final subscription = repository(firestore)
        .watchThread('p1', 'p1_h1', 'u1')
        .listen((t) => seen.add(t.messages.length));
    await Future<void>.delayed(const Duration(milliseconds: 30));
    expect(seen.last, 3);
    await firestore
        .collection('programWhatsappMessages')
        .doc('m4')
        .set(message('m4', ms(const Duration(minutes: -1))));
    await Future<void>.delayed(const Duration(milliseconds: 30));
    expect(seen.last, 4);
    await subscription.cancel();
  });
}
