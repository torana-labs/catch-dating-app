import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:meta/meta.dart';

/// The manager query is bound to one immutable published form version.
enum HostResponseMatch { all, any }

enum HostResponseOperator {
  present,
  missing,
  choiceAny,
  choiceAll,
  choiceNone,
  textEquals,
  textContains,
  textStartsWith,
  numberEq,
  numberGt,
  numberGte,
  numberLt,
  numberLte,
  numberBetween,
  dateOn,
  dateBefore,
  dateAfter,
  dateBetween,
  booleanIs,
}

@immutable
class HostResponseQueryField {
  const HostResponseQueryField({
    required this.questionId,
    required this.label,
    required this.kind,
    required this.operators,
    required this.sortable,
    required this.options,
  });

  factory HostResponseQueryField.fromMap(Object? data) {
    final map = _queryMap(data, 'response query field');
    final rawOptions = map['options'];
    if (rawOptions is! List) {
      throw const FormatException('Response query field options are invalid.');
    }
    final options = <String, String>{};
    for (final raw in rawOptions) {
      final option = _queryMap(raw, 'response query option');
      options[_queryString(option, 'value')] = _queryString(option, 'label');
    }
    final rawOperators = map['operators'];
    if (rawOperators is! List) {
      throw const FormatException(
        'Response query field operators are invalid.',
      );
    }
    return HostResponseQueryField(
      questionId: _queryString(map, 'questionId'),
      label: _queryString(map, 'label'),
      kind: _queryString(map, 'kind'),
      operators: Set.unmodifiable(
        rawOperators.map((value) {
          if (value is! String) {
            throw const FormatException('Response query operator is invalid.');
          }
          return HostResponseOperator.values.byName(value);
        }),
      ),
      sortable: map['sortable'] == true,
      options: Map.unmodifiable(options),
    );
  }

  final String questionId;
  final String label;
  final String kind;
  final Set<HostResponseOperator> operators;
  final bool sortable;
  final Map<String, String> options;
}

sealed class HostResponsePredicate {
  const HostResponsePredicate();

  Map<String, Object?> toJson();

  int get conditionCount;
  int get depth;
}

@immutable
final class HostResponseCondition extends HostResponsePredicate {
  const HostResponseCondition({
    required this.questionId,
    required this.operator,
    this.value,
    this.values = const [],
    this.minimum,
    this.maximum,
  });

  final String questionId;
  final HostResponseOperator operator;
  final Object? value;
  final List<String> values;
  final Object? minimum;
  final Object? maximum;

  @override
  int get conditionCount => 1;

  @override
  int get depth => 1;

  @override
  Map<String, Object?> toJson() => {
    'questionId': questionId,
    'op': operator.name,
    if (operator == HostResponseOperator.choiceAny ||
        operator == HostResponseOperator.choiceAll ||
        operator == HostResponseOperator.choiceNone)
      'values': values,
    if (value != null) 'value': value,
    if (minimum != null) 'minimum': minimum,
    if (maximum != null) 'maximum': maximum,
  };

