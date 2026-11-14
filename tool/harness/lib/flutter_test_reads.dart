import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/token.dart';
import 'package:analyzer/dart/ast/visitor.dart';

/// The comment a `dart:io` test file or helper uses to name the repository
/// paths it reads when its code computes them:
///
/// ```dart
/// // test-selection-reads: contracts/, packages/catch_ui/assets/fonts/
/// ```
final declarationPattern = RegExp(
  r'^// test-selection-reads:(.*)$',
  multiLine: true,
);

const _fileSystemTypes = {
  'File',
  'Directory',
  'Link',
  'FileSystemEntity',
  'RandomAccessFile',
};

// Paths derived from global test inputs (the pubspecs and lockfile), which
// already select every test when they change.
bool _globalPath(String path) => path.startsWith('.dart_tool/');

/// The repository paths a `dart:io` file reads, or null when they cannot be
/// bounded and the file must stay a filesystem probe that always runs.
///
/// Without a declaration, every path the file hands to `File`, `Directory`,
/// `Link` or `FileSystemEntity` must evaluate to string literals, constants
/// of the same file, or interpolations and conditionals of those. With a
/// declaration, computed paths are trusted to stay within the declared roots,
/// but any literal or constant-prefixed path outside them, a declared root
/// absent from [paths], or a use of `Process`, `Directory.current` or
/// `Platform.script` keeps the file a probe.
Set<String>? fileReads({
  required String name,
  required String source,
  required CompilationUnit unit,
  required Set<String> paths,
}) {
  final declared = <String>[];
  for (final match in declarationPattern.allMatches(source)) {
    for (final entry in match.group(1)!.split(',')) {
      final root = _normalize(entry.trim());
      // An absolute, parent-relative or empty root bounds nothing.
      if (root == null || root.isEmpty) return null;
      declared.add(root);
    }
  }
  for (final directive in unit.directives) {
    if (directive is ImportDirective &&
        directive.uri.stringValue == 'dart:io' &&
        (directive.prefix != null || directive.combinators.isNotEmpty)) {
      return null;
    }
  }
  // A name the file also binds anywhere below the top level (a parameter,
  // local, loop or catch variable, pattern variable, nested function or class
  // member) may shadow the top-level constant where a path uses it. The
  // unresolved AST cannot tell which binding a use refers to, so such a name
  // counts as computed.
  final shadowed = _LocalNames();
  unit.accept(shadowed);
  final constants = <String, Expression>{
    for (final declaration in unit.declarations)
      if (declaration is TopLevelVariableDeclaration &&
          (declaration.variables.isConst || declaration.variables.isFinal))
        for (final variable in declaration.variables.variables)
          if (!shadowed.names.contains(variable.name.lexeme))
            variable.name.lexeme: ?variable.initializer,
  };
  final visitor = _PathVisitor(constants);
  unit.accept(visitor);
  if (visitor.forbidden) return null;
  if (declared.isEmpty) {
    if (visitor.paths.any((path) => !path.complete)) return null;
    final reads = <String>{};
    for (final path in visitor.paths) {
      final normalized = _normalize(path.text);
      if (normalized == null || normalized.isEmpty) return null;
      reads.add(normalized);
    }
    return reads;
  }
  for (final root in declared) {
    if (!paths.any((path) => path == root || path.startsWith('$root/'))) {
      return null;
    }
  }
  for (final path in visitor.paths) {
    if (!path.complete && path.text.isEmpty) continue; // Trusted computation.
    final text = path.text.startsWith('./')
        ? path.text.substring(2)
        : path.text;
    if (_globalPath(text)) continue;
    final inside = declared.any(
      (root) =>
          text == root ||
          text.startsWith('$root/') ||
          (!path.complete && text == '$root/'),
    );
    if (!inside) return null;
  }
  return declared.toSet();
}

/// Whether a changed repository path is one a test with [reads] can read.
bool readsPath(Set<String> reads, String path) =>
    reads.any((read) => path == read || path.startsWith('$read/'));

