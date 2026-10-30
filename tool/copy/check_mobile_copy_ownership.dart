import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';

const _baselinePath = 'tool/copy/mobile_copy_baseline.json';
const _allowlistPath = 'tool/copy/mobile_copy_allowlist.json';

const _copyArgumentNames = <String>{
  'privateToYouLabel',
  'hostCanSeeLabel',
  'catchPrivateLabel',
  'actionLabel',
  'answer',
  'antiPatterns',
  'attendeeExperience',
  'attendeePromise',
  'body',
  'brandLabel',
  'caption',
  'ctaLabel',
  'debugDetailsLabel',
  'decreaseTooltip',
  'increaseTooltip',
  'description',
  'detail',
  'emptyMessage',
  'emptyBody',
  'emptyTitle',
  'errorMessage',
  'errorText',
  'eyebrow',
  'helperText',
  'hintText',
  'hostInstruction',
  'hostPromise',
  'iterationQuestions',
  'kicker',
  'label',
  'buttonLabel',
  'confirmLabel',
  'footerLabel',
  'footnote',
  'linkLabel',
  'message',
  'note',
  'optionalLabel',
  'optionalSuffix',
  'optionalSemantics',
  'placeholder',
  'prompt',
  'proof',
  'question',
  'rationale',
  'riskControls',
  'searchPlaceholder',
  'semanticLabel',
  'statusMessage',
  'setupSteps',
  'subtitle',
  'successMessage',
  'subject',
  'summary',
  'target',
  'text',
  'title',
  'tooltip',
  'validationMessage',
  'validator',
  'onValidate',
  'wiringNotes',
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
  'CatchAttributionRow',
  'CatchShareCardSheet',
  'CatchExternalShareSheet',
  'CatchText',
  'CelebrationDetail',
  'CupertinoActionSheetAction',
  'CupertinoDialogAction',
  'DropdownMenuEntry',
  'SnackBar',
  'Text',
  'TextSpan',
  'showCatchNotice',
  'showConfirmDangerDialog',
};

const _copyMemberNames = <String>{
  'privateToYouLabel',
  'hostCanSeeLabel',
  'catchPrivateLabel',
  'balanceLabel',
  'badgeLabel',
  'body',
  'bodyFor',
  'brandLabel',
  'cancelDetail',
  'clusterLabel',
  'countLabel',
  'defaultAttendeePrompt',
  'debugDetailsLabel',
  'decreaseTooltip',
  'increaseTooltip',
  'description',
  'deleteDetail',
  'displayLabel',
  'displayName',
  'emptyCopy',
  'emptyMessage',
  'emptyBody',
  'emptyTitle',
  'errorMessage',
  'footerLabel',
  'helperText',
  'hintText',
  'invalidScheduleMessage',
  'label',
  'message',
  'missingStartingPointMessage',
  'name',
  'peoplePerLabel',
  'optionalLabel',
  'optionalSuffix',
  'optionalSemantics',
  'placeholder',
  'reasonLabel',
  'runTimesLabel',
  'semanticLabel',
  'setupHint',
  'singularLabel',
  'subtitle',
  'successMessage',
  'title',
  'tooltip',
  'validationMessage',
};

const _technicalArgumentNames = <String>{
  'analyticsSource',
  'assetName',
  'collection',
  'dedupeKey',
  'fileName',
  'fontFamily',
  'heroTag',
  'id',
  'key',
  'path',
  'resource',
  'routeName',
};

final _copyFunctionNameSuffix = RegExp(
  r'(?:(?:Empty|Failure|Invite|Share|Status|Validation)(?:Copy|Description|Detail|Hint|Label|Message|Placeholder|Prompt|Subject|Text|Title|Tooltip)|Validator)$',
);

final _diagnosticName = RegExp(
  r'(?:analytics|debug|diagnostic|exception|log|metric|trace|wire)',
  caseSensitive: false,
);

final _visibleText = RegExp('[A-Za-z]');

