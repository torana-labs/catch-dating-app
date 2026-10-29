import 'dart:convert';
import 'dart:io';

/// Frontend / local / provider / plugin / global error-handling candidate
/// scanner.
///
/// This is the non-backend parallel to `tool/audit/backend_error_candidates.dart`.
/// The backend scanner owns Firebase service call sites; this scanner owns
/// everything the app does locally or through a platform plugin:
///
/// - bare `catch (_)` / `catch (e)` that may swallow errors,
/// - `.catchError(...)` callbacks that swallow,
/// - raw `print` / `debugPrint` of errors,
/// - validation throwing raw strings / `StateError` / `ArgumentError`,
/// - plugin side effects (image picker, url_launcher, share, permissions,
///   geolocation, notifications) that may not normalize failures,
/// - `FlutterError.onError` / `PlatformDispatcher.onError` / `ErrorWidget`
///   global-handler setup, and
/// - usage of the new frontend op-context API
///   (`withAppErrorContext` / `normalizeAppError` / `logAppError` /
///   `runLoggingAppErrors`).
///
/// Each candidate is classified into stable buckets:
/// `mustMigrate`, `review`, `verified`, `intentional`, `fixture`, `migrated`.
/// The finished-state invariant is `mustMigrate == 0` and `review == 0`.
const defaultRoots = ['lib', 'test'];
const defaultBaselinePath =
    'tool/audit/frontend_error_candidates_baseline.json';
const generatedSuffixes = ['.g.dart', '.freezed.dart', '.mocks.dart'];

final rules = <CandidateRule>[
  // Usage of the unified frontend op-context API → already migrated.
  CandidateRule(
    id: 'frontend_error_api',
    status: CandidateStatus.migrated,
    pattern: RegExp(
      r'\b(withAppErrorContext|normalizeAppError|logAppError|runLoggingAppErrors)\b',
    ),
    recommendation: 'Already using the unified frontend op-context API.',
  ),
  // Bare catch sites that may swallow a failure.
  CandidateRule(
    id: 'bare_catch',
    status: CandidateStatus.review,
    pattern: RegExp(r'\}\s*catch\s*\(\s*_\s*(,\s*_?\w*\s*)?\)'),
    recommendation:
        'Bare catch: log via logAppError/ErrorLogger, surface to the user, '
        'rethrow, or document why the failure is intentionally swallowed.',
  ),
  CandidateRule(
    id: 'named_catch',
    status: CandidateStatus.review,
    pattern: RegExp(r'\}\s*catch\s*\(\s*(e|err|ex|error|exception)\b'),
    recommendation:
        'Normalize and surface/log the caught error, or document the swallow.',
  ),
  CandidateRule(
    id: 'catch_error_callback',
    status: CandidateStatus.review,
    pattern: RegExp(r'\.catchError\('),
    recommendation:
        'catchError callback: forward to a completer, log, or rethrow — '
        'do not silently discard.',
  ),
  // Raw error printing.
  CandidateRule(
    id: 'raw_error_print',
    status: CandidateStatus.review,
    pattern: RegExp(r'\b(print|debugPrint)\s*\([^)]*\$(e|err|error|stack)\b'),
    recommendation:
        'Route error output through ErrorLogger/logAppError instead of raw '
        'print/debugPrint.',
  ),
  // Raw throws that may be user-correctable validation.
  CandidateRule(
    id: 'raw_string_throw',
    status: CandidateStatus.review,
    pattern: RegExp(r'''\bthrow\s+(['"]|Exception\s*\()'''),
    recommendation:
        'Throw a typed AppException (e.g. ValidationException) for product '
        'failures instead of a raw string/Exception.',
  ),
  CandidateRule(
    id: 'state_error_throw',
    status: CandidateStatus.review,
    pattern: RegExp(r'\bthrow\s+StateError\s*\('),
    recommendation:
        'User-correctable failures should throw ValidationException; keep '
        'StateError only for true invariant/programmer bugs.',
  ),
  CandidateRule(
    id: 'argument_error_throw',
    status: CandidateStatus.review,
    pattern: RegExp(r'\bthrow\s+ArgumentError'),
    recommendation:
        'User-correctable failures should throw ValidationException; keep '
        'ArgumentError only for programmer-guard preconditions.',
  ),
  // Plugin / platform side effects. Match true plugin/package invocations
  // (the raw seam), not higher-level repository methods that merely happen to
  // share a name (e.g. a repository `pickImage` that already wraps the picker).
  CandidateRule(
    id: 'plugin_side_effect',
    status: CandidateStatus.review,
    pattern: RegExp(
      r'(\blaunchUrl(String)?\s*\(|\bSharePlus\b|'
      r'\b_picker\.pickImage\s*\(|\b_picker\.pickMultiImage\s*\(|'
      r'\bGeolocator\.|\.requestPermission\s*\(|\.getCurrentPosition\s*\(|'
      r'\bflutterLocalNotifications\b|\bSharedPreferences\.getInstance\s*\(|'
      r'\bFlutterSecureStorage\b)',
    ),
    recommendation:
        'Verify the plugin call is wrapped in withAppErrorContext or a '
        'normalizing seam so plugin failures become typed app exceptions.',
  ),
  // Global framework / platform handlers.
  CandidateRule(
    id: 'global_error_handler',
    status: CandidateStatus.review,
    pattern: RegExp(
      r'\b(FlutterError\.onError|PlatformDispatcher\.instance\.onError|'
      r'ErrorWidget\.builder|FlutterError\.presentError)\b',
    ),
    recommendation:
        'Global handler: confirm it forwards to ErrorLogger / branded '
        'framework fallback and stays installed.',
  ),
];

