import 'dart:async';
import 'dart:io';

import 'package:catch_dating_app/contexts/programmes/data/phone_contact_picker.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_contact.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_draft.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_controller.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_review_screen.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/catch_test_fonts.dart';
import '../../test_pump_helpers.dart';
import '../../ui_captures/support/capture_device.dart';
import '../../ui_captures/support/capture_pump.dart';

const _wedding = 'Asha & Ravi · sample wedding';
const _mobile = '+1 202 555 0106';
const _home = '+1 202 555 0107';

void main() {
  testWidgets(
    'chooses a number, edits guest grouping, and confirms the exact scope',
    (tester) async {
      final picker = _Picker([
        PhoneContactPickerResult(PhoneContactPickerStatus.selected, [
          PhoneContact(
            localId: 'sample-one',
            displayName: '',
            numbers: const [
              PhoneContactNumber(value: _mobile, label: 'Mobile'),
              PhoneContactNumber(value: _home, label: 'Home'),
            ],
          ),
        ]),
      ]);
      final controller = PhoneImportController(picker: picker);
      addTearDown(controller.dispose);
      await _mount(tester, controller);
      expect(find.text('No guests selected'), findsOneWidget);
      await _tap(tester, const ValueKey('phone-import-pick'));
      final id = controller.entries.single.id;
      expect(controller.entries.single.selectedPhone, isNull);
      await _edit(tester, ValueKey('phone-import-name-$id'), 'Mira Rao');
      await _select(
        tester,
        ValueKey('phone-import-phone-$id'),
        'Home · $_home',
      );
      await _select(
        tester,
        ValueKey('phone-import-family-$id'),
        'Partner two’s side',
      );
      await _edit(
        tester,
        ValueKey('phone-import-household-$id'),
        'Rao household',
      );
      final entry = controller.entries.single;
      expect(entry.displayName, 'Mira Rao');
      expect(entry.selectedPhone, _home);
      expect(entry.familySide, PhoneImportFamilySide.partnerTwo);
      expect(entry.household, 'Rao household');
      expect(controller.canReview, isFalse);
      await _tap(tester, const ValueKey('phone-import-sharing'));
      expect(controller.canReview, isTrue);
      expect(
        find.textContaining(
          'with $_wedding and its authorized program collaborators',
        ),
        findsOneWidget,
      );
      expect(
        tester
            .widget<CatchButton>(
              find.byKey(const ValueKey('phone-import-share')),
            )
            .onPressed,
        isNull,
      );
      await _edit(tester, ValueKey('phone-import-name-$id'), 'Mira Shah');
      expect(controller.sharingConfirmed, isFalse);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('local chosen phone requires explicit international review', (
    tester,
  ) async {
    final controller = PhoneImportController(
      picker: _Picker([
        PhoneContactPickerResult(PhoneContactPickerStatus.selected, [
          PhoneContact(
            localId: 'synthetic-local',
            displayName: 'Synthetic guest',
            numbers: const [
              PhoneContactNumber(value: '202-555-0100', label: 'Mobile'),
            ],
          ),
        ]),
      ]),
    );
    addTearDown(controller.dispose);
    await _mount(tester, controller);
    await _tap(tester, const ValueKey('phone-import-pick'));
    final id = controller.entries.single.id;
    await _tap(tester, const ValueKey('phone-import-sharing'));
    expect(controller.canReview, isFalse);
    await _edit(
      tester,
      ValueKey('phone-import-international-$id'),
      '+1 202 555 0100',
    );
    expect(controller.entries.single.phoneForImport, '+12025550100');
    expect(controller.sharingConfirmed, isFalse);
    await _tap(tester, const ValueKey('phone-import-sharing'));
    expect(controller.canReview, isTrue);
    await _edit(
      tester,
      ValueKey('phone-import-international-$id'),
      '+0 202 555 0100',
    );
    expect(controller.canReview, isFalse);
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'no-number contacts require removal; household members need no phone',
    (tester) async {
      final controller = PhoneImportController(
        picker: _Picker([
          PhoneContactPickerResult(PhoneContactPickerStatus.selected, [
            PhoneContact(
              localId: 'sample-no-number',
              displayName: 'Ravi Rao',
              numbers: const [],
            ),
          ]),
        ]),
      );
      addTearDown(controller.dispose);
      await _mount(tester, controller);
      await _tap(tester, const ValueKey('phone-import-pick'));
      final id = controller.entries.single.id;
      expect(controller.entries.single.valid, isFalse);
      expect(
        find.textContaining('This contact has no phone number'),
        findsOneWidget,
      );
      await _tap(tester, ValueKey('phone-import-remove-$id'));
      await _tap(tester, const ValueKey('phone-import-add-member'));
      final manual = controller.entries.single;
      expect(manual.source, PhoneImportEntrySource.manualHouseholdMember);
      expect(manual.valid, isFalse);
      await _edit(
        tester,
        ValueKey('phone-import-name-${manual.id}'),
        'Mira Rao',
      );
      await _edit(
        tester,
        ValueKey('phone-import-household-${manual.id}'),
        'Rao household',
      );
      await _tap(tester, const ValueKey('phone-import-sharing'));
      expect(controller.canReview, isTrue);
      expect(controller.entries.single.selectedPhone, isNull);
      expect(
        find.text('No phone needed for this household member.'),
        findsOneWidget,
      );
      await _tap(tester, const ValueKey('phone-import-discard'));
      expect(controller.entries, isEmpty);
      expect(controller.sharingConfirmed, isFalse);
      expect(find.text('No guests selected'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'repeated selection stays deduplicated and shared phones stay separate',
    (tester) async {
      final contacts = [
        PhoneContact(
          localId: 'sample-one',
          displayName: 'Asha Shah',
          numbers: const [PhoneContactNumber(value: _mobile)],
        ),
        PhoneContact(
          localId: 'sample-two',
          displayName: 'Ravi Rao',
          numbers: const [PhoneContactNumber(value: _mobile)],
        ),
      ];
      final picker = _Picker([
        PhoneContactPickerResult(PhoneContactPickerStatus.selected, contacts),
        PhoneContactPickerResult(PhoneContactPickerStatus.selected, contacts),
      ]);
      final controller = PhoneImportController(picker: picker);
      addTearDown(controller.dispose);
      await _mount(tester, controller);
      await _tap(tester, const ValueKey('phone-import-pick'));
      expect(controller.entries, hasLength(2));
      expect(
        find.byKey(const ValueKey('phone-import-shared-phones')),
        findsOneWidget,
      );
      await _tap(tester, const ValueKey('phone-import-pick'));
      expect(picker.calls, 2);
      expect(controller.entries, hasLength(2));
      expect(controller.entries.map((entry) => entry.displayName), [
        'Asha Shah',
        'Ravi Rao',
      ]);
      expect(tester.takeException(), isNull);
    },
  );

  for (final status in [
    PhoneContactPickerStatus.cancelled,
    PhoneContactPickerStatus.denied,
    PhoneContactPickerStatus.unavailable,
    PhoneContactPickerStatus.failed,
  ]) {
    testWidgets('$status gives honest feedback without a permission loop', (
      tester,
    ) async {
      final picker = _Picker([PhoneContactPickerResult(status)]);
      final controller = PhoneImportController(picker: picker);
      addTearDown(controller.dispose);
      await _mount(tester, controller);
      await _tap(tester, const ValueKey('phone-import-pick'));
      expect(picker.calls, 1);
      expect(find.byKey(const ValueKey('phone-import-notice')), findsOneWidget);
      expect(controller.entries, isEmpty);
      expect(
        tester
            .widget<CatchButton>(
              find.byKey(const ValueKey('phone-import-pick')),
            )
            .onPressed,
        isNotNull,
      );
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('picker pending state freezes conflicting review controls', (
    tester,
  ) async {
    final picker = _PendingPicker();
    final controller = PhoneImportController(picker: picker)
      ..addHouseholdMember(name: 'Mira Rao');
    addTearDown(controller.dispose);
    await _mount(tester, controller);
    await _tap(tester, const ValueKey('phone-import-pick'), settle: false);
    expect(controller.picking, isTrue);
    for (final key in [
      'phone-import-pick',
      'phone-import-add-member',
      'phone-import-discard',
    ]) {
      expect(
        tester.widget<CatchButton>(find.byKey(ValueKey(key))).onPressed,
        isNull,
      );
    }
    expect(
      tester
          .widget<CheckboxListTile>(
            find.byKey(const ValueKey('phone-import-sharing')),
          )
          .onChanged,
      isNull,
    );
    picker.result.complete(
      PhoneContactPickerResult(PhoneContactPickerStatus.cancelled),
    );
    await pumpFeatureUi(tester);
    expect(controller.entries.single.displayName, 'Mira Rao');
    expect(tester.takeException(), isNull);
  });

  for (final scale in [1.0, 2.0]) {
    for (final size in [const Size(390, 812), const Size(1024, 1000)]) {
      testWidgets(
        'sharing remains reachable at $size / text scale $scale in both themes',
        (tester) async {
          tester.view.devicePixelRatio = 1;
          tester.view.physicalSize = size;
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetPhysicalSize);
          final controller = PhoneImportController(picker: _Picker([]))
            ..addHouseholdMember(name: 'Mira Rao', household: 'Rao household');
          addTearDown(controller.dispose);
          for (final theme in [AppTheme.light, AppTheme.dark]) {
            await _mount(tester, controller, scale: scale, theme: theme);
            await _tap(tester, const ValueKey('phone-import-sharing'));
            expect(tester.takeException(), isNull);
            await tester.ensureVisible(
              find.byKey(const ValueKey('phone-import-share')),
            );
            await pumpFeatureUi(tester);
            expect(
              find.byKey(const ValueKey('phone-import-share')).hitTestable(),
              findsOneWidget,
            );
            expect(
              tester
                  .widget<CatchButton>(
                    find.byKey(const ValueKey('phone-import-share')),
                  )
                  .onPressed,
              isNull,
            );
            await tester.pumpWidget(const SizedBox.shrink());
            await tester.pump();
          }
        },
      );
    }
  }

  const captureDirectory = String.fromEnvironment(
    'PHONE_IMPORT_CAPTURE_DIRECTORY',
  );
  if (captureDirectory.isNotEmpty) {
    TestWidgetsFlutterBinding.ensureInitialized();
    setUpAll(loadCatchTestFonts);
    for (final scale in [1.0, 2.0]) {
      for (final state in ['selection', 'guest', 'sharing']) {
        testWidgets('capture $state at text scale $scale', (tester) async {
          final controller = PhoneImportController(
            picker: _Picker([
              PhoneContactPickerResult(PhoneContactPickerStatus.selected, [
                PhoneContact(
                  localId: 'sample-asha',
                  displayName: 'Asha Shah',
                  numbers: const [
                    PhoneContactNumber(value: _mobile, label: 'Mobile'),
                    PhoneContactNumber(value: _home, label: 'Home'),
                  ],
                ),
              ]),
            ]),
          );
          addTearDown(controller.dispose);
          if (state != 'selection') await controller.pickContacts();
          await captureCatchWidget(
            tester,
            id: 'phone-import-$state-$scale',
            device: CaptureDevice.iphone17Pro,
            textScale: scale,
            disableAnimations: true,
            outputDirectory: Directory(captureDirectory),
            builder: (_) => PhoneImportReviewScreen(
              controller: controller,
              weddingName: _wedding,
            ),
            drive: state == 'selection'
                ? null
                : (tester) async {
                    final key = state == 'sharing'
                        ? const ValueKey('phone-import-sharing')
                        : ValueKey(
                            'phone-import-name-${controller.entries.single.id}',
                          );
                    await tester.ensureVisible(find.byKey(key));
                    await pumpFeatureUi(tester);
                  },
          );
          expect(tester.takeException(), isNull);
        });
      }
    }
  }
}

Future<void> _mount(
  WidgetTester tester,
  PhoneImportController controller, {
  double scale = 1,
  ThemeData? theme,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: theme ?? AppTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(
          textScaler: TextScaler.linear(scale),
          disableAnimations: true,
        ),
        child: child!,
      ),
      home: PhoneImportReviewScreen(
        controller: controller,
        weddingName: _wedding,
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

Future<void> _tap(WidgetTester tester, Key key, {bool settle = true}) async {
  final target = find.byKey(key);
  await tester.ensureVisible(target);
  await tester.pump();
  await tester.tap(target);
  if (settle) {
    await pumpFeatureUi(tester);
  } else {
    await tester.pump();
  }
}

Future<void> _edit(WidgetTester tester, Key key, String value) async {
  final field = find.byKey(key);
  await tester.ensureVisible(field);
  await tester.pump();
  await tester.tap(field);
  await tester.pump();
  final input = find.descendant(of: field, matching: find.byType(EditableText));
  await tester.enterText(input, value);
  FocusManager.instance.primaryFocus?.unfocus();
  await pumpFeatureUi(tester);
}

Future<void> _select(WidgetTester tester, Key key, String label) async {
  await _tap(tester, key);
  final choice = find.text(label).hitTestable();
  expect(choice, findsOneWidget);
  await tester.tap(choice);
  await pumpFeatureUi(tester);
}

class _Picker implements PhoneContactPicker {
  _Picker(this.results);
  final List<PhoneContactPickerResult> results;
  int calls = 0;
  @override
  Future<PhoneContactPickerResult> pickContacts() async => results[calls++];
}

class _PendingPicker implements PhoneContactPicker {
  final result = Completer<PhoneContactPickerResult>();
  @override
  Future<PhoneContactPickerResult> pickContacts() => result.future;
}