Future<void> main(List<String> arguments) async {
  final root = Directory.current;
  final writeBaseline = arguments.contains('--write-baseline');
  final jsonOutput = arguments.contains('--json');
  if (arguments.contains('--self-test')) {
    _runSelfTest();
    return;
  }

  final result = scanMobileCopy(root);
  final allowlist = _readRegistry(
    File('${root.path}/$_allowlistPath'),
    requireReason: true,
  );

  if (writeBaseline) {
    final allowedKeys = allowlist.entries.map((entry) => entry.key).toSet();
    final entries =
        result.findings
            .where((finding) => !allowedKeys.contains(finding.key))
            .map(RegistryEntry.fromFinding)
            .toList()
          ..sort((a, b) => a.key.compareTo(b.key));
    _writeBaseline(
      File('${root.path}/$_baselinePath'),
      CopyRegistry(
        version: 1,
        updated: _today(),
        description:
            'Existing unmanaged Flutter product copy. The scanner blocks additions; migrate entries into lib/l10n/app_en.arb and delete them from this baseline.',
        entries: entries,
      ),
    );
    stdout.writeln(
      'Wrote ${entries.length} baseline entries from ${result.checkedFiles} Dart files.',
    );
    return;
  }

  final baseline = _readRegistry(File('${root.path}/$_baselinePath'));
  final currentByKey = {
    for (final finding in result.findings) finding.key: finding,
  };
  final baselineKeys = baseline.entries.map((entry) => entry.key).toSet();
  final allowlistKeys = allowlist.entries.map((entry) => entry.key).toSet();
  final newFindings = result.findings
      .where(
        (finding) =>
            !baselineKeys.contains(finding.key) &&
            !allowlistKeys.contains(finding.key),
      )
      .toList();
  final staleBaseline = baseline.entries
      .where((entry) => !currentByKey.containsKey(entry.key))
      .toList();
  final staleAllowlist = allowlist.entries
      .where((entry) => !currentByKey.containsKey(entry.key))
      .toList();

  if (jsonOutput) {
    stdout.writeln(
      const JsonEncoder.withIndent('  ').convert({
        'checkedFiles': result.checkedFiles,
        'findings': result.findings.map((finding) => finding.toJson()).toList(),
        'newFindings': newFindings.map((finding) => finding.toJson()).toList(),
        'staleBaseline': staleBaseline.map((entry) => entry.toJson()).toList(),
        'staleAllowlist': staleAllowlist
            .map((entry) => entry.toJson())
            .toList(),
      }),
    );
  } else {
    stdout.writeln(
      'Mobile copy ownership: ${result.checkedFiles} files, '
      '${result.findings.length} unmanaged entries, '
      '${newFindings.length} new, '
      '${staleBaseline.length} stale baseline, '
      '${staleAllowlist.length} stale allowlist.',
    );
    for (final finding in newFindings.take(80)) {
      stderr.writeln(
        '${finding.file}:${finding.line}:${finding.column} '
        '[${finding.kind}] ${finding.text}',
      );
    }
    if (newFindings.length > 80) {
      stderr.writeln('...and ${newFindings.length - 80} more new entries.');
    }
    if (staleBaseline.isNotEmpty) {
      stderr.writeln(
        'Baseline contains ${staleBaseline.length} stale entries; run '
        '`dart run tool/copy/check_mobile_copy_ownership.dart --write-baseline` '
        'after migrating copy.',
      );
    }
    if (staleAllowlist.isNotEmpty) {
      stderr.writeln(
        'Allowlist contains ${staleAllowlist.length} stale entries; remove them.',
      );
    }
  }

  if (newFindings.isNotEmpty ||
      staleBaseline.isNotEmpty ||
      staleAllowlist.isNotEmpty) {
    exitCode = 1;
  }
}