void main(List<String> args) {
  final options = _parseArgs(args);
  if (options.help) {
    _printUsage();
    return;
  }
  if (options.selfTest) {
    _runSelfTest();
    return;
  }

  final roots = options.roots;
  final candidates = _scan(roots);

  if (options.checkOutput) {
    final baseline = _loadBaseline(options.baselinePath);
    final blockingCandidates = _blockingCandidates(candidates, baseline);
    _printCheck(roots, candidates, baseline, blockingCandidates);
    if (blockingCandidates.isNotEmpty) exitCode = 1;
    return;
  }

  if (options.jsonOutput) {
    stdout.writeln(
      const JsonEncoder.withIndent('  ').convert({
        'roots': roots,
        'summary': _summary(candidates),
        'candidates': candidates
            .map((candidate) => candidate.toJson())
            .toList(),
      }),
    );
    return;
  }

  if (options.markdownOutput) {
    _printMarkdown(roots, candidates);
    return;
  }

  _printText(roots, candidates);
}

CliOptions _parseArgs(List<String> args) {
  final roots = <String>[];
  var baselinePath = defaultBaselinePath;
  var checkOutput = false;
  var jsonOutput = false;
  var markdownOutput = false;
  var selfTest = false;
  var help = false;

  for (var i = 0; i < args.length; i += 1) {
    final arg = args[i];
    if (arg == '--baseline') {
      if (i + 1 >= args.length) {
        stderr.writeln('--baseline requires a path.');
        exitCode = 64;
        return const CliOptions(help: true);
      }
      baselinePath = args[i + 1];
      i += 1;
      continue;
    }
    if (arg == '--check') {
      checkOutput = true;
      continue;
    }
    if (arg == '--json') {
      jsonOutput = true;
      continue;
    }
    if (arg == '--markdown') {
      markdownOutput = true;
      continue;
    }
    if (arg == '--self-test') {
      selfTest = true;
      continue;
    }
    if (arg == '--help' || arg == '-h') {
      help = true;
      continue;
    }
    if (arg.startsWith('--')) {
      stderr.writeln('Unknown option: $arg');
      exitCode = 64;
      return const CliOptions(help: true);
    }
    roots.add(arg);
  }

  return CliOptions(
    roots: roots.isEmpty ? defaultRoots : roots,
    baselinePath: baselinePath,
    checkOutput: checkOutput,
    jsonOutput: jsonOutput,
    markdownOutput: markdownOutput,
    selfTest: selfTest,
    help: help,
  );
}

void _printUsage() {
  stdout.writeln('''
Usage:
  dart tool/audit/frontend_error_candidates.dart [options] [roots...]

Options:
  --check             Fail on unbaselined mustMigrate/review candidates.
  --baseline <path>   Baseline JSON path for --check.
  --json              Print JSON report.
  --markdown          Print Markdown report.
  --self-test         Run seeded scanner probes.
  --help              Show this help.
''');
}

List<Candidate> _scan(List<String> roots) {
  final candidates = <Candidate>[];
  for (final root in roots) {
    final entity = FileSystemEntity.typeSync(root);
    if (entity == FileSystemEntityType.notFound) continue;
    final files = entity == FileSystemEntityType.file
        ? [File(root)]
        : Directory(root)
              .listSync(recursive: true)
              .whereType<File>()
              .where((file) => file.path.endsWith('.dart'));

    for (final file in files) {
      if (generatedSuffixes.any(file.path.endsWith)) continue;
      final content = file.readAsStringSync();
      final imports = RegExp(
        r'''import ['"]package:([^'"]+)['"]''',
      ).allMatches(content).map((match) => match.group(1) ?? '').join('\n');
      final lines = const LineSplitter().convert(content);
      for (var i = 0; i < lines.length; i += 1) {
        final line = lines[i];
        if (_isComment(line)) continue;
        for (final rule in rules) {
          final requiredImport = rule.requiredImport;
          if (requiredImport != null && !imports.contains(requiredImport)) {
            continue;
          }
          if (!rule.pattern.hasMatch(line)) continue;
          final disposition = _dispositionFor(
            path: file.path,
            lineIndex: i,
            lines: lines,
            rule: rule,
          );
          candidates.add(
            Candidate(
              path: file.path,
              line: i + 1,
              rule: rule,
              status: disposition.status,
              disposition: disposition.reason,
              recommendation: disposition.recommendation ?? rule.recommendation,
              snippet: line.trim(),
            ),
          );
        }
      }
    }
  }

  candidates.sort((a, b) {
    final statusCompare = a.status.index.compareTo(b.status.index);
    if (statusCompare != 0) return statusCompare;
    final pathCompare = a.path.compareTo(b.path);
    if (pathCompare != 0) return pathCompare;
    return a.line.compareTo(b.line);
  });
  return candidates;
}

bool _isComment(String line) {
  final trimmed = line.trimLeft();
  return trimmed.startsWith('//') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('/*');
}

Map<String, int> _summary(List<Candidate> candidates) {
  final summary = <String, int>{
    for (final status in CandidateStatus.values) status.name: 0,
  };
  for (final candidate in candidates) {
    summary[candidate.status.name] = (summary[candidate.status.name] ?? 0) + 1;
  }
  return summary;
}