  /// Local validation keeps the editor consistent; server validation owns access.
  void validate(HostResponseQueryField field) {
    if (questionId != field.questionId || !field.operators.contains(operator)) {
      throw ArgumentError.value(
        questionId,
        'questionId',
        'Field is unavailable.',
      );
    }
    switch (operator) {
      case HostResponseOperator.present:
      case HostResponseOperator.missing:
        if (value != null ||
            values.isNotEmpty ||
            minimum != null ||
            maximum != null) {
          throw ArgumentError('Presence conditions cannot have values.');
        }
      case HostResponseOperator.choiceAny:
      case HostResponseOperator.choiceAll:
      case HostResponseOperator.choiceNone:
        if (values.isEmpty ||
            values.length > 20 ||
            values.toSet().length != values.length ||
            values.any((item) => !field.options.containsKey(item))) {
          throw ArgumentError('Choose one to twenty published options.');
        }
      case HostResponseOperator.textEquals:
      case HostResponseOperator.textContains:
      case HostResponseOperator.textStartsWith:
        if (value is! String ||
            (value as String).trim().isEmpty ||
            (value as String).length > 200) {
          throw ArgumentError('Enter a response text value.');
        }
      case HostResponseOperator.numberEq:
      case HostResponseOperator.numberGt:
      case HostResponseOperator.numberGte:
      case HostResponseOperator.numberLt:
      case HostResponseOperator.numberLte:
        if (value is! num ||
            !(value as num).isFinite ||
            (value as num).abs() > 1000000000) {
          throw ArgumentError('Enter a finite response number.');
        }
      case HostResponseOperator.numberBetween:
        if (minimum is! num ||
            maximum is! num ||
            !(minimum as num).isFinite ||
            !(maximum as num).isFinite ||
            (minimum as num) > (maximum as num)) {
          throw ArgumentError('Enter an ordered numeric range.');
        }
      case HostResponseOperator.dateOn:
      case HostResponseOperator.dateBefore:
      case HostResponseOperator.dateAfter:
        if (!_validIsoDay(value)) {
          throw ArgumentError('Enter a valid ISO day.');
        }
      case HostResponseOperator.dateBetween:
        if (!_validIsoDay(minimum) ||
            !_validIsoDay(maximum) ||
            (minimum as String).compareTo(maximum as String) > 0) {
          throw ArgumentError('Enter an ordered day range.');
        }
      case HostResponseOperator.booleanIs:
        if (value is! bool) {
          throw ArgumentError('Choose yes or no.');
        }
    }
  }
}

@immutable
final class HostResponseGroup extends HostResponsePredicate {
  const HostResponseGroup({required this.match, required this.children});

  final HostResponseMatch match;
  final List<HostResponsePredicate> children;

  @override
  int get conditionCount =>
      children.fold(0, (sum, child) => sum + child.conditionCount);

  @override
  int get depth => children.isEmpty
      ? 1
      : 1 +
            children
                .map((child) => child.depth)
                .reduce((a, b) => a > b ? a : b);

  @override
  Map<String, Object?> toJson() => {
    match.name: children.map((child) => child.toJson()).toList(growable: false),
  };

  void validate(Map<String, HostResponseQueryField> fields) {
    if (children.isEmpty ||
        children.length > 20 ||
        conditionCount > 20 ||
        depth > 3) {
      throw ArgumentError('Response filter tree exceeds its supported bounds.');
    }
    for (final child in children) {
      switch (child) {
        case HostResponseCondition():
          final field = fields[child.questionId];
          if (field == null) {
            throw ArgumentError('Response filter field is unavailable.');
          }
          child.validate(field);
        case HostResponseGroup():
          child.validate(fields);
      }
    }
  }
}

@immutable
class HostResponseSort {
  const HostResponseSort({
    this.questionId,
    this.direction = 'desc',
    this.nulls = 'last',
  });

  final String? questionId;
  final String direction;
  final String nulls;

  Map<String, Object?> toJson() => {
    'questionId': questionId,
    'direction': direction,
    'nulls': nulls,
  };
}

@immutable
class HostResponseQueryRequest {
  const HostResponseQueryRequest({
    required this.organizerId,
    required this.formId,
    required this.versionId,
    this.statuses = const {'submitted'},
    this.predicate,
    this.sort = const HostResponseSort(),
    this.limit = 25,
    this.cursor,
  });

  final String organizerId;
  final String formId;
  final String versionId;
  final Set<String> statuses;
  final HostResponsePredicate? predicate;
  final HostResponseSort sort;
  final int limit;
  final String? cursor;

  HostResponseQueryRequest withCursor(String? value) =>
      HostResponseQueryRequest(
        organizerId: organizerId,
        formId: formId,
        versionId: versionId,
        statuses: statuses,
        predicate: predicate,
        sort: sort,
        limit: limit,
        cursor: value,
      );