ScanResult scanMobileCopy(Directory root) {
  final sourceRoots = [
    Directory('${root.path}/lib'),
    Directory('${root.path}/packages/catch_ui/lib'),
  ];
  final files =
      sourceRoots
          .where((directory) => directory.existsSync())
          .expand(
            (directory) =>
                directory.listSync(recursive: true, followLinks: false),
          )
          .whereType<File>()
          .where((file) => _isCandidate(file.path, root.path))
          .toList()
        ..sort((a, b) => a.path.compareTo(b.path));
  final findings = <CopyFinding>[];
  for (final file in files) {
    final relative = _relativePath(file.path, root.path);
    findings.addAll(scanDartSource(relative, file.readAsStringSync()));
  }
  findings.sort((a, b) => a.key.compareTo(b.key));
  return ScanResult(checkedFiles: files.length, findings: findings);
}

List<CopyFinding> scanDartSource(String file, String source) {
  final fileAllowance = _fileAllowanceReason(source);
  if (fileAllowance != null) {
    if (!_supportsFileAllowance(file)) {
      throw FormatException(
        '$file uses copy:allow-file outside an approved developer-only fixture surface.',
      );
    }
    return const [];
  }
  final parsed = parseString(
    content: source,
    path: file,
    throwIfDiagnostics: false,
  );
  final visitor = _CopyVisitor(file: file, source: source, unit: parsed.unit);
  parsed.unit.accept(visitor);
  final unique = <String, CopyFinding>{};
  for (final finding in visitor.findings) {
    unique[finding.key] = finding;
  }
  return unique.values.toList()..sort((a, b) => a.key.compareTo(b.key));
}

String? _fileAllowanceReason(String source) {
  final header = source.split('\n').take(12).join('\n');
  if (!header.contains('copy:allow-file')) return null;
  final match = RegExp(
    r'^// copy:allow-file\(([^)]+)\)\s*$',
    multiLine: true,
  ).firstMatch(header);
  final reason = match?.group(1)?.trim();
  if (reason == null || reason.length < 12) {
    throw const FormatException(
      'copy:allow-file requires a specific reason of at least 12 characters.',
    );
  }
  return reason;
}

bool _supportsFileAllowance(String file) =>
    file.startsWith('lib/design_fixtures/') ||
    file == 'lib/kernel/city_catalog.dart' ||
    file == 'lib/kernel/country_markets.dart';

class _CopyVisitor extends RecursiveAstVisitor<void> {
  _CopyVisitor({required this.file, required this.source, required this.unit});

  final String file;
  final String source;
  final CompilationUnit unit;
  final findings = <CopyFinding>[];

  @override
  void visitSimpleStringLiteral(SimpleStringLiteral node) {
    AstNode? ancestor = node.parent;
    while (ancestor != null) {
      if (ancestor is StringInterpolation) {
        // The enclosing interpolation is recorded as one actionable finding;
        // do not also report plural suffixes or other nested fragments.
        super.visitSimpleStringLiteral(node);
        return;
      }
      ancestor = ancestor.parent;
    }
    _inspect(node, node.value);
    super.visitSimpleStringLiteral(node);
  }

  @override
  void visitStringInterpolation(StringInterpolation node) {
    final literalText = node.elements
        .whereType<InterpolationString>()
        .map((element) => element.value)
        .join();
    if (!_visibleText.hasMatch(literalText)) {
      super.visitStringInterpolation(node);
      return;
    }
    _inspect(node, node.toSource());
    super.visitStringInterpolation(node);
  }

  void _inspect(StringLiteral node, String value) {
    final text = value.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (!_visibleText.hasMatch(text)) return;
    if (RegExp(r'^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$').hasMatch(text)) return;
    final context = _copyContext(node, text);
    if (context == null || _hasInlineAllowance(node)) return;
    final location = unit.lineInfo.getLocation(node.offset);
    findings.add(
      CopyFinding(
        file: file,
        line: location.lineNumber,
        column: location.columnNumber,
        kind: context,
        text: text,
      ),
    );
  }

