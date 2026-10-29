import 'dart:convert';
import 'dart:io';

const defaultRoots = ['lib', 'test'];
const generatedSuffixes = ['.g.dart', '.freezed.dart'];

final rules = <CandidateRule>[
  CandidateRule(
    id: 'legacy_firestore_wrapper',
    status: CandidateStatus.mustMigrate,
    pattern: RegExp(r'\bwithFirestoreErrorContext\b'),
    recommendation:
        'Replace with withBackendErrorContext or withBackendErrorStream.',
  ),
  CandidateRule(
    id: 'legacy_firestore_message',
    status: CandidateStatus.mustMigrate,
    pattern: RegExp(r'\bfirestoreErrorMessage\b'),
    recommendation: 'Replace with appErrorMessage.',
  ),
  CandidateRule(
    id: 'legacy_auth_message',
    status: CandidateStatus.mustMigrate,
    pattern: RegExp(r'\b(authErrorMessage|generalErrorMessage)\b'),
    recommendation: 'Replace with appErrorMessage.',
  ),
  CandidateRule(
    id: 'legacy_run_booking_message',
    status: CandidateStatus.mustMigrate,
    pattern: RegExp(r'\beventBookingErrorMessage\b'),
    recommendation: 'Replace with appErrorMessage and AppErrorContext.event.',
  ),
  CandidateRule(
    id: 'legacy_firestore_exception',
    status: CandidateStatus.mustMigrate,
    pattern: RegExp(r'\bFirestoreWriteException\b'),
    recommendation:
        'Replace with BackendOperationException and BackendErrorContext.',
  ),
  CandidateRule(
    id: 'direct_functions_callable',
    status: CandidateStatus.review,
    pattern: RegExp(r'\.httpsCallable\('),
    recommendation: 'Verify callable is wrapped in withBackendErrorContext.',
  ),
  CandidateRule(
    id: 'direct_firestore_stream',
    status: CandidateStatus.review,
    pattern: RegExp(r'\.snapshots\('),
    requiredImport: 'cloud_firestore',
    recommendation: 'Verify stream is wrapped in withBackendErrorStream.',
  ),
  CandidateRule(
    id: 'direct_firestore_read',
    status: CandidateStatus.review,
    pattern: RegExp(r'\.get\('),
    requiredImport: 'cloud_firestore',
    recommendation: 'Verify read future is wrapped in withBackendErrorContext.',
  ),
  CandidateRule(
    id: 'direct_firestore_write',
    status: CandidateStatus.review,
    pattern: RegExp(r'\.(set|update|delete)\('),
    requiredImport: 'cloud_firestore',
    recommendation:
        'Verify write future is wrapped in withBackendErrorContext.',
  ),
  CandidateRule(
    id: 'raw_firebase_exception_type',
    status: CandidateStatus.review,
    pattern: RegExp(
      r'\b(FirebaseException|FirebaseAuthException|FirebaseFunctionsException)\b',
    ),
    recommendation:
        'Verify raw Firebase errors are mapped through backend error utilities.',
  ),
  CandidateRule(
    id: 'manual_error_logging',
    status: CandidateStatus.review,
    pattern: RegExp(r'\.logError\('),
    recommendation: 'Expected AppException paths should use logAppException.',
  ),
  CandidateRule(
    id: 'backend_error_api',
    status: CandidateStatus.migrated,
    pattern: RegExp(
      r'\b(withBackendErrorContext|withBackendErrorStream|normalizeBackendError|appErrorMessage)\b',
    ),
    recommendation: 'Already using the unified backend error API.',
  ),
];

const blockingReviewRuleIds = {
  'direct_functions_callable',
  'direct_firestore_stream',
  'direct_firestore_read',
  'direct_firestore_write',
  'raw_firebase_exception_type',
};