  void validate(List<HostResponseQueryField> catalog) {
    if (organizerId.isEmpty ||
        formId.isEmpty ||
        versionId.isEmpty ||
        limit < 1 ||
        limit > 100 ||
        statuses.isEmpty ||
        statuses.any(
          (status) => status != 'submitted' && status != 'withdrawn',
        ) ||
        (sort.direction != 'asc' && sort.direction != 'desc') ||
        (sort.nulls != 'first' && sort.nulls != 'last')) {
      throw ArgumentError('Response query is invalid.');
    }
    final fields = {for (final field in catalog) field.questionId: field};
    if (sort.questionId case final questionId?) {
      if (fields[questionId]?.sortable != true) {
        throw ArgumentError('Response sort field is unavailable.');
      }
    }
    switch (predicate) {
      case HostResponseCondition(:final questionId)
          when fields[questionId] != null:
        (predicate! as HostResponseCondition).validate(fields[questionId]!);
      case HostResponseGroup():
        (predicate! as HostResponseGroup).validate(fields);
      case null:
        break;
      default:
        throw ArgumentError('Response filter field is unavailable.');
    }
  }

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'formId': formId,
    'versionId': versionId,
    'statuses': statuses.toList()..sort(),
    'predicate': predicate?.toJson(),
    'sort': sort.toJson(),
    'limit': limit,
    'cursor': cursor,
  };
}

@immutable
class HostResponseQueryRow {
  const HostResponseQueryRow({
    required this.responseId,
    required this.formId,
    required this.formTitle,
    required this.versionId,
    required this.version,
    required this.status,
    required this.identityKind,
    required this.identity,
    required this.sourceLinkId,
    required this.submittedAt,
    required this.withdrawnAt,
  });

  factory HostResponseQueryRow.fromMap(Object? data) {
    final map = _queryMap(data, 'response query row');
    final submittedAt = map['submittedAtMillis'];
    final withdrawnAt = map['withdrawnAtMillis'];
    final version = map['version'];
    final status = map['status'];
    final identityKind = map['identityKind'];
    if (submittedAt is! int ||
        version is! int ||
        withdrawnAt != null && withdrawnAt is! int ||
        status is! String ||
        identityKind is! String ||
        map['sourceLinkId'] != null && map['sourceLinkId'] is! String) {
      throw const FormatException('Response query row is invalid.');
    }
    return HostResponseQueryRow(
      responseId: _queryString(map, 'responseId'),
      formId: _queryString(map, 'formId'),
      formTitle: _queryString(map, 'formTitle'),
      versionId: _queryString(map, 'versionId'),
      version: version,
      status: HostFormResponseStatus.values.byName(status),
      identityKind: HostFormResponseIdentityKind.values.byName(identityKind),
      identity: HostFormResponseIdentity.fromMap(
        _queryMap(map['identity'], 'response identity'),
      ),
      sourceLinkId: map['sourceLinkId'] as String?,
      submittedAt: DateTime.fromMillisecondsSinceEpoch(submittedAt),
      withdrawnAt: withdrawnAt == null
          ? null
          : DateTime.fromMillisecondsSinceEpoch(withdrawnAt as int),
    );
  }

  final String responseId;
  final String formId;
  final String formTitle;
  final String versionId;
  final int version;
  final HostFormResponseStatus status;
  final HostFormResponseIdentityKind identityKind;
  final HostFormResponseIdentity identity;
  final String? sourceLinkId;
  final DateTime submittedAt;
  final DateTime? withdrawnAt;

  String get id => responseId;
}

@immutable
class HostResponseQueryForm {
  const HostResponseQueryForm({
    required this.formId,
    required this.title,
    required this.versionId,
    required this.version,
  });

