import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/phone_contact_picker.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_contact.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_contact_reference.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_draft.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_controller.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

class SyntheticPicker implements PhoneContactPicker {
  PhoneContactPickerResult result = PhoneContactPickerResult(
    PhoneContactPickerStatus.selected,
  );
  Completer<PhoneContactPickerResult>? pending;
  int calls = 0;
  @override
  Future<PhoneContactPickerResult> pickContacts() {
    calls++;
    return pending?.future ?? Future.value(result);
  }
}

PhoneContact contact(String id, String name, List<String> values) =>
    PhoneContact(
      localId: id,
      displayName: name,
      numbers: values
          .map((value) => PhoneContactNumber(value: value, label: 'mobile'))
          .toList(),
    );
void main() {
  test(
    'selected contact references are stable only in the same account and wedding',
    () {
      String reference(String actor, String program, String local) =>
          phoneContactReferenceId(
            accountId: actor,
            programId: program,
            localContactId: local,
          );
      final original = reference('client', 'wedding', 'synthetic-native-id');
      expect(reference('client', 'wedding', 'synthetic-native-id'), original);
      expect(
        reference('parent', 'wedding', 'synthetic-native-id'),
        isNot(original),
      );
      expect(
        reference('client', 'other-wedding', 'synthetic-native-id'),
        isNot(original),
      );
      expect(
        reference('client', 'wedding', 'different-native-id'),
        isNot(original),
      );
      expect(original, isNot(contains('synthetic-native-id')));
      expect(RegExp(r'^[A-Za-z0-9_-]{8,120}$').hasMatch(original), isTrue);
    },
  );

  late SyntheticPicker picker;
  late PhoneImportController controller;
  setUp(() {
    picker = SyntheticPicker();
    controller = PhoneImportController(picker: picker);
  });
  tearDown(() => controller.dispose());
  Future<void> select(List<PhoneContact> contacts) async {
    picker.result = PhoneContactPickerResult(
      PhoneContactPickerStatus.selected,
      contacts,
    );
    await controller.pickContacts();
  }

  test(
    'multiple numbers require a chosen number; nameless guest needs reviewed name',
    () async {
      await select([
        contact('multi', '', ['+12025550101', '+12025550102']),
      ]);
      final id = controller.entries.single.id;
      controller.confirmSharing(true);
      expect(controller.canReview, false);
      controller.rename(id, 'Synthetic guest');
      controller.choosePhone(id, '+12025550102');
      expect(controller.sharingConfirmed, false);
      controller.confirmSharing(true);
      expect(controller.canReview, true);
      expect(controller.entries.single.nameEdited, true);
      expect(controller.entries.single.originalName, isEmpty);
    },
  );
  test(
    'shared phones keep separate guests and expose review warning',
    () async {
      await select([
        contact('one', 'Asha', ['+1 (202) 555-0101']),
        contact('two', 'Ravi', ['+12025550101']),
      ]);
      expect(controller.entries.length, 2);
      expect(controller.sharedPhones, {'+12025550101'});
      expect(controller.entries.map((entry) => entry.id).toSet().length, 2);
    },
  );
  test(
    'repeated selection deduplicates by local contact only and preserves chosen edits',
    () async {
      await select([
        contact('one', 'Asha', ['+12025550101']),
      ]);
      final id = controller.entries.single.id;
      controller.rename(id, 'Asha Shah');
      controller.assignHousehold(id, 'Shah household');
      controller.assignFamilySide(id, PhoneImportFamilySide.partnerOne);
      await select([
        contact('one', 'Asha', ['+12025550101', '+12025550102']),
      ]);
      expect(controller.entries.length, 1);
      expect(controller.entries.single.id, id);
      expect(controller.entries.single.numbers.length, 2);
      expect(controller.entries.single.displayName, 'Asha Shah');
      expect(controller.entries.single.household, 'Shah household');
      expect(
        controller.entries.single.familySide,
        PhoneImportFamilySide.partnerOne,
      );
    },
  );
  test(
    'no-number picker entries cannot become importable; household member can',
    () async {
      await select([contact('no-phone', 'Guest', [])]);
      controller.confirmSharing(true);
      expect(controller.canReview, false);
      controller.remove(controller.entries.single.id);
      controller.addHouseholdMember(
        name: 'Synthetic child',
        household: 'Shah household',
      );
      controller.confirmSharing(true);
      expect(controller.canReview, true);
      expect(controller.entries.single.selectedPhone, isNull);
      expect(
        controller.entries.single.source,
        PhoneImportEntrySource.manualHouseholdMember,
      );
    },
  );
  test('explicit sharing resets after every request-defining change', () async {
    await select([
      contact('one', 'Asha', ['+12025550101']),
    ]);
    final id = controller.entries.single.id;
    controller.confirmSharing(true);
    controller.assignFamilySide(id, PhoneImportFamilySide.both);
    expect(controller.canReview, false);
    controller.confirmSharing(true);
    controller.assignHousehold(id, 'New household');
    expect(controller.sharingConfirmed, false);
  });
  test(
    'stable review snapshot retries locally; edits invalidate snapshot',
    () async {
      await select([
        contact('one', 'Asha', ['+12025550101']),
      ]);
      controller.confirmSharing(true);
      final first = controller.prepareReview()!;
      expect(identical(first, controller.prepareReview()), true);
      controller.rename(controller.entries.single.id, 'Reviewed Asha');
      expect(controller.prepareReview(), isNull);
      controller.confirmSharing(true);
      expect(controller.prepareReview()!.reviewId, isNot(first.reviewId));
      expect(first.entries.single.displayName, 'Asha');
    },
  );
  for (final status in [
    PhoneContactPickerStatus.cancelled,
    PhoneContactPickerStatus.denied,
    PhoneContactPickerStatus.failed,
  ]) {
    test('$status keeps selected review and never loops', () async {
      await select([
        contact('one', 'Asha', ['+12025550101']),
      ]);
      controller.confirmSharing(true);
      picker.result = PhoneContactPickerResult(status);
      await controller.pickContacts();
      expect(controller.entries.length, 1);
      expect(controller.notice, isNotNull);
      expect(controller.sharingConfirmed, true);
      expect(picker.calls, 2);
    });
  }
  test(
    'thrown native error preserves review and allows manual retry',
    () async {
      await select([
        contact('one', 'Synthetic guest', ['+12025550101']),
      ]);
      controller.confirmSharing(true);
      final review = controller.prepareReview()!;
      final selectedEntry = controller.entries.single;
      picker.pending = Completer();
      final pick = controller.pickContacts();
      expect(controller.interactionLocked, true);
      picker.pending!.completeError(PlatformException(code: 'native_failure'));
      await pick;

      expect(controller.notice, PhoneImportNotice.failed);
      expect(controller.picking, false);
      expect(controller.interactionLocked, false);
      expect(controller.entries.single, same(selectedEntry));
      expect(controller.sharingConfirmed, true);
      expect(controller.prepareReview(), same(review));
      expect(picker.calls, 2);

      picker.pending = null;
      await controller.pickContacts();
      expect(controller.notice, isNull);
      expect(controller.prepareReview(), same(review));
      expect(picker.calls, 3);
    },
  );
  test('pending picker freezes peer changes and duplicate taps', () async {
    await select([
      contact('one', 'Asha', ['+12025550101']),
    ]);
    picker.pending = Completer();
    final future = controller.pickContacts();
    await controller.pickContacts();
    controller.rename(controller.entries.single.id, 'Changed');
    controller.remove(controller.entries.single.id);
    controller.addHouseholdMember(name: 'Ignored');
    expect(controller.entries.single.displayName, 'Asha');
    expect(picker.calls, 2);
    picker.pending!.complete(
      PhoneContactPickerResult(PhoneContactPickerStatus.cancelled),
    );
    await future;
    expect(controller.picking, false);
  });
  test(
    'discard invalidates an outstanding callback and clears all local evidence',
    () async {
      picker.pending = Completer();
      final future = controller.pickContacts();
      controller.discard();
      picker.pending!.complete(
        PhoneContactPickerResult(PhoneContactPickerStatus.selected, [
          contact('one', 'Asha', ['+12025550101']),
        ]),
      );
      await future;
      expect(controller.entries, isEmpty);
      expect(controller.prepareReview(), isNull);
    },
  );
  test(
    'local number needs explicit country review and re-selection clears it',
    () async {
      await select([
        contact('local', 'Synthetic guest', ['202-555-0100', '202-555-0101']),
      ]);
      final id = controller.entries.single.id;
      controller.choosePhone(id, '202-555-0100');
      controller.confirmSharing(true);
      expect(controller.canReview, false);
      controller.reviewInternationalPhone(id, '+1 (202) 555-0100');
      expect(controller.sharingConfirmed, false);
      controller.confirmSharing(true);
      expect(controller.canReview, true);
      expect(controller.entries.single.phoneForImport, '+12025550100');
      controller.choosePhone(id, '202-555-0101');
      expect(controller.entries.single.reviewedInternationalPhone, isNull);
      expect(controller.entries.single.phoneForImport, isNull);
      expect(controller.sharingConfirmed, false);
    },
  );
  test(
    'invalid number cannot be substituted into a selected contact',
    () async {
      await select([
        contact('one', 'Asha', ['+12025550101']),
      ]);
      controller.choosePhone(controller.entries.single.id, '+12025550999');
      expect(controller.entries.single.selectedPhone, '+12025550101');
    },
  );
}
