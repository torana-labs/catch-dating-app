import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/analysis/results.dart';
import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:crypto/crypto.dart';
import 'package:path/path.dart' as p;

const _tokenClassSources = [
  'packages/catch_tokens/lib',
  'packages/catch_ui/lib/src/foundations',
  'lib/platform/theme',
];

Map<String, Object?> extractFingerprints({
  required String repoRoot,
  List<String>? files,
  String? classificationPath,
  DateTime? generatedAt,
}) {
  final normalizedRoot = p.normalize(repoRoot);
  final hasExplicitFiles = files != null && files.isNotEmpty;
  final normalizedClassificationPath = classificationPath?.trim();
  if (!hasExplicitFiles &&
      (normalizedClassificationPath == null ||
          normalizedClassificationPath.isEmpty)) {
    throw ArgumentError(
      'classificationPath is required when files are not supplied.',
    );
  }
  final registry =
      normalizedClassificationPath == null ||
          normalizedClassificationPath.isEmpty
      ? const _ClassificationRegistry([])
      : _readClassificationRegistry(
          normalizedRoot,
          normalizedClassificationPath,
        );
  final registryEntries = registry.entries;
  final tokenClasses = _collectTokenClasses(normalizedRoot);
  final targetFiles = !hasExplicitFiles
      ? registryEntries
            .where((entry) => entry.classKind == 'widget')
            .map((entry) => entry.file)
            .toSet()
      : files.map((file) => _relativeFile(normalizedRoot, file)).toSet();
  final entriesByFile = <String, List<_RegistryEntry>>{};
  for (final entry in registryEntries) {
    entriesByFile.putIfAbsent(entry.file, () => []).add(entry);
  }

  final widgets = <Map<String, Object?>>[];
  final failures = <Map<String, Object?>>[];

  for (final relativeFile in targetFiles.toList()..sort()) {
    final filePath = p.join(normalizedRoot, relativeFile);
    final sourceFile = File(filePath);
    if (!sourceFile.existsSync()) {
      final fileEntries =
          entriesByFile[relativeFile] ?? const <_RegistryEntry>[];
      final widgetEntries = fileEntries.where(
        (entry) => entry.classKind == 'widget',
      );
      if (widgetEntries.isEmpty) {
        failures.add({
          'name': null,
          'file': relativeFile,
          'reason': 'file not found',
        });
      } else {
        for (final entry in widgetEntries) {
          failures.add({
            'name': entry.name,
            'file': relativeFile,
            'reason': 'file not found',
          });
        }
      }
      continue;
    }

    late ParseStringResult parsed;
    try {
      parsed = parseString(
        content: sourceFile.readAsStringSync(),
        path: filePath,
        throwIfDiagnostics: false,
      );
    } catch (error) {
      failures.add({
        'name': null,
        'file': relativeFile,
        'reason': 'parse failed: $error',
      });
      continue;
    }

    final classes = _classesByName(parsed.unit);
    final fileEntries = !hasExplicitFiles
        ? (entriesByFile[relativeFile] ?? const <_RegistryEntry>[])
        : _entriesForExplicitFile(
            relativeFile,
            entriesByFile[relativeFile] ?? const <_RegistryEntry>[],
            classes.values,
          );
    final stateLinks = _linkStateClasses(fileEntries, classes);

    for (final entry in fileEntries.where(
      (entry) => entry.classKind == 'widget',
    )) {
      final declaration = classes[entry.name];
      if (declaration == null) {
        failures.add({
          'name': entry.name,
          'file': relativeFile,
          'reason': 'class declaration not found',
        });
        continue;
      }

      final stateClassName = stateLinks[entry.name];
      final stateDeclaration = stateClassName == null
          ? null
          : classes[stateClassName];
      final methods = [
        ..._orderedWidgetMethods(declaration),
        if (stateDeclaration != null)
          ..._orderedWidgetMethods(stateDeclaration),
      ];
      if (methods.isEmpty) {
        failures.add({
          'name': entry.name,
          'file': relativeFile,
          'reason': 'no widget-returning methods found',
        });
        continue;
      }

      final tokenStreams = _TokenStreams();
      for (final method in methods) {
        method.body.accept(_TokenVisitor(tokenStreams, tokenClasses));
      }
      final fineTokens = tokenStreams.fine;
      final coarseTokens = tokenStreams.coarse;
      final shingles = _shingles(coarseTokens, 2);
      final tokenMultiset = _tokenMultiset(coarseTokens);
      final lineStart = parsed.lineInfo
          .getLocation(declaration.offset)
          .lineNumber;
      final lineEnd = parsed.lineInfo.getLocation(declaration.end).lineNumber;
      final constructors = declaration.body.members
          .whereType<ConstructorDeclaration>();
      final unnamedConstructor = constructors
          .where((constructor) => constructor.name == null)
          .cast<ConstructorDeclaration?>()
          .firstWhere((constructor) => constructor != null, orElse: () => null);

      widgets.add({
        'name': entry.name,
        'file': relativeFile,
        'role': entry.role,
        'classKind': entry.classKind,
        'contractId': entry.contractId,
        'loc': {'startLine': lineStart, 'endLine': lineEnd},
        'constructorParams': _constructorParams(unnamedConstructor),
        'widgetsUsed': _distinctPrefixed(fineTokens, 'W:'),
        'tokensUsed': _distinctPrefixed(fineTokens, 'T:'),
        'coarseTokensUsed': _distinctPrefixed(coarseTokens, 'T:'),
        'tokenStreamLength': fineTokens.length,
        'coarseTokenStreamLength': coarseTokens.length,
        'hasWidgetHelpers': _hasWidgetHelpers(methods),
        'stateClass': stateClassName,
        'shapeHash': sha256
            .convert(utf8.encode(fineTokens.join('\n')))
            .toString(),
        'coarseShapeHash': sha256
            .convert(utf8.encode(coarseTokens.join('\n')))
            .toString(),
        'simhash128': _simhash128(shingles),
        'tokenStream': fineTokens,
        'coarseTokenStream': coarseTokens,
        'shingles': shingles.toList()..sort(),
        'tokenMultiset': tokenMultiset,
      });
    }
  }

  widgets.sort((a, b) {
    final fileCompare = (a['file']! as String).compareTo(b['file']! as String);
    if (fileCompare != 0) return fileCompare;
    return (a['name']! as String).compareTo(b['name']! as String);
  });
  failures.sort((a, b) {
    final fileCompare = _stringValue(
      a['file'],
    ).compareTo(_stringValue(b['file']));
    if (fileCompare != 0) return fileCompare;
    return _stringValue(a['name']).compareTo(_stringValue(b['name']));
  });

  return {
    'version': 2,
    'generatedAt': (generatedAt ?? DateTime.now().toUtc()).toIso8601String(),
    'tokenClassSources': _tokenClassSources,
    'tokenClasses': tokenClasses.toList()..sort(),
    'widgets': widgets,
    'failures': failures,
  };
}

