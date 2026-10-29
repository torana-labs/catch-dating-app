import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';

const _l10nImport = "import 'package:catch_dating_app/l10n/l10n.dart';";

const _copyArgumentNames = <String>{
  'actionLabel',
  'answer',
  'body',
  'caption',
  'ctaLabel',
  'description',
  'detail',
  'emptyBody',
  'emptyTitle',
  'errorMessage',
  'errorText',
  'eyebrow',
  'helperText',
  'hintText',
  'kicker',
  'label',
  'linkLabel',
  'message',
  'note',
  'placeholder',
  'prompt',
  'proof',
  'question',
  'searchPlaceholder',
  'semanticLabel',
  'statusMessage',
  'subtitle',
  'successMessage',
  'text',
  'title',
  'tooltip',
  'validationMessage',
};

const _copyConstructors = <String>{
  'AutoSizeText',
  'CatchButton',
  'CatchEmptyState',
  'CatchBanner',
  'CatchErrorState',
  'CatchFieldLabelText',
  'CatchKickerText',
  'CatchNoticeData',
  'CatchPageHeader',
  'CatchSectionHeader',
  'CatchText',
  'CupertinoActionSheetAction',
  'CupertinoDialogAction',
  'DropdownMenuEntry',
  'SnackBar',
  'Text',
  'TextSpan',
};

const _copyMemberNames = <String>{
  'badgeLabel',
  'body',
  'bodyFor',
  'description',
  'displayLabel',
  'displayName',
  'emptyBody',
  'emptyTitle',
  'errorMessage',
  'helperText',
  'hintText',
  'label',
  'message',
  'name',
  'placeholder',
  'semanticLabel',
  'subtitle',
  'successMessage',
  'title',
  'tooltip',
  'validationMessage',
};

void main(List<String> arguments) {
  final apply = arguments.contains('--apply');
  final includeDirty = arguments.contains('--include-dirty');
  final deconst = arguments.contains('--deconst');
  final allVisible = arguments.contains('--all-visible');
  final pathPrefixes = arguments
      .where((argument) => argument.startsWith('--path='))
      .map((argument) => argument.substring('--path='.length))
      .where((path) => path.isNotEmpty)
      .toList(growable: false);
  final root = Directory.current.path;
  final arbFile = File('$root/lib/l10n/app_en.arb');
  final catalog = (jsonDecode(arbFile.readAsStringSync()) as Map)
      .cast<String, Object?>();
  if (arguments.contains('--rollback-generated-batch')) {
    _rollbackGeneratedBatch(root, arbFile, catalog);
    return;
  }
  if (arguments.contains('--fix-generated-imports')) {
    _fixGeneratedImports(root, catalog);
    return;
  }
  final dirtyPaths = _dirtyPaths(root);
  final existingValues = <String, String>{
    for (final entry in catalog.entries)
      if (!entry.key.startsWith('@') && entry.value is String)
        entry.key: entry.value! as String,
  };
  final files =
      Directory('$root/lib')
          .listSync(recursive: true, followLinks: false)
          .whereType<File>()
          .where(
            (file) => _isCandidate(
              file.path,
              root,
              dirtyPaths,
              includeDirty: includeDirty,
              pathPrefixes: pathPrefixes,
            ),
          )
          .toList()
        ..sort((a, b) => a.path.compareTo(b.path));

  var changedFiles = 0;
  var migratedMessages = 0;
  final skippedByReason = <String, int>{};
  for (final file in files) {
    final relative = _relative(file.path, root);
    final source = file.readAsStringSync();
    if (source
        .split('\n')
        .take(12)
        .any((line) => line.startsWith('// copy:allow-file('))) {
      continue;
    }
    final parsed = parseString(
      content: source,
      path: relative,
      throwIfDiagnostics: false,
    );
    final imports = parsed.unit.directives
        .whereType<ImportDirective>()
        .toList();
    final isPart = parsed.unit.directives.any(
      (directive) => directive is PartOfDirective,
    );
    if (imports.isEmpty && !source.contains(_l10nImport) && !isPart) {
      skippedByReason.update(
        'no-import-anchor',
        (value) => value + 1,
        ifAbsent: () => 1,
      );
      continue;
    }
    final collector = _MigrationCollector(
      relativePath: relative,
      unit: parsed.unit,
      catalog: catalog,
      existingValues: existingValues,
      skippedByReason: skippedByReason,
      deconst: deconst,
      allVisible: allVisible,
    );
    parsed.unit.accept(collector);
    if (collector.edits.isEmpty) continue;

    final edits = [...collector.edits];
    if (!source.contains(_l10nImport) && !isPart) {
      edits.add(_Edit(imports.last.end, 0, '\n$_l10nImport'));
    }
    edits.sort((a, b) => b.offset.compareTo(a.offset));
    var migrated = source;
    for (final edit in edits) {
      migrated = migrated.replaceRange(
        edit.offset,
        edit.offset + edit.length,
        edit.replacement,
      );
    }
    if (apply) file.writeAsStringSync(migrated);
    changedFiles += 1;
    migratedMessages += collector.messageCount;
  }

  if (apply && migratedMessages > 0) {
    arbFile.writeAsStringSync(
      '${const JsonEncoder.withIndent('  ').convert(catalog)}\n',
    );
  }
  stdout.writeln(
    '${apply ? 'Migrated' : 'Would migrate'} $migratedMessages simple copy '
    'sites across $changedFiles clean Dart files.',
  );
  if (skippedByReason.isNotEmpty) {
    final summary = skippedByReason.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));
    stdout.writeln(
      'Skipped: ${summary.map((entry) => '${entry.key}=${entry.value}').join(', ')}',
    );
  }
}