String? _normalize(String path) {
  var value = path;
  while (value.startsWith('./')) {
    value = value.substring(2);
  }
  while (value.endsWith('/')) {
    value = value.substring(0, value.length - 1);
  }
  if (value.startsWith('/') ||
      value.contains(r'\') ||
      value.split('/').any((segment) => segment == '..' || segment == '.')) {
    return null;
  }
  return value;
}

/// A path expression's value: the full text when [complete], otherwise the
/// literal prefix before the first computed part.
typedef _Path = ({String text, bool complete});

class _PathVisitor extends RecursiveAstVisitor<void> {
  _PathVisitor(this.constants);

  final Map<String, Expression> constants;
  final paths = <_Path>[];
  var forbidden = false;
  final _evaluating = <String>{};
  final _consumed = <SimpleIdentifier>{};

  static const _computed = (text: '', complete: false);

  List<_Path> evaluate(Expression expression) {
    switch (expression) {
      case SimpleStringLiteral(:final value):
        return [(text: value, complete: true)];
      case ParenthesizedExpression(:final expression):
        return evaluate(expression);
      case ConditionalExpression(:final thenExpression, :final elseExpression):
        return [...evaluate(thenExpression), ...evaluate(elseExpression)];
      case AdjacentStrings(:final strings):
        return _concatenate(strings.map(evaluate).toList());
      case StringInterpolation(:final elements):
        return _concatenate([
          for (final element in elements)
            switch (element) {
              InterpolationString(:final value) => [
                (text: value, complete: true),
              ],
              InterpolationExpression(:final expression) => evaluate(
                expression,
              ),
            },
        ]);
      case SimpleIdentifier(:final name)
          when constants.containsKey(name) && _evaluating.add(name):
        try {
          return evaluate(constants[name]!);
        } finally {
          _evaluating.remove(name);
        }
      default:
        return [_computed];
    }
  }

  List<_Path> _concatenate(List<List<_Path>> parts) {
    var results = <_Path>[(text: '', complete: true)];
    for (final part in parts) {
      final next = <_Path>[];
      for (final prefix in results) {
        if (!prefix.complete) {
          next.add(prefix);
          continue;
        }
        for (final value in part) {
          next.add((
            text: '${prefix.text}${value.text}',
            complete: value.complete,
          ));
        }
      }
      if (next.length > 64) return [_computed];
      results = next;
    }
    return results;
  }

  void _arguments(ArgumentList arguments) {
    final positional = arguments.arguments.where(
      (argument) => argument is! NamedExpression,
    );
    if (positional.isEmpty) {
      paths.add(_computed);
      return;
    }
    for (final argument in positional) {
      paths.addAll(evaluate(argument));
    }
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    final target = node.target;
    final method = node.methodName.name;
    if (target == null && _fileSystemTypes.contains(method)) {
      _consumed.add(node.methodName);
      _arguments(node.argumentList);
    } else if (target is SimpleIdentifier &&
        _fileSystemTypes.contains(target.name)) {
      _consumed.add(target);
      if (method == 'fromUri' || method == 'fromRawPath') {
        paths.add(_computed);
      } else {
        _arguments(node.argumentList);
      }
    }
    super.visitMethodInvocation(node);
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    final type = node.constructorName.type.name.lexeme;
    if (_fileSystemTypes.contains(type)) {
      final named = node.constructorName.name?.name;
      if (named == null) {
        _arguments(node.argumentList);
      } else {
        paths.add(_computed);
      }
    }
    super.visitInstanceCreationExpression(node);
  }

  @override
  void visitPrefixedIdentifier(PrefixedIdentifier node) {
    final prefix = node.prefix.name;
    final member = node.identifier.name;
    if ((prefix == 'Directory' && member == 'current') ||
        (prefix == 'Platform' && member == 'script')) {
      forbidden = true;
    } else if (_fileSystemTypes.contains(prefix)) {
      _consumed.add(node.prefix);
      // A temporary directory holds only what the test itself writes.
      if (!(prefix == 'Directory' && member == 'systemTemp')) {
        paths.add(_computed);
      }
    }
    super.visitPrefixedIdentifier(node);
  }

  @override
  void visitSimpleIdentifier(SimpleIdentifier node) {
    if (node.name == 'Process') forbidden = true;
    if (_fileSystemTypes.contains(node.name) && !_consumed.contains(node)) {
      paths.add(_computed); // A tear-off or alias escapes path evaluation.
    }
    super.visitSimpleIdentifier(node);
  }
}

/// Every name bound below the top level of a compilation unit.
class _LocalNames extends RecursiveAstVisitor<void> {
  final names = <String>{};

  void _add(Token? name) {
    if (name != null) names.add(name.lexeme);
  }

  @override
  void visitVariableDeclaration(VariableDeclaration node) {
    if (node.parent?.parent is! TopLevelVariableDeclaration) _add(node.name);
    super.visitVariableDeclaration(node);
  }

  @override
  void visitSimpleFormalParameter(SimpleFormalParameter node) {
    _add(node.name);
    super.visitSimpleFormalParameter(node);
  }

  @override
  void visitFieldFormalParameter(FieldFormalParameter node) {
    _add(node.name);
    super.visitFieldFormalParameter(node);
  }

  @override
  void visitSuperFormalParameter(SuperFormalParameter node) {
    _add(node.name);
    super.visitSuperFormalParameter(node);
  }

  @override
  void visitFunctionTypedFormalParameter(FunctionTypedFormalParameter node) {
    _add(node.name);
    super.visitFunctionTypedFormalParameter(node);
  }

  @override
  void visitDeclaredIdentifier(DeclaredIdentifier node) {
    _add(node.name);
    super.visitDeclaredIdentifier(node);
  }

  @override
  void visitCatchClauseParameter(CatchClauseParameter node) {
    _add(node.name);
    super.visitCatchClauseParameter(node);
  }

  @override
  void visitDeclaredVariablePattern(DeclaredVariablePattern node) {
    _add(node.name);
    super.visitDeclaredVariablePattern(node);
  }

  @override
  void visitFunctionDeclaration(FunctionDeclaration node) {
    if (node.parent is! CompilationUnit) _add(node.name);
    super.visitFunctionDeclaration(node);
  }

  @override
  void visitMethodDeclaration(MethodDeclaration node) {
    _add(node.name);
    super.visitMethodDeclaration(node);
  }
}