_ClassificationRegistry _readClassificationRegistry(
  String repoRoot,
  String classificationPath,
) {
  final path = p.isAbsolute(classificationPath)
      ? p.normalize(classificationPath)
      : p.normalize(p.join(repoRoot, classificationPath));
  final file = File(path);
  if (!file.existsSync()) {
    throw ArgumentError.value(
      classificationPath,
      'classificationPath',
      'Classification file does not exist.',
    );
  }
  final json = jsonDecode(file.readAsStringSync()) as Map<String, Object?>;
  final widgets = (json['widgets'] as List<Object?>? ?? const [])
      .whereType<Map<String, Object?>>()
      .map(_RegistryEntry.fromJson)
      .toList();
  return _ClassificationRegistry(widgets);
}

Set<String> _collectTokenClasses(String repoRoot) {
  final classes = <String>{};
  for (final source in _tokenClassSources) {
    final root = Directory(p.join(repoRoot, source));
    if (!root.existsSync()) continue;
    for (final entity in root.listSync(recursive: true)) {
      if (entity is! File || !entity.path.endsWith('.dart')) continue;
      final parsed = parseString(
        content: entity.readAsStringSync(),
        path: entity.path,
        throwIfDiagnostics: false,
      );
      for (final declaration
          in parsed.unit.declarations.whereType<ClassDeclaration>()) {
        final name = _className(declaration);
        if (!name.startsWith('_')) classes.add(name);
      }
    }
  }
  return classes;
}