class _MigrationCollector extends RecursiveAstVisitor<void> {
  _MigrationCollector({
    required this.relativePath,
    required this.unit,
    required this.catalog,
    required this.existingValues,
    required this.skippedByReason,
    required this.deconst,
    required this.allVisible,
  });

  final String relativePath;
  final CompilationUnit unit;
  final Map<String, Object?> catalog;
  final Map<String, String> existingValues;
  final Map<String, int> skippedByReason;
  final bool deconst;
  final bool allVisible;
  final edits = <_Edit>[];
  final _deconstOffsets = <int>{};
  var messageCount = 0;

  @override
  void visitSimpleStringLiteral(SimpleStringLiteral node) {
    final contextKind = _migrationContext(node);
    if (contextKind == null) {
      super.visitSimpleStringLiteral(node);
      return;
    }
    // Keep intentional line breaks and repeated spaces: copy layout is part of
    // the product contract. Only discard padding at the literal boundaries.
    final value = node.value.trim();
    final skip = _skipReason(node, value);
    if (skip != null) {
      skippedByReason.update(skip, (count) => count + 1, ifAbsent: () => 1);
      super.visitSimpleStringLiteral(node);
      return;
    }
    final localizationsAccess = _localizationsAccess(node);
    if (localizationsAccess == null) {
      skippedByReason.update(
        'no-context',
        (count) => count + 1,
        ifAbsent: () => 1,
      );
      super.visitSimpleStringLiteral(node);
      return;
    }
    final key = _messageKey(node, contextKind, value);
    if (deconst) _addDeconstEdits(node);
    final escapedValue = value.replaceAll("'", "''");
    catalog[key] = escapedValue;
    catalog['@$key'] = <String, Object>{
      'description': 'Product copy used by $relativePath ($contextKind).',
      'x-audience': _audience(relativePath),
      'x-owner': 'product',
      'x-surface': relativePath
          .replaceFirst('lib/', '')
          .replaceFirst(RegExp(r'\.dart$'), '')
          .replaceAll('/', '.'),
    };
    existingValues[key] = escapedValue;
    edits.add(_Edit(node.offset, node.length, '$localizationsAccess.$key'));
    messageCount += 1;
    super.visitSimpleStringLiteral(node);
  }

