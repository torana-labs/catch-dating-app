import 'dart:async';

import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/catch_test_fonts.dart';
import '../../test_pump_helpers.dart';

final _copy = catchFieldCopy(AppLocalizationsEn());
const _required = CatchContractFieldConstraints(
  path: 'name',
  required: true,
  maxLength: 80,
  minLength: 1,
);
const _optional = CatchContractFieldConstraints(
  path: 'nickname',
  maxLength: 80,
);
Finder _input(String id) => find.descendant(
  of: find.byKey(ValueKey('catch-form-text-$id')),
  matching: find.byType(TextField),
);
CatchFormTextRow<String?> _row(
  String id,
  String value, {
  bool required = false,
  bool multiline = false,
  bool nullOnClear = true,
}) => CatchFormTextRow(
  id: id,
  icon: CatchIcons.person,
  label: id,
  currentValue: value,
  currentFieldValue: value,
  validationCopy: _copy.validation,
  contract: required ? _required : _optional,
  maxLines: multiline ? 3 : 1,
  toFieldValue: (value) => value.isEmpty && nullOnClear ? null : value,
  patchForValue: (value) => value as String?,
);
Future<void> _boot(
  WidgetTester t, {
  List<CatchFormRowDescriptor<String?>>? rows,
  Future<bool> Function(String?)? save,
  double scale = 1,
  double width = 390,
}) async {
  t.view.physicalSize = Size(width, 1000);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
  await t.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      home: MediaQuery(
        data: MediaQueryData(textScaler: TextScaler.linear(scale)),
        child: Scaffold(
          body: SingleChildScrollView(
            child: CatchFormList<String?>(
              fieldCopy: _copy,
              rows:
                  rows ??
                  [
                    _row('Name', 'Maya', required: true),
                    _row('Nickname', 'May'),
                  ],
              onSave: save ?? (_) => Future.value(true),
              errorTextBuilder: (_, e) =>
                  'Could not save. Your draft is kept. Try again.',
            ),
          ),
        ),
      ),
    ),
  );
  await pumpFeatureUi(t);
}

Future<void> _open(WidgetTester t, String id) async {
  await t.tap(find.text(id));
  await pumpFeatureUi(t);
}

Future<void> _end(WidgetTester t) async {
  await t.pumpWidget(const SizedBox());
  await pumpFeatureUi(t);
  expect(t.takeException(), isNull);
}

