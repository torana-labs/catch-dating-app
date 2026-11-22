// The analyzer-resolved import graph that tool/architecture/move_screens.mjs
// plans with. For every Dart file it lists each directive, the file the URI
// names (and each conditional configuration's file), and which libraries'
// declarations the file actually uses through that directive. A barrel is
// transparent: an import of it records the libraries that declare the names
// used, not the barrel.
//
// A branch library (--branch <path>:<flag>) is also described declaration by
// declaration, with each reference marked by the values of a boolean flag
// (such as isHostApp) under which it runs. move_screens.mjs walks the router
// that way, so the host and consumer route tables reach only their own screens.
//
//   dart run tool/architecture/dart_symbol_imports.dart \
//     [--root <dir>] [--out <file>] [--include <dir>]... \
//     [--branch lib/routing/go_router.dart:isHostApp]
import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:analyzer/dart/analysis/session.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/token.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/dart/element/element.dart';

const _defaultIncludes = [
  'lib',
  'test',
  'integration_test',
  'apps',
  'packages',
  'widgetbook',
];

// Packages that analyze their own fixtures or are not app code.
final _excluded = RegExp(
  r'(^|/)(\.dart_tool|build|node_modules|\.git)(/|$)|'
  r'^packages/catch_ui_lints/|^tool/|^functions/|'
  r'^apps/[^/]+/(ios|android|macos|web|linux|windows)/',
);

Future<void> main(List<String> args) async {
  var root = Directory.current.path;
  String? out;
  final includes = <String>[];
  final branches = <String, String>{};
  for (var index = 0; index < args.length; index++) {
    final arg = args[index];
    String next() {
      if (index + 1 >= args.length) {
        stderr.writeln('$arg needs a value.');
        exit(64);
      }
      return args[++index];
    }

    switch (arg) {
      case '--root':
        root = Directory(next()).absolute.path;
      case '--out':
        out = next();
      case '--include':
        includes.add(next());
      case '--branch':
        final value = next();
        final split = value.lastIndexOf(':');
        if (split <= 0) {
          stderr.writeln('--branch takes <library path>:<flag>.');
          exit(64);
        }
        branches[value.substring(0, split)] = value.substring(split + 1);
      case '--help' || '-h':
        stdout.writeln(
          'Usage: dart run tool/architecture/dart_symbol_imports.dart '
          '[--root <dir>] [--out <file>] [--include <dir>]... '
          '[--branch <library path>:<flag>]',
        );
        return;
      default:
        stderr.writeln('Unknown argument: $arg');
        exit(64);
    }
  }
  root = Directory(root).resolveSymbolicLinksSync();
  final graph = await buildSymbolImportGraph(
    root: root,
    includes: includes.isEmpty ? _defaultIncludes : includes,
    branches: branches,
  );
  final json = const JsonEncoder.withIndent(' ').convert(graph);
  if (out == null) {
    stdout.writeln(json);
  } else {
    File(out)
      ..parent.createSync(recursive: true)
      ..writeAsStringSync('$json\n');
  }
}

