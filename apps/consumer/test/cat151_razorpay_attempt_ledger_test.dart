import 'package:flutter_test/flutter_test.dart';

import '../integration_test/support/cat151_razorpay_attempt_ledger.dart';

void main() {
  late _MemoryStore store;
  late Cat151AttemptLedger ledger;

  setUp(() {
    store = _MemoryStore();
    ledger = Cat151AttemptLedger(store: store, nowMillis: () => 1700000000000);
  });

  Future<Cat151AttemptLedgerState> bind({
    String uid = 'synthetic-user',
    String eventId = 'synthetic-event',
    String seed = 'cat151-seed',
  }) => ledger.bindScope(
    projectId: 'catch-staging',
    uid: uid,
    eventId: eventId,
    seedPrefix: seed,
  );

  test('binds one durable scope per Firebase project', () async {
    final state = await bind();
    final reloaded = await Cat151AttemptLedger(
      store: store,
    ).load('catch-staging');

    expect(reloaded?.toJson(), state.toJson());
    expect(state.attempts, isEmpty);
  });

  test('reserves attempt before checkout and preserves uncertainty', () async {
    final reserved = await ledger.reserveNext(await bind());
    final afterProcessDeath = await Cat151AttemptLedger(
      store: store,
    ).load('catch-staging');

    expect(reserved.attempts.single.status, Cat151AttemptStatus.reserved);
    expect(
      afterProcessDeath?.attempts.single.status,
      Cat151AttemptStatus.reserved,
    );
  });

  test('never unlocks attempt two automatically', () async {
    final reserved = await ledger.reserveNext(await bind());

    await expectLater(
      ledger.reserveNext(reserved),
      throwsA(isA<Cat151AttemptLedgerException>()),
    );
  });

  test('requires the exact explicit confirmation for attempt two', () async {
    final first = await ledger.reserveNext(await bind());
    await expectLater(
      ledger.authorizeSecondAttempt(first, confirmation: 'yes'),
      throwsA(isA<Cat151AttemptLedgerException>()),
    );

    final authorized = await ledger.authorizeSecondAttempt(
      first,
      confirmation: cat151SecondAttemptConfirmation,
    );
    final second = await ledger.reserveNext(authorized);
    expect(second.attempts.map((attempt) => attempt.number), [1, 2]);
  });

  test('hard-stops after two attempts or a known admission', () async {
    final first = await ledger.reserveNext(await bind());
    final authorized = await ledger.authorizeSecondAttempt(
      first,
      confirmation: cat151SecondAttemptConfirmation,
    );
    final second = await ledger.reserveNext(authorized);
    await expectLater(
      ledger.reserveNext(second),
      throwsA(isA<Cat151AttemptLedgerException>()),
    );

    final admittedLedger = Cat151AttemptLedger(
      store: _MemoryStore(),
      nowMillis: () => 1700000000000,
    );
    final admittedScope = await admittedLedger.bindScope(
      projectId: 'other-project',
      uid: 'synthetic-user',
      eventId: 'synthetic-event',
      seedPrefix: 'cat151-seed',
    );
    final admittedAttempt = await admittedLedger.reserveNext(admittedScope);
    final admitted = await admittedLedger.markAdmitted(
      admittedAttempt,
      attemptNumber: 1,
      paymentId: 'pay-test',
      orderId: 'order-test',
    );
    await expectLater(
      admittedLedger.reserveNext(admitted),
      throwsA(isA<Cat151AttemptLedgerException>()),
    );
    await expectLater(
      admittedLedger.markRefunded(
        admitted,
        attemptNumber: 1,
        paymentId: 'different-payment',
        orderId: 'order-test',
      ),
      throwsA(isA<Cat151AttemptLedgerException>()),
    );
    final refunded = await admittedLedger.markRefunded(
      admitted,
      attemptNumber: 1,
      paymentId: 'pay-test',
      orderId: 'order-test',
    );
    await expectLater(
      admittedLedger.markAdmitted(
        refunded,
        attemptNumber: 1,
        paymentId: 'pay-test',
        orderId: 'order-test',
      ),
      throwsA(isA<Cat151AttemptLedgerException>()),
    );
  });

  test('rejects a different identity, event, or seed in the project', () async {
    await bind();

    for (final changed in [
      (uid: 'other-user', eventId: 'synthetic-event', seed: 'cat151-seed'),
      (uid: 'synthetic-user', eventId: 'other-event', seed: 'cat151-seed'),
      (uid: 'synthetic-user', eventId: 'synthetic-event', seed: 'other-seed'),
    ]) {
      await expectLater(
        bind(uid: changed.uid, eventId: changed.eventId, seed: changed.seed),
        throwsA(isA<Cat151AttemptLedgerException>()),
      );
    }
  });

  test('malformed persistence fails closed without replacement', () async {
    store.values['cat151_razorpay_acceptance_v1_Y2F0Y2gtc3RhZ2luZw=='] =
        '{"version":99}';

    await expectLater(
      ledger.load('catch-staging'),
      throwsA(isA<Cat151AttemptLedgerException>()),
    );
    expect(store.values.values.single, '{"version":99}');
  });
}

final class _MemoryStore implements Cat151StringStore {
  final values = <String, String>{};

  @override
  Future<String?> getString(String key) async => values[key];

  @override
  Future<void> setString(String key, String value) async {
    values[key] = value;
  }
}