  String? _copyContext(AstNode node, String text) {
    // AppException messages are diagnostic fallbacks. Presentation adapters
    // localize them before display, so treating their constructor defaults as
    // product copy would invert the ownership boundary.
    if (file.startsWith('lib/platform/errors/')) return null;
    AstNode? diagnosticAncestor = node.parent;
    while (diagnosticAncestor != null) {
      if (diagnosticAncestor is ThrowExpression ||
          diagnosticAncestor is AssertStatement ||
          diagnosticAncestor is ConstantPattern) {
        return null;
      }
      if (diagnosticAncestor is InstanceCreationExpression &&
          _isDiagnosticConstructor(
            diagnosticAncestor.constructorName.type.name.lexeme,
          )) {
        return null;
      }
      diagnosticAncestor = diagnosticAncestor.parent;
    }
    AstNode current = node;
    while (true) {
      final parent = current.parent;
      if (parent == null) break;
      // Only the two result branches can become the rendered copy. Literals
      // in the predicate identify state/wire values rather than visible text.
      if (parent is ConditionalExpression && parent.condition == current) {
        return null;
      }
      if (parent is NamedExpression) {
        final name = parent.name.label.name;
        if (_technicalArgumentNames.contains(name)) return null;
        final argumentList = parent.parent;
        final invocation = argumentList is ArgumentList
            ? argumentList.parent
            : null;
        if (name == 'message' &&
            invocation is MethodInvocation &&
            invocation.methodName.name == 'log') {
          return null;
        }
        if (name == 'message' &&
            invocation is MethodInvocation &&
            invocation.methodName.name.endsWith('Exception')) {
          return null;
        }
        if (name == 'message' &&
            invocation is InstanceCreationExpression &&
            invocation.constructorName.type.name.lexeme.endsWith('Exception')) {
          return null;
        }
        if (_copyArgumentNames.contains(name)) {
          return 'argument:$name';
        }
      }
      if (parent is ArgumentList) {
        final invocation = parent.parent;
        if (invocation is InstanceCreationExpression) {
          final name = invocation.constructorName.type.name.lexeme;
          if (_copyConstructors.contains(name)) return 'constructor:$name';
        } else if (invocation is MethodInvocation) {
          final name = invocation.methodName.name;
          if (_copyConstructors.contains(name)) return 'constructor:$name';
          if (name == 'add') {
            current = parent;
            continue;
          }
        } else if (invocation is EnumConstantArguments &&
            (file.startsWith('lib/contexts/live/domain/') ||
                file.startsWith('lib/contexts/formats/domain/')) &&
            _looksLikeEnumDisplayCopy(text)) {
          return 'enum:display-argument';
        }
        // A string nested inside a non-UI helper call is normally a wire key,
        // parser field name, or other implementation detail. The enclosing
        // named argument may be copy-shaped (for example `label:`), but the
        // literal itself is not the value rendered to the user.
        return null;
      }
      if (parent is IndexExpression) return null;
      if (parent is DefaultFormalParameter) {
        final name = parent.parameter.name?.lexeme;
        if (name != null && _isCopyMemberName(name)) {
          return 'default:$name';
        }
      }
      if (parent is ConstructorFieldInitializer) {
        final name = parent.fieldName.name;
        if (_isCopyMemberName(name)) return 'initializer:$name';
      }
      if (parent is VariableDeclaration) {
        final name = parent.name.lexeme;
        if (_isCopyMemberName(name)) return 'variable:$name';
      }
      if (parent is MethodDeclaration) {
        final name = parent.name.lexeme;
        if (_isCopyMemberName(name) || _isCopyFunctionName(name)) {
          return 'member:$name';
        }
      }
      if (parent is FunctionDeclaration) {
        final name = parent.name.lexeme;
        if (_isCopyFunctionName(name)) return 'function:$name';
      }
      if (parent is FieldDeclaration) break;
      if (parent is CompilationUnit) break;
      current = parent;
    }
    return null;
  }

  // Exact display-copy names include the visible debug-details disclosure label.
  bool _isCopyMemberName(String name) => _copyMemberNames.contains(name);