  factory HostResponseQueryForm.fromMap(Object? data) {
    final map = _queryMap(data, 'response query form');
    final version = map['version'];
    if (version is! int || version < 1) {
      throw const FormatException('Response query version is invalid.');
    }
    return HostResponseQueryForm(
      formId: _queryString(map, 'formId'),
      title: _queryString(map, 'title'),
      versionId: _queryString(map, 'versionId'),
      version: version,
    );
  }

  final String formId;
  final String title;
  final String versionId;
  final int version;
}

@immutable
class HostResponseQueryPage {
  const HostResponseQueryPage({
    required this.form,
    required this.items,
    required this.nextCursor,
    required this.total,
    required this.selectedIds,
    required this.queryHash,
    required this.resultHash,
    required this.fieldCatalog,
  });

  factory HostResponseQueryPage.fromCallableData(Object? data) {
    final map = _queryMap(data, 'response query');
    final rawItems = map['items'];
    final rawIds = map['selectedIds'];
    final rawCatalog = map['fieldCatalog'];
    final total = map['total'];
    final nextCursor = map['nextCursor'];
    if (rawItems is! List ||
        rawIds is! List ||
        rawCatalog is! List ||
        total is! int ||
        total < 0 ||
        nextCursor != null && nextCursor is! String) {
      throw const FormatException('Response query page is invalid.');
    }
    return HostResponseQueryPage(
      form: HostResponseQueryForm.fromMap(map['form']),
      items: List.unmodifiable(rawItems.map(HostResponseQueryRow.fromMap)),
      nextCursor: nextCursor as String?,
      total: total,
      selectedIds: Set.unmodifiable(
        rawIds.map((id) {
          if (id is! String) {
            throw const FormatException('Response result ID is invalid.');
          }
          return id;
        }),
      ),
      queryHash: _queryString(map, 'queryHash'),
      resultHash: _queryString(map, 'resultHash'),
      fieldCatalog: List.unmodifiable(
        rawCatalog.map(HostResponseQueryField.fromMap),
      ),
    );
  }

  final HostResponseQueryForm form;
  final List<HostResponseQueryRow> items;
  final String? nextCursor;
  final int total;
  final Set<String> selectedIds;
  final String queryHash;
  final String resultHash;
  final List<HostResponseQueryField> fieldCatalog;
}

/// Selection names response IDs in one exact materialized query result.
@immutable
class HostResponseSelection {
  const HostResponseSelection({
    required this.queryHash,
    required this.resultHash,
    this.ids = const {},
  });

  final String queryHash;
  final String resultHash;
  final Set<String> ids;

  HostResponseSelection reconcile(HostResponseQueryPage page) =>
      queryHash == page.queryHash && resultHash == page.resultHash
      ? this
      : HostResponseSelection(
          queryHash: page.queryHash,
          resultHash: page.resultHash,
        );

  HostResponseSelection toggle(String responseId, HostResponseQueryPage page) {
    final current = reconcile(page);
    if (!page.selectedIds.contains(responseId)) {
      throw ArgumentError.value(
        responseId,
        'responseId',
        'Not in current result.',
      );
    }
    final next = {...current.ids};
    if (!next.add(responseId)) next.remove(responseId);
    return HostResponseSelection(
      queryHash: page.queryHash,
      resultHash: page.resultHash,
      ids: Set.unmodifiable(next),
    );
  }
}

Map<String, Object?> _queryMap(Object? data, String label) {
  if (data is! Map) throw FormatException('$label is invalid.');
  return data.map((key, value) {
    if (key is! String) throw FormatException('$label has an invalid key.');
    return MapEntry(key, value);
  });
}

String _queryString(Map<String, Object?> map, String key) {
  final value = map[key];
  if (value is! String || value.isEmpty) {
    throw FormatException('Response query $key is invalid.');
  }
  return value;
}

bool _validIsoDay(Object? value) {
  if (value is! String || !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value)) {
    return false;
  }
  final parsed = DateTime.tryParse('${value}T00:00:00.000Z');
  return parsed != null && parsed.toIso8601String().startsWith(value);
}