void main() {
  setUpAll(loadCatchTestFonts);
  testWidgets(
    'optional labels follow value contracts without caller label text',
    (t) async {
      await _boot(t);
      final fields = t.widgetList<CatchField>(find.byType(CatchField)).toList();
      expect(fields.first.isOptional, isFalse);
      expect(fields.last.isOptional, isTrue);
      expect(find.text(_copy.label.optionalSuffix), findsOneWidget);
      await _open(t, 'Nickname');
      expect(find.text(_copy.label.optionalSuffix), findsOneWidget);
      expect(t.widget<TextField>(_input('Nickname')).maxLength, 80);
      await _end(t);
    },
  );
  testWidgets(
    'count shares action row and short validation does not add height',
    (t) async {
      var saves = 0;
      await _boot(
        t,
        save: (_) {
          saves++;
          return Future.value(true);
        },
      );
      await _open(t, 'Name');
      await t.tap(find.byTooltip(_copy.clearTooltip('Name')));
      await pumpFeatureUi(t);
      final owner = find.byKey(const ValueKey('catch-form-text-Name'));
      final height = t.getSize(owner).height;
      final counter = find.byKey(const ValueKey('catch-field-action-counter'));
      final done = find.byKey(const ValueKey('catch-field-done'));
      expect(t.getCenter(counter).dy, closeTo(t.getCenter(done).dy, 1));
      await t.tap(find.text('Done'));
      await pumpFeatureUi(t);
      expect(
        find.text(_copy.validation.requiredMessage('Name')),
        findsOneWidget,
      );
      expect(t.getSize(owner).height, closeTo(height, 1));
      expect(saves, 0);
      expect(
        find.byKey(const ValueKey('catch-field-root-support')),
        findsNothing,
      );
      await t.tap(find.text('Cancel'));
      await pumpFeatureUi(t);
      expect(t.widget<TextField>(_input('Name')).controller!.text, 'Maya');
      await _end(t);
    },
  );
  testWidgets('optional empty draft uses Clear and persists null once', (
    t,
  ) async {
    final values = <String?>[];
    await _boot(
      t,
      save: (v) {
        values.add(v);
        return Future.value(true);
      },
    );
    await _open(t, 'Nickname');
    await t.enterText(_input('Nickname'), '   ');
    await pumpFeatureUi(t);
    expect(find.text('Clear'), findsOneWidget);
    await t.enterText(_input('Nickname'), 'Replacement');
    await pumpFeatureUi(t);
    expect(find.text('Done'), findsOneWidget);
    await t.enterText(_input('Nickname'), '');
    await pumpFeatureUi(t);
    await t.tap(find.text('Clear'));
    await pumpFeatureUi(t);
    expect(values, [null]);
    // Parent data can lag the successful save. Null must remain a committed value.
    await t.tap(find.byKey(const ValueKey('catch-form-text-Nickname')));
    await pumpFeatureUi(t);
    await t.tap(find.text('Done'));
    await pumpFeatureUi(t);
    expect(values, [null]);
    await _end(t);
  });
  testWidgets('empty-string clear respects a non-nullable backend adapter', (
    t,
  ) async {
    final values = <String?>[];
    await _boot(
      t,
      rows: [_row('Email', 'maya@example.test', nullOnClear: false)],
      save: (v) {
        values.add(v);
        return Future.value(true);
      },
    );
    await _open(t, 'Email');
    await t.enterText(_input('Email'), '');
    await pumpFeatureUi(t);
    await t.tap(find.text('Clear'));
    await pumpFeatureUi(t);
    expect(values, ['']);
    await _end(t);
  });
  testWidgets('failed Clear retains draft and original value for Cancel', (
    t,
  ) async {
    await _boot(t, save: (_) => Future.error(StateError('offline')));
    await _open(t, 'Nickname');
    await t.enterText(_input('Nickname'), '');
    await pumpFeatureUi(t);
    await t.tap(find.text('Clear'));
    await pumpFeatureUi(t);
    expect(
      find.text('Could not save. Your draft is kept. Try again.'),
      findsOneWidget,
    );
    expect(t.widget<TextField>(_input('Nickname')).controller!.text, '');
    await t.tap(find.text('Cancel'));
    await pumpFeatureUi(t);
    expect(t.widget<TextField>(_input('Nickname')).controller!.text, 'May');
    await _end(t);
  });
  testWidgets('save locks row switching and repeated submit until completion', (
    t,
  ) async {
    final pending = Completer<bool>();
    var saves = 0;
    await _boot(
      t,
      save: (_) {
        saves++;
        return pending.future;
      },
    );
    await _open(t, 'Name');
    await t.enterText(_input('Name'), 'Maya Rao');
    await t.tap(find.text('Done'));
    await t.pump();
    expect(saves, 1);
    expect(t.widget<TextField>(_input('Name')).enabled, isFalse);
    await t.tapAt(t.getCenter(find.text('Nickname')));
    await t.pump();
    expect(
      t
          .widget<CatchField>(
            find.descendant(
              of: find.byKey(const ValueKey('catch-form-text-Nickname')),
              matching: find.byType(CatchField),
            ),
          )
          .open,
      isFalse,
    );
    pending.complete(true);
    await t.pump();
    await pumpUntilFound(t, find.byKey(const ValueKey('catch-field-saved')));
    expect(find.byKey(const ValueKey('catch-field-saved')), findsOneWidget);
    await _end(t);
  });
  testWidgets('switching discards draft and unchanged Done skips mutation', (
    t,
  ) async {
    var saves = 0;
    await _boot(
      t,
      save: (_) {
        saves++;
        return Future.value(true);
      },
    );
    await _open(t, 'Name');
    await t.enterText(_input('Name'), 'Discard me');
    await _open(t, 'Nickname');
    expect(t.widget<TextField>(_input('Name')).controller!.text, 'Maya');
    await t.tap(find.text('Done'));
    await pumpFeatureUi(t);
    expect(saves, 0);
    await _end(t);
  });
  testWidgets('multiline uses newline, long errors wrap at large text', (
    t,
  ) async {
    await _boot(
      t,
      rows: [_row('Description', 'Hello', required: true, multiline: true)],
      scale: 2,
      save: (_) => Future.error(StateError('offline')),
    );
    await _open(t, 'Description');
    await t.enterText(_input('Description'), 'Line one\nLine two');
    expect(
      t.widget<TextField>(_input('Description')).textInputAction,
      TextInputAction.newline,
    );
    await t.tap(find.text('Done'));
    await pumpFeatureUi(t);
    final error = find.text('Could not save. Your draft is kept. Try again.');
    expect(error, findsOneWidget);
    expect(t.widget<Text>(error).maxLines, isNull);
    await _end(t);
  });
  testWidgets('floating hints inherit entered typography', (t) async {
    final c = TextEditingController();
    addTearDown(c.dispose);
    await t.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: CatchField.input(
            copy: _copy,
            title: 'Phone',
            controller: c,
            placeholder: '98765 43210',
            keyboardType: TextInputType.phone,
            variant: CatchFieldVariant.underline,
            size: CatchFieldSize.floating,
          ),
        ),
      ),
    );
    final field = t.widget<TextField>(find.byType(TextField));
    expect(field.decoration!.hintStyle!.fontSize, field.style!.fontSize);
    expect(field.decoration!.hintStyle!.fontWeight, field.style!.fontWeight);
    expect(field.decoration!.hintStyle!.height, field.style!.height);
    await _end(t);
  });
}