void _printText(List<String> roots, List<Candidate> candidates) {
  stdout.writeln('Frontend error candidates');
  stdout.writeln('roots: ${roots.join(', ')}');
  for (final entry in _summary(candidates).entries) {
    stdout.writeln('${entry.key}: ${entry.value}');
  }
  stdout.writeln();
  for (final candidate in candidates) {
    stdout.writeln(
      '${candidate.status.name} | ${candidate.rule.id} | '
      '${candidate.path}:${candidate.line} | ${candidate.disposition} | '
      '${candidate.snippet}',
    );
  }
}

void _printCheck(
  List<String> roots,
  List<Candidate> candidates,
  FrontendErrorBaseline baseline,
  List<Candidate> blockingCandidates,
) {
  final summary = _summary(candidates);
  stdout.writeln('Frontend error pre-submit check');
  stdout.writeln('roots: ${roots.join(', ')}');
  stdout.writeln('baseline: ${baseline.path}');
  for (final entry in summary.entries) {
    stdout.writeln('${entry.key}: ${entry.value}');
  }
  stdout.writeln('blocking: ${blockingCandidates.length}');

  if (blockingCandidates.isEmpty) {
    stdout.writeln('No unbaselined frontend error candidates found.');
    return;
  }

  stderr.writeln();
  stderr.writeln('Unresolved frontend error candidates block this check:');
  for (final candidate in blockingCandidates) {
    stderr.writeln(
      '- ${candidate.rule.id} at ${candidate.path}:${candidate.line}: '
      '${candidate.disposition}. ${candidate.recommendation}',
    );
    stderr.writeln('  ${candidate.snippet}');
  }
}

FrontendErrorBaseline _loadBaseline(String path) {
  final file = File(path);
  if (!file.existsSync()) {
    return FrontendErrorBaseline.empty(path);
  }
  final decoded = jsonDecode(file.readAsStringSync());
  if (decoded is! Map<String, Object?>) {
    throw FormatException(
      'Frontend error baseline must be a JSON object: $path',
    );
  }
  final entries = decoded['allowedReviewCandidates'];
  final allowedReviewCandidates = <String, int>{};
  if (entries is List) {
    for (final entry in entries) {
      if (entry is! Map<String, Object?>) continue;
      final rule = entry['rule'];
      final candidatePath = entry['path'];
      final snippet = entry['snippet'];
      if (rule is! String || candidatePath is! String || snippet is! String) {
        throw FormatException(
          'Baseline entries require string rule/path/snippet: $path',
        );
      }
      final countValue = entry['maxOccurrences'];
      final maxOccurrences = countValue is int ? countValue : 1;
      allowedReviewCandidates[_candidateKeyParts(
            rule,
            candidatePath,
            snippet,
          )] =
          maxOccurrences;
    }
  }
  return FrontendErrorBaseline(
    path: path,
    allowedReviewCandidates: allowedReviewCandidates,
  );
}

List<Candidate> _blockingCandidates(
  List<Candidate> candidates,
  FrontendErrorBaseline baseline,
) {
  final usedReviewCounts = <String, int>{};
  final blocking = <Candidate>[];
  for (final candidate in candidates) {
    if (candidate.status == CandidateStatus.mustMigrate) {
      blocking.add(candidate);
      continue;
    }
    if (candidate.status != CandidateStatus.review) continue;

    final key = _candidateKey(candidate);
    final used = (usedReviewCounts[key] ?? 0) + 1;
    usedReviewCounts[key] = used;
    final allowed = baseline.allowedReviewCandidates[key] ?? 0;
    if (used > allowed) {
      blocking.add(candidate);
    }
  }
  return blocking;
}

String _candidateKey(Candidate candidate) =>
    _candidateKeyParts(candidate.rule.id, candidate.path, candidate.snippet);

String _candidateKeyParts(String rule, String path, String snippet) =>
    '$rule|${path.replaceAll('\\', '/')}|$snippet';

