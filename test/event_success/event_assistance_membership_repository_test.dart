import 'package:catch_dating_app/contexts/live/data/event_assistance_guest_views.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_membership_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_guest_view_fixtures.dart';
import 'event_assistance_membership_fixtures.dart';

const _end = 3000000;
const _noExpiry = 9007199254740991;
final _receivers = [
  {
    'operatorId': 'host-1',
    'displayName': 'Host',
    'groups': [
      {'groupId': 'easy', 'validUntil': _noExpiry},
      {'groupId': 'tempo', 'validUntil': _noExpiry},
    ],
  },
  {
    'operatorId': 'pacer-1',
    'displayName': null,
    'groups': [
      {'groupId': 'tempo', 'validUntil': 1500},
    ],
  },
];

void main() {
  late _Functions functions;
  late FakeFirebaseFirestore firestore;
  late GuestViewTestClock time;
  late EventAssistanceMembershipRepository repository;
  setUp(() {
    functions = _Functions();
    firestore = FakeFirebaseFirestore();
    time = GuestViewTestClock(1000);
    repository = EventAssistanceMembershipRepository(
      functions,
      firestore,
      clock: time.clock,
    );
  });
  Future<void> seed(Map<String, Object?> response) => seedGuestView(
    firestore,
    EventAssistanceGuestViews.memberships,
    membershipViewDoc(
      response,
      scope: membershipScope,
      evaluatedAt: 900,
      endAt: _end,
      receivers: _receivers,
    ),
  );
  Future<EventAssistanceMembershipView> first({String actorUid = 'host-1'}) =>
      repository.watch(membershipScope, actorUid: actorUid).first;

  test('the membership is a manager listener and calls nothing', () async {
    await seed(membershipWire());
    final view = await first();
    expect(view.membership, isA<AssistanceUninitializedMembership>());
    expect(view.serverTime, 1000);
    expect(view.actions, {
      AssistanceMembershipAction.place,
      AssistanceMembershipAction.propose,
    });
    expect(functions.calls, isEmpty);
  });

  test(
    'the receiver review ends with the window and drops expired duties',
    () async {
      await seed(membershipWire());
      var review = (await first()).handoverReview!;
      expect(review.expiresAt, 1000 + membershipHandoverReviewWindow);
      expect(review.receivers.map((r) => r.operatorId), ['host-1', 'pacer-1']);
      expect(review.receivers.first.groups, {
        'easy': review.expiresAt,
        'tempo': review.expiresAt,
      });
      expect(review.receivers.last.groups, {'tempo': 1500});
      time.now = 2000;
      review = (await first()).handoverReview!;
      expect(review.receivers.map((r) => r.operatorId), ['host-1']);
      time.now = _end - 1000;
      expect((await first()).handoverReview!.expiresAt, _end);
    },
  );

  test('readiness ends with the event by the app clock', () async {
    await seed(membershipWire(state: 'current'));
    expect((await first()).ready, isTrue);
    time.now = _end;
    final ended = await first();
    expect(ended.ready, isFalse);
    expect(ended.actions, {AssistanceMembershipAction.leave});
    expect(ended.handoverReview, isNull);
  });

  test('only the receiving manager can accept, and a transfer expires by the '
      'app clock', () async {
    await seed(membershipWire(state: 'pending'));
    expect((await first()).actions, {
      AssistanceMembershipAction.cancel,
      AssistanceMembershipAction.leave,
    });
    expect((await first(actorUid: 'host-2')).actions, {
      AssistanceMembershipAction.accept,
      AssistanceMembershipAction.reject,
      AssistanceMembershipAction.cancel,
      AssistanceMembershipAction.leave,
    });
    time.now = 5000;
    final expired = await first(actorUid: 'host-2');
    expect(
      (expired.transfer! as AssistancePendingTransfer).state,
      AssistancePendingTransferState.expired,
    );
    expect(expired.actions, {
      AssistanceMembershipAction.propose,
      AssistanceMembershipAction.cancel,
      AssistanceMembershipAction.leave,
    });
  });
  test(
    'uncertain retries retain all reviewed fences and the exact original decision',
    () async {
      final change = membershipChange();
      functions.error = FirebaseFunctionsException(
        code: 'unavailable',
        message: 'Offline',
      );
      await expectLater(
        repository.apply(change),
        throwsA(isA<NetworkException>()),
      );
      functions.error = null;
      functions.response = membershipAppliedWire(change);
      final result = await repository.apply(change);
      expect(result.view.accepted?.groupId, 'easy');
      expect(functions.calls.map((c) => c.name).toSet(), {
        'transferEventAssistanceGroup',
      });
      expect(functions.calls.first.input, {
        'command': change.command,
        'expectedSourceHash': change.snapshot.sourceHash,
      });
      expect(functions.calls.last.input, functions.calls.first.input);
    },
  );
  test('missing, invalid and foreign views and unconfirmed mutation responses '
      'are visible errors', () async {
    await expectLater(
      first(),
      throwsA(
        isA<BackendOperationException>().having(
          (e) => e.code,
          'code',
          'live-view-missing',
        ),
      ),
    );
    final doc = membershipViewDoc(
      membershipWire(),
      scope: membershipScope,
      evaluatedAt: 900,
      endAt: _end,
    );
    await seedGuestView(firestore, EventAssistanceGuestViews.memberships, {
      ...doc,
      'sourceCoverage': 'invalidSource',
      'incompleteSource': 'eventAssistanceMemberships',
    });
    await expectLater(
      first(),
      throwsA(
        isA<BackendOperationException>().having(
          (e) => e.code,
          'code',
          'live-view-invalid-source',
        ),
      ),
    );
    await seedGuestView(firestore, EventAssistanceGuestViews.memberships, {
      ...doc,
      'organizerId': 'other-organizer',
    });
    await expectLater(first(), throwsA(isA<BackendOperationException>()));
    final change = membershipChange();
    final wire = membershipAppliedWire(change);
    (wire['view']! as Map)['accepted'] = acceptedGroupWire(
      group: 'tempo',
      at: 2000,
    );
    functions.response = wire;
    await expectLater(
      repository.apply(change),
      throwsA(isA<BackendOperationException>()),
    );
  });
}

class _Functions extends Fake implements FirebaseFunctions {
  Object? response, error;
  final calls = <({String name, Object? input})>[];
  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _Callable(this, name);
}

class _Callable extends Fake implements HttpsCallable {
  _Callable(this.owner, this.name);
  final _Functions owner;
  final String name;
  @override
  Future<HttpsCallableResult<T>> call<T>([Object? parameters]) async {
    owner.calls.add((name: name, input: parameters));
    if (owner.error case final error?) throw error;
    return _Result<T>(owner.response as T);
  }
}

class _Result<T> extends Fake implements HttpsCallableResult<T> {
  _Result(this.data);
  @override
  final T data;
}