  bool _isCopyFunctionName(String name) {
    if (_diagnosticName.hasMatch(name)) return false;
    return const {
          '_admissionDefaultDescription',
          '_admissionDefaultLabel',
          '_optionalEmailValidator',
          '_requiredDisplayName',
          '_suggestionLabel',
          '_spotsLabel',
          'validateOptionalEmail',
          'subject',
        }.contains(name) ||
        RegExp(r'^validate[A-Z]').hasMatch(name) ||
        _copyFunctionNameSuffix.hasMatch(name);
  }

  bool _looksLikeEnumDisplayCopy(String text) {
    if (RegExp(r'^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$').hasMatch(text)) {
      return false;
    }
    return RegExp(r'\s').hasMatch(text) || RegExp(r'^[A-Z]').hasMatch(text);
  }

  bool _isDiagnosticConstructor(String name) {
    return name.endsWith('Exception') ||
        const {
          'ArgumentError',
          'AssertionError',
          'StateError',
          'UnsupportedError',
        }.contains(name);
  }

  bool _hasInlineAllowance(AstNode node) {
    final location = unit.lineInfo.getLocation(node.offset);
    final lines = source.split('\n');
    final start = (location.lineNumber - 2).clamp(0, lines.length - 1);
    final end = (location.lineNumber - 1).clamp(0, lines.length - 1);
    for (var index = start; index <= end; index += 1) {
      if (lines[index].contains('copy:allow-inline(')) return true;
    }
    return false;
  }
}

bool _isCandidate(String path, String root) {
  final relative = _relativePath(path, root);
  if (!relative.endsWith('.dart')) return false;
  if (relative.endsWith('.g.dart') || relative.endsWith('.freezed.dart')) {
    return false;
  }
  if (relative ==
      'lib/contexts/formats/domain/event_success_compatibility_response/questionnaire_packs.dart') {
    return false;
  }
  if (relative ==
          'lib/contexts/formats/domain/event_success_playbooks/library.dart' ||
      relative ==
          'lib/contexts/formats/domain/event_success_playbooks/modules.dart' ||
      relative ==
          'lib/contexts/formats/domain/event_success_playbooks/metrics.dart') {
    return false;
  }
  if (relative == 'lib/contexts/formats/domain/event_success_coach.dart') {
    return false;
  }
  if (relative == 'lib/contexts/events/domain/event_policy/cancellation.dart' ||
      relative == 'lib/contexts/events/domain/event_policy/cohort.dart' ||
      relative == 'lib/contexts/events/domain/event_policy/settlement.dart') {
    return false;
  }
  if (relative.startsWith('lib/l10n/') ||
      relative.startsWith('lib/platform/schema_contracts/generated/')) {
    return false;
  }
  // Generated from packages/brand/brand.json; the brand record, not copy.
  if (relative == 'lib/kernel/brand.dart') return false;
  return true;
}

CopyRegistry _readRegistry(File file, {bool requireReason = false}) {
  if (!file.existsSync()) {
    return const CopyRegistry(
      version: 1,
      updated: '1970-01-01',
      description: '',
      entries: [],
    );
  }
  final value = jsonDecode(file.readAsStringSync()) as Map<String, Object?>;
  final rawEntries = value['entries'];
  if (value['version'] != 1 || rawEntries is! List<Object?>) {
    throw FormatException('${file.path} must be a version 1 copy registry.');
  }
  final entries = rawEntries.map((raw) {
    final entry = RegistryEntry.fromJson(raw! as Map<String, Object?>);
    if (requireReason &&
        (entry.reason == null || entry.reason!.trim().isEmpty)) {
      throw FormatException('${file.path} allowlist entries require a reason.');
    }
    return entry;
  }).toList();
  final keys = entries.map((entry) => entry.key).toList();
  if (keys.toSet().length != keys.length) {
    throw FormatException('${file.path} contains duplicate entries.');
  }
  return CopyRegistry(
    version: 1,
    updated: value['updated']! as String,
    description: value['description']! as String,
    entries: entries,
  );
}