void _runSelfTest() {
  final temp = Directory.systemTemp.createTempSync(
    'catch-frontend-error-self-test-',
  );
  try {
    final fixtureFile = File('${temp.path}/lib/bad.dart');
    fixtureFile.parent.createSync(recursive: true);
    fixtureFile.writeAsStringSync('''
Future<void> swallow() async {
  try {
    throw StateError('boom');
  } catch (_) {
  }
}
''');

    final surfacedFixtureFile = File('${temp.path}/lib/surfaced.dart');
    surfacedFixtureFile.writeAsStringSync('''

Future<void> surfaceThroughFieldState(dynamic state) async {
  try {
    throw StateError('boom');
  } catch (error) {
    state
      ..saving = false
      ..error = error;
  }
}

Future<void> surfaceThroughMessageState() async {
  try {
    throw StateError('boom');
  } catch (error) {
    _errorMessage = error.toString();
  }
}

Future<void> surfaceThroughImmutableState() async {
  try {
    throw StateError('boom');
  } catch (error) {
    state = Failure(
      error: error,
    );
  }
}

Future<void> surfaceThroughPublishedState() async {
  try {
    throw StateError('boom');
  } catch (error) {
    _publish(
      Failure(error: error),
    );
  }
}

Future<void> compensateThenRethrow() async {
  try {
    throw StateError('boom');
  } catch (error) {
    final values = <int>[
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
    ];
    values.clear();
    rethrow;
  }
}

Future<void> surfaceCatchError(Future<void> operation) => operation.catchError(
  (Object error) {
    _publishRead(Failure(error));
  },
);
''');
    final futureFixtureFile = File('${temp.path}/lib/returned_future.dart');
    futureFixtureFile.writeAsStringSync('''
Future<void> forwardFailure() {
  try {
    doWork();
    return Future.value();
  } catch (error, stack) {
    return Future<void>.error(error, stack);
  }
}
''');
    final candidates = _scan(['${temp.path}/lib']);
    final reviewCandidate = candidates.where((candidate) {
      return candidate.rule.id == 'bare_catch' &&
          candidate.status == CandidateStatus.review;
    }).toList();
    if (reviewCandidate.length != 1) {
      stderr.writeln(
        'Expected one bare_catch review candidate, found '
        '${reviewCandidate.length}.',
      );
      exitCode = 1;
      return;
    }

    final forwarded = candidates.where(
      (candidate) =>
          candidate.path.endsWith('/returned_future.dart') &&
          candidate.rule.id == 'named_catch',
    );
    if (forwarded.length != 1 ||
        forwarded.single.status != CandidateStatus.verified) {
      stderr.writeln('Returned failed Future must propagate its caught error.');
      exitCode = 1;
      return;
    }
    final futureBodies = <String, bool>{
      '    return Future.error(error, stack);': true,
      '    return Future<Result>.error(error);': true,
      '    Future.error(error, stack);': false,
      '    return Future.error(other, stack);': false,
      '    return Future.value(error);': false,
      '    // return Future.error(error);': false,
      '    /*\n    return Future.error(error);\n    */': false,
      '    final callback = () {\n      return Future.error(error);\n    };':
          false,
      '  }\n  return Future.error(error);': false,
    };
    for (final probe in futureBodies.entries) {
      final lines = [
        '  } catch (error, stack) {',
        ...probe.key.split('\n'),
        '  }',
      ];
      if (_catchReturnsFailedFuture(lines, 0) != probe.value) {
        stderr.writeln('Failed Future propagation probe failed: ${probe.key}');
        exitCode = 1;
        return;
      }
    }
    final verifiedSurfaceCandidates = candidates.where((candidate) {
      return candidate.rule.id == 'named_catch' &&
          candidate.status == CandidateStatus.verified &&
          candidate.disposition.contains('surfaced to the user');
    }).toList();
    if (verifiedSurfaceCandidates.length != 4) {
      stderr.writeln(
        'Expected four surfaced named_catch candidates, found '
        '${verifiedSurfaceCandidates.length}.',
      );
      exitCode = 1;
      return;
    }
    final compensated = candidates.where(
      (candidate) =>
          candidate.path.endsWith('/surfaced.dart') &&
          candidate.rule.id == 'named_catch' &&
          candidate.snippet.contains('catch (error)'),
    );
    if (!compensated.any(
      (candidate) =>
          candidate.disposition.contains('rethrows the original error'),
    )) {
      stderr.writeln(
        'A direct rethrow must be found across the full catch body.',
      );
      exitCode = 1;
      return;
    }
    final surfacedCallback = candidates.where(
      (candidate) =>
          candidate.path.endsWith('/surfaced.dart') &&
          candidate.rule.id == 'catch_error_callback',
    );
    if (surfacedCallback.length != 1 ||
        surfacedCallback.single.status != CandidateStatus.verified) {
      stderr.writeln('Published catchError state must count as surfaced.');
      exitCode = 1;
      return;
    }

    final baseline = FrontendErrorBaseline(
      path: '<self-test>',
      allowedReviewCandidates: {_candidateKey(reviewCandidate.single): 1},
    );
    final blockedWithoutBaseline = _blockingCandidates(
      candidates,
      FrontendErrorBaseline.empty('<empty>'),
    );
    final blockedWithBaseline = _blockingCandidates(candidates, baseline);
    if (blockedWithoutBaseline.length != 1 || blockedWithBaseline.isNotEmpty) {
      stderr.writeln('Frontend error baseline probe failed.');
      exitCode = 1;
      return;
    }
    stdout.writeln('Frontend error scanner self-test passed.');
  } finally {
    temp.deleteSync(recursive: true);
  }
}

void _printMarkdown(List<String> roots, List<Candidate> candidates) {
  stdout.writeln('# Frontend Error Candidate Scan');
  stdout.writeln();
  stdout.writeln('- Roots: `${roots.join('`, `')}`');
  for (final entry in _summary(candidates).entries) {
    stdout.writeln('- ${entry.key}: ${entry.value}');
  }
  stdout.writeln();
  stdout.writeln('| Status | Rule | Location | Recommendation |');
  stdout.writeln('|---|---|---|---|');
  for (final candidate in candidates) {
    stdout.writeln(
      '| ${candidate.status.name} | ${candidate.rule.id} | '
      '`${candidate.path}:${candidate.line}` | '
      '${candidate.disposition}: ${candidate.recommendation} |',
    );
  }
}

