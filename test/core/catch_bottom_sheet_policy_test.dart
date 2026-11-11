import 'dart:io';

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:flutter_test/flutter_test.dart';

const _hostRoots = [
  'lib/hosts/',
  'lib/event_success/',
  'lib/event_rehearsal/',
  'lib/programs/',
];
const _rawPresenters = {
  'showModalBottomSheet',
  'showBottomSheet',
  'showCupertinoModalPopup',
  'BottomSheet',
};

List<String> _violations(String path, String source) {
  final visitor = _SheetPolicy(path);
  parseString(content: source).unit.accept(visitor);
  return visitor.failures;
}

class _SheetPolicy extends RecursiveAstVisitor<void> {
  _SheetPolicy(this.path);
  final String path;
  final failures = <String>[];

  void _check(
    String name,
    String? target,
    String? constructor,
    ArgumentList arguments,
  ) {
    final sharedPresenter =
        path == 'packages/catch_ui/lib/src/components/catch_sheet.dart';
    final nativePicker =
        path ==
        'packages/catch_ui/lib/src/components/catch_adaptive_picker.dart';
    if (_rawPresenters.contains(name) &&
        !(sharedPresenter && name == 'showModalBottomSheet') &&
        !(nativePicker && name == 'showCupertinoModalPopup')) {
      failures.add('$path: raw $name');
    }
    // CatchSheet.contained is the system Sheet drawn in place at the foot of
    // its screen (redesign); it owns its geometry like standard and filter.
    if (_hostRoots.any(path.startsWith) &&
        (name == 'CatchSheet' || target == 'CatchSheet') &&
        !{'standard', 'filter', 'contained'}.contains(constructor ?? name)) {
      failures.add(
        '$path: use CatchSheet.standard or CatchSheet.filter for shared geometry',
      );
    }
    if (!_hostRoots.any(path.startsWith)) return;
    final type = target ?? name;
    final recipe = constructor ?? (target == null ? null : name);
    final props = <String, String>{
      for (final arg in arguments.arguments.whereType<NamedExpression>())
        arg.name.label.name: arg.expression.toSource(),
    };
    if (type == 'CatchSheet' &&
        RegExp(
          r'hostCustomers(Filters|FilterSheetTitle)\b',
        ).hasMatch(props['title'] ?? '') &&
        recipe != 'filter') {
      failures.add('$path: ordinary filters must use CatchSheet.filter');
    }
    if (type == 'CatchButton' &&
        (props['label'] ?? '').contains('hostSheetClose')) {
      failures.add('$path: the filter recipe owns the Close action');
    }
    if (type == 'CatchButton' && recipe != 'sheet') {
      AstNode? ancestor = arguments.parent?.parent;
      while (ancestor != null) {
        if (ancestor is NamedExpression &&
            ancestor.name.label.name == 'footer') {
          final owner = ancestor.parent?.parent;
          // A contained Sheet's footer pairs a primary with quiet or danger
          // actions of the system Sheet; the role rule is for pushed sheets.
          final isSheet =
              owner is MethodInvocation &&
                  owner.target?.toSource() == 'CatchSheet' &&
                  owner.methodName.name != 'contained' ||
              owner is InstanceCreationExpression &&
                  owner.constructorName.type.name.lexeme == 'CatchSheet' &&
                  owner.constructorName.name?.name != 'contained';
          if (isSheet) {
            failures.add(
              '$path: sheet footer actions must declare their semantic role with CatchButton.sheet',
            );
          }
          break;
        }
        ancestor = ancestor.parent;
      }
    }
    if (type == 'CatchField' &&
        recipe == 'nav' &&
        arguments.root.toSource().contains('CatchSheet.filter(')) {
      failures.add(
        '$path: ordinary filter choices must be inline chips, not nested navigation rows',
      );
    }
    // Inspect section calls in filter owners, including helper-built groups.
    if (type == 'CatchSection' &&
        props.containsKey('title') &&
        arguments.root.toSource().contains('CatchSheet.filter(') &&
        (recipe != 'choiceGroup' || props.containsKey('titleColor'))) {
      failures.add(
        '$path: filter groups use the shared choice-group heading and chip clearance',
      );
    }
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    _check(
      node.methodName.name,
      node.target?.toSource(),
      null,
      node.argumentList,
    );
    super.visitMethodInvocation(node);
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    _check(
      node.constructorName.type.name.lexeme,
      null,
      node.constructorName.name?.name,
      node.argumentList,
    );
    super.visitInstanceCreationExpression(node);
  }
}

