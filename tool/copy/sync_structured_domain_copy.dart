import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';

const _catalogPath = 'copy/structured_domain_copy_en.json';
const _files = <String, String>{
  'coach': 'lib/contexts/formats/domain/event_success_coach.dart',
  'library': 'lib/contexts/formats/domain/event_success_playbooks/library.dart',
  'modules': 'lib/contexts/formats/domain/event_success_playbooks/modules.dart',
  'metrics': 'lib/contexts/formats/domain/event_success_playbooks/metrics.dart',
  'eventPolicyCancellation':
      'lib/contexts/events/domain/event_policy/cancellation.dart',
  'eventPolicyCohort': 'lib/contexts/events/domain/event_policy/cohort.dart',
  'eventPolicySettlement':
      'lib/contexts/events/domain/event_policy/settlement.dart',
};
const _copyArguments = <String>{
  'antiPatterns',
  'attendeeExperience',
  'attendeePromise',
  'attendeeSummary',
  'description',
  'hostInstruction',
  'hostPromise',
  'hostCancellationSummary',
  'iterationQuestions',
  'explanation',
  'label',
  'rationale',
  'riskControls',
  'setupSteps',
  'summary',
  'target',
  'title',
  'wiringNotes',
  'userLabel',
};

var _writeGenerated = false;

void main(List<String> arguments) {
  if (arguments.contains('--bootstrap-missing')) {
    _writeGenerated = true;
    _bootstrapMissing();
    return;
  }
  if (arguments.contains('--bootstrap')) {
    _writeGenerated = true;
    _bootstrap();
    return;
  }
  _writeGenerated = arguments.contains('--write');
  _sync();
}

void _bootstrapMissing() {
  final catalogFile = File(_catalogPath);
  final catalog = jsonDecode(catalogFile.readAsStringSync());
  if (catalog is! Map<String, Object?> ||
      catalog['messages'] is! Map<String, Object?>) {
    throw const FormatException(
      'Cannot extend a malformed structured domain-copy catalog.',
    );
  }
  final messages = Map<String, Object?>.from(
    catalog['messages']! as Map<String, Object?>,
  );
  var addedFiles = 0;
  for (final entry in _files.entries) {
    final templateFile = File(
      'tool/copy/templates/structured_domain_copy/${entry.key}.dart.template',
    );
    if (templateFile.existsSync()) continue;
    final source = File(entry.value).readAsStringSync();
    final unit = parseString(content: source, path: entry.value).unit;
    final collector = _CopyCollector(fileStem: entry.key);
    unit.accept(collector);
    final edits = <_Edit>[];
    final counts = <String, int>{};
    for (final finding in collector.findings) {
      final base = '${entry.key}.${finding.owner}.${finding.argument}';
      final ordinal = counts.update(
        base,
        (value) => value + 1,
        ifAbsent: () => 1,
      );
      final key = '$base.$ordinal';
      messages[key] = {
        'value': finding.value,
        'description':
            'Structured domain copy for ${entry.key}.${finding.owner}.${finding.argument}.',
      };
      edits.add(_Edit(finding.offset, finding.length, '{{$key}}'));
    }
    edits.sort((a, b) => b.offset.compareTo(a.offset));
    var template = source;
    for (final edit in edits) {
      template = template.replaceRange(
        edit.offset,
        edit.offset + edit.length,
        edit.replacement,
      );
    }
    templateFile.parent.createSync(recursive: true);
    templateFile.writeAsStringSync(template);
    addedFiles += 1;
  }
  if (addedFiles == 0) {
    throw StateError(
      'No missing structured domain-copy templates to bootstrap.',
    );
  }
  catalog['messages'] = messages;
  catalogFile.writeAsStringSync(
    '${const JsonEncoder.withIndent('  ').convert(catalog)}\n',
  );
  _sync();
}