Map<String, ClassDeclaration> _classesByName(CompilationUnit unit) {
  final classes = <String, ClassDeclaration>{};
  for (final declaration in unit.declarations.whereType<ClassDeclaration>()) {
    classes[_className(declaration)] = declaration;
  }
  return classes;
}

List<_RegistryEntry> _entriesForExplicitFile(
  String file,
  List<_RegistryEntry> registryEntries,
  Iterable<ClassDeclaration> declarations,
) {
  final byName = {for (final entry in registryEntries) entry.name: entry};
  return declarations
      .where(
        (declaration) =>
            _isWidgetClass(declaration) || _isStateClass(declaration),
      )
      .map((declaration) {
        final name = _className(declaration);
        final fromRegistry = byName[name];
        if (fromRegistry != null) return fromRegistry;
        return _RegistryEntry(
          name: name,
          file: file,
          classKind: _isStateClass(declaration) ? 'widget-state' : 'widget',
          role: 'unclassified',
          contractId: null,
        );
      })
      .toList()
    ..sort((a, b) => a.name.compareTo(b.name));
}

Map<String, String> _linkStateClasses(
  List<_RegistryEntry> entries,
  Map<String, ClassDeclaration> classes,
) {
  final links = <String, String>{};
  final stateClassNames = entries
      .where((entry) => entry.classKind == 'widget-state')
      .map((entry) => entry.name)
      .toSet();
  for (final entry in entries.where((entry) => entry.classKind == 'widget')) {
    final declaration = classes[entry.name];
    if (declaration == null) continue;
    final createState = declaration.body.members
        .whereType<MethodDeclaration>()
        .where((method) => method.name.lexeme == 'createState')
        .cast<MethodDeclaration?>()
        .firstWhere((method) => method != null, orElse: () => null);
    final explicit = createState == null
        ? null
        : _stateClassFromCreateState(createState);
    if (explicit != null && classes.containsKey(explicit)) {
      links[entry.name] = explicit;
      continue;
    }
    final conventional = '_${entry.name}State';
    if (classes.containsKey(conventional)) {
      links[entry.name] = conventional;
      continue;
    }
    final matching = stateClassNames.firstWhere(
      (stateName) =>
          stateName.replaceFirst(RegExp(r'^_+'), '').startsWith(entry.name),
      orElse: () => '',
    );
    if (matching.isNotEmpty && classes.containsKey(matching)) {
      links[entry.name] = matching;
    }
  }
  return links;
}

String? _stateClassFromCreateState(MethodDeclaration method) {
  final returnType = method.returnType?.toSource();
  if (returnType != null) {
    final direct = RegExp(
      r'\b(_?[A-Z][A-Za-z0-9_]*State)\b',
    ).firstMatch(returnType);
    if (direct != null) return direct.group(1);
  }
  final body = method.body.toSource();
  final created =
      RegExp(r'=>\s*(_?[A-Z][A-Za-z0-9_]*State)\s*\(').firstMatch(body) ??
      RegExp(r'return\s+(_?[A-Z][A-Za-z0-9_]*State)\s*\(').firstMatch(body);
  return created?.group(1);
}

bool _isStateClass(ClassDeclaration declaration) {
  final superclass = declaration.extendsClause?.superclass.toSource() ?? '';
  return RegExp(r'^(?:State|ConsumerState)<').hasMatch(superclass);
}

bool _isWidgetClass(ClassDeclaration declaration) {
  final superclass = declaration.extendsClause?.superclass.toSource() ?? '';
  return RegExp(
    r'^(?:StatelessWidget|StatefulWidget|ConsumerWidget|ConsumerStatefulWidget|HookWidget|HookConsumerWidget)$',
  ).hasMatch(superclass);
}

List<MethodDeclaration> _orderedWidgetMethods(ClassDeclaration declaration) {
  final methods = declaration.body.members.whereType<MethodDeclaration>().where(
    (method) {
      if (method.isGetter || method.isSetter) return false;
      if (method.name.lexeme == 'build') return true;
      return _isWidgetReturnType(method.returnType?.toSource());
    },
  ).toList();
  methods.sort((a, b) {
    if (a.name.lexeme == 'build' && b.name.lexeme != 'build') return -1;
    if (b.name.lexeme == 'build' && a.name.lexeme != 'build') return 1;
    return a.name.lexeme.compareTo(b.name.lexeme);
  });
  return methods;
}

