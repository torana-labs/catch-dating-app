import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';

/// What a column of an uploaded guest list holds, without its values, as
/// guests.import-list reports it.
enum GuestListColumnShape {
  empty,
  phoneLike,
  emailLike,
  dateLike,
  number,
  text,
}

/// The host's ticket price for guests the file gives no amount for.
typedef GuestListFallbackRevenue = ({int amountMinor, String currency});

/// One preview from guests.import-list: the file is read on the server, and
/// its rows sit in the host's saved review session ([sessionId]).
class GuestListImportPreview {
  const GuestListImportPreview({
    required this.status,
    required this.headline,
    required this.lines,
    required this.headers,
    required this.columnShapes,
    required this.mapping,
    required this.needsMapping,
    required this.sessionId,
    required this.counts,
    required this.sampleNames,
    required this.truncatedCount,
  });

  factory GuestListImportPreview.fromCallableData(Object? value) {
    final root = _map(value);
    final summary = _map(root['summary']);
    final result = _map(root['result']);
    final mapping = _map(result['mapping']);
    return GuestListImportPreview(
      status: root['status'] as String,
      headline: summary['headline'] as String,
      lines: (summary['lines'] as List<Object?>? ?? const [])
          .cast<String>()
          .toList(growable: false),
      headers: (result['headers'] as List<Object?>).cast<String>().toList(
        growable: false,
      ),
      columnShapes: (result['columnShapes'] as List<Object?>)
          .map((shape) => _shapes[shape] ?? GuestListColumnShape.text)
          .toList(growable: false),
      mapping: {
        for (final field in HostRosterField.values)
          field: (mapping[field.name] as num?)?.toInt(),
      },
      needsMapping: result['needsMapping'] as bool? ?? false,
      sessionId: result['sessionId'] as String?,
      counts: _map(
        result['counts'],
      ).map((key, count) => MapEntry(key, (count as num).toInt())),
      sampleNames: (result['rows'] as List<Object?>? ?? const [])
          .map((row) => _map(row)['displayName'] as String? ?? '')
          .where((name) => name.isNotEmpty)
          .take(3)
          .toList(growable: false),
      truncatedCount: (result['truncatedCount'] as num?)?.toInt() ?? 0,
    );
  }

  final String status;

  /// Plain-language summary written by the server, shown as it is.
  final String headline;
  final List<String> lines;
  final List<String> headers;
  final List<GuestListColumnShape> columnShapes;
  final Map<HostRosterField, int?> mapping;

  /// True when no column could be read as the guest's name.
  final bool needsMapping;

  /// The review session holding these rows; null while [needsMapping].
  final String? sessionId;
  final Map<String, int> counts;
  final List<String> sampleNames;
  final int truncatedCount;

  int count(String key) => counts[key] ?? 0;

  bool get canReview => !needsMapping && sessionId != null;

  static const _shapes = {
    'empty': GuestListColumnShape.empty,
    'phone-like': GuestListColumnShape.phoneLike,
    'email-like': GuestListColumnShape.emailLike,
    'date-like': GuestListColumnShape.dateLike,
    'number': GuestListColumnShape.number,
    'text': GuestListColumnShape.text,
  };
}

Map<String, Object?> _map(Object? value) =>
    Map<String, Object?>.from(value! as Map<Object?, Object?>);