  @override
  void visitStringInterpolation(StringInterpolation node) {
    final contextKind = _migrationContext(node);
    if (contextKind == null) {
      super.visitStringInterpolation(node);
      return;
    }
    if (_hasAncestor<AdjacentStrings>(node)) {
      _recordSkip('adjacent-strings');
      super.visitStringInterpolation(node);
      return;
    }
    if (_hasInlineAllowance(node)) {
      _recordSkip('inline-allowance');
      super.visitStringInterpolation(node);
      return;
    }
    final localizationsAccess = _localizationsAccess(node);
    if (localizationsAccess == null) {
      _recordSkip('no-context');
      super.visitStringInterpolation(node);
      return;
    }

    final message = StringBuffer();
    final arguments = <({String name, String expression})>[];
    final usedNames = <String>{};
    for (final element in node.elements) {
      switch (element) {
        case InterpolationString():
          message.write(element.value);
        case InterpolationExpression():
          final name = _placeholderName(
            element.expression,
            arguments.length + 1,
            usedNames,
          );
          usedNames.add(name);
          message.write('{$name}');
          arguments.add((
            name: name,
            expression: element.expression.toSource(),
          ));
      }
    }
    final value = message.toString().trim();
    if (!RegExp('[A-Za-z]').hasMatch(value)) {
      _recordSkip('not-visible');
      super.visitStringInterpolation(node);
      return;
    }
    if (value.contains(RegExp(r'[{}].*[{}]')) && arguments.isEmpty) {
      _recordSkip('icu-braces');
      super.visitStringInterpolation(node);
      return;
    }

    final key = _messageKey(node, contextKind, value);
    final escapedValue = value.replaceAll("'", "''");
    catalog[key] = escapedValue;
    catalog['@$key'] = <String, Object>{
      'description': 'Product copy used by $relativePath ($contextKind).',
      'placeholders': <String, Object>{
        for (final argument in arguments) argument.name: <String, Object>{},
      },
      'x-audience': _audience(relativePath),
      'x-owner': 'product',
      'x-surface': relativePath
          .replaceFirst('lib/', '')
          .replaceFirst(RegExp(r'\.dart$'), '')
          .replaceAll('/', '.'),
    };
    existingValues[key] = escapedValue;
    final namedArguments = arguments
        .map((argument) => '${argument.name}: ${argument.expression}')
        .join(', ');
    edits.add(
      _Edit(
        node.offset,
        node.length,
        '$localizationsAccess.$key($namedArguments)',
      ),
    );
    messageCount += 1;
    // The whole interpolation is replaced. Do not collect overlapping edits
    // from string literals nested inside interpolation expressions.
  }

  @override
  void visitAdjacentStrings(AdjacentStrings node) {
    final contextKind = _migrationContext(node);
    if (contextKind == null) {
      super.visitAdjacentStrings(node);
      return;
    }
    if (_hasInlineAllowance(node)) {
      _recordSkip('inline-allowance');
      super.visitAdjacentStrings(node);
      return;
    }
    final localizationsAccess = _localizationsAccess(node);
    if (localizationsAccess == null) {
      _recordSkip('no-context');
      super.visitAdjacentStrings(node);
      return;
    }

    final message = StringBuffer();
    final arguments = <({String name, String expression})>[];
    final usedNames = <String>{};
    for (final string in node.strings) {
      if (string is SimpleStringLiteral) {
        message.write(string.value);
      } else if (string is StringInterpolation) {
        for (final element in string.elements) {
          switch (element) {
            case InterpolationString():
              message.write(element.value);
            case InterpolationExpression():
              final name = _placeholderName(
                element.expression,
                arguments.length + 1,
                usedNames,
              );
              usedNames.add(name);
              message.write('{$name}');
              arguments.add((
                name: name,
                expression: element.expression.toSource(),
              ));
          }
        }
      } else {
        message.write(string.stringValue ?? '');
      }
    }
    final value = message.toString().trim();
    if (!RegExp('[A-Za-z]').hasMatch(value)) {
      _recordSkip('not-visible');
      super.visitAdjacentStrings(node);
      return;
    }

    final key = _messageKey(node, contextKind, value);
    if (deconst) _addDeconstEdits(node);
    final escapedValue = value.replaceAll("'", "''");
    catalog[key] = escapedValue;
    catalog['@$key'] = <String, Object>{
      'description': 'Product copy used by $relativePath ($contextKind).',
      if (arguments.isNotEmpty)
        'placeholders': <String, Object>{
          for (final argument in arguments) argument.name: <String, Object>{},
        },
      'x-audience': _audience(relativePath),
      'x-owner': 'product',
      'x-surface': relativePath
          .replaceFirst('lib/', '')
          .replaceFirst(RegExp(r'\.dart$'), '')
          .replaceAll('/', '.'),
    };
    existingValues[key] = escapedValue;
    final replacement = arguments.isEmpty
        ? '$localizationsAccess.$key'
        : '$localizationsAccess.$key(${arguments.map((argument) => '${argument.name}: ${argument.expression}').join(', ')})';
    edits.add(_Edit(node.offset, node.length, replacement));
    messageCount += 1;
    // The whole adjacent-string expression is replaced.
  }