bool _isWidgetReturnType(String? rawType) {
  if (rawType == null) return false;
  final type = rawType.replaceAll(RegExp(r'\s+'), '');
  return type == 'Widget' ||
      type == 'Widget?' ||
      type == 'List<Widget>' ||
      type == 'PreferredSizeWidget';
}

bool _hasWidgetHelpers(List<MethodDeclaration> methods) {
  return methods.any(
    (method) =>
        method.name.lexeme != 'build' &&
        _isWidgetReturnType(method.returnType?.toSource()),
  );
}

List<Map<String, Object?>> _constructorParams(
  ConstructorDeclaration? constructor,
) {
  if (constructor == null) return const [];
  return constructor.parameters.parameters.map((parameter) {
    return {
      'name': parameter.name?.lexeme,
      'type': parameter.type?.toSource(),
      'required':
          parameter.requiredKeyword != null || parameter.isRequiredNamed,
    };
  }).toList();
}

Set<String> _shingles(List<String> tokens, int k) {
  final shingles = <String>{};
  for (var index = 0; index <= tokens.length - k; index += 1) {
    final gram = tokens.sublist(index, index + k).join('|');
    shingles.add(sha1.convert(utf8.encode(gram)).toString().substring(0, 10));
  }
  return shingles;
}

Map<String, int> _tokenMultiset(List<String> tokens) {
  final counts = <String, int>{};
  for (final token in tokens) {
    counts[token] = (counts[token] ?? 0) + 1;
  }
  return Map.fromEntries(
    counts.entries.toList()..sort((a, b) => a.key.compareTo(b.key)),
  );
}

String _simhash128(Set<String> features) {
  final weights = List<int>.filled(128, 0);
  for (final feature in features) {
    final digest = sha1.convert(utf8.encode(feature)).bytes;
    for (var byteIndex = 0; byteIndex < 16; byteIndex += 1) {
      final byte = digest[byteIndex];
      for (var bit = 0; bit < 8; bit += 1) {
        final mask = 1 << (7 - bit);
        weights[byteIndex * 8 + bit] += (byte & mask) == 0 ? -1 : 1;
      }
    }
  }
  final buffer = StringBuffer();
  for (var nibbleStart = 0; nibbleStart < 128; nibbleStart += 4) {
    var nibble = 0;
    for (var bit = 0; bit < 4; bit += 1) {
      nibble = (nibble << 1) | (weights[nibbleStart + bit] >= 0 ? 1 : 0);
    }
    buffer.write(nibble.toRadixString(16));
  }
  return buffer.toString();
}

List<String> _distinctPrefixed(List<String> tokens, String prefix) {
  return tokens
      .where((token) => token.startsWith(prefix))
      .map((token) => token.substring(prefix.length))
      .toSet()
      .toList()
    ..sort();
}

String _relativeFile(String repoRoot, String file) {
  final normalized = p.normalize(file);
  if (p.isAbsolute(normalized)) {
    return p.relative(normalized, from: repoRoot);
  }
  return normalized;
}

String _className(ClassDeclaration declaration) {
  return declaration.namePart.typeName.lexeme;
}

String _stringValue(Object? value) {
  return value == null ? '' : value.toString();
}

class _TokenStreams {
  final fine = <String>[];
  final coarse = <String>[];

  void addBoth(String token) {
    fine.add(token);
    coarse.add(token);
  }
}

class _TokenVisitor extends RecursiveAstVisitor<void> {
  _TokenVisitor(this.tokens, this.tokenClasses);