void _bootstrap() {
  final catalogFile = File(_catalogPath);
  if (catalogFile.existsSync()) {
    throw StateError(
      'Refusing to bootstrap over $_catalogPath. Edit the catalog or templates instead.',
    );
  }
  final messages = <String, Object?>{};
  for (final entry in _files.entries) {
    final source = File(entry.value).readAsStringSync();
    final unit = parseString(content: source, path: entry.value).unit;
    final collector = _CopyCollector(fileStem: entry.key);
    unit.accept(collector);
    final edits = <_Edit>[];
    final counts = <String, int>{};
    for (final finding in collector.findings) {
      final base = '${entry.key}.${finding.owner}.${finding.argument}';
      final ordinal = counts.update(
        base,
        (value) => value + 1,
        ifAbsent: () => 1,
      );
      final key = '$base.$ordinal';
      messages[key] = {
        'value': finding.value,
        'description':
            'Structured domain copy for ${entry.key}.${finding.owner}.${finding.argument}.',
      };
      edits.add(_Edit(finding.offset, finding.length, '{{$key}}'));
    }
    edits.sort((a, b) => b.offset.compareTo(a.offset));
    var template = source;
    for (final edit in edits) {
      template = template.replaceRange(
        edit.offset,
        edit.offset + edit.length,
        edit.replacement,
      );
    }
    final templateFile = File(
      'tool/copy/templates/structured_domain_copy/${entry.key}.dart.template',
    );
    templateFile.parent.createSync(recursive: true);
    templateFile.writeAsStringSync(template);
  }
  catalogFile.writeAsStringSync(
    '${const JsonEncoder.withIndent('  ').convert({'version': 1, 'locale': 'en', 'owner': 'marketing', 'messages': messages})}\n',
  );
  _sync();
}

void _sync() {
  final catalog = jsonDecode(File(_catalogPath).readAsStringSync());
  if (catalog is! Map<String, Object?> ||
      catalog['version'] != 1 ||
      catalog['locale'] != 'en' ||
      catalog['owner'] != 'marketing' ||
      catalog['eventSuccessModuleMetadata'] is! Map<String, Object?> ||
      catalog['constants'] is! Map<String, Object?> ||
      catalog['messages'] is! Map<String, Object?>) {
    throw const FormatException(
      'Structured domain-copy catalog must be version 1 English marketing copy.',
    );
  }
  final constants = _validatedValues(
    catalog['constants']! as Map<String, Object?>,
    requireIdentifierKeys: true,
  );
  final rawMessages = catalog['messages']! as Map<String, Object?>;
  final messages = _validatedValues(rawMessages);
  final moduleMetadata = _validatedModuleMetadata(
    catalog['eventSuccessModuleMetadata']! as Map<String, Object?>,
  );

  final constantFields = constants.entries
      .map(
        (entry) => '  static const ${entry.key} = ${_dartString(entry.value)};',
      )
      .join('\n');
  _writeOrCheck(
    File('lib/l10n/generated/structured_domain_copy.g.dart'),
    '// GENERATED CODE - DO NOT EDIT.\n'
    '// Source: copy/structured_domain_copy_en.json\n\n'
    'abstract final class StructuredDomainCopy {\n'
    '$constantFields\n'
    '}\n',
  );

  final used = <String>{};
  final usedModuleMetadata = <String>{};
  for (final entry in _files.entries) {
    final template = File(
      'tool/copy/templates/structured_domain_copy/${entry.key}.dart.template',
    ).readAsStringSync();
    final output = template.replaceAllMapped(RegExp(r'\{\{([^}]+)\}\}'), (
      match,
    ) {
      final key = match.group(1)!;
      const metadataPrefix = 'eventSuccessModuleMetadata.';
      const metadataSuffix = '.hostConfigurable';
      if (key.startsWith(metadataPrefix) && key.endsWith(metadataSuffix)) {
        final moduleKey = key.substring(
          metadataPrefix.length,
          key.length - metadataSuffix.length,
        );
        final value = moduleMetadata[moduleKey];
        if (value == null) {
          throw FormatException('Template references missing $key.');
        }
        usedModuleMetadata.add(moduleKey);
        return value.toString();
      }
      final value = messages[key];
      if (value == null) {
        throw FormatException('Template references missing $key.');
      }
      used.add(key);
      return _dartString(value);
    });
    _writeOrCheck(
      File(entry.value),
      '// GENERATED CODE - DO NOT EDIT.\n'
      '// Source: copy/structured_domain_copy_en.json and tool/copy/templates/structured_domain_copy/${entry.key}.dart.template\n\n'
      '$output',
    );
  }
  final unused = messages.keys.toSet().difference(used);
  if (unused.isNotEmpty) {
    throw FormatException('Catalog has unused messages: ${unused.join(', ')}');
  }
  final unusedModuleMetadata = moduleMetadata.keys.toSet().difference(
    usedModuleMetadata,
  );
  if (unusedModuleMetadata.isNotEmpty) {
    throw FormatException(
      'Catalog has unused Event Success module metadata: '
      '${unusedModuleMetadata.join(', ')}',
    );
  }
  stdout.writeln(
    'Synchronized ${messages.length} templates and ${constants.length} structured constants.',
  );
}