Future<Map<String, Object?>> buildSymbolImportGraph({
  required String root,
  required List<String> includes,
  Map<String, String> branches = const {},
}) async {
  final includedPaths = [
    for (final include in includes)
      if (Directory('$root/$include').existsSync())
        Directory('$root/$include').absolute.path,
  ];
  final collection = AnalysisContextCollection(includedPaths: includedPaths);
  final files = <String, Object?>{};
  final branchOutput = <String, Object?>{};
  final unresolved = <String>[];
  String relative(String path) =>
      path.startsWith('$root/') ? path.substring(root.length + 1) : path;
  String libraryId(LibraryElement library) {
    final path = library.firstFragment.source.fullName;
    return path.startsWith('$root/') ? relative(path) : library.uri.toString();
  }

  for (final context in collection.contexts) {
    final session = context.currentSession;
    final paths =
        context.contextRoot
            .analyzedFiles()
            .where((path) => path.endsWith('.dart'))
            .where((path) => !_excluded.hasMatch(relative(path)))
            .toList()
          ..sort();
    for (final path in paths) {
      final result = await session.getResolvedLibrary(path);
      if (result is! ResolvedLibraryResult) continue;
      final libraryPath = relative(path);
      final collector = _UseCollector(libraryId);
      for (final unit in result.units) {
        unit.unit.accept(collector);
      }
      for (final unit in result.units) {
        // Each conditional configuration names another library; its names
        // are looked up there.
        final configured = <Configuration, LibraryElement?>{};
        for (final directive in unit.unit.directives) {
          if (directive is! ImportDirective) continue;
          for (final configuration in directive.configurations) {
            configured[configuration] = await _libraryAt(
              session,
              unit.libraryFragment.source.uri,
              configuration.uri.stringValue,
            );
          }
        }
        files[relative(unit.path)] = {
          'library': libraryPath,
          'directives': [
            for (final directive in unit.unit.directives)
              ?_describeDirective(
                directive: directive,
                unit: unit,
                collector: collector,
                session: session,
                configured: configured,
                relative: relative,
                libraryId: libraryId,
                unresolved: unresolved,
              ),
          ],
        };
      }
      final flag = branches[libraryPath];
      if (flag != null) {
        final branch = _BranchCollector(flag, libraryId, result.element);
        for (final unit in result.units) {
          unit.unit.accept(branch);
        }
        branchOutput[libraryPath] = {
          'flag': flag,
          'declarations': branch.output(),
        };
      }
    }
  }
  final missingBranches = branches.keys
      .where((path) => !branchOutput.containsKey(path))
      .toList();
  if (missingBranches.isNotEmpty) {
    throw StateError('Branch libraries not analyzed: $missingBranches');
  }
  return {
    'version': 1,
    'root': root,
    'files': files,
    'branches': branchOutput,
    'unresolvedDirectives': unresolved,
  };
}

Map<String, Object?>? _describeDirective({
  required Directive directive,
  required ResolvedUnitResult unit,
  required _UseCollector collector,
  required AnalysisSession session,
  required Map<Configuration, LibraryElement?> configured,
  required String Function(String) relative,
  required String Function(LibraryElement) libraryId,
  required List<String> unresolved,
}) {
  final fragmentUri = unit.libraryFragment.source.uri;
  String? targetOf(String? uri) {
    if (uri == null) return null;
    final Uri resolved;
    try {
      resolved = fragmentUri.resolveUri(Uri.parse(uri));
    } on FormatException {
      return null;
    }
    if (resolved.scheme == 'dart') return resolved.toString();
    final path = session.uriConverter.uriToPath(resolved);
    if (path == null) return resolved.toString();
    final inRepo = relative(path);
    // Files outside the repository are named by their URI, not a machine path.
    return inRepo == path ? resolved.toString() : inRepo;
  }

  final base = <String, Object?>{
    'offset': directive.offset,
    'end': directive.end,
  };
  switch (directive) {
    case ImportDirective():
      final import = directive.libraryImport;
      final uri = directive.uri.stringValue;
      final uses = import == null ? null : collector.usesOf(import);
      if (import?.importedLibrary == null) {
        unresolved.add('${relative(unit.path)}: $uri');
      }
      return {
        ...base,
        'kind': 'import',
        'uri': uri,
        'target': targetOf(uri),
        'prefix': directive.prefix?.name,
        'deferred': directive.deferredKeyword != null,
        ..._combinators(
          directive.combinators,
          import?.importedLibrary,
          libraryId,
        ),
        'configurations': [
          for (final configuration in directive.configurations)
            {
              'uri': configuration.uri.stringValue,
              'target': targetOf(configuration.uri.stringValue),
              if (uses != null)
                'uses': _usesThrough(
                  configured[configuration],
                  uses,
                  libraryId,
                ),
            },
        ],
        'uses': uses == null ? null : _sortedUses(uses),
      };
    case ExportDirective():
      final uri = directive.uri.stringValue;
      return {
        ...base,
        'kind': 'export',
        'uri': uri,
        'target': targetOf(uri),
        ..._combinators(
          directive.combinators,
          directive.libraryExport?.exportedLibrary,
          libraryId,
        ),
        'configurations': [
          for (final configuration in directive.configurations)
            {
              'uri': configuration.uri.stringValue,
              'target': targetOf(configuration.uri.stringValue),
            },
        ],
      };
    case PartDirective():
      final uri = directive.uri.stringValue;
      return {...base, 'kind': 'part', 'uri': uri, 'target': targetOf(uri)};
    case PartOfDirective():
      final uri = directive.uri?.stringValue;
      return {...base, 'kind': 'part of', 'uri': uri, 'target': targetOf(uri)};
    default:
      return null;
  }
}

