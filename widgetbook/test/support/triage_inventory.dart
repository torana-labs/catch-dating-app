// Syntax-only inventory for classify_widgetbook_use_cases.mjs. Run from the
// repository root with the app's already-pinned analyzer; no code generation.
import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';

final _units = <String, CompilationUnit>{};
final _declarations = <String, Map<String, AstNode>>{};

CompilationUnit _unit(String path) => _units.putIfAbsent(path, () {
  final parsed = parseString(
    content: File(path).readAsStringSync(),
    path: path,
  );
  return parsed.unit;
});

Map<String, AstNode> _members(String path) =>
    _declarations.putIfAbsent(path, () {
      final result = <String, AstNode>{};
      for (final node in _unit(path).declarations) {
        if (node is ClassDeclaration) {
          result[node.namePart.typeName.lexeme] = node;
        } else if (node is FunctionDeclaration) {
          result[node.name.lexeme] = node;
        } else if (node is TopLevelVariableDeclaration) {
          for (final variable in node.variables.variables) {
            result[variable.name.lexeme] = variable;
          }
        }
      }
      return result;
    });

String? _resolveUri(String from, String? uri) {
  if (uri == null || uri.startsWith('dart:')) return null;
  if (uri.startsWith('package:catch_dating_app/')) {
    return uri.replaceFirst('package:catch_dating_app/', 'lib/');
  }
  if (uri.startsWith('package:widgetbook_workspace/')) {
    return uri.replaceFirst('package:widgetbook_workspace/', 'widgetbook/lib/');
  }
  for (final package in ['catch_ui', 'catch_tokens']) {
    if (uri.startsWith('package:$package/')) {
      return uri.replaceFirst('package:$package/', 'packages/$package/lib/');
    }
  }
  if (uri.startsWith('package:')) return null;
  return Uri.parse(from).resolve(uri).path;
}

Iterable<String> _exports(String path, [Set<String>? seen]) sync* {
  seen ??= <String>{};
  if (!seen.add(path)) return;
  yield path;
  for (final directive in _unit(path).directives) {
    final uri = switch (directive) {
      ExportDirective() => directive.uri.stringValue,
      PartDirective() => directive.uri.stringValue,
      _ => null,
    };
    final target = _resolveUri(path, uri);
    if (target != null) yield* _exports(target, seen);
  }
}

final _visibleCache = <String, Map<String, String>>{};
Map<String, String> _visible(
  String path,
) => _visibleCache.putIfAbsent(path, () {
  final result = <String, String>{};
  final paths = <String>{..._exports(path)};
  for (final directive in _unit(path).directives.whereType<ImportDirective>()) {
    final target = _resolveUri(path, directive.uri.stringValue);
    if (target != null) paths.addAll(_exports(target));
  }
  for (final target in paths) {
    for (final name in _members(target).keys) {
      final previous = result[name];
      // Private declarations in other libraries are never visible.
      if (name.startsWith('_') && !(_exports(path).contains(target))) continue;
      if (previous != null && previous != target) {
        throw StateError('Ambiguous symbol $name in $path: $previous, $target');
      }
      result[name] = target;
    }
  }
  return result;
});

class _References extends RecursiveAstVisitor<void> {
  final names = <String>{};

  @override
  void visitSimpleIdentifier(SimpleIdentifier node) {
    names.add(node.name);
    super.visitSimpleIdentifier(node);
  }

  @override
  void visitNamedType(NamedType node) {
    names.add(node.name.lexeme);
    super.visitNamedType(node);
  }
}

bool _isUiDeclaration(AstNode? declaration) {
  if (declaration is ClassDeclaration) {
    final base = declaration.extendsClause?.superclass.toSource() ?? '';
    return RegExp(
      r'(Widget|InheritedNotifier|InheritedModel)(<|$)',
    ).hasMatch(base);
  }
  if (declaration is FunctionDeclaration) {
    final returns = declaration.returnType?.toSource() ?? '';
    return RegExp(r'(^|[<, ])Widget([>, ?]|$)').hasMatch(returns);
  }
  return false;
}