  final _TokenStreams tokens;
  final Set<String> tokenClasses;

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    _emitWidgetInvocation(
      node.constructorName.toSource(),
      node.argumentList.arguments,
    );
    super.visitInstanceCreationExpression(node);
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    final name = node.methodName.name;
    if (RegExp(r'^[A-Z]').hasMatch(name)) {
      _emitWidgetInvocation(name, node.argumentList.arguments);
    }
    super.visitMethodInvocation(node);
  }

  @override
  void visitPrefixedIdentifier(PrefixedIdentifier node) {
    final prefix = node.prefix.name;
    if (tokenClasses.contains(prefix)) {
      tokens.fine.add('T:$prefix.${node.identifier.name}');
      tokens.coarse.add('T:$prefix');
    }
    super.visitPrefixedIdentifier(node);
  }

  @override
  void visitPropertyAccess(PropertyAccess node) {
    final target = node.target?.toSource();
    if (target != null && tokenClasses.contains(target)) {
      tokens.fine.add('T:$target.${node.propertyName.name}');
      tokens.coarse.add('T:$target');
    }
    super.visitPropertyAccess(node);
  }

  @override
  void visitSimpleStringLiteral(SimpleStringLiteral node) {
    tokens.addBoth('S');
  }

  @override
  void visitStringInterpolation(StringInterpolation node) {
    tokens.addBoth('S');
  }

  @override
  void visitAdjacentStrings(AdjacentStrings node) {
    tokens.addBoth('S');
  }

  @override
  void visitIntegerLiteral(IntegerLiteral node) {
    tokens.addBoth('N');
    super.visitIntegerLiteral(node);
  }

  @override
  void visitDoubleLiteral(DoubleLiteral node) {
    tokens.addBoth('N');
    super.visitDoubleLiteral(node);
  }

  @override
  void visitBooleanLiteral(BooleanLiteral node) {
    tokens.addBoth('B');
    super.visitBooleanLiteral(node);
  }

  @override
  void visitConditionalExpression(ConditionalExpression node) {
    tokens.addBoth('C:cond');
    super.visitConditionalExpression(node);
  }

  @override
  void visitIfStatement(IfStatement node) {
    tokens.addBoth('C:if');
    super.visitIfStatement(node);
  }

  @override
  void visitIfElement(IfElement node) {
    tokens.addBoth('C:if');
    super.visitIfElement(node);
  }

  @override
  void visitForStatement(ForStatement node) {
    tokens.addBoth('C:for');
    super.visitForStatement(node);
  }

  @override
  void visitForElement(ForElement node) {
    tokens.addBoth('C:for');
    super.visitForElement(node);
  }

  @override
  void visitForEachPartsWithDeclaration(ForEachPartsWithDeclaration node) {
    tokens.addBoth('C:for');
    super.visitForEachPartsWithDeclaration(node);
  }

  @override
  void visitForEachPartsWithIdentifier(ForEachPartsWithIdentifier node) {
    tokens.addBoth('C:for');
    super.visitForEachPartsWithIdentifier(node);
  }

  @override
  void visitWhileStatement(WhileStatement node) {
    tokens.addBoth('C:for');
    super.visitWhileStatement(node);
  }

  @override
  void visitDoStatement(DoStatement node) {
    tokens.addBoth('C:for');
    super.visitDoStatement(node);
  }

  @override
  void visitSpreadElement(SpreadElement node) {
    tokens.addBoth('C:spread');
    super.visitSpreadElement(node);
  }

  @override
  void visitNullLiteral(NullLiteral node) {
    tokens.addBoth('Z');
    super.visitNullLiteral(node);
  }

  void _emitWidgetInvocation(String rawName, NodeList<Argument> arguments) {
    final widgetToken = 'W:${_normalizeConstructorName(rawName)}';
    tokens.addBoth(widgetToken);
    final coarseArgs = <String>[];
    for (final argument in arguments) {
      if (argument is NamedArgument) {
        final token = 'A:${argument.name.lexeme}';
        tokens.fine.add(token);
        coarseArgs.add(token);
      } else {
        tokens.fine.add('A:_');
        coarseArgs.add('A:_');
      }
    }
    coarseArgs.sort();
    tokens.coarse.addAll(coarseArgs);
  }

  String _normalizeConstructorName(String rawName) {
    return rawName
        .replaceAll(RegExp(r'<[^<>]*>'), '')
        .replaceAll(RegExp(r'\s+'), '');
  }
}

class _ClassificationRegistry {
  const _ClassificationRegistry(this.entries);

  final List<_RegistryEntry> entries;
}

