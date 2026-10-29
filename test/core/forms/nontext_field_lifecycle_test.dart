import 'dart:async';
import 'dart:io';

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/catch_test_fonts.dart';
import '../../test_pump_helpers.dart';

Future<void> _boot(
  WidgetTester tester, {
  Future<bool> Function(Object?)? save,
  CatchFormRangeRow<Object?>? range,
}) async {
  final copy = catchFieldCopy(AppLocalizationsEn());
  await tester.pumpWidget(
    MaterialApp(
      theme: CatchTheme.light,
      home: Scaffold(
        body: CatchFormList<Object?>(
          fieldCopy: copy,
          rows: [
            CatchFormSingleChoiceRow<Object?, String>(
              id: 'choice',
              icon: CatchIcons.person,
              label: 'Choice',
              values: const ['One', 'Two'],
              itemLabel: (v) => v,
              value: 'One',
              patchForValue: (v) => v,
            ),
            range ??
                CatchFormRangeRow<Object?>(
                  id: 'range',
                  icon: CatchIcons.person,
                  label: 'Range',
                  value: '1–5',
                  currentMin: 1,
                  currentMax: 5,
                  sliderMin: 0,
                  sliderMax: 10,
                  divisions: 10,
                  labelText: (v) => v.toInt().toString(),
                  patchForRange: (a, b) => (a, b),
                ),
            CatchFormTextRow<Object?>(
              id: 'text',
              icon: CatchIcons.person,
              label: 'Text',
              currentValue: 'Maya',
              validationCopy: copy.validation,
              patchForValue: (v) => v,
            ),
          ],
          onSave: save ?? (_) async => true,
          errorTextBuilder: (_, error) => 'Save failed',
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

CatchField<dynamic> _field(WidgetTester t, String title) =>
    t.widget<CatchField<dynamic>>(
      find.byWidgetPredicate((w) => w is CatchField && w.title == title),
    );
Future<void> _open(WidgetTester t, String title) async {
  await t.tap(find.text(title));
  await pumpFeatureUi(t);
}

Future<void> _change(WidgetTester t, String title) async {
  if (title == 'Choice') {
    await t.tap(find.text('Two'));
  } else {
    t.widget<CatchRangeInput>(find.byType(CatchRangeInput)).onChanged!(
      const RangeValues(2, 8),
    );
  }
  await pumpFeatureUi(t);
}

Future<void> _action(WidgetTester t, String key) async {
  await t.tap(find.byKey(ValueKey('catch-field-$key')));
  await t.pump();
  await pumpFeatureUiFor(t, CatchFieldTokens.reveal);
  await t.pump();
}

Future<void> _end(WidgetTester t) async {
  await t.pumpWidget(const SizedBox());
  await pumpFeatureUi(t);
  expect(t.takeException(), isNull);
}

void _expectDraft(WidgetTester t, String title, {required bool changed}) {
  if (title == 'Choice') {
    expect(
      t
          .widget<CatchChoiceInput>(
            find.byWidgetPredicate((w) => w is CatchChoiceInput),
          )
          .selected,
      {changed ? 'Two' : 'One'},
    );
  } else {
    expect(
      t.widget<CatchRangeInput>(find.byType(CatchRangeInput)).values,
      changed ? const RangeValues(2, 8) : const RangeValues(1, 5),
    );
  }
}

void main() {
  setUpAll(loadCatchTestFonts);
  test('action navigation scanner distinguishes callback code from copy', () {
    expect(
      _navigationActions(
        "void f() { CatchField.action(onTap: () => context.pushNamed('chat')); }",
      ),
      hasLength(1),
    );
    expect(
      _navigationActions(
        "void f() { CatchField.nav(onTap: () => context.pushNamed('chat')); }",
      ),
      isEmpty,
    );
    expect(
      _navigationActions(
        "void f() { CatchField.action(body: 'context.pushNamed()', onTap: save); } // CatchField.action(onTap: () => context.go('/'))",
      ),
      isEmpty,
    );
  });
  test('app action rows do not directly navigate to routes', () {
    final violations = <String>[];
    for (final file in Directory(
      'lib',
    ).listSync(recursive: true, followLinks: false).whereType<File>()) {
      final path = file.path;
      if (!path.endsWith('.dart') ||
          path.endsWith('.g.dart') ||
          path.endsWith('.freezed.dart') ||
          path.contains('/generated/') ||
          path.contains('/design_fixtures/')) {
        continue;
      }
      for (final line in _navigationActions(file.readAsStringSync())) {
        violations.add('$path:$line');
      }
    }
    expect(
      violations,
      isEmpty,
      reason:
          'Route destinations use CatchField.nav or navigate; action is non-navigation.',
    );
  });
  testWidgets(
    'range preserves distinct endpoint contracts and localized summaries',
    (t) async {
      await _boot(
        t,
        range: CatchFormRangeRow<Object?>(
          id: 'range',
          icon: CatchIcons.pace,
          label: 'Range',
          value: '1 to 5',
          currentMin: 1,
          currentMax: 5,
          sliderMin: 0,
          sliderMax: 10,
          divisions: 10,
          contract: const CatchContractFieldConstraints(
            path: 'test.min',
            minimum: 0,
            maximum: 6,
          ),
          maximumContract: const CatchContractFieldConstraints(
            path: 'test.max',
            minimum: 1,
            maximum: 10,
          ),
          labelText: (v) => v.round().toString(),
          rangeLabel: (a, b) => '${a.round()} to ${b.round()}',
          patchForRange: (a, b) => (a, b),
        ),
      );
      await _open(t, 'Range');
      final slider = t.widget<RangeSlider>(find.byType(RangeSlider));
      expect(slider.min, 0);
      expect(slider.max, 10);
      await _change(t, 'Range');
      expect(_field(t, 'Range').body, '2 to 8');
      await _action(t, 'done');
      expect(_field(t, 'Range').body, '2 to 8');
      await _end(t);
    },
  );
  for (final title in ['Choice', 'Range']) {
    testWidgets('$title cancels drafts on ordinary row switching', (t) async {
      await _boot(t);
      await _open(t, title);
      await _change(t, title);
      await _open(t, 'Text');
      await _open(t, title);
      _expectDraft(t, title, changed: false);
      await _end(t);
    });
    testWidgets('$title has timed success and retains the accepted baseline', (
      t,
    ) async {
      final saves = <Object?>[];
      await _boot(
        t,
        save: (patch) async {
          saves.add(patch);
          return true;
        },
      );
      await _open(t, title);
      await _change(t, title);
      await _action(t, 'done');
      expect(_field(t, title).status, CatchFieldStatus.saved);
      await pumpFeatureUiFor(t, CatchFieldTokens.savedStatusHold * 2);
      expect(_field(t, title).status, CatchFieldStatus.idle);
      // No authoritative parent refresh: reopening or cancelling must not
      // restore the pre-save value or resubmit the same accepted mutation.
      await _open(t, title);
      _expectDraft(t, title, changed: true);
      await _action(t, 'cancel');
      await _open(t, title);
      _expectDraft(t, title, changed: true);
      await _action(t, 'done');
      expect(saves, hasLength(1));
      await _end(t);
    });
    testWidgets('$title blocks duplicate saves and retains a failed draft', (
      t,
    ) async {
      var calls = 0;
      var pending = Completer<bool>();
      await _boot(
        t,
        save: (_) {
          calls++;
          return pending.future;
        },
      );
      await _open(t, title);
      await _change(t, title);
      await _action(t, 'done');
      expect(_field(t, title).status, CatchFieldStatus.saving);
      // A real second activation is absorbed while the first request is pending.
      await t.tapAt(
        t.getCenter(find.byKey(const ValueKey('catch-field-done'))),
      );
      await t.pump();
      expect(calls, 1);
      pending.completeError(StateError('network failure'));
      await pumpFeatureUi(t);
      expect(find.text('Save failed'), findsOneWidget);
      _expectDraft(t, title, changed: true);
      pending = Completer<bool>();
      await _action(t, 'done');
      expect(calls, 2);
      pending.complete(false);
      await pumpFeatureUi(t);
      expect(_field(t, title).status, CatchFieldStatus.idle);
      _expectDraft(t, title, changed: true);
      await _action(t, 'cancel');
      await _open(t, title);
      _expectDraft(t, title, changed: false);
      await _end(t);
    });
    testWidgets('$title can be disposed during an in-flight save', (t) async {
      final pending = Completer<bool>();
      await _boot(t, save: (_) => pending.future);
      await _open(t, title);
      await _change(t, title);
      await _action(t, 'done');
      await _end(t);
      pending.complete(true);
      await pumpFeatureUi(t);
      expect(t.takeException(), isNull);
    });
  }
  testWidgets('optional choice removal is a draft until Clear commits null', (
    t,
  ) async {
    final saves = <Object?>[];
    await _boot(
      t,
      save: (patch) async {
        saves.add(patch);
        return true;
      },
    );
    await _open(t, 'Choice');
    expect(find.textContaining('Optional', findRichText: true), findsWidgets);
    await t.tap(
      find.descendant(
        of: find.byWidgetPredicate((w) => w is CatchChoiceInput),
        matching: find.text('One'),
      ),
    );
    await pumpFeatureUi(t);
    expect(find.text('Clear'), findsOneWidget);
    expect(saves, isEmpty);
    await _action(t, 'cancel');
    await _open(t, 'Choice');
    _expectDraft(t, 'Choice', changed: false);
    await t.tap(
      find.descendant(
        of: find.byWidgetPredicate((w) => w is CatchChoiceInput),
        matching: find.text('One'),
      ),
    );
    await pumpFeatureUi(t);
    await _action(t, 'done');
    expect(saves, [null]);
    await _end(t);
  });
}

// Deliberately narrow syntax check: indirect callbacks require semantic review.
List<int> _navigationActions(String source) {
  final visitor = _ActionVisitor(source);
  parseString(content: source, throwIfDiagnostics: false).unit.accept(visitor);
  return visitor.lines;
}

class _ActionVisitor extends RecursiveAstVisitor<void> {
  _ActionVisitor(this.source);
  final String source;
  final lines = <int>[];

  void _check(AstNode node, ArgumentList arguments) {
    final head = source
        .substring(node.offset, arguments.offset)
        .replaceFirst(RegExp(r'^(const|new)\s+'), '')
        .trim();
    if (!RegExp(r'^CatchField(?:<.*>)?\.action$').hasMatch(head)) return;
    for (final argument in arguments.arguments.whereType<NamedExpression>()) {
      if (argument.name.label.name != 'onTap') continue;
      final routes = _RouteVisitor();
      argument.expression.accept(routes);
      if (routes.found) {
        lines.add('\n'.allMatches(source.substring(0, node.offset)).length + 1);
      }
    }
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    _check(node, node.argumentList);
    super.visitInstanceCreationExpression(node);
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    _check(node, node.argumentList);
    super.visitMethodInvocation(node);
  }
}

class _RouteVisitor extends RecursiveAstVisitor<void> {
  bool found = false;
  @override
  void visitMethodInvocation(MethodInvocation node) {
    if (node.target?.toSource() == 'context' &&
        {'go', 'goNamed', 'push', 'pushNamed'}.contains(node.methodName.name)) {
      found = true;
    }
    super.visitMethodInvocation(node);
  }
}