  String? _skipReason(SimpleStringLiteral node, String value) {
    if (!RegExp('[A-Za-z]').hasMatch(value)) return 'not-visible';
    if (value.contains('{') || value.contains('}')) return 'icu-braces';
    if (_hasAncestor<AdjacentStrings>(node)) return 'adjacent-strings';
    if (_insideConst(node) && !deconst) return 'const-context';
    if (_hasInlineAllowance(node)) return 'inline-allowance';
    if (value.length > 500) return 'long-content';
    return null;
  }

  void _recordSkip(String reason) {
    skippedByReason.update(reason, (count) => count + 1, ifAbsent: () => 1);
  }

  String _placeholderName(
    Expression expression,
    int index,
    Set<String> usedNames,
  ) {
    final raw = switch (expression) {
      SimpleIdentifier() => expression.name,
      PrefixedIdentifier() => expression.identifier.name,
      PropertyAccess() => expression.propertyName.name,
      MethodInvocation() => expression.methodName.name,
      _ => 'value$index',
    };
    var candidate = _lowerCamel([raw]);
    if (candidate.isEmpty || !RegExp(r'^[A-Za-z]').hasMatch(candidate)) {
      candidate = 'value$index';
    }
    if (!usedNames.contains(candidate)) return candidate;
    var suffix = 2;
    while (usedNames.contains('$candidate$suffix')) {
      suffix += 1;
    }
    return '$candidate$suffix';
  }

  String? _copyContext(AstNode node) {
    AstNode current = node;
    while (true) {
      final parent = current.parent;
      if (parent == null) return null;
      if (parent is NamedExpression) {
        final name = parent.name.label.name;
        if (_copyArgumentNames.contains(name)) return name;
      }
      if (parent is ArgumentList) {
        final invocation = parent.parent;
        final name = switch (invocation) {
          InstanceCreationExpression() =>
            invocation.constructorName.type.name.lexeme,
          MethodInvocation() => invocation.methodName.name,
          _ => null,
        };
        if (name != null && _copyConstructors.contains(name)) return name;
      }
      if (parent is VariableDeclaration &&
          _copyMemberNames.contains(parent.name.lexeme)) {
        return parent.name.lexeme;
      }
      if (parent is MethodDeclaration &&
          _copyMemberNames.contains(parent.name.lexeme)) {
        return parent.name.lexeme;
      }
      if (parent is CompilationUnit) return null;
      current = parent;
    }
  }

  String? _migrationContext(AstNode node) {
    final governed = _copyContext(node);
    if (governed != null) return governed;
    if (!allVisible || _isTechnicalLiteral(node)) return null;
    return 'visibleCopy';
  }