class _RegistryEntry {
  const _RegistryEntry({
    required this.name,
    required this.file,
    required this.classKind,
    required this.role,
    required this.contractId,
  });

  factory _RegistryEntry.fromJson(Map<String, Object?> json) {
    return _RegistryEntry(
      name: json['name']! as String,
      file: json['file']! as String,
      classKind: json['classKind']! as String,
      role: json['role']! as String,
      contractId: json['contractId'] as String?,
    );
  }

  final String name;
  final String file;
  final String classKind;
  final String role;
  final String? contractId;
}

/// Syntax-based review queue, deliberately not an automatic deletion decision.
/// Accepts source text so coverage and false-positive behavior can be tested
/// without resolving Flutter dependencies or loading the application.
Map<String, Object?> analyzeRetirementSources(Map<String, String> sources) {
  final files = sources.keys.toList()..sort();
  final failures = <Map<String, Object?>>[];
  final declarations = <_RetirementDeclaration>[];
  final libraries = <String, String>{for (final file in files) file: file};
  String library(String file) {
    var current = file;
    final visited = <String>{};
    while (libraries[current] != current && visited.add(current)) {
      current = libraries[current]!;
    }
    return current;
  }

  for (final file in files) {
    if (_retirementGenerated(file, sources[file]!)) {
      // Generated files are blockers, never candidates. A lexical superset
      // also tolerates generator syntax ahead of this parser's language mode.
      // Including comments/string identifiers may retain extra widgets, but
      // cannot manufacture a no-reference result from an unsupported AST.
      declarations.add(
        _RetirementDeclaration(
          file: file,
          name: '<generated>',
          kind: 'generated',
          base: null,
          stateOf: null,
          line: 1,
          endLine: sources[file]!.split('\n').length,
          references: RegExp(
            r'[A-Za-z_$][A-Za-z0-9_$]*',
          ).allMatches(sources[file]!).map((match) => match[0]!).toSet(),
          annotations: {},
          entryPoint: false,
        ),
      );
      continue;
    }
    final parsed = parseString(
      content: sources[file]!,
      path: file,
      throwIfDiagnostics: false,
    );
    if (parsed.errors.isNotEmpty) {
      failures.add({
        'file': file,
        'diagnostics': parsed.errors.map((error) => error.toString()).toList(),
      });
    }
    for (final directive in parsed.unit.directives.whereType<PartDirective>()) {
      final uri = directive.uri.stringValue;
      if (uri == null) continue;
      final part = p.posix.normalize(p.posix.join(p.posix.dirname(file), uri));
      if (libraries.containsKey(part))
        libraries[part] = file;
      else
        failures.add({'file': file, 'missingPart': part});
    }
    for (final node in parsed.unit.declarations) {
      final name = switch (node) {
        ClassDeclaration() => node.namePart.typeName.lexeme,
        FunctionDeclaration() => node.name.lexeme,
        EnumDeclaration() => node.namePart.typeName.lexeme,
        GenericTypeAlias() => node.name.lexeme,
        _ => null,
      };
      final base = node is ClassDeclaration
          ? node.extendsClause?.superclass.name.lexeme
          : null;
      final stateOf =
          node is ClassDeclaration &&
              const {'State', 'ConsumerState'}.contains(base)
          ? node.extendsClause?.superclass.typeArguments?.arguments.firstOrNull
                ?.toSource()
          : null;
      // Tokens retain interpolated expressions, but not comments or string text.
      // Named arguments/declarations may overcount; this is conservative.
      final references = <String>{};
      var token = node.firstTokenAfterCommentAndMetadata;
      while (token.offset <= node.endToken.offset && !token.isEof) {
        if (token.isIdentifier) references.add(token.lexeme);
        token = token.next!;
      }
      final annotationReferences = <String>{};
      for (final annotation in node.metadata) {
        var annotationToken = annotation.beginToken;
        while (annotationToken.offset <= annotation.endToken.offset &&
            !annotationToken.isEof) {
          if (annotationToken.isIdentifier) {
            annotationReferences.add(annotationToken.lexeme);
          }
          annotationToken = annotationToken.next!;
        }
      }
      final line = parsed.lineInfo.getLocation(node.offset).lineNumber;
      declarations.add(
        _RetirementDeclaration(
          file: file,
          name: name ?? '<top-level:$line>',
          kind: node is ClassDeclaration
              ? 'class'
              : node is FunctionDeclaration
              ? 'function'
              : 'other',
          base: base,
          stateOf: stateOf,
          line: line,
          endLine: parsed.lineInfo.getLocation(node.end - 1).lineNumber,
          references: references,
          annotations: annotationReferences,
          entryPoint: node.metadata.any(
            (annotation) => annotation.toSource().contains('vm:entry-point'),
          ),
        ),
      );
    }
  }
  final byName = <String, List<_RetirementDeclaration>>{};
  for (final declaration in declarations) {
    byName.putIfAbsent(declaration.name, () => []).add(declaration);
  }
  // Index uses once rather than rescanning the repository for every symbol.
  final uses = <String, List<_RetirementDeclaration>>{};
  final annotationUses = <String, List<_RetirementDeclaration>>{};
  for (final declaration in declarations) {
    for (final name in declaration.references) {
      uses.putIfAbsent(name, () => []).add(declaration);
    }
    for (final name in declaration.annotations) {
      annotationUses.putIfAbsent(name, () => []).add(declaration);
    }
  }
  bool sameScope(_RetirementDeclaration target, _RetirementDeclaration use) =>
      !target.name.startsWith('_') || library(target.file) == library(use.file);
  bool ownState(_RetirementDeclaration target, _RetirementDeclaration use) =>
      use.stateOf == target.name && library(use.file) == library(target.file);
  List<_RetirementDeclaration> referencesTo(_RetirementDeclaration target) =>
      (uses[target.name] ?? [])
          .where(
            (use) =>
                use != target &&
                sameScope(target, use) &&
                !ownState(target, use),
          )
          .toList();
  final widgets = declarations
      .where(
        (declaration) =>
            _retirementCategory(declaration.file) == 'production' &&
            !_retirementGenerated(
              declaration.file,
              sources[declaration.file]!,
            ) &&
            const {
              'StatelessWidget',
              'StatefulWidget',
              'ConsumerWidget',
              'ConsumerStatefulWidget',
              'HookWidget',
              'HookConsumerWidget',
            }.contains(declaration.base),
      )
      .toList();
  final layers = <_RetirementDeclaration, int>{};
  // A dependent is eligible only after all its production owners were found
  // eligible. Unrooted cycles stay retained: no optimistic reachability claim.
  var layer = 0;
  if (failures.isEmpty) {
    while (true) {
      final next = widgets.where((widget) {
        if (layers.containsKey(widget) ||
            widget.entryPoint ||
            declarations.any(
              (use) => ownState(widget, use) && use.entryPoint,
            )) {
          return false;
        }
        if ((byName[widget.name] ?? [])
                .where(
                  (other) =>
                      sameScope(widget, other) &&
                      _retirementCategory(other.file) == 'production',
                )
                .length !=
            1) {
          return false;
        }
        return referencesTo(widget)
            .where((use) => _retirementCategory(use.file) == 'production')
            .every(
              (use) =>
                  layers.containsKey(use) ||
                  layers.keys.any((owner) => ownState(owner, use)),
            );
      }).toList();
      if (next.isEmpty) break;
      for (final widget in next) {
        layers[widget] = layer;
      }
      layer++;
    }
  }
  Map<String, Object?> evidence(_RetirementDeclaration declaration) => {
    'file': declaration.file,
    'name': declaration.name,
    'line': declaration.line,
    'category': _retirementCategory(declaration.file),
  };
  final candidates = layers.keys
      .map(
        (widget) => {
          ...evidence(widget),
          'endLine': widget.endLine,
          'physicalLines': widget.endLine - widget.line + 1,
          'layer': layers[widget],
          'reason': layers[widget] == 0
              ? 'no-production-callers'
              : 'only-candidate-production-callers',
          'packageApiReview': widget.file.startsWith('packages/'),
          'references': referencesTo(widget).map(evidence).toList(),
          'annotationReferences': (annotationUses[widget.name] ?? [])
              .where((use) => sameScope(widget, use))
              .map(evidence)
              .toList(),
        },
      )
      .toList();
  final unreferencedDeclarations = failures.isNotEmpty
      ? <Map<String, Object?>>[]
      : declarations
            .where(
              (declaration) =>
                  _retirementCategory(declaration.file) == 'production' &&
                  !_retirementGenerated(
                    declaration.file,
                    sources[declaration.file]!,
                  ) &&
                  const {'class', 'function'}.contains(declaration.kind) &&
                  !widgets.contains(declaration) &&
                  declaration.stateOf == null &&
                  !declaration.entryPoint &&
                  declaration.name != 'main' &&
                  (byName[declaration.name] ?? [])
                          .where(
                            (other) =>
                                sameScope(declaration, other) &&
                                _retirementCategory(other.file) == 'production',
                          )
                          .length ==
                      1 &&
                  !referencesTo(
                    declaration,
                  ).any((use) => _retirementCategory(use.file) == 'production'),
            )
            .map(
              (declaration) => {
                ...evidence(declaration),
                'kind': declaration.kind,
                'endLine': declaration.endLine,
                'physicalLines': declaration.endLine - declaration.line + 1,
                'packageApiReview': declaration.file.startsWith('packages/'),
                'references': referencesTo(declaration).map(evidence).toList(),
                'annotationReferences': (annotationUses[declaration.name] ?? [])
                    .where((use) => sameScope(declaration, use))
                    .map(evidence)
                    .toList(),
              },
            )
            .toList();
  final digest = sha256
      .convert(
        utf8.encode(
          jsonEncode({
            for (final file in files)
              file: sha256.convert(utf8.encode(sources[file]!)).toString(),
          }),
        ),
      )
      .toString();
  return {
    'schemaVersion': 1,
    'coverage': {
      'files': files.length,
      'generatedLexicalFiles': declarations
          .where((entry) => entry.kind == 'generated')
          .length,
      'declarations': declarations.length,
      'widgets': widgets.length,
      'complete': failures.isEmpty,
      'sourceDigest': digest,
    },
    'limitations': [
      'Authored source uses syntax identifiers, not resolved symbols or runtime reachability. Generated files use conservative lexical identifiers including strings/comments. Overcounting retains code.',
      'Only direct known widget base classes are candidates; indirect inheritance and unreachable cycles are not classified.',
      'External package consumers, native entry points, reflection and string-based registries require review. unreferencedDeclarations is a separate advisory queue, not approved retirement.',
      'Imports, exports and annotations are not runtime callers; catalog/API and annotation obligations must be migrated before deletion.',
      'Physical declaration lines include comments and whitespace; they are not promised deletion savings.',
      'Any parse diagnostic or missing part suppresses every retirement candidate.',
    ],
    'failures': failures,
    'candidates': candidates,
    'unreferencedDeclarations': unreferencedDeclarations,
  };
}