Map<String, Object?> _reach(String path, String builder) {
  final pending = <(String, String)>[(path, builder)];
  final seen = <String>{};
  final production = <String, Object?>{};
  final wrappers = <String>{};
  final localWidgets = <String>{};
  while (pending.isNotEmpty) {
    final (file, name) = pending.removeLast();
    if (!seen.add('$file:$name')) continue;
    final node = _members(file)[name]!;
    final refs = _References();
    if (node is FunctionDeclaration) {
      node.functionExpression.body.accept(refs);
    } else {
      node.accept(refs);
    }
    if (node is ClassDeclaration &&
        RegExp(
          r'Widget|State<',
        ).hasMatch(node.extendsClause?.toSource() ?? '')) {
      localWidgets.add('$file:$name');
    }
    wrappers.addAll(
      refs.names.intersection({
        'ProviderScope',
        'GoRouter',
        'UncontrolledProviderScope',
      }),
    );
    final visible = _visible(file);
    for (final ref in refs.names) {
      final target = visible[ref];
      if (target == null) continue;
      if (target.startsWith('widgetbook/lib/')) {
        pending.add((target, ref));
      } else if (target.startsWith('lib/') ||
          target.startsWith('packages/catch_ui/lib/') ||
          target.startsWith('packages/catch_tokens/lib/')) {
        final declaration = _members(target)[ref];
        if (declaration is ClassDeclaration || _isUiDeclaration(declaration)) {
          production['$target:$ref'] = {
            'symbol': ref,
            'file': target,
            'base': declaration is ClassDeclaration
                ? declaration.extendsClause?.superclass.toSource()
                : null,
            'ui': _isUiDeclaration(declaration),
          };
        }
      }
    }
  }
  return {
    'productionReferences': production.values.toList(),
    'wrappers': wrappers.toList()..sort(),
    'localWidgets': localWidgets.toList()..sort(),
  };
}

Map<String, Expression> _arguments(ArgumentList? arguments) => {
  for (final arg
      in arguments?.arguments.whereType<NamedExpression>() ??
          <NamedExpression>[])
    arg.name.label.name: arg.expression,
};

String? _constantString(
  Expression? expression,
  String file, [
  Set<String>? resolving,
]) {
  if (expression == null) return null;
  if (expression case StringLiteral(:final stringValue)) return stringValue;
  if (expression case SimpleIdentifier(:final name)) {
    resolving ??= <String>{};
    if (!resolving.add(name)) {
      throw StateError('Cyclic string constant $name in $file');
    }
    final declaration = _members(file)[name];
    if (declaration case VariableDeclaration(:final initializer)) {
      return _constantString(initializer, file, resolving);
    }
  }
  return null;
}

String? _annotationString(
  Map<String, Expression> arguments,
  String key,
  String file, {
  bool required = false,
}) {
  final expression = arguments[key];
  if (expression == null && !required) return null;
  final value = _constantString(expression, file);
  if (value == null) {
    throw StateError(
      'Widgetbook annotation $key in $file must be a static string.',
    );
  }
  return value;
}

class _GeneratedCases extends RecursiveAstVisitor<void> {
  final cases = <Map<String, Object?>>[];

  void _record(String type, ArgumentList arguments, AstNode node) {
    if (!type.endsWith('WidgetbookUseCase')) return;
    final args = _arguments(arguments);
    final parents = <String>[];
    for (var parent = node.parent; parent != null; parent = parent.parent) {
      final (kind, params) = switch (parent) {
        MethodInvocation() => (parent.methodName.name, parent.argumentList),
        InstanceCreationExpression() => (
          parent.constructorName.type.name.lexeme,
          parent.argumentList,
        ),
        _ => ('', null),
      };
      if ([
        'WidgetbookCategory',
        'WidgetbookFolder',
        'WidgetbookComponent',
      ].contains(kind)) {
        parents.add((_arguments(params)['name'] as StringLiteral).stringValue!);
      }
    }
    cases.add({
      'name': (args['name'] as StringLiteral).stringValue,
      'builder': args['builder']!.toSource(),
      'type': parents.first,
      'path': parents.reversed.join('/'),
    });
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    _record(node.methodName.name, node.argumentList, node);
    super.visitMethodInvocation(node);
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    _record(node.constructorName.type.name.lexeme, node.argumentList, node);
    super.visitInstanceCreationExpression(node);
  }
}

/// App-coupled shared widgets: context parts, the shared media editor and the
/// startup page. They took over from lib/core/widgets; tool/design/lib/
/// component_naming.mjs names the same homes.
bool isAppSharedWidgetSource(String path) =>
    RegExp(r'^lib/contexts/[^/]+/parts/').hasMatch(path) ||
    path.startsWith('lib/platform/media/') ||
    path.startsWith('lib/pages/startup/');

