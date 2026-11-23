// The analyzer-resolved import graph that tool/architecture/move_screens.mjs
// plans with. For every Dart file it lists each directive, the file the URI
// names (and each conditional configuration's file), and which libraries'
// declarations the file actually uses through that directive. A barrel is
// transparent: an import of it records the libraries that declare the names
// used, not the barrel.
//
//   dart run tool/architecture/dart_symbol_imports.dart \
//     [--root <dir>] [--out <file>] [--include <dir>]...
import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:analyzer/dart/analysis/session.dart';
import 'package:analyzer/dart/ast/ast.dart';
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
      case '--help' || '-h':
        stdout.writeln(
          'Usage: dart run tool/architecture/dart_symbol_imports.dart '
          '[--root <dir>] [--out <file>] [--include <dir>]...',
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
}) async {
  final includedPaths = [
    for (final include in includes)
      if (Directory('$root/$include').existsSync())
        Directory('$root/$include').absolute.path,
  ];
  final collection = AnalysisContextCollection(includedPaths: includedPaths);
  final files = <String, Object?>{};
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
    }
  }
  return {
    'version': 1,
    'root': root,
    'files': files,
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
    final top = _topLevel(element);
    if (top is ExtensionElement && top != element) {
      // An extension member applies through any import of its extension.
      _record(element, anyPrefix: true);
      return;
    }
    // A class, mixin or enum member needs no import of its own: `a.b` reaches
    // it through `a`, and `Foo.b` names Foo, which is recorded where it is
    // written. Recording the member's class would keep an import the
    // analyzer calls unused once a move splits a barrel into direct imports.
    if (top != null && top != element) return;
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