void _writeBaseline(File file, CopyRegistry registry) {
  file.parent.createSync(recursive: true);
  final baseline = {
    ...registry.toJson(),
    'owner': 'app_architecture',
    'targetPhase':
        'docs/plans/ui_system_blueprint_and_conformance_audit.md#phase-6--continuous-conformance-folds-into-existing-lanes',
  };
  file.writeAsStringSync(
    '${const JsonEncoder.withIndent('  ').convert(baseline)}\n',
  );
}

String _relativePath(String path, String root) =>
    path.substring(root.length + 1).replaceAll('\\', '/');

String _today() => DateTime.now().toIso8601String().substring(0, 10);

void _runSelfTest() {
  const source = '''
Widget build(BuildContext context) => Column(children: [
  Text('Visible title'),
  CatchButton(label: 'Continue'),
  Text(context.l10n.sharedActionTryAgain),
]);
const route = '/events';
''';
  final findings = scanDartSource('lib/example.dart', source);
  final texts = findings.map((finding) => finding.text).toSet();
  if (!texts.containsAll({'Visible title', 'Continue'}) ||
      texts.contains('/events') ||
      findings.length != 2) {
    throw StateError('Mobile copy scanner self-test failed: $findings');
  }
  const conditionalSource = '''
Widget build() => Column(children: [
  CatchField.read(title: state == 'published' ? l10n.published : l10n.private),
  CatchField.read(title: key == 'expectedAmountMinor' ? 'Amount' : 'Fallback'),
  Text(state == 'private' ? 'Private event' : 'Published event'),
]);
''';
  final conditionalTexts = scanDartSource(
    'lib/example_conditional.dart',
    conditionalSource,
  ).map((finding) => finding.text).toSet();
  if (conditionalTexts.length != 4 ||
      !conditionalTexts.containsAll({
        'Amount',
        'Fallback',
        'Private event',
        'Published event',
      })) {
    throw StateError('Conditional copy confused predicates with results.');
  }
  const noticeSource = '''
void report(BuildContext context) {
  showCatchNotice(context, 'Upload failed', dedupeKey: 'upload.failure');
  CatchNoticeData(title: 'Saved', dedupeKey: 'form.saved');
}
''';
  final noticeTexts = scanDartSource(
    'lib/example_notice.dart',
    noticeSource,
  ).map((finding) => finding.text).toSet();
  if (noticeTexts.length != 2 ||
      !noticeTexts.containsAll({'Upload failed', 'Saved'})) {
    throw StateError('Notice copy scanner confused keys with copy.');
  }
  // Shared geometry data is referenced, never granted a subtree copy waiver.
  const loadingSource = '''
Widget build() => CatchSkeleton.content(
  child: Column(children: [
    Text(CatchSkeleton.sampleQuestionText),
    Text('Unowned loading question'),
    CatchField.read(title: 'Unowned loading title'),
  ]),
);
''';
  final loadingTexts = scanDartSource(
    'lib/example_loading.dart',
    loadingSource,
  ).map((finding) => finding.text).toSet();
  if (loadingTexts.length != 2 ||
      !loadingTexts.containsAll({
        'Unowned loading question',
        'Unowned loading title',
      })) {
    throw StateError('A loading subtree bypassed display-copy ownership.');
  }
  const shareAdapterSource = '''
Widget share() => CatchExternalShareSheet(
  buttonLabel: 'Share this card',
  footnote: 'Visible sharing information',
);
''';
  final shareAdapterTexts = scanDartSource(
    'lib/example_share.dart',
    shareAdapterSource,
  ).map((finding) => finding.text).toSet();
  if (!shareAdapterTexts.containsAll({
    'Share this card',
    'Visible sharing information',
  })) {
    throw StateError('App share adapter bypassed display-copy ownership.');
  }
  const missedShapesSource = r'''
enum DisplayMode {
  compact('Compact', 'A concise product description.'),
  wire('wire_value', 'wire_value_2');
  const DisplayMode(this.label, this.description);
  final String label;
  final String description;
}

String shareInviteText(String name) => 'Join me at $name';
String validateDisplayName(String? value) => 'Enter a display name.';

class DisplayState {
  const DisplayState({this.footerLabel = 'Save changes'});
  const DisplayState.host() : footerLabel = 'Host inbox';
  final String footerLabel;
  String get emptyMessage => 'Nothing here yet.';
}

Widget buildForm(BuildContext context) => Column(children: [
  CatchField.input(
    onValidate: (_) => 'Please choose your city',
  ),
  CatchButton(
    label: helper('wire-key'),
  ),
  Builder(
    builder: (_) {
      showCatchNotice(context, 'Account unblocked.');
      return const SizedBox.shrink();
    },
  ),
]);
''';
  final missedShapeFindings = scanDartSource(
    'lib/contexts/formats/domain/example_missed_shapes.dart',
    missedShapesSource,
  );
  final missedShapeTexts = missedShapeFindings
      .map((finding) => finding.text)
      .toSet();
  const expectedMissedShapeTexts = {
    'Compact',
    'A concise product description.',
    r"'Join me at $name'",
    'Enter a display name.',
    'Save changes',
    'Host inbox',
    'Nothing here yet.',
    'Please choose your city',
    'Account unblocked.',
  };
  if (!missedShapeTexts.containsAll(expectedMissedShapeTexts) ||
      missedShapeTexts.contains('wire_value') ||
      missedShapeTexts.contains('wire_value_2') ||
      missedShapeTexts.contains('wire-key')) {
    throw StateError(
      'Mobile copy scanner missed extended UI-copy shapes: '
      '$missedShapeFindings',
    );
  }
  const sharedCopySource = r'''
class SharedCopy {
  const SharedCopy({
    this.optionalLabel = 'Optional',
    this.optionalSuffix = ' (optional)',
    this.debugDetailsLabel = 'Developer details',
    this.decreaseTooltip = 'Decrease',
    this.increaseTooltip = 'Increase',
    this.privateToYouLabel = 'Private to you',
    this.hostCanSeeLabel = 'Host can see',
    this.catchPrivateLabel = 'Catch private',
  });
  String optionalSemantics(String label) => '$label, optional';
  String get diagnosticMessage => 'Internal diagnostic only';
}
final copy = SharedCopy(
  optionalLabel: 'Optional field',
  optionalSuffix: ' (not required)',
  debugDetailsLabel: 'Technical details',
  optionalSemantics: (label) => '$label, not required',
);
''';
  final sharedCopyFindings = scanDartSource(
    'packages/catch_ui/lib/src/components/example_copy.dart',
    sharedCopySource,
  );
  final sharedCopyKinds = sharedCopyFindings
      .map((finding) => finding.kind)
      .toSet();
  if (sharedCopyFindings.length != 13 ||
      !sharedCopyKinds.containsAll({
        'default:optionalLabel',
        'default:optionalSuffix',
        'default:debugDetailsLabel',
        'default:decreaseTooltip',
        'default:increaseTooltip',
        'default:privateToYouLabel',
        'default:hostCanSeeLabel',
        'default:catchPrivateLabel',
        'member:optionalSemantics',
        'argument:optionalLabel',
        'argument:optionalSuffix',
        'argument:debugDetailsLabel',
        'argument:optionalSemantics',
      })) {
    throw StateError('Shared display-copy ownership gaps: $sharedCopyFindings');
  }
  const exceptionSource = '''
void fail() => throw BackendOperationException(
  code: 'example',
  message: 'Diagnostic fallback only.',
  context: backendContext,
);
''';
  if (scanDartSource('lib/example_error.dart', exceptionSource).isNotEmpty) {
    throw StateError('Exception diagnostic fallback was treated as UI copy.');
  }
  const fixtureSource = '''
// copy:allow-file(Developer-only deterministic visual fixture)
Widget build(BuildContext context) => Text('Fixture title');
''';
  if (scanDartSource(
    'lib/design_fixtures/example.dart',
    fixtureSource,
  ).isNotEmpty) {
    throw StateError('File-level fixture exemption was not honored.');
  }
  try {
    scanDartSource('lib/profile/presentation/screen.dart', fixtureSource);
    throw StateError('File exemption escaped its developer-only boundary.');
  } on FormatException {
    // Expected: production surfaces cannot hide copy with a file exemption.
  }
  final fixtureRoot = Directory.systemTemp.createTempSync('catch-copy-roots-');
  try {
    for (final entry in const {
      'lib/example.dart': "Widget build() => Text('App copy');",
      'packages/catch_ui/lib/src/components/example.dart':
          "Widget build() => Text('Package copy');",
      'packages/catch_ui/lib/src/components/caller_copy.dart':
          'Widget build(String label) => Text(label);',
      'packages/catch_ui/lib/example.g.dart':
          "Widget generated() => Text('Generated copy');",
      'packages/catch_ui/test/example_test.dart':
          "Widget fixture() => Text('Test copy');",
    }.entries) {
      final file = File('${fixtureRoot.path}/${entry.key}');
      file.parent.createSync(recursive: true);
      file.writeAsStringSync(entry.value);
    }
    final scan = scanMobileCopy(fixtureRoot);
    final found = scan.findings.map((finding) => finding.text).toSet();
    if (scan.checkedFiles != 3 ||
        scan.findings.length != 2 ||
        !found.containsAll({'App copy', 'Package copy'})) {
      throw StateError('App/package copy-root self-test failed: $found');
    }
    try {
      scanDartSource(
        'packages/catch_ui/lib/src/components/example.dart',
        fixtureSource,
      );
      throw StateError('A package widget hid copy with a file exemption.');
    } on FormatException {
      // Shared production components cannot opt out as developer fixtures.
    }
  } finally {
    fixtureRoot.deleteSync(recursive: true);
  }
  stdout.writeln('Mobile copy ownership scanner self-test passed.');
}