// `show` names are kept as written; each `hide` name is paired with the
// library that declares it, so a barrel import split into direct imports can
// keep hiding the name on the import that would otherwise bring it in.
Map<String, Object?> _combinators(
  List<Combinator> combinators,
  LibraryElement? library,
  String Function(LibraryElement) libraryId,
) {
  final show = <String>[];
  final hide = <String, String?>{};
  var hasShow = false;
  for (final combinator in combinators) {
    if (combinator is ShowCombinator) {
      hasShow = true;
      show.addAll(combinator.shownNames.map((name) => name.name));
    } else if (combinator is HideCombinator) {
      for (final name in combinator.hiddenNames) {
        final element = library?.exportNamespace.get2(name.name);
        final declaring = element?.library;
        hide[name.name] = declaring == null ? null : libraryId(declaring);
      }
    }
  }
  return {'show': hasShow ? show : null, 'hide': hide.isEmpty ? null : hide};
}

Map<String, List<String>> _sortedUses(Map<String, Set<String>> uses) => {
  for (final key in uses.keys.toList()..sort())
    key: uses[key]!.toList()..sort(),
};

// What a conditional configuration's library declares for the names the
// default import provides: each name is looked up in that library's exports.
Map<String, List<String>> _usesThrough(
  LibraryElement? library,
  Map<String, Set<String>> uses,
  String Function(LibraryElement) libraryId,
) {
  if (library == null) return const {};
  final result = <String, Set<String>>{};
  for (final names in uses.values) {
    for (final name in names) {
      final element = library.exportNamespace.get2(name);
      final declaring = element?.library;
      if (declaring == null) continue;
      result.putIfAbsent(libraryId(declaring), () => {}).add(name);
    }
  }
  return _sortedUses(result);
}

Future<LibraryElement?> _libraryAt(
  AnalysisSession session,
  Uri base,
  String? uri,
) async {
  if (uri == null) return null;
  final Uri resolved;
  try {
    resolved = base.resolveUri(Uri.parse(uri));
  } on FormatException {
    return null;
  }
  final result = await session.getLibraryByUri(resolved.toString());
  return result is LibraryElementResult ? result.element : null;
}

/// The top-level declaration that holds [element]: a class for a member or
/// constructor, the extension for an extension member.
Element? _topLevel(Element? element) {
  var current = element;
  while (current != null && current.enclosingElement is! LibraryElement) {
    if (current is LibraryElement) return null;
    current = current.enclosingElement;
  }
  return current;
}

/// Records, per import of the library, the declaring library and names of
/// every top-level declaration the library's code reaches through it.
class _UseCollector extends RecursiveAstVisitor<void> {
  _UseCollector(this.libraryId);

  final String Function(LibraryElement) libraryId;
  final _byImport = <LibraryImport, Map<String, Set<String>>>{};
  final _imports = <LibraryImport>[];
  LibraryElement? _library;

  Map<String, Set<String>> usesOf(LibraryImport import) =>
      _byImport[import] ?? {};

  @override
  void visitCompilationUnit(CompilationUnit node) {
    final fragment = node.declaredFragment;
    if (fragment != null) {
      _library = fragment.element;
      // A part sees its own imports and those of every fragment above it.
      _imports
        ..clear()
        ..addAll([
          for (
            LibraryFragment? f = fragment;
            f != null;
            f = f.enclosingFragment
          )
            ...f.libraryImports,
        ]);
    }
    super.visitCompilationUnit(node);
  }

  void _record(Element? element, {String? prefix, bool anyPrefix = false}) {
    final top = _topLevel(element);
    final library = top?.library;
    if (top == null || library == null || library == _library) return;
    final lookup = top.lookupName ?? top.name;
    if (lookup == null) return;
    for (final import in _imports) {
      final importPrefix = import.prefix?.name;
      if (!anyPrefix && importPrefix != prefix) continue;
      final provided =
          import.namespace.definedNames2[lookup] ??
          (lookup.endsWith('=')
              ? null
              : import.namespace.definedNames2['$lookup=']);
      if (provided == null || provided.baseElement != top.baseElement) {
        continue;
      }
      _byImport
          .putIfAbsent(import, () => {})
          .putIfAbsent(libraryId(library), () => {})
          .add(top.name ?? lookup);
    }
  }

  String? _prefixOf(SimpleIdentifier node) {
    final parent = node.parent;
    if (parent is PrefixedIdentifier &&
        parent.identifier == node &&
        parent.prefix.element is PrefixElement) {
      return parent.prefix.name;
    }
    if (parent is MethodInvocation &&
        parent.methodName == node &&
        parent.target is SimpleIdentifier &&
        (parent.target! as SimpleIdentifier).element is PrefixElement) {
      return (parent.target! as SimpleIdentifier).name;
    }
    return null;
  }

