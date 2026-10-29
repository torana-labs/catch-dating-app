import 'package:catch_dating_app/contexts/connections/data/cross_paths_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_invitation.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_pair_hold.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

class _TestFirebaseFunctions extends Fake implements FirebaseFunctions {
  final callables = <String, _TestHttpsCallable>{};

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      callables.putIfAbsent(name, _TestHttpsCallable.new);
}

class _TestHttpsCallable extends Fake implements HttpsCallable {
  Object? response;
  final calls = <Object?>[];

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async {
    calls.add(parameters);
    return _TestHttpsCallableResult<T>(response as T);
  }
}

class _TestHttpsCallableResult<T> extends Fake
    implements HttpsCallableResult<T> {
  _TestHttpsCallableResult(this.value);
  final T value;

  @override
  T get data => value;
}

void main() {
  late FakeFirebaseFirestore firestore;
  late _TestFirebaseFunctions functions;
  late CrossPathsRepository repository;

  setUp(() {
    firestore = FakeFirebaseFirestore();
    functions = _TestFirebaseFunctions();
    repository = CrossPathsRepository(firestore, functions);
  });

  test(
    'incoming and outgoing invitation streams stay participant-scoped',
    () async {
      await firestore
          .collection('crossPathsInvitations')
          .doc('older')
          .set(
            _invitation(
              senderUid: 'runner-1',
              recipientUid: 'runner-2',
              updatedAt: DateTime.utc(2026, 8, 5),
            ),
          );
      await firestore
          .collection('crossPathsInvitations')
          .doc('newer')
          .set(
            _invitation(
              senderUid: 'runner-3',
              recipientUid: 'runner-2',
              eventId: 'event-2',
              updatedAt: DateTime.utc(2026, 8, 6),
            ),
          );

      final incoming = await repository
          .watchIncomingInvitations('runner-2')
          .first;
      final outgoing = await repository
          .watchOutgoingInvitation(uid: 'runner-1', eventId: 'event-1')
          .first;

      expect(incoming.map((row) => row.id), ['newer', 'older']);
      expect(outgoing?.id, 'older');
    },
  );

  test(
    'invitation mutations call only the server-owned lifecycle endpoints',
    () async {
      functions.callables['sendCrossPathsInvitation'] = _TestHttpsCallable()
        ..response = {
          'invitationId': 'invitation-1',
          'status': 'pending',
          'eventId': 'event-1',
          'recipientUid': 'runner-2',
          'expiresAt': '2026-08-08T12:00:00.000Z',
        };
      functions.callables['respondCrossPathsInvitation'] = _TestHttpsCallable()
        ..response = {
          'invitationId': 'invitation-1',
          'status': 'accepted',
          'conversationId': 'plan-1',
        };
      functions.callables['cancelCrossPathsInvitationOrPlan'] =
          _TestHttpsCallable()
            ..response = {
              'invitationId': 'invitation-1',
              'status': 'invalidated',
            };

      final sent = await repository.sendInvitation(
        eventId: 'event-1',
        recipientUid: 'runner-2',
        suggestionToken: 'suggestion-token-value',
      );
      final accepted = await repository.respondToInvitation(
        invitationId: 'invitation-1',
        accept: true,
      );
      final cancelled = await repository.cancelInvitationOrPlan('invitation-1');

      expect(sent.status, CrossPathsInvitationStatus.pending);
      expect(accepted.conversationId, 'plan-1');
      expect(cancelled.status, CrossPathsInvitationStatus.invalidated);
      expect(functions.callables['sendCrossPathsInvitation']!.calls, [
        {
          'eventId': 'event-1',
          'recipientUid': 'runner-2',
          'suggestionToken': 'suggestion-token-value',
        },
      ]);
      expect(functions.callables['respondCrossPathsInvitation']!.calls, [
        {'invitationId': 'invitation-1', 'decision': 'accept'},
      ]);
      expect(functions.callables['cancelCrossPathsInvitationOrPlan']!.calls, [
        {'invitationId': 'invitation-1'},
      ]);
    },
  );

  test('pair hold watch is participant-readable and typed', () async {
    await firestore.collection('crossPathsPairHolds').doc('hold-1').set({
      'eventId': 'event-1',
      'invitationId': 'invitation-1',
      'requesterUid': 'runner-1',
      'attendeeUid': 'runner-2',
      'participantIds': ['runner-1', 'runner-2'],
      'status': 'active',
      'requesterBookingStatus': 'held',
      'attendeeBookingStatus': 'signedUp',
      'requesterPriceInPaise': 0,
      'currency': 'INR',
      'expiresAt': Timestamp.fromDate(DateTime.utc(2026, 8, 6, 12, 15)),
      'conversationId': null,
    });

    final hold = await repository.watchPairHold('hold-1').first;

    expect(hold?.status, CrossPathsPairHoldStatus.active);
    expect(hold?.requesterBookingStatus, 'held');
    expect(hold?.attendeeBookingStatus, 'signedUp');
  });
}

Map<String, Object?> _invitation({
  required String senderUid,
  required String recipientUid,
  required DateTime updatedAt,
  String eventId = 'event-1',
}) => {
  'eventId': eventId,
  'senderUid': senderUid,
  'recipientUid': recipientUid,
  'participantIds': [senderUid, recipientUid],
  'status': 'pending',
  'createdAt': Timestamp.fromDate(updatedAt),
  'updatedAt': Timestamp.fromDate(updatedAt),
  'expiresAt': Timestamp.fromDate(updatedAt.add(const Duration(days: 1))),
  'respondedAt': null,
  'cancelledAt': null,
  'invalidatedAt': null,
  'invalidationReason': null,
  'conversationId': null,
};