CandidateDisposition _dispositionFor({
  required String path,
  required int lineIndex,
  required List<String> lines,
  required CandidateRule rule,
}) {
  if (rule.status != CandidateStatus.review) {
    return CandidateDisposition(
      status: rule.status,
      reason: rule.status == CandidateStatus.migrated
          ? 'uses unified frontend op-context API'
          : 'flagged candidate',
    );
  }

  // Tests and fixtures: classify so the scanner is actionable but does not
  // demand production normalization inside test code.
  if (_isTestPath(path)) {
    return const CandidateDisposition(
      status: CandidateStatus.fixture,
      reason: 'test fixture / fake / assertion',
    );
  }

  // ── Bootstrap / framework / central logging seams ──────────────────────────
  if (rule.id == 'global_error_handler') {
    if (path == 'lib/app_bootstrap.dart') {
      return const CandidateDisposition(
        status: CandidateStatus.intentional,
        reason: 'bootstrap owns framework/platform global error handlers',
      );
    }
    return const CandidateDisposition(
      status: CandidateStatus.review,
      reason: 'global handler outside bootstrap — confirm it is intentional',
    );
  }

  // The central logger and the op-context layer are the implementations that
  // own raw logging / normalization themselves.
  if (_isCoreErrorInfraFile(path)) {
    return const CandidateDisposition(
      status: CandidateStatus.intentional,
      reason: 'core error infrastructure owns raw logging/normalization',
    );
  }

  // ── Raw error printing ─────────────────────────────────────────────────────
  if (rule.id == 'raw_error_print') {
    if (_near(lines, lineIndex, before: 4, after: 1, needle: 'assert(')) {
      return const CandidateDisposition(
        status: CandidateStatus.intentional,
        reason: 'debug-only assert(() {...}) diagnostic, swallowed in release',
      );
    }
    if (path == 'lib/app_bootstrap.dart') {
      // Bootstrap runs before ErrorLogger is constructed; best-effort warmup
      // diagnostics can only go to the console at this point.
      return const CandidateDisposition(
        status: CandidateStatus.intentional,
        reason: 'pre-logger bootstrap diagnostic (ErrorLogger not yet built)',
      );
    }
    return const CandidateDisposition(
      status: CandidateStatus.review,
      reason: 'raw print/debugPrint of an error outside debug-only diagnostics',
    );
  }

  // ── Raw throws (validation vs programmer guard) ────────────────────────────
  if (rule.id == 'state_error_throw' ||
      rule.id == 'argument_error_throw' ||
      rule.id == 'raw_string_throw') {
    return _throwDisposition(path, lineIndex, lines, rule);
  }

  // ── Plugin side effects ────────────────────────────────────────────────────
  if (rule.id == 'plugin_side_effect') {
    return _pluginDisposition(path, lineIndex, lines);
  }

  // ── catch / catchError swallows ────────────────────────────────────────────
  if (rule.id == 'bare_catch' ||
      rule.id == 'named_catch' ||
      rule.id == 'catch_error_callback') {
    return _catchDisposition(path, lineIndex, lines, rule);
  }

  return const CandidateDisposition(
    status: CandidateStatus.review,
    reason: 'needs human review',
  );
}

CandidateDisposition _throwDisposition(
  String path,
  int lineIndex,
  List<String> lines,
  CandidateRule rule,
) {
  // Freezed/sealed exhaustiveness guards: `throw StateError('Unexpected
  // subclass')` is generated-style invariant code, never user-facing.
  final line = lines[lineIndex];
  if (line.contains('Unexpected subclass') ||
      line.contains('Unreachable') ||
      line.contains('should never')) {
    return const CandidateDisposition(
      status: CandidateStatus.intentional,
      reason: 'sealed/exhaustiveness invariant guard, not user-facing',
    );
  }

  // ArgumentError on a clearly internal precondition (id/empty checks) is a
  // programmer guard; keep it as a bug, not a typed product exception.
  if (rule.id == 'argument_error_throw') {
    return const CandidateDisposition(
      status: CandidateStatus.intentional,
      reason: 'programmer-guard precondition (ArgumentError), not user copy',
    );
  }

  // Bootstrap config invariants are programmer/setup errors.
  if (path == 'lib/app_bootstrap.dart') {
    return const CandidateDisposition(
      status: CandidateStatus.intentional,
      reason: 'bootstrap configuration invariant (programmer/setup error)',
    );
  }

  // A StateError whose message is a user-facing sentence (reads like guidance)
  // is a user-correctable validation failure.
  if (rule.id == 'state_error_throw' && _looksUserFacing(line)) {
    // If the file catches the StateError locally (`on StateError catch`) and
    // converts it into an inline field error, it is used as local validation
    // control flow — it never reaches crash reporting, so it is intentional.
    if (lines.any((l) => l.contains('on StateError catch'))) {
      return const CandidateDisposition(
        status: CandidateStatus.intentional,
        reason:
            'user-facing StateError caught locally for inline field-error '
            'control flow (never reported as a crash)',
      );
    }
    // Otherwise it propagates (e.g. into a mutation) and, being a non-App",
    // exception, would be reported as a crash — it must become a typed
    // ValidationException.
    return const CandidateDisposition(
      status: CandidateStatus.review,
      reason:
          'user-facing StateError propagates and must become a '
          'ValidationException',
    );
  }

  // Internal-state guards (rendering pipelines, invariants) stay as StateError.
  return const CandidateDisposition(
    status: CandidateStatus.intentional,
    reason: 'internal invariant guard (StateError), not user-correctable copy',
  );
}

bool _looksUserFacing(String line) {
  final match = RegExp(r'''StateError\s*\(\s*['"](.*?)['"]''').firstMatch(line);
  // Multi-line strings (no closing quote on this line) — inspect what we have.
  final raw =
      match?.group(1) ??
      RegExp(r'''StateError\s*\(\s*['"](.*)''').firstMatch(line)?.group(1) ??
      '';
  final message = raw.trim();
  if (message.isEmpty) return false;
  // User guidance reads like a sentence directed at the user.
  final lower = message.toLowerCase();
  return lower.startsWith('please ') ||
      lower.contains('before continuing') ||
      lower.contains('your ') && message.endsWith('.');
}

