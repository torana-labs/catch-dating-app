import 'dart:convert';

import 'package:catch_dating_app/core/app_error_context.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ProgramCreateJournalValues {
  const ProgramCreateJournalValues({
    required this.title,
    required this.kind,
    required this.timezone,
    required this.startsAtMillis,
    required this.endsAtMillis,
  });

  factory ProgramCreateJournalValues.fromJson(Map<String, Object?> json) =>
      ProgramCreateJournalValues(
        title: _draftString(json, 'title'),
        kind: _optionalString(json, 'kind'),
        timezone: _draftString(json, 'timezone'),
        startsAtMillis: _optionalInt(json, 'startsAtMillis'),
        endsAtMillis: _optionalInt(json, 'endsAtMillis'),
      );

  final String title;
  final String? kind;
  final String timezone;
  final int? startsAtMillis;
  final int? endsAtMillis;

  Map<String, Object?> toJson() => {
    'title': title,
    'kind': kind,
    'timezone': timezone,
    'startsAtMillis': startsAtMillis,
    'endsAtMillis': endsAtMillis,
  };
}

class ProgramCreateJournalEntry {
  const ProgramCreateJournalEntry({
    required this.accountId,
    required this.organizerId,
    required this.requestId,
    required this.values,
    this.submittedValues,
    this.programId,
  });

  factory ProgramCreateJournalEntry.fromJson(Map<String, Object?> json) {
    final requestId = _requiredString(json, 'requestId');
    if (!_requestIdPattern.hasMatch(requestId)) {
      throw const FormatException('Invalid program create request identity');
    }
    final programId = _optionalString(json, 'programId');
    if (programId != null && (programId.isEmpty || programId.length > 180)) {
      throw const FormatException('Invalid saved program identity');
    }
    return ProgramCreateJournalEntry(
      accountId: _requiredString(json, 'accountId'),
      organizerId: _requiredString(json, 'organizerId'),
      requestId: requestId,
      values: ProgramCreateJournalValues.fromJson(_requiredMap(json, 'values')),
      submittedValues: switch (json['submittedValues']) {
        null => null,
        final Map value => ProgramCreateJournalValues.fromJson(
          Map<String, Object?>.from(value),
        ),
        _ => throw const FormatException('Invalid submitted program values'),
      },
      programId: programId,
    );
  }

  final String accountId;
  final String organizerId;
  final String requestId;
  final ProgramCreateJournalValues values;
  final ProgramCreateJournalValues? submittedValues;
  final String? programId;

  Map<String, Object?> toJson() => {
    'version': 1,
    'accountId': accountId,
    'organizerId': organizerId,
    'requestId': requestId,
    'values': values.toJson(),
    'submittedValues': submittedValues?.toJson(),
    'programId': programId,
  };
}

/// Account- and organizer-scoped recovery for a create that may already have
/// committed. The request identity and submitted body remain inseparable until
/// the exact saved program has been confirmed.
class ProgramCreateJournal {
  const ProgramCreateJournal({this.preferences});

  final SharedPreferences? preferences;

  Future<SharedPreferences> _getPreferences() async =>
      preferences ?? await SharedPreferences.getInstance();

  String _key({required String accountId, required String organizerId}) =>
      'program_create_${Uri.encodeComponent(accountId)}_'
      '${Uri.encodeComponent(organizerId)}';

  Future<ProgramCreateJournalEntry?> load({
    required String accountId,
    required String organizerId,
  }) => withAppErrorContext<ProgramCreateJournalEntry?>(
    () async {
      final raw = (await _getPreferences()).getString(
        _key(accountId: accountId, organizerId: organizerId),
      );
      if (raw == null) return null;
      final decoded = jsonDecode(raw);
      if (decoded is! Map) {
        throw const FormatException('Invalid program create journal');
      }
      final entry = ProgramCreateJournalEntry.fromJson(
        Map<String, Object?>.from(decoded),
      );
      if (entry.accountId != accountId || entry.organizerId != organizerId) {
        throw const FormatException('Program create journal scope changed');
      }
      return entry;
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'load the pending program draft',
      resource: 'shared_preferences',
    ),
  );

  Future<void> save(ProgramCreateJournalEntry entry) =>
      withAppErrorContext<void>(
        () async {
          final saved = await (await _getPreferences()).setString(
            _key(accountId: entry.accountId, organizerId: entry.organizerId),
            jsonEncode(entry.toJson()),
          );
          if (!saved) throw StateError('Program command could not be saved');
        },
        context: const AppErrorContext(
          operation: AppOperation.localPersistence,
          action: 'save the pending program draft',
          resource: 'shared_preferences',
        ),
      );

  Future<void> clear({
    required String accountId,
    required String organizerId,
    required String requestId,
  }) => withAppErrorContext<void>(
    () async {
      final preferences = await _getPreferences();
      final key = _key(accountId: accountId, organizerId: organizerId);
      final raw = preferences.getString(key);
      if (raw == null) return;
      final decoded = jsonDecode(raw);
      if (decoded is! Map || decoded['requestId'] != requestId) return;
      if (!await preferences.remove(key)) {
        throw StateError('Confirmed program command could not be cleared');
      }
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'clear the confirmed program draft',
      resource: 'shared_preferences',
    ),
  );
}

final _requestIdPattern = RegExp(r'^[A-Za-z0-9_-]{16,128}$');

// Partial local drafts may contain blank form fields. The create controller
// validates a draft before freezing a new command; durable account/request
// identities remain nonempty and strict.
String _draftString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is! String) throw FormatException('Invalid $key');
  return value;
}

String _requiredString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is! String || value.isEmpty) {
    throw FormatException('Invalid $key');
  }
  return value;
}

String? _optionalString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value == null) return null;
  if (value is! String) throw FormatException('Invalid $key');
  return value;
}

int? _optionalInt(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value == null) return null;
  if (value is! int || value < 0 || value > 9007199254740991) {
    throw FormatException('Invalid $key');
  }
  return value;
}

Map<String, Object?> _requiredMap(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is! Map) throw FormatException('Invalid $key');
  return Map<String, Object?>.from(value);
}