class ScanResult {
  const ScanResult({required this.checkedFiles, required this.findings});

  final int checkedFiles;
  final List<CopyFinding> findings;
}

class CopyFinding {
  const CopyFinding({
    required this.file,
    required this.line,
    required this.column,
    required this.kind,
    required this.text,
  });

  final String file;
  final int line;
  final int column;
  final String kind;
  final String text;

  String get key => '$file|$kind|$text';

  Map<String, Object> toJson() => {
    'file': file,
    'line': line,
    'column': column,
    'kind': kind,
    'text': text,
  };

  @override
  String toString() => '$file:$line [$kind] $text';
}

class RegistryEntry {
  const RegistryEntry({
    required this.file,
    required this.kind,
    required this.text,
    this.reason,
  });

  factory RegistryEntry.fromFinding(CopyFinding finding) =>
      RegistryEntry(file: finding.file, kind: finding.kind, text: finding.text);

  factory RegistryEntry.fromJson(Map<String, Object?> value) => RegistryEntry(
    file: value['file']! as String,
    kind: value['kind']! as String,
    text: value['text']! as String,
    reason: value['reason'] as String?,
  );

  final String file;
  final String kind;
  final String text;
  final String? reason;

  String get key => '$file|$kind|$text';

  Map<String, Object> toJson() => {
    'file': file,
    'kind': kind,
    'text': text,
    'reason': ?reason,
  };
}

class CopyRegistry {
  const CopyRegistry({
    required this.version,
    required this.updated,
    required this.description,
    required this.entries,
  });

  final int version;
  final String updated;
  final String description;
  final List<RegistryEntry> entries;

  Map<String, Object> toJson() => {
    'version': version,
    'updated': updated,
    'description': description,
    'entries': entries.map((entry) => entry.toJson()).toList(),
  };
}