CandidateDisposition _pluginDisposition(
  String path,
  int lineIndex,
  List<String> lines,
) {
  // Inside a backend/app op-context wrapper, a normalized catch, or the dp
  // device-location/external seams → verified.
  if (_isWrapped(lines, lineIndex)) {
    return const CandidateDisposition(
      status: CandidateStatus.verified,
      reason: 'plugin call is inside an app/backend op-context wrapper',
    );
  }

  // Default value of an injectable launcher/picker seam (e.g. the
  // `ExternalUrlLauncher` field default). The seam itself is wrapped wherever
  // it is *invoked* — this is just the production implementation handed in.
  final line = lines[lineIndex];
  if ((line.contains('launchUrl') || line.contains('SharePlus')) &&
      lines.any(
        (l) =>
            l.contains('ExternalUrlLauncher') ||
            l.contains('ExternalShareLauncher'),
      )) {
    return const CandidateDisposition(
      status: CandidateStatus.verified,
      reason:
          'default implementation of an injectable launcher seam (invocations '
          'are wrapped in an op-context elsewhere)',
    );
  }
  if (_isNormalizedCatch(lines, lineIndex)) {
    return const CandidateDisposition(
      status: CandidateStatus.verified,
      reason: 'plugin call is caught and normalized before logging',
    );
  }
  // Typed-state plugin services that translate a permission/geolocation result
  // into typed domain state (rather than leaking the raw plugin error).
  if (_near(
        lines,
        lineIndex,
        before: 30,
        after: 30,
        needle: 'LocationPermission',
      ) &&
      _near(lines, lineIndex, before: 30, after: 30, needle: 'return')) {
    return const CandidateDisposition(
      status: CandidateStatus.verified,
      reason:
          'permission/geolocation result is translated into typed domain state',
    );
  }

  // SharedPreferences accessors (the `_prefs` getter / installation-id loader)
  // whose actual reads/writes are routed through a normalizing+logging catch or
  // an op-context wrapper elsewhere in the same file are verified seams: a
  // prefs failure surfaces as a typed app exception, not a silent swallow.
  if (_fileRoutesErrorsToLogger(lines)) {
    return const CandidateDisposition(
      status: CandidateStatus.verified,
      reason:
          'local-persistence accessor whose reads are normalized/logged in-file',
    );
  }

  return const CandidateDisposition(
    status: CandidateStatus.review,
    reason: 'plugin side effect without a normalizing op-context seam',
  );
}

/// True when the file routes its failures through the normalizer + logger or an
/// op-context wrapper, i.e. errors from local seams in this file are observable.
bool _fileRoutesErrorsToLogger(List<String> lines) {
  // logAppError / runLoggingAppErrors both normalize *and* log, so either alone
  // is sufficient evidence that this file's failures are observable.
  if (lines.any(
    (line) =>
        line.contains('logAppError') || line.contains('runLoggingAppErrors'),
  )) {
    return true;
  }
  final hasLogger = lines.any(
    (line) =>
        line.contains('logAppException') ||
        line.contains('_errorLogger') ||
        line.contains('errorLoggerProvider'),
  );
  final hasNormalizer = lines.any(
    (line) =>
        line.contains('normalizeBackendError') ||
        line.contains('normalizeAppError') ||
        line.contains('withBackendErrorContext') ||
        line.contains('withAppErrorContext'),
  );
  return hasLogger && hasNormalizer;
}

CandidateDisposition _catchDisposition(
  String path,
  int lineIndex,
  List<String> lines,
  CandidateRule rule,
) {
  // .catchError callbacks: a `test:` filter scopes the swallow to a specific
  // expected error (e.g. Firestore not-found), and a surrounding op-context
  // wrapper normalizes everything else — both are verified, not swallows.
  if (rule.id == 'catch_error_callback') {
    if (_near(lines, lineIndex, before: 0, after: 5, needle: 'test:')) {
      return const CandidateDisposition(
        status: CandidateStatus.verified,
        reason:
            'scoped .catchError(test:) only swallows a specific expected '
            'error; all others propagate',
      );
    }
    if (_isWrapped(lines, lineIndex)) {
      return const CandidateDisposition(
        status: CandidateStatus.verified,
        reason:
            '.catchError inside an op-context wrapper that normalizes '
            'unexpected errors',
      );
    }
    // A .catchError that forwards the error to a completer / logger is handled.
    if (_catchLogs(lines, lineIndex) ||
        _near(lines, lineIndex, before: 0, after: 6, needle: 'completeError')) {
      return const CandidateDisposition(
        status: CandidateStatus.verified,
        reason: 'caught error is forwarded to a completer / logged',
      );
    }
  }

  // Errors that are explicitly normalized/logged in or around the catch.
  if (_catchLogs(lines, lineIndex)) {
    return const CandidateDisposition(
      status: CandidateStatus.verified,
      reason: 'caught error is normalized/logged (not silently swallowed)',
    );
  }

  // Best-effort cleanup that rethrows after compensating.
  if (_catchRethrows(lines, lineIndex)) {
    return const CandidateDisposition(
      status: CandidateStatus.verified,
      reason: 'best-effort cleanup rethrows the original error',
    );
  }

  // Riverpod mutation pattern: the try ran a Mutation, whose error state is
  // displayed by a mutation-error listener/banner. The local catch only stops
  // the awaited run() from rethrowing into the handler.
  if (_catchAfterMutationRun(lines, lineIndex)) {
    return const CandidateDisposition(
      status: CandidateStatus.verified,
      reason: 'mutation error state owns user-facing display',
    );
  }

  // Error is surfaced to the user through a snackbar / banner / error UI state.
  if (_catchSurfacesToUser(lines, lineIndex)) {
    return const CandidateDisposition(
      status: CandidateStatus.verified,
      reason: 'caught error is surfaced to the user (snackbar / error state)',
    );
  }

  // Defensive boolean reads that intentionally fall back to false/null and are
  // documented as such.
  if (_catchDocumented(lines, lineIndex)) {
    return const CandidateDisposition(
      status: CandidateStatus.intentional,
      reason: 'documented intentional swallow / defensive fallback',
    );
  }

  return CandidateDisposition(
    status: CandidateStatus.review,
    reason: 'catch may swallow the failure without log/surface/rethrow',
    recommendation: rule.recommendation,
  );
}