Map<String, bool> _validatedModuleMetadata(Map<String, Object?> raw) {
  final values = <String, bool>{};
  for (final entry in raw.entries) {
    if (!RegExp(r'^[a-z][A-Za-z0-9]*$').hasMatch(entry.key)) {
      throw FormatException(
        '${entry.key} must be a lower-camel module identifier.',
      );
    }
    final value = entry.value;
    if (value is! Map<String, Object?> || value['hostConfigurable'] is! bool) {
      throw FormatException(
        '${entry.key} needs a boolean hostConfigurable value.',
      );
    }
    values[entry.key] = value['hostConfigurable']! as bool;
  }
  return values;
}

void _writeOrCheck(File file, String expected) {
  if (_writeGenerated) {
    file.parent.createSync(recursive: true);
    file.writeAsStringSync(expected);
    return;
  }
  if (!file.existsSync() || file.readAsStringSync() != expected) {
    throw StateError(
      '${file.path} is stale. Run '
      '`dart run tool/copy/sync_structured_domain_copy.dart --write`.',
    );
  }
}

Map<String, String> _validatedValues(
  Map<String, Object?> raw, {
  bool requireIdentifierKeys = false,
}) {
  final values = <String, String>{};
  for (final entry in raw.entries) {
    if (requireIdentifierKeys &&
        !RegExp(r'^[a-z][A-Za-z0-9]*$').hasMatch(entry.key)) {
      throw FormatException(
        '${entry.key} must be a lower-camel Dart identifier.',
      );
    }
    final value = entry.value;
    if (value is! Map<String, Object?> ||
        value['value'] is! String ||
        (value['value']! as String).trim().isEmpty ||
        value['description'] is! String ||
        (value['description']! as String).trim().length < 12) {
      throw FormatException(
        '${entry.key} needs non-empty value and description.',
      );
    }
    values[entry.key] = value['value']! as String;
  }
  return values;
}

String _dartString(String value) {
  final quote = value.contains("'") && !value.contains('"') ? '"' : "'";
  final escaped = value
      .replaceAll(r'\', r'\\')
      .replaceAll(r'$', r'\$')
      .replaceAll('\n', r'\n')
      .replaceAll('\r', r'\r')
      .replaceAll(quote, '\\$quote');
  return '$quote$escaped$quote';
}

class _CopyCollector extends RecursiveAstVisitor<void> {
  _CopyCollector({required this.fileStem});

  final String fileStem;
  final findings = <_Finding>[];

  @override
  void visitSimpleStringLiteral(SimpleStringLiteral node) {
    final argument = _copyArgument(node);
    final owner = _fieldOwner(node);
    if (argument != null && owner != null) {
      findings.add(
        _Finding(
          offset: node.offset,
          length: node.length,
          value: node.value,
          owner: owner,
          argument: argument,
        ),
      );
    }
    super.visitSimpleStringLiteral(node);
  }

  String? _copyArgument(AstNode node) {
    AstNode current = node;
    while (current.parent != null) {
      final parent = current.parent!;
      if (parent is NamedExpression) {
        final name = parent.name.label.name;
        return _copyArguments.contains(name) ? name : null;
      }
      if (parent is ArgumentList) {
        final invocation = parent.parent;
        if (invocation is MethodInvocation &&
            invocation.methodName.name == 'add' &&
            invocation.target?.toSource() == 'strengths') {
          return 'strength';
        }
        return null;
      }
      current = parent;
    }
    return null;
  }

  String? _fieldOwner(AstNode node) {
    AstNode current = node;
    while (current.parent != null) {
      final parent = current.parent!;
      if (parent is FieldDeclaration) {
        final variables = parent.fields.variables;
        return variables.length == 1 ? variables.single.name.lexeme : fileStem;
      }
      if (parent is MethodDeclaration) return parent.name.lexeme;
      current = parent;
    }
    return null;
  }
}

class _Finding {
  const _Finding({
    required this.offset,
    required this.length,
    required this.value,
    required this.owner,
    required this.argument,
  });

  final int offset;
  final int length;
  final String value;
  final String owner;
  final String argument;
}

class _Edit {
  const _Edit(this.offset, this.length, this.replacement);

  final int offset;
  final int length;
  final String replacement;
}