  void _recordOperator(Element? element) {
    if (_topLevel(element) is ExtensionElement) {
      _record(element, anyPrefix: true);
    }
  }

  @override
  void visitSimpleIdentifier(SimpleIdentifier node) {
    final parent = node.parent;
    if (parent is DotShorthandPropertyAccess ||
        parent is DotShorthandInvocation ||
        node.inDeclarationContext()) {
      return;
    }
    final element = node.element;
    if (element is PrefixElement) return;
    if (_topLevel(element) is ExtensionElement &&
        _topLevel(element) != element) {
      // An extension member applies through any import of its extension.
      _record(element, anyPrefix: true);
      return;
    }
    _record(element, prefix: _prefixOf(node));
  }

  @override
  void visitNamedType(NamedType node) {
    _record(node.element, prefix: node.importPrefix?.name.lexeme);
    super.visitNamedType(node);
  }

  @override
  void visitExtensionOverride(ExtensionOverride node) {
    _record(node.element, prefix: node.importPrefix?.name.lexeme);
    super.visitExtensionOverride(node);
  }

  @override
  void visitBinaryExpression(BinaryExpression node) {
    _recordOperator(node.element);
    super.visitBinaryExpression(node);
  }

  @override
  void visitPrefixExpression(PrefixExpression node) {
    _recordOperator(node.element);
    super.visitPrefixExpression(node);
  }

  @override
  void visitPostfixExpression(PostfixExpression node) {
    _recordOperator(node.element);
    super.visitPostfixExpression(node);
  }

  @override
  void visitIndexExpression(IndexExpression node) {
    _recordOperator(node.element);
    super.visitIndexExpression(node);
  }

  @override
  void visitAssignmentExpression(AssignmentExpression node) {
    _recordOperator(node.element);
    _recordOperator(node.readElement);
    _recordOperator(node.writeElement);
    super.visitAssignmentExpression(node);
  }

  @override
  void visitFunctionExpressionInvocation(FunctionExpressionInvocation node) {
    _recordOperator(node.element);
    super.visitFunctionExpressionInvocation(node);
  }
}

/// Describes a branch library declaration by declaration. Each reference
/// carries the flag values under which it runs: `if (flag)`, `flag ? a : b`
/// and collection `if` split on the flag (or `!flag`, or a property named
/// like it), and `&&`/`||` narrow the branch they guard.
class _BranchCollector extends RecursiveAstVisitor<void> {
  _BranchCollector(this.flag, this.libraryId, this.library);

  final String flag;
  final String Function(LibraryElement) libraryId;
  final LibraryElement library;
  final _refs = <String, Map<String, Set<String>>>{};
  String? _declaration;
  Set<String> _when = const {'true', 'false'};

  Map<String, Object?> output() => {
    for (final name in _refs.keys.toList()..sort())
      name: [
        for (final target in _refs[name]!.keys.toList()..sort())
          {'target': target, 'when': _refs[name]![target]!.toList()..sort()},
      ],
  };

  void _inDeclaration(String? name, void Function() visit) {
    final previous = _declaration;
    _declaration = name;
    visit();
    _declaration = previous;
  }

  @override
  void visitFunctionDeclaration(FunctionDeclaration node) {
    if (node.parent is CompilationUnit) {
      _inDeclaration(
        node.name.lexeme,
        () => super.visitFunctionDeclaration(node),
      );
    } else {
      super.visitFunctionDeclaration(node);
    }
  }

  @override
  void visitClassDeclaration(ClassDeclaration node) => _inDeclaration(
    node.namePart.typeName.lexeme,
    () => super.visitClassDeclaration(node),
  );

  @override
  void visitMixinDeclaration(MixinDeclaration node) =>
      _inDeclaration(node.name.lexeme, () => super.visitMixinDeclaration(node));

  @override
  void visitEnumDeclaration(EnumDeclaration node) => _inDeclaration(
    node.namePart.typeName.lexeme,
    () => super.visitEnumDeclaration(node),
  );

  @override
  void visitExtensionDeclaration(ExtensionDeclaration node) => _inDeclaration(
    node.name?.lexeme ?? '<unnamed extension>',
    () => super.visitExtensionDeclaration(node),
  );