bool _catchLogs(List<String> lines, int lineIndex) {
  return _near(
    lines,
    lineIndex,
    before: 0,
    after: 14,
    needles: const [
      'logAppError',
      'normalizeAppError',
      'logAppException',
      'logError(',
      'logFlutterError',
      '.log(',
      'errorLoggerProvider',
      '_errorLogger',
      'ErrorLogger',
      // Forwards the error to Flutter's global pipeline (bootstrap reports it).
      'FlutterError.reportError',
      // Common "fail/report/handle" helpers that forward the caught error and
      // its stack trace to a logging path.
      '_failUploading',
      '_failUpload',
      'reportError(',
    ],
  );
}

bool _catchRethrows(List<String> lines, int lineIndex) {
  // `rethrow`, or `throw <normalized>` that converts the caught error into a
  // typed app exception before propagating it.
  if (_catchDirectlyRethrows(lines, lineIndex)) {
    return true;
  }
  if (_catchReturnsFailedFuture(lines, lineIndex)) return true;
  return _near(
    lines,
    lineIndex,
    before: 0,
    after: 14,
    needles: const [
      'throw _normalize',
      'throw normalize',
      'throw _map',
      'throw const ',
      'throw AppException',
      'throw ValidationException',
      'throw PaymentFailedException',
      'completeError',
    ],
  );
}

bool _catchDirectlyRethrows(List<String> lines, int lineIndex) {
  final header = lines[lineIndex];
  if (!header.trimRight().endsWith('{')) return false;
  final indent = header.length - header.trimLeft().length;
  for (var index = lineIndex + 1; index < lines.length; index++) {
    final line = lines[index];
    final text = line.trimLeft();
    if (text.isEmpty || _isComment(line)) continue;
    final depth = line.length - text.length;
    if (depth <= indent && text.startsWith('}')) return false;
    if (depth == indent + 2 && text == 'rethrow;') return true;
  }
  return false;
}

bool _catchReturnsFailedFuture(List<String> lines, int lineIndex) {
  final header = lines[lineIndex];
  final caught = RegExp(r'catch\s*\(\s*([\w$]+)\b').firstMatch(header);
  if (caught == null || !header.trimRight().endsWith('{')) return false;
  final indent = header.length - header.trimLeft().length;
  final returnedFailure = RegExp(
    r'^return\s+Future(?:<[^;{}]+>)?\.error\(\s*' +
        RegExp.escape(caught.group(1)!) +
        r'\s*[,)]',
  );
  // Recognize only a direct return of this catch's error. A discarded future,
  // a nested callback's return, or a return after the catch is not propagation.
  for (var index = lineIndex + 1; index < lines.length; index++) {
    final line = lines[index];
    final text = line.trimLeft();
    if (text.isEmpty) continue;
    // Ambiguous multiline lexical content stays a review candidate. Do not
    // treat an example inside a comment/string as executable propagation.
    if (text.contains('/*') || text.contains("'''") || text.contains('"""')) {
      return false;
    }
    final depth = line.length - text.length;
    if (depth <= indent && text.startsWith('}')) return false;
    if (depth == indent + 2 && returnedFailure.hasMatch(text)) return true;
  }
  return false;
}

bool _catchAfterMutationRun(List<String> lines, int lineIndex) {
  // The Mutation.run(...) call sits in the try block just above the catch.
  return _near(
    lines,
    lineIndex,
    before: 30,
    after: 0,
    needles: const [
      'Mutation.run(',
      '.run(ref',
      'Mutation.run (',
      '.run(\n',
      'sendMutation',
    ],
  );
}

bool _catchSurfacesToUser(List<String> lines, int lineIndex) {
  if (_near(
    lines,
    lineIndex,
    before: 0,
    after: 14,
    needles: const [
      'ScaffoldMessenger',
      'showCatchNoticeError',
      'showCatchNotice',
      'CatchBanner.error',
      'ErrorBanner',
      '_searchError',
      '_error =',
      '.error =',
      '_errorMessage =',
      'Error =',
      'Error;',
      'completeError',
      '_publishRead(',
    ],
  )) {
    return true;
  }
  return _catchPublishesErrorState(lines, lineIndex);
}