// Preserve the migration denominator across shared UI and app adapters: every public
// Catch* core class, including descriptors and controllers, remains inventoried
// when moved into the package. Nonvisual classes need an explicit disposition.
// App-coupled shared widgets follow feature naming without the Catch prefix,
// so their public widget classes are inventoried by base type instead.
List<Map<String, Object?>> _coreSurface() {
  final files = [
    for (final root in [
      'lib/contexts',
      'lib/pages/startup',
      'lib/platform/media',
      'lib/platform/riverpod_ui',
      'packages/catch_ui/lib/src/primitives',
      'packages/catch_ui/lib/src/components',
      'packages/catch_ui/lib/src/patterns',
    ])
      if (Directory(root).existsSync())
        ...Directory(root)
            .listSync(recursive: true)
            .whereType<File>()
            .map((file) => file.path)
            .where((path) => path.endsWith('.dart'))
            .where(
              (path) =>
                  !path.startsWith('lib/contexts/') ||
                  isAppSharedWidgetSource(path),
            ),
  ]..sort();
  return [
    for (final file in files)
      for (final node in _unit(file).declarations.whereType<ClassDeclaration>())
        if (node.namePart.typeName.lexeme.startsWith('Catch') ||
            (isAppSharedWidgetSource(file) &&
                !node.namePart.typeName.lexeme.startsWith('_') &&
                (node.extendsClause?.superclass.toSource() ?? '').endsWith(
                  'Widget',
                )))
          {
            'name': node.namePart.typeName.lexeme,
            'file': file,
            'line': _unit(file).lineInfo.getLocation(node.offset).lineNumber,
            'base': node.extendsClause?.superclass.toSource(),
            'interfaces': [
              for (final type
                  in node.implementsClause?.interfaces ?? <NamedType>[])
                type.toSource(),
            ],
            'generated': file.endsWith('.g.dart'),
          },
  ];
}

Map<String, Object?> readWidgetbookInventory({String repoRoot = '.'}) {
  final originalDirectory = Directory.current;
  Directory.current = Directory(repoRoot).absolute;
  try {
    return _readWidgetbookInventory();
  } finally {
    Directory.current = originalDirectory;
  }
}

Map<String, Object?> _readWidgetbookInventory() {
  final files =
      Directory('widgetbook/lib')
          .listSync(recursive: true)
          .whereType<File>()
          .map((file) => file.path)
          .where((path) => path.endsWith('.dart') && !path.endsWith('.g.dart'))
          .toList()
        ..sort();
  final cases = <Map<String, Object?>>[];
  for (final file in files) {
    for (final function in _unit(
      file,
    ).declarations.whereType<FunctionDeclaration>()) {
      for (final annotation in function.metadata) {
        if (annotation.name.toSource() != 'widgetbook.UseCase') continue;
        final args = _arguments(annotation.arguments);
        final type = args['type']!.toSource();
        cases.add({
          'file': file,
          'line': _unit(
            file,
          ).lineInfo.getLocation(annotation.offset).lineNumber,
          'builder': function.name.lexeme,
          'name': _annotationString(args, 'name', file, required: true),
          'type': type,
          'path': _annotationString(args, 'path', file),
          'typeFile': _visible(file)[type],
          ..._reach(file, function.name.lexeme),
        });
      }
    }
  }
  const generatedPath = 'widgetbook/lib/main.directories.g.dart';
  final generated = _GeneratedCases();
  _unit(generatedPath).accept(generated);
  final imports = {
    for (final directive in _unit(
      generatedPath,
    ).directives.whereType<ImportDirective>())
      directive.prefix?.name: _resolveUri(
        generatedPath,
        directive.uri.stringValue,
      ),
  };
  return {
    'coreSurface': _coreSurface(),
    'cases': cases,
    'generated': [
      for (final entry in generated.cases)
        {
          'name': entry['name'],
          'type': entry['type'],
          'path': entry['path'],
          'file': imports[(entry['builder'] as String).split('.').first],
          'builder': (entry['builder'] as String).split('.').last,
        },
    ],
  };
}

void main() => stdout.writeln(jsonEncode(readWidgetbookInventory()));