  @override
  void visitGenericTypeAlias(GenericTypeAlias node) =>
      _inDeclaration(node.name.lexeme, () => super.visitGenericTypeAlias(node));

  @override
  void visitTopLevelVariableDeclaration(TopLevelVariableDeclaration node) {
    for (final variable in node.variables.variables) {
      _inDeclaration(variable.name.lexeme, () {
        node.metadata.accept(this);
        node.variables.type?.accept(this);
        variable.initializer?.accept(this);
      });
    }
  }

  void _reference(Element? element) {
    final declaration = _declaration;
    final top = _topLevel(element);
    if (declaration == null || top == null || _when.isEmpty) return;
    final topLibrary = top.library;
    if (topLibrary == null) return;
    final target = topLibrary == library
        ? '#${top.name}'
        : '${libraryId(topLibrary)}#${top.name}';
    if (target == '#$declaration') return;
    _refs
        .putIfAbsent(declaration, () => {})
        .putIfAbsent(target, () => {})
        .addAll(_when);
  }

  @override
  void visitSimpleIdentifier(SimpleIdentifier node) {
    if (!node.inDeclarationContext()) _reference(node.element);
  }

  @override
  void visitNamedType(NamedType node) {
    _reference(node.element);
    super.visitNamedType(node);
  }

  @override
  void visitBinaryExpression(BinaryExpression node) {
    _reference(node.element);
    final operator = node.operator.type;
    if (operator == TokenType.AMPERSAND_AMPERSAND ||
        operator == TokenType.BAR_BAR) {
      // The right operand runs only when the left one lets it.
      node.leftOperand.accept(this);
      final left = _truth(node.leftOperand);
      final guard = operator == TokenType.AMPERSAND_AMPERSAND
          ? left.whenTrue
          : left.whenFalse;
      _narrowed(guard, () => node.rightOperand.accept(this));
      return;
    }
    super.visitBinaryExpression(node);
  }

  @override
  void visitIfStatement(IfStatement node) {
    node.expression.accept(this);
    final truth = _truth(node.expression);
    _narrowed(truth.whenTrue, () => node.thenStatement.accept(this));
    _narrowed(truth.whenFalse, () => node.elseStatement?.accept(this));
  }

  @override
  void visitIfElement(IfElement node) {
    node.expression.accept(this);
    final truth = _truth(node.expression);
    _narrowed(truth.whenTrue, () => node.thenElement.accept(this));
    _narrowed(truth.whenFalse, () => node.elseElement?.accept(this));
  }

  @override
  void visitConditionalExpression(ConditionalExpression node) {
    node.condition.accept(this);
    final truth = _truth(node.condition);
    _narrowed(truth.whenTrue, () => node.thenExpression.accept(this));
    _narrowed(truth.whenFalse, () => node.elseExpression.accept(this));
  }

  void _narrowed(Set<String> values, void Function() visit) {
    final previous = _when;
    _when = previous.intersection(values);
    visit();
    _when = previous;
  }

  /// The flag values that make [expression] true and false.
  ({Set<String> whenTrue, Set<String> whenFalse}) _truth(
    Expression expression,
  ) {
    const both = {'true', 'false'};
    final node = expression.unParenthesized;
    if (_namesFlag(node)) return (whenTrue: {'true'}, whenFalse: {'false'});
    if (node is PrefixExpression && node.operator.type == TokenType.BANG) {
      final inner = _truth(node.operand);
      return (whenTrue: inner.whenFalse, whenFalse: inner.whenTrue);
    }
    if (node is BinaryExpression) {
      final left = _truth(node.leftOperand);
      final right = _truth(node.rightOperand);
      if (node.operator.type == TokenType.AMPERSAND_AMPERSAND) {
        return (
          whenTrue: left.whenTrue.intersection(right.whenTrue),
          whenFalse: left.whenFalse.union(right.whenFalse),
        );
      }
      if (node.operator.type == TokenType.BAR_BAR) {
        return (
          whenTrue: left.whenTrue.union(right.whenTrue),
          whenFalse: left.whenFalse.intersection(right.whenFalse),
        );
      }
    }
    return (whenTrue: both, whenFalse: both);
  }

  bool _namesFlag(Expression node) => switch (node) {
    SimpleIdentifier(:final name) => name == flag,
    PrefixedIdentifier(:final identifier) => identifier.name == flag,
    PropertyAccess(:final propertyName) => propertyName.name == flag,
    _ => false,
  };
}