void main(List<String> args) {
  final checkOutput = args.contains('--check');
  final jsonOutput = args.contains('--json');
  final markdownOutput = args.contains('--markdown');
  final roots = _rootsFromArgs(args);
  final candidates = _scan(roots);

  if (checkOutput) {
    final blockingCandidates = candidates.where(_isBlockingCandidate).toList();
    _printCheck(roots, candidates, blockingCandidates);
    if (blockingCandidates.isNotEmpty) exitCode = 1;
    return;
  }

  if (jsonOutput) {
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

  if (markdownOutput) {
    _printMarkdown(roots, candidates);
    return;
  }

  _printText(roots, candidates);
}

List<String> _rootsFromArgs(List<String> args) {
  final roots = <String>[];
  for (final arg in args) {
    if (arg.startsWith('--')) continue;
    roots.add(arg);
  }
  return roots.isEmpty ? defaultRoots : roots;
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
  stdout.writeln('Backend error candidates');
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

void _printMarkdown(List<String> roots, List<Candidate> candidates) {
  stdout.writeln('# Backend Error Candidate Scan');
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

void _printCheck(
  List<String> roots,
  List<Candidate> candidates,
  List<Candidate> blockingCandidates,
) {
  final summary = _summary(candidates);
  final nonBlockingReviews = candidates
      .where((candidate) => candidate.status == CandidateStatus.review)
      .where((candidate) => !_isBlockingCandidate(candidate))
      .length;

  stdout.writeln('Backend error pre-submit check');
  stdout.writeln('roots: ${roots.join(', ')}');
  for (final entry in summary.entries) {
    stdout.writeln('${entry.key}: ${entry.value}');
  }
  stdout.writeln('blocking: ${blockingCandidates.length}');
  if (nonBlockingReviews > 0) {
    stdout.writeln('nonBlockingReview: $nonBlockingReviews');
  }

  if (blockingCandidates.isEmpty) {
    stdout.writeln('No unwrapped backend call candidates found.');
    return;
  }

  stderr.writeln();
  stderr.writeln('Unresolved backend error candidates block this check:');
  for (final candidate in blockingCandidates) {
    stderr.writeln(
      '- ${candidate.rule.id} at ${candidate.path}:${candidate.line}: '
      '${candidate.disposition}. ${candidate.recommendation}',
    );
    stderr.writeln('  ${candidate.snippet}');
  }
}

bool _isBlockingCandidate(Candidate candidate) {
  if (candidate.status == CandidateStatus.mustMigrate) return true;
  return candidate.status == CandidateStatus.review &&
      blockingReviewRuleIds.contains(candidate.rule.id);
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
          ? 'uses unified backend error API'
          : 'legacy API must be migrated',
    );
  }

  if (path.startsWith('test/')) {
    return const CandidateDisposition(
      status: CandidateStatus.fixture,
      reason: 'test fixture or direct mapper assertion',
    );
  }

  if (_isCoreMapperFile(path)) {
    return const CandidateDisposition(
      status: CandidateStatus.intentional,
      reason: 'core mapper/message layer intentionally inspects raw errors',
    );
  }

  if (path == 'lib/exceptions/error_logger.dart') {
    return const CandidateDisposition(
      status: CandidateStatus.intentional,
      reason: 'central logger implementation owns raw crash logging',
    );
  }

  if (path == 'lib/app_bootstrap.dart') {
    return const CandidateDisposition(
      status: CandidateStatus.intentional,
      reason: 'bootstrap framework/platform error handler + central logging',
    );
  }

  if (path == 'lib/contexts/profiles/data/image_upload_repository.dart' &&
      rule.id == 'raw_firebase_exception_type') {
    return const CandidateDisposition(
      status: CandidateStatus.intentional,
      reason: 'best-effort deleteByPath cleanup swallows object-not-found',
    );
  }

  if (path == 'lib/core/fcm_service.dart' &&
      rule.id == 'direct_firestore_write') {
    return const CandidateDisposition(
      status: CandidateStatus.verified,
      reason: 'fcmToken write sits inside a normalizeBackendError try/catch',
    );
  }

  if (path == 'lib/contexts/account/data/launch_access_repository.dart' &&
      rule.id == 'direct_firestore_write') {
    return const CandidateDisposition(
      status: CandidateStatus.verified,
      reason: 'transaction.set runs inside withBackendErrorContext',
    );
  }

  if (path == 'lib/force_update/presentation/force_update_diagnostics.dart') {
    return const CandidateDisposition(
      status: CandidateStatus.intentional,
      reason: 'developer diagnostic surface inspects Remote Config errors',
    );
  }

  if (path == 'lib/contexts/connections/data/match_repository.dart' &&
      rule.id == 'raw_firebase_exception_type') {
    return const CandidateDisposition(
      status: CandidateStatus.intentional,
      reason: 'documented not-found swallow inside backend wrapper',
    );
  }

  if (path == 'lib/contexts/organizers/data/clubs_repository.dart' &&
      rule.id == 'raw_firebase_exception_type') {
    return const CandidateDisposition(
      status: CandidateStatus.intentional,
      reason:
          'legacy callable compatibility classifier rethrows all other errors',
    );
  }

  if (rule.id == 'manual_error_logging') {
    return const CandidateDisposition(
      status: CandidateStatus.review,
      reason: 'manual logError outside central logger/bootstrap',
    );
  }

  if (_near(
    lines,
    lineIndex,
    before: 18,
    after: 18,
    needle: 'BackendErrorMapper',
  )) {
    return const CandidateDisposition(
      status: CandidateStatus.verified,
      reason:
          'feature-specific backend mapper intentionally inspects raw error',
    );
  }

  if (_isBackendWrapped(lines, lineIndex)) {
    return const CandidateDisposition(
      status: CandidateStatus.verified,
      reason: 'direct backend call is inside unified backend wrapper',
    );
  }

  if (_isNormalizedCatch(lines, lineIndex)) {
    return const CandidateDisposition(
      status: CandidateStatus.verified,
      reason: 'best-effort direct call is caught and normalized before logging',
    );
  }

  return const CandidateDisposition(
    status: CandidateStatus.review,
    reason: 'needs human review',
  );
}

bool _isCoreMapperFile(String path) {
  return path == 'lib/core/backend_error_util.dart' ||
      path == 'lib/core/app_error_message.dart';
}

bool _isBackendWrapped(List<String> lines, int lineIndex) {
  return _near(
        lines,
        lineIndex,
        before: 35,
        after: 70,
        needle: 'withBackendErrorContext',
      ) ||
      _near(
        lines,
        lineIndex,
        before: 35,
        after: 70,
        needle: 'withBackendErrorStream',
      );
}

bool _isNormalizedCatch(List<String> lines, int lineIndex) {
  return _near(lines, lineIndex, before: 8, after: 30, needle: 'try {') &&
      _near(lines, lineIndex, before: 5, after: 40, needle: 'catch') &&
      _near(
        lines,
        lineIndex,
        before: 5,
        after: 45,
        needle: 'normalizeBackendError',
      );
}

bool _near(
  List<String> lines,
  int lineIndex, {
  required int before,
  required int after,
  required String needle,
}) {
  final start = lineIndex - before < 0 ? 0 : lineIndex - before;
  final end = lineIndex + after >= lines.length
      ? lines.length - 1
      : lineIndex + after;
  for (var i = start; i <= end; i += 1) {
    if (lines[i].contains(needle)) return true;
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