void main() {
  test('production sheets use shared presenters and Host composition', () {
    final failures = <String>[];
    var hostSheets = 0;
    for (final root in ['lib', 'packages/catch_ui/lib']) {
      for (final entity in Directory(root).listSync(recursive: true)) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final path = entity.path.replaceAll('\\', '/');
        final source = entity.readAsStringSync();
        failures.addAll(_violations(path, source));
        if (_hostRoots.any(path.startsWith)) {
          hostSheets += 'CatchSheet.standard('.allMatches(source).length;
        }
      }
    }
    expect(
      hostSheets,
      greaterThan(0),
      reason: 'The Host scan must not pass vacuously.',
    );
    expect(failures, isEmpty);
  });

  test('policy rejects raw presenter variants and legacy Host shells', () {
    for (final source in [
      'void f() { showModalBottomSheet(context: c, builder: b); }',
      'void f() { material.showModalBottomSheet(context: c, builder: b); }',
      'void f() { Scaffold.of(c).showBottomSheet(b); }',
      'void f() { showCupertinoModalPopup(context: c, builder: b); }',
      'void f() { BottomSheet(onClosing: f, builder: b); }',
      'void f() { const BottomSheet(onClosing: f, builder: b); }',
      'void f() { CatchSheet(child: child); }',
      'void f() { const CatchSheet(child: child); }',
      'final a = CatchSheet.standard(footer: CatchButton(label: save, onPressed: save), child: child);',
      'final a = CatchSheet.standard(footer: Column(children: [CatchButton(label: save, onPressed: save)]), child: child);',
    ]) {
      expect(
        _violations('lib/hosts/example.dart', source),
        isNotEmpty,
        reason: source,
      );
    }
    expect(
      _violations('lib/hosts/example.dart', '''
      // showModalBottomSheet is forbidden; mentioning it is not a call.
      void f() { showCatchBottomSheet(context: c, builder: b); }
      final a = CatchSheet.standard(child: child);
      final b = const CatchSheet.standard(child: child);
      final d = CatchSheet.standard(footer: CatchButton.sheet(role: CatchButtonEmphasis.commit, label: save, onPressed: save), child: child);
      final c = CatchSheet.filter(title: l10n.hostCustomersFilters, child: CatchSection.choiceGroup(title: 'Purpose', child: chips), closeLabel: l10n.hostSheetClose, onClose: close);
    '''),
      isEmpty,
    );
  });
  test('filter policy rejects ad hoc copy, footer and heading recipes', () {
    for (final source in [
      "final a = CatchSheet.standard(title: l10n.hostCustomersFilters, subtitle: 'Instructions', child: chips);",
      'final a = CatchSheet.standard(title: l10n.hostCustomersFilterSheetTitle, child: chips);',
      'final a = CatchButton(label: l10n.hostSheetClose, onPressed: close);',
      "final a = CatchSheet.filter(child: CatchField.nav(title: 'Form', onTap: choose));",
      "final a = CatchSheet.filter(child: CatchSection.fieldRows(title: 'Attendance', child: chips));",
      "final a = CatchSheet.filter(child: CatchSection.divided(title: 'Attendance', child: chips));",
      "final a = CatchSheet.filter(child: CatchSection.fieldRows(title: 'Attendance', titleColor: Colors.white, child: chips));",
    ]) {
      expect(
        _violations('lib/hosts/example.dart', source),
        isNotEmpty,
        reason: source,
      );
    }
  });
}
