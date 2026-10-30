import 'dart:convert';

import 'package:catch_dating_app/contexts/audience/audience.dart';
import 'package:catch_dating_app/platform/cryptography/sha256_digest.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/profile_schema_contracts.g.dart';

enum HostApplicationImportIssue { missingNameColumn, noRows }

class HostApplicationImportException implements Exception {
  const HostApplicationImportException(this.issue);

  final HostApplicationImportIssue issue;
}

class HostApplicationImportQuestion {
  const HostApplicationImportQuestion({
    required this.questionId,
    required this.key,
    required this.label,
    required this.kind,
    required this.required,
    required this.canonicalFieldId,
    required this.privacyClass,
    required this.prefillPolicy,
    required this.hostPresentation,
    required this.transform,
  });

  final String questionId;
  final String key;
  final String label;
  final String kind;
  final bool required;
  final String? canonicalFieldId;
  final String privacyClass;
  final String prefillPolicy;
  final String hostPresentation;
  final String transform;

  Map<String, Object?> toQuestionJson() => {
    'questionId': questionId,
    'key': key,
    'label': label,
    'helpText': null,
    'kind': kind,
    'required': required,
    'options': const <Object?>[],
    'canonicalFieldId': canonicalFieldId,
    'privacyClass': privacyClass,
    'prefillPolicy': prefillPolicy,
    'hostPresentation': hostPresentation,
  };
}

class HostApplicationImportDraft {
  const HostApplicationImportDraft({
    required this.fileName,
    required this.format,
    required this.title,
    required this.headers,
    required this.rows,
    required this.questions,
    required this.importKey,
    required this.truncatedRowCount,
  });

  final String fileName;
  final String format;
  final String title;
  final List<String> headers;
  final List<List<String>> rows;
  final List<HostApplicationImportQuestion> questions;
  final String importKey;
  final int truncatedRowCount;

  List<Map<String, Object?>> get questionJson => questions
      .map((question) => question.toQuestionJson())
      .toList(growable: false);

  List<Map<String, Object?>> get mappingJson => [
    for (var index = 0; index < questions.length; index += 1)
      {
        'headerIndex': index,
        'questionId': questions[index].questionId,
        'transform': questions[index].transform,
      },
  ];

  List<Map<String, Object?>> get rowJson => [
    for (var index = 0; index < rows.length; index += 1)
      {
        'rowId': '${index + 2}',
        'values': <String?>[
          for (var column = 0; column < headers.length; column += 1)
            column < rows[index].length && rows[index][column].trim().isNotEmpty
                ? rows[index][column].trim()
                : null,
        ],
      },
  ];
}

HostApplicationImportDraft buildHostApplicationImportDraft(
  HostRosterTable table,
) {
  if (table.rows.isEmpty) {
    throw const HostApplicationImportException(
      HostApplicationImportIssue.noRows,
    );
  }
  final canonicalIds = <String>{};
  final usedKeys = <String>{};
  final questions = <HostApplicationImportQuestion>[];
  for (var index = 0; index < table.headers.length; index += 1) {
    final header = table.headers[index];
    var canonicalFieldId = schemaPersonFieldIdForNormalizedAlias(
      _normalize(header),
    );
    if (canonicalFieldId != null && !canonicalIds.add(canonicalFieldId)) {
      canonicalFieldId = null;
    }
    final field = canonicalFieldId == null
        ? null
        : schemaPersonFieldForId(canonicalFieldId);
    final key = _uniqueKey(header, index, usedKeys);
    questions.add(
      HostApplicationImportQuestion(
        questionId: 'q${index + 1}_$key',
        key: key,
        label: header,
        kind: _tabularQuestionKind(field),
        required:
            canonicalFieldId == 'displayName' ||
            canonicalFieldId == 'givenName',
        canonicalFieldId: canonicalFieldId,
        privacyClass: field?.privacyClass ?? 'organizerCustom',
        prefillPolicy: field?.prefillPolicy ?? 'never',
        hostPresentation: field?.hostPresentation ?? 'filterable',
        transform: _tabularTransform(field),
      ),
    );
  }
  if (!canonicalIds.contains('displayName') &&
      !canonicalIds.contains('givenName')) {
    throw const HostApplicationImportException(
      HostApplicationImportIssue.missingNameColumn,
    );
  }
  final boundedRows = table.rows.take(200).toList(growable: false);
  final canonical = jsonEncode({
    'fileName': table.fileName.trim().toLowerCase(),
    'format': table.format.name,
    'headers': table.headers,
    'rows': boundedRows,
  });
  return HostApplicationImportDraft(
    fileName: table.fileName,
    format: table.format.name,
    title: _titleFromFileName(table.fileName),
    headers: table.headers,
    rows: boundedRows,
    questions: questions,
    importKey: 'applications-${sha256Digest(canonical)}',
    truncatedRowCount: table.rows.length - boundedRows.length,
  );
}

String _uniqueKey(String header, int index, Set<String> usedKeys) {
  final words = header
      .trim()
      .split(RegExp(r'[^A-Za-z0-9]+'))
      .where((word) => word.isNotEmpty)
      .toList(growable: false);
  var key = words.isEmpty
      ? 'column${index + 1}'
      : words.first.toLowerCase() +
            words
                .skip(1)
                .map(
                  (word) =>
                      word.substring(0, 1).toUpperCase() +
                      word.substring(1).toLowerCase(),
                )
                .join();
  if (!RegExp(r'^[A-Za-z]').hasMatch(key)) key = 'column${index + 1}$key';
  key = key.substring(0, key.length.clamp(1, 70));
  final base = key;
  var suffix = 2;
  while (!usedKeys.add(key)) {
    key = '$base$suffix';
    suffix += 1;
  }
  return key;
}

String _titleFromFileName(String value) {
  final dot = value.lastIndexOf('.');
  final raw = dot > 0 ? value.substring(0, dot) : value;
  final title = raw.replaceAll(RegExp(r'[_-]+'), ' ').trim();
  return title.isEmpty
      ? 'Imported applications'
      : title.substring(0, title.length.clamp(1, 160));
}

String _normalize(String value) =>
    value.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');

String _tabularQuestionKind(SchemaPersonFieldDefinition? field) {
  if (field == null ||
      field.questionKind == 'singleChoice' ||
      field.questionKind == 'multiChoice') {
    return 'shortText';
  }
  return field.questionKind;
}

String _tabularTransform(SchemaPersonFieldDefinition? field) {
  if (field == null ||
      field.questionKind == 'singleChoice' ||
      field.questionKind == 'multiChoice') {
    return 'trim';
  }
  return field.transform;
}
