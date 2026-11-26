import 'dart:async';

import 'package:catch_dating_app/contexts/forms/data/forms/host_form_admission_gateway.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_admission.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/persistence/memory_command_journal_storage.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_offer_controller_test_support.dart';

const scope = HostFormAdmissionScope(
  organizerId: 'org',
  eventId: 'event',
  responseId: 'response',
  contactId: 'contact',
  offerId: 'offer',
);
Map<String, Object?> ready() => {
  ...scope.toJson(),
  'canCommit': true,
  'expectedOfferRevision': 2,
  'expectedOfferGeneration': 1,
  'expectedLedgerRevision': 3,
  'paymentAuthority': 'explicitFree',
  'seatAlreadyOccupied': false,
  'blocker': null,
};
Map<String, Object?> receipt(HostFormAdmissionCommand command) => {
  ...scope.toJson(),
  'receiptId': 'receipt',
  'attendeeId': 'attendee',
  'canonicalSeatKey': 'seat',
  'requestId': command.requestId,
  'requestHash': command.requestHash,
  'resultingLedgerRevision': 4,
  'admittedAtMillis': 1800000000000,
  'replayed': false,
  'seatAlreadyOccupied': false,
};

void main() {
  test(
    'readiness and receipts reject wrong scope and fabricated authority',
    () {
      for (final patch in [
        {'contactId': 'other'},
        {'expectedLedgerRevision': 0},
        {'paymentAuthority': 'providerPaid'},
        {'blocker': 'unexpected'},
      ]) {
        expect(
          () =>
              HostFormAdmissionPreview.fromData({...ready(), ...patch}, scope),
          throwsFormatException,
        );
      }
      final command = HostFormAdmissionPreview.fromData(
        ready(),
        scope,
      ).command('request-123');
      for (final patch in [
        {'responseId': 'other'},
        {'requestId': 'wrong'},
        {'requestHash': 'a' * 64},
        {'resultingLedgerRevision': 0},
      ]) {
        expect(
          () => HostFormAdmissionReceipt.fromData({
            ...receipt(command),
            ...patch,
          }, command),
          throwsFormatException,
        );
      }
    },
  );

  test(
    'uncertain commit survives recreation and retries the exact request',
    () async {
      final gateway = _Gateway()..failure = TimeoutException('Unknown outcome');
      final storage = MemoryCommandJournalStorage();
      addTearDown(storage.close);
      JournalHostFormAdmissionOutbox outbox() => JournalHostFormAdmissionOutbox(
        gateway: gateway,
        storage: () async => storage,
        currentAccountId: () => 'manager',
      );
      final first = TestHostFormAdmissionController(
        accountId: 'manager',
        scope: scope,
        gateway: gateway,
        outbox: outbox(),
        currentAccountId: () => 'manager',
      );
      await first.review();
      expect(gateway.commands, isEmpty);
      await first.confirm();
      expect(first.receipt, isNull);
      expect(first.pending, isNotNull);
      final original = gateway.commands.single.toJson();
      first.dispose();

      final restored = TestHostFormAdmissionController(
        accountId: 'manager',
        scope: scope,
        gateway: gateway,
        outbox: outbox(),
        currentAccountId: () => 'manager',
      );
      addTearDown(restored.dispose);
      await restored.review();
      expect(restored.pending, isNotNull);
      expect(restored.preview, isNull);
      await expectLater(
        outbox().reviewAgain('manager', scope),
        throwsStateError,
      );
      gateway.failure = null;
      await restored.confirm();
      expect(gateway.commands.last.toJson(), original);
      expect(restored.receipt?.attendeeId, 'attendee');
      expect(await outbox().pending('manager', scope), isNull);
    },
  );

  test(
    'definitively rejected command must be reviewed again before replacement',
    () async {
      final gateway = _Gateway()
        ..failure = const ValidationException('Offer changed.');
      final storage = MemoryCommandJournalStorage();
      addTearDown(storage.close);
      final outbox = JournalHostFormAdmissionOutbox(
        gateway: gateway,
        storage: () async => storage,
        currentAccountId: () => 'manager',
      );
      final controller = TestHostFormAdmissionController(
        accountId: 'manager',
        scope: scope,
        gateway: gateway,
        outbox: outbox,
        currentAccountId: () => 'manager',
      );
      addTearDown(controller.dispose);
      await controller.review();
      await controller.confirm();
      expect(controller.pending?.needsReview, isTrue);
      await controller.confirm();
      expect(gateway.commands, hasLength(1));
      gateway.failure = null;
      await controller.reviewAgain();
      expect(controller.pending, isNull);
      expect(controller.preview?.canCommit, isTrue);
      await controller.confirm();
      expect(gateway.commands, hasLength(2));
      expect(
        gateway.commands.last.requestId,
        isNot(gateway.commands.first.requestId),
      );
    },
  );

  test('late preview cannot render or admit after an account change', () async {
    var account = 'manager';
    final pending = Completer<HostFormAdmissionPreview>();
    final gateway = _Gateway()..previewResult = pending;
    final storage = MemoryCommandJournalStorage();
    addTearDown(storage.close);
    final controller = TestHostFormAdmissionController(
      accountId: 'manager',
      scope: scope,
      gateway: gateway,
      currentAccountId: () => account,
      outbox: JournalHostFormAdmissionOutbox(
        gateway: gateway,
        storage: () async => storage,
        currentAccountId: () => account,
      ),
    );
    addTearDown(controller.dispose);
    final load = controller.review();
    await flushTestEventQueue();
    account = 'other';
    pending.complete(HostFormAdmissionPreview.fromData(ready(), scope));
    await load;
    expect(controller.preview, isNull);
    await controller.confirm();
    expect(gateway.commands, isEmpty);
  });
}

class _Gateway implements HostFormAdmissionGateway {
  Object? failure;
  Completer<HostFormAdmissionPreview>? previewResult;
  final commands = <HostFormAdmissionCommand>[];
  @override
  Future<HostFormAdmissionPreview> preview(
    HostFormAdmissionScope scope,
  ) async =>
      previewResult?.future ??
      HostFormAdmissionPreview.fromData(ready(), scope);
  @override
  Future<HostFormAdmissionReceipt> commit(
    HostFormAdmissionCommand command,
  ) async {
    commands.add(command);
    if (failure case final error?) throw error;
    return HostFormAdmissionReceipt.fromData(receipt(command), command);
  }
}