  bool _isTechnicalLiteral(AstNode node) {
    final literalValue = switch (node) {
      SimpleStringLiteral() => node.value,
      _ => null,
    };
    if (literalValue != null &&
        (RegExp(
              r'^[a-z][a-z0-9]*(?:[A-Z][A-Za-z0-9]*)+$',
            ).hasMatch(literalValue) ||
            RegExp(r'^[a-z0-9]+(?:[_-][a-z0-9]+)+$').hasMatch(literalValue))) {
      return true;
    }
    AstNode? current = node;
    while (current != null) {
      if (current is ConstantPattern) return true;
      if (current is NamedExpression &&
          const {
            'analyticsSource',
            'assetName',
            'collection',
            'fontFamily',
            'heroTag',
            'id',
            'key',
            'pathParameters',
            'queryParameters',
            'routeName',
          }.contains(current.name.label.name)) {
        return true;
      }
      if (current is ArgumentList) {
        final invocation = current.parent;
        final name = switch (invocation) {
          InstanceCreationExpression() =>
            invocation.constructorName.type.name.lexeme,
          MethodInvocation() => invocation.methodName.name,
          _ => null,
        };
        if (const {
          'Key',
          'ObjectKey',
          'PageStorageKey',
          'ValueKey',
        }.contains(name)) {
          return true;
        }
      }
      if (current is Directive || current is CompilationUnit) break;
      current = current.parent;
    }
    return false;
  }

  String? _localizationsAccess(AstNode node) {
    AstNode? current = node;
    MethodDeclaration? enclosingMethod;
    while (current != null) {
      if (current is MethodDeclaration) enclosingMethod ??= current;
      final parameters = switch (current) {
        MethodDeclaration() => current.parameters?.parameters,
        ConstructorDeclaration() => current.parameters.parameters,
        FunctionExpression() => current.parameters?.parameters,
        FunctionDeclaration() =>
          current.functionExpression.parameters?.parameters,
        _ => null,
      };
      if (parameters != null) {
        for (final parameter in parameters) {
          final source = parameter.toSource();
          final name = parameter.name?.lexeme;
          if (name == null) continue;
          if (RegExp(r'\bBuildContext\b').hasMatch(source)) {
            return '$name.l10n';
          }
          if (RegExp(r'\bAppLocalizations\b').hasMatch(source)) {
            return name;
          }
        }
        if (current is MethodDeclaration && current.name.lexeme == 'build') {
          final namedContext = parameters
              .where((parameter) => parameter.name?.lexeme == 'context')
              .firstOrNull;
          if (namedContext != null) return 'context.l10n';
        }
      }
      if (current is ClassDeclaration) {
        final superclass = current.extendsClause?.superclass.toSource() ?? '';
        if (superclass.contains('State<') ||
            superclass.contains('ConsumerState<')) {
          if (enclosingMethod == null ||
              const {
                'initState',
                'dispose',
                'deactivate',
                'reassemble',
              }.contains(enclosingMethod.name.lexeme)) {
            return null;
          }
          return 'context.l10n';
        }
      }
      current = current.parent;
    }
    return null;
  }