bool _catchPublishesErrorState(List<String> lines, int lineIndex) {
  final header = lines[lineIndex];
  final caught = RegExp(r'catch\s*\(\s*([\w$]+)\b').firstMatch(header);
  if (caught == null || !header.trimRight().endsWith('{')) return false;
  final indent = header.length - header.trimLeft().length;
  var publishesState = false;
  var forwardsError = false;
  for (var index = lineIndex + 1; index < lines.length; index++) {
    final line = lines[index];
    final text = line.trimLeft();
    if (text.isEmpty || _isComment(line)) continue;
    final depth = line.length - text.length;
    if (depth <= indent && text.startsWith('}')) break;
    if (text.contains('state =') || text.contains('_publish(')) {
      publishesState = true;
    }
    if (RegExp(
      r'\berror\s*:\s*' + RegExp.escape(caught.group(1)!) + r'\b',
    ).hasMatch(text)) {
      forwardsError = true;
    }
  }
  return publishesState && forwardsError;
}

bool _catchDocumented(List<String> lines, int lineIndex) {
  // A comment in the catch body explaining the swallow, OR a return of a typed
  // fallback (false/null/empty domain state) directly after the catch.
  for (var i = lineIndex; i <= lineIndex + 8 && i < lines.length; i += 1) {
    final trimmed = lines[i].trimLeft();
    if (trimmed.startsWith('//')) return true;
    if (trimmed.startsWith('return false') ||
        trimmed.startsWith('return null') ||
        trimmed.startsWith('return const') ||
        trimmed.startsWith('return WeeklyActivitySnapshot') ||
        trimmed.startsWith('return [];') ||
        trimmed.startsWith('return <')) {
      return true;
    }
  }
  return false;
}

bool _isWrapped(List<String> lines, int lineIndex) {
  return _near(
    lines,
    lineIndex,
    before: 40,
    after: 60,
    needles: const [
      'withAppErrorContext',
      'withBackendErrorContext',
      'withBackendErrorStream',
      'runLoggingAppErrors',
    ],
  );
}

bool _isNormalizedCatch(List<String> lines, int lineIndex) {
  return _near(lines, lineIndex, before: 4, after: 40, needle: 'catch') &&
      _near(
        lines,
        lineIndex,
        before: 4,
        after: 45,
        needles: const [
          'normalizeAppError',
          'normalizeBackendError',
          'logAppError',
          'logAppException',
        ],
      );
}

bool _isTestPath(String path) {
  return path.startsWith('test/') ||
      path.startsWith('test\\') ||
      path.contains('/test/') ||
      path.contains('_test.dart') ||
      path.contains('/testing/') ||
      path.endsWith('test_helpers.dart') ||
      path.contains('/fakes/') ||
      path.contains('fake_') ||
      path.contains('mock_');
}

bool _isCoreErrorInfraFile(String path) {
  return path == 'lib/platform/errors/app_error_context.dart' ||
      path == 'lib/platform/errors/backend_error_util.dart' ||
      path == 'lib/platform/errors/app_error_message.dart' ||
      path == 'lib/platform/errors/error_logger.dart' ||
      path == 'lib/platform/errors/console_crash_reporter.dart';
}

bool _near(
  List<String> lines,
  int lineIndex, {
  required int before,
  required int after,
  String? needle,
  List<String> needles = const [],
}) {
  final all = <String>[?needle, ...needles];
  final start = lineIndex - before < 0 ? 0 : lineIndex - before;
  final end = lineIndex + after >= lines.length
      ? lines.length - 1
      : lineIndex + after;
  for (var i = start; i <= end; i += 1) {
    for (final n in all) {
      if (lines[i].contains(n)) return true;
    }
  }
  return false;
}

enum CandidateStatus {
  mustMigrate,
  review,
  verified,
  intentional,
  fixture,
  migrated,
}

class CandidateDisposition {
  const CandidateDisposition({
    required this.status,
    required this.reason,
    this.recommendation,
  });

  final CandidateStatus status;
  final String reason;
  final String? recommendation;
}

class CandidateRule {
  const CandidateRule({
    required this.id,
    required this.status,
    required this.pattern,
    required this.recommendation,
    this.requiredImport,
  });

  final String id;
  final CandidateStatus status;
  final RegExp pattern;
  final String recommendation;
  final String? requiredImport;
}

class Candidate {
  const Candidate({
    required this.path,
    required this.line,
    required this.rule,
    required this.status,
    required this.disposition,
    required this.recommendation,
    required this.snippet,
  });

  final String path;
  final int line;
  final CandidateRule rule;
  final CandidateStatus status;
  final String disposition;
  final String recommendation;
  final String snippet;

  Map<String, Object> toJson() => {
    'path': path,
    'line': line,
    'rule': rule.id,
    'status': status.name,
    'disposition': disposition,
    'recommendation': recommendation,
    'snippet': snippet,
  };
}

class CliOptions {
  const CliOptions({
    this.roots = defaultRoots,
    this.baselinePath = defaultBaselinePath,
    this.checkOutput = false,
    this.jsonOutput = false,
    this.markdownOutput = false,
    this.selfTest = false,
    this.help = false,
  });

  final List<String> roots;
  final String baselinePath;
  final bool checkOutput;
  final bool jsonOutput;
  final bool markdownOutput;
  final bool selfTest;
  final bool help;
}

class FrontendErrorBaseline {
  const FrontendErrorBaseline({
    required this.path,
    required this.allowedReviewCandidates,
  });

  FrontendErrorBaseline.empty(this.path) : allowedReviewCandidates = const {};

  final String path;
  final Map<String, int> allowedReviewCandidates;
}