String _retirementCategory(String file) {
  if (file.startsWith('widgetbook/') ||
      file.startsWith('lib/design_fixtures/')) {
    return 'preview';
  }
  if (file.startsWith('test/') ||
      file.startsWith('integration_test/') ||
      file.contains('/test/') ||
      file.contains('/integration_test/')) {
    return 'test';
  }
  if (file.startsWith('lib/') ||
      RegExp(r'^(packages|apps)/[^/]+/lib/').hasMatch(file)) {
    return 'production';
  }
  return 'tool';
}

bool _retirementGenerated(String file, String source) =>
    RegExp(r'\.(g|freezed|mocks|gr)\.dart$').hasMatch(file) ||
    source
        .split('\n')
        .take(8)
        .any(
          (line) => RegExp(
            r'GENERATED CODE|GENERATED FILE|DO NOT MODIFY BY HAND',
            caseSensitive: false,
          ).hasMatch(line),
        );

class _RetirementDeclaration {
  _RetirementDeclaration({
    required this.file,
    required this.name,
    required this.kind,
    required this.base,
    required this.stateOf,
    required this.line,
    required this.endLine,
    required this.references,
    required this.annotations,
    required this.entryPoint,
  });
  final String file;
  final String name;
  final String kind;
  final String? base;
  final String? stateOf;
  final int line;
  final int endLine;
  final Set<String> references;
  final Set<String> annotations;
  final bool entryPoint;
}