  bool _insideConst(AstNode node) {
    AstNode? current = node.parent;
    while (current != null && current is! FunctionBody) {
      if (current is InstanceCreationExpression &&
          current.keyword?.lexeme == 'const') {
        return true;
      }
      if (current is ListLiteral && current.constKeyword != null) return true;
      if (current is SetOrMapLiteral && current.constKeyword != null) {
        return true;
      }
      if (current is VariableDeclarationList &&
          current.keyword?.lexeme == 'const') {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  void _addDeconstEdits(AstNode node) {
    AstNode? current = node.parent;
    while (current != null && current is! FunctionBody) {
      final token = switch (current) {
        InstanceCreationExpression() => current.keyword,
        ListLiteral() => current.constKeyword,
        SetOrMapLiteral() => current.constKeyword,
        VariableDeclarationList() => current.keyword,
        _ => null,
      };
      if (token != null && token.lexeme == 'const') {
        if (_deconstOffsets.add(token.offset)) {
          final replacement = current is VariableDeclarationList ? 'final' : '';
          edits.add(_Edit(token.offset, token.length, replacement));
        }
      }
      current = current.parent;
    }
  }

  bool _hasInlineAllowance(AstNode node) {
    final line = unit.lineInfo.getLocation(node.offset).lineNumber;
    final content = unit.toSource().split('\n');
    for (
      var index = (line - 2).clamp(0, content.length - 1);
      index <= (line - 1).clamp(0, content.length - 1);
      index += 1
    ) {
      if (content[index].contains('copy:allow-inline(')) return true;
    }
    return false;
  }

  String _messageKey(AstNode node, String contextKind, String value) {
    final parts = relativePath.replaceFirst('lib/', '').split('/');
    final feature = parts.first;
    final fileName = parts.last.replaceFirst(RegExp(r'\.dart$'), '');
    final words = value
        .replaceAll(RegExp(r'[^A-Za-z0-9 ]'), ' ')
        .split(RegExp(r'\s+'))
        .where((word) => word.isNotEmpty)
        .take(4)
        .toList();
    var candidate = _lowerCamel([feature, fileName, contextKind, ...words]);
    if (candidate.isEmpty || RegExp(r'^\d').hasMatch(candidate)) {
      candidate = 'copy${_hash('$relativePath|$contextKind|$value')}';
    }
    final escapedValue = value.replaceAll("'", "''");
    final existing = existingValues[candidate];
    if (existing == null || existing == escapedValue) return candidate;
    return '$candidate${_hash('$relativePath|$contextKind|$value')}';
  }
}

class _Edit {
  const _Edit(this.offset, this.length, this.replacement);

  final int offset;
  final int length;
  final String replacement;
}

Set<String> _dirtyPaths(String root) {
  final result = Process.runSync('git', [
    'status',
    '--short',
  ], workingDirectory: root);
  if (result.exitCode != 0) throw StateError(result.stderr);
  return LineSplitter.split(result.stdout as String)
      .where((line) => line.length > 3)
      .map((line) => line.substring(3).trim())
      .toSet();
}

bool _isCandidate(
  String path,
  String root,
  Set<String> dirtyPaths, {
  required bool includeDirty,
  required List<String> pathPrefixes,
}) {
  final relative = _relative(path, root);
  if (!relative.endsWith('.dart') ||
      (!includeDirty && dirtyPaths.contains(relative))) {
    return false;
  }
  if (pathPrefixes.isNotEmpty &&
      !pathPrefixes.any((prefix) => relative.startsWith(prefix))) {
    return false;
  }
  if (relative.endsWith('.g.dart') || relative.endsWith('.freezed.dart')) {
    return false;
  }
  if (relative ==
      'lib/contexts/formats/domain/event_success_compatibility_response/questionnaire_packs.dart') {
    return false;
  }
  if (relative == 'lib/contexts/formats/domain/event_success_coach.dart' ||
      relative ==
          'lib/contexts/formats/domain/event_success_playbooks/library.dart' ||
      relative ==
          'lib/contexts/formats/domain/event_success_playbooks/modules.dart' ||
      relative ==
          'lib/contexts/formats/domain/event_success_playbooks/metrics.dart' ||
      relative == 'lib/contexts/events/domain/event_policy/cancellation.dart' ||
      relative == 'lib/contexts/events/domain/event_policy/cohort.dart' ||
      relative == 'lib/contexts/events/domain/event_policy/settlement.dart') {
    return false;
  }
  if (relative.startsWith('lib/l10n/') ||
      relative.startsWith('lib/core/schema_contracts/generated/')) {
    return false;
  }
  return true;
}

String _relative(String path, String root) =>
    path.substring(root.length + 1).replaceAll('\\', '/');

String _audience(String path) {
  if (path.startsWith('lib/hosts/') || path.contains('/host_')) return 'host';
  if (path.startsWith('lib/core/')) return 'shared';
  return 'consumer';
}

String _lowerCamel(List<String> rawParts) {
  final words = rawParts
      .expand((part) => part.split(RegExp(r'[^A-Za-z0-9]+|_+')))
      .where((part) => part.isNotEmpty)
      .toList();
  if (words.isEmpty) return '';
  final first = words.first;
  return first.substring(0, 1).toLowerCase() +
      first.substring(1) +
      words.skip(1).map((word) {
        final lower = word.toLowerCase();
        return lower.substring(0, 1).toUpperCase() + lower.substring(1);
      }).join();
}

String _hash(String value) {
  var hash = 0x811c9dc5;
  for (final unit in value.codeUnits) {
    hash ^= unit;
    hash = (hash * 0x01000193) & 0xffffffff;
  }
  return hash.toRadixString(16).padLeft(8, '0').substring(0, 6);
}

bool _hasAncestor<T extends AstNode>(AstNode node) {
  AstNode? current = node.parent;
  while (current != null) {
    if (current is T) return true;
    current = current.parent;
  }
  return false;
}

void _rollbackGeneratedBatch(
  String root,
  File arbFile,
  Map<String, Object?> catalog,
) {
  final generatedKeys = <String>[];
  final paths = <String>{};
  for (final entry in catalog.entries) {
    if (!entry.key.startsWith('@') || entry.value is! Map) continue;
    final metadata = entry.value! as Map;
    final description = metadata['description'];
    if (description is! String ||
        !description.startsWith('Product copy used by lib/')) {
      continue;
    }
    generatedKeys.add(entry.key.substring(1));
    final match = RegExp(
      r'^Product copy used by (lib/[^ ]+) \(',
    ).firstMatch(description);
    if (match != null) paths.add(match.group(1)!);
  }
  for (final path in paths) {
    final result = Process.runSync('git', [
      'show',
      'HEAD:$path',
    ], workingDirectory: root);
    if (result.exitCode != 0) {
      throw StateError('Could not restore $path: ${result.stderr}');
    }
    File('$root/$path').writeAsStringSync(result.stdout as String);
  }
  for (final key in generatedKeys) {
    catalog.remove(key);
    catalog.remove('@$key');
  }
  arbFile.writeAsStringSync(
    '${const JsonEncoder.withIndent('  ').convert(catalog)}\n',
  );
  stdout.writeln(
    'Rolled back ${generatedKeys.length} generated messages and '
    '${paths.length} clean source files.',
  );
}

void _fixGeneratedImports(String root, Map<String, Object?> catalog) {
  final paths = <String>{};
  for (final entry in catalog.entries) {
    if (!entry.key.startsWith('@') || entry.value is! Map) continue;
    final description = (entry.value! as Map)['description'];
    if (description is! String) continue;
    final match = RegExp(
      r'^Product copy used by (lib/[^ ]+) \(',
    ).firstMatch(description);
    if (match != null) paths.add(match.group(1)!);
  }
  for (final path in paths) {
    final file = File('$root/$path');
    var source = file.readAsStringSync();
    source = source.replaceFirst('$_l10nImport\n', '');
    final parsed = parseString(content: source, path: path);
    final catchImports = parsed.unit.directives
        .whereType<ImportDirective>()
        .where(
          (directive) =>
              directive.uri.stringValue?.startsWith(
                'package:catch_dating_app/',
              ) ??
              false,
        )
        .toList();
    if (catchImports.isEmpty) continue;
    var insertionOffset = catchImports.last.end;
    for (final directive in catchImports) {
      final uri = directive.uri.stringValue!;
      if (uri.compareTo('package:catch_dating_app/l10n/l10n.dart') > 0) {
        insertionOffset = directive.offset;
        break;
      }
    }
    final prefix = insertionOffset == catchImports.last.end ? '\n' : '';
    file.writeAsStringSync(
      source.replaceRange(
        insertionOffset,
        insertionOffset,
        '$prefix$_l10nImport\n',
      ),
    );
  }
  stdout.writeln('Sorted localization imports in ${paths.length} files.');
}
