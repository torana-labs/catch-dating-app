import 'package:catch_dating_app/core/cryptography/sha256_digest.dart';

/// Event-local matching preferences. These rules never grant answer use.
final class EventSuccessAssignmentFeatureRule {
  const EventSuccessAssignmentFeatureRule({
    required this.featureId,
    required this.formId,
    required this.versionId,
    required this.questionId,
    required this.kind,
    required this.mode,
    required this.weight,
    this.transformVersion = 1,
    this.optionIds,
    this.scoreByOptionId,
    this.minimum,
    this.maximum,
  });

  factory EventSuccessAssignmentFeatureRule.fromJson(Object? value) {
    final map = _map(value, 'matching rule');
    return EventSuccessAssignmentFeatureRule(
      featureId: _string(map, 'featureId'),
      formId: _string(map, 'formId'),
      versionId: _string(map, 'versionId'),
      questionId: _string(map, 'questionId'),
      kind: _string(map, 'kind'),
      mode: _string(map, 'mode'),
      weight: _number(map, 'weight'),
      transformVersion: _integer(map, 'transformVersion'),
      optionIds: switch (map['optionIds']) {
        final List<Object?> values => List.unmodifiable(values.map((value) {
          if (value is! String || value.isEmpty) {
            throw const FormatException('Invalid matching option ID.');
          }
          return value;
        })),
        null => null,
        _ => throw const FormatException('Invalid matching options.'),
      },
      scoreByOptionId: switch (map['scoreByOptionId']) {
        final Map<Object?, Object?> scores => Map.unmodifiable(
          scores.map((key, value) {
            if (key is! String || value is! num || !value.isFinite) {
              throw const FormatException('Invalid matching option score.');
            }
            return MapEntry(key, value.toDouble());
          }),
        ),
        null => null,
        _ => throw const FormatException('Invalid matching option scores.'),
      },
      minimum: _optionalNumber(map, 'minimum'),
      maximum: _optionalNumber(map, 'maximum'),
    );
  }

  final String featureId;
  final String formId;
  final String versionId;
  final String questionId;
  final int transformVersion;
  final String kind;
  final String mode;
  final double weight;
  final List<String>? optionIds;
  final Map<String, double>? scoreByOptionId;
  final double? minimum;
  final double? maximum;

  /// Builds a soft rule only from a server-returned published question.
  factory EventSuccessAssignmentFeatureRule.fromPublishedQuestion({
    required EventSuccessAssignmentFeatureSource source,
    required EventSuccessAssignmentFeatureQuestion question,
    required String kind,
    required String mode,
    required double weight,
    List<String>? ordinalOrder,
    double? minimum,
    double? maximum,
  }) {
    final published = source.questions.where((item) =>
      item.questionId == question.questionId).firstOrNull;
    if (published == null) {
      throw ArgumentError.value(question.questionId, 'question', 'Not in source');
    }
    if (!{'singleChoice', 'multiChoice', 'number'}.contains(published.kind)) {
      throw ArgumentError.value(published.kind, 'question',
          'Unsupported published answer type');
    }
    if (!{'preferSimilar', 'preferDifferent', 'balanceAcrossGroups'}
        .contains(mode) || !weight.isFinite || weight < 0 || weight > 100) {
      throw ArgumentError.value(mode, 'mode', 'Invalid matching preference');
    }
    if (published.kind == 'singleChoice' &&
        kind != 'category' && kind != 'ordinal') {
      throw ArgumentError.value(kind, 'kind', 'Invalid choice transform');
    }
    if (published.kind == 'multiChoice' && kind != 'set') {
      throw ArgumentError.value(kind, 'kind', 'Invalid set transform');
    }
    if (published.kind == 'number' && kind != 'number') {
      throw ArgumentError.value(kind, 'kind', 'Invalid numeric transform');
    }
    final optionIds = published.options.map((item) => item.optionId).toList();
    if (kind != 'number' &&
        (optionIds.isEmpty || optionIds.length > 40 ||
          optionIds.toSet().length != optionIds.length)) {
      throw ArgumentError.value(optionIds, 'options', 'Invalid source options');
    }
    final order = ordinalOrder ?? optionIds;
    if (kind == 'ordinal' &&
        (order.length < 2 || order.toSet().length != order.length ||
          !order.toSet().containsAll(optionIds) ||
          !optionIds.toSet().containsAll(order))) {
      throw ArgumentError.value(order, 'ordinalOrder', 'Incomplete ordering');
    }
    if (kind == 'number' &&
        (minimum == null || maximum == null ||
          !minimum.isFinite || !maximum.isFinite || minimum >= maximum)) {
      throw ArgumentError.value(minimum, 'minimum', 'Invalid numeric range');
    }
    final digest = sha256Digest(
      '${source.formId}|${source.versionId}|${question.questionId}',
    );
    return EventSuccessAssignmentFeatureRule(
      featureId: 'af_${digest.substring(0, 40)}',
      formId: source.formId,
      versionId: source.versionId,
      questionId: question.questionId,
      kind: kind,
      mode: mode,
      weight: weight,
      optionIds: kind == 'number' ? null : List.unmodifiable(optionIds),
      scoreByOptionId: kind == 'ordinal'
          ? Map.unmodifiable({
              for (var index = 0; index < order.length; index++)
                order[index]: index.toDouble(),
            })
          : null,
      minimum: kind == 'number' ? minimum : null,
      maximum: kind == 'number' ? maximum : null,
    );
  }

  Map<String, Object?> toJson() => {
    'featureId': featureId,
    'formId': formId,
    'versionId': versionId,
    'questionId': questionId,
    'transformVersion': transformVersion,
    'kind': kind,
    'mode': mode,
    'weight': weight,
    if (optionIds != null) 'optionIds': optionIds,
    if (scoreByOptionId != null) 'scoreByOptionId': scoreByOptionId,
    if (minimum != null) 'minimum': minimum,
    if (maximum != null) 'maximum': maximum,
  };
}

final class EventSuccessAssignmentFeatureOption {
  const EventSuccessAssignmentFeatureOption({
    required this.optionId,
    required this.label,
  });

  factory EventSuccessAssignmentFeatureOption.fromJson(Object? value) {
    final map = _map(value, 'matching option');
    return EventSuccessAssignmentFeatureOption(
      optionId: _string(map, 'optionId'),
      label: _string(map, 'label'),
    );
  }

  final String optionId;
  final String label;
}

final class EventSuccessAssignmentFeatureQuestion {
  const EventSuccessAssignmentFeatureQuestion({
    required this.questionId,
    required this.label,
    required this.kind,
    required this.options,
    this.minNumber,
    this.maxNumber,
  });

  factory EventSuccessAssignmentFeatureQuestion.fromJson(Object? value) {
    final map = _map(value, 'matching question');
    return EventSuccessAssignmentFeatureQuestion(
      questionId: _string(map, 'questionId'),
      label: _string(map, 'label'),
      kind: _string(map, 'kind'),
      options: _list(map, 'options')
          .map(EventSuccessAssignmentFeatureOption.fromJson)
          .toList(growable: false),
      minNumber: _optionalNumber(map, 'minNumber'),
      maxNumber: _optionalNumber(map, 'maxNumber'),
    );
  }

  final String questionId;
  final String label;
  final String kind;
  final List<EventSuccessAssignmentFeatureOption> options;
  final double? minNumber;
  final double? maxNumber;
}

final class EventSuccessAssignmentFeatureSource {
  const EventSuccessAssignmentFeatureSource({
    required this.formId,
    required this.formTitle,
    required this.versionId,
    required this.isActiveVersion,
    required this.questions,
  });

  factory EventSuccessAssignmentFeatureSource.fromJson(Object? value) {
    final map = _map(value, 'matching form version');
    final active = map['isActiveVersion'];
    if (active is! bool) {
      throw const FormatException('Invalid matching form version.');
    }
    return EventSuccessAssignmentFeatureSource(
      formId: _string(map, 'formId'),
      formTitle: _string(map, 'formTitle'),
      versionId: _string(map, 'versionId'),
      isActiveVersion: active,
      questions: _list(map, 'questions')
          .map(EventSuccessAssignmentFeatureQuestion.fromJson)
          .toList(growable: false),
    );
  }

  final String formId;
  final String formTitle;
  final String versionId;
  final bool isActiveVersion;
  final List<EventSuccessAssignmentFeatureQuestion> questions;
}

final class EventSuccessAssignmentFeatureCoverage {
  const EventSuccessAssignmentFeatureCoverage({
    required this.featureId,
    required this.grantedCount,
    required this.usableCount,
    required this.missingCount,
  });

  factory EventSuccessAssignmentFeatureCoverage.fromJson(Object? value) {
    final map = _map(value, 'matching coverage');
    return EventSuccessAssignmentFeatureCoverage(
      featureId: _string(map, 'featureId'),
      grantedCount: _integer(map, 'grantedCount'),
      usableCount: _integer(map, 'usableCount'),
      missingCount: _integer(map, 'missingCount'),
    );
  }

  final String featureId;
  final int grantedCount;
  final int usableCount;
  final int missingCount;
}

final class EventSuccessAssignmentFeaturePreview {
  const EventSuccessAssignmentFeaturePreview({
    required this.eventId,
    required this.revision,
    required this.rosterCount,
    required this.sources,
    required this.savedRules,
    required this.coverage,
  });

  factory EventSuccessAssignmentFeaturePreview.fromCallableData(Object? data) {
    final map = _map(data, 'matching preview');
    if (map['coverageBasis'] != 'currentEventRoster') {
      throw const FormatException('Unknown matching coverage basis.');
    }
    return EventSuccessAssignmentFeaturePreview(
      eventId: _string(map, 'eventId'),
      revision: _integer(map, 'revision'),
      rosterCount: _integer(map, 'rosterCount'),
      sources: _list(map, 'sources')
          .map(EventSuccessAssignmentFeatureSource.fromJson)
          .toList(growable: false),
      savedRules: _list(map, 'savedRules')
          .map(EventSuccessAssignmentFeatureRule.fromJson)
          .toList(growable: false),
      coverage: _list(map, 'rows')
          .map(EventSuccessAssignmentFeatureCoverage.fromJson)
          .toList(growable: false),
    );
  }

  final String eventId;
  final int revision;
  /// Signed-up or attended current roster; not the final safety-filtered pool.
  final int rosterCount;
  final List<EventSuccessAssignmentFeatureSource> sources;
  final List<EventSuccessAssignmentFeatureRule> savedRules;
  final List<EventSuccessAssignmentFeatureCoverage> coverage;
}

final class EventSuccessAssignmentFeatureSaveResult {
  const EventSuccessAssignmentFeatureSaveResult({
    required this.eventId,
    required this.revision,
    required this.replayed,
  });

  factory EventSuccessAssignmentFeatureSaveResult.fromCallableData(
    Object? data,
  ) {
    final map = _map(data, 'matching save');
    final replayed = map['replayed'];
    if (replayed is! bool) {
      throw const FormatException('Invalid matching save receipt.');
    }
    return EventSuccessAssignmentFeatureSaveResult(
      eventId: _string(map, 'eventId'),
      revision: _integer(map, 'revision'),
      replayed: replayed,
    );
  }

  final String eventId;
  final int revision;
  final bool replayed;
}

Map<Object?, Object?> _map(Object? value, String label) {
  if (value is! Map<Object?, Object?>) {
    throw FormatException('Invalid $label.');
  }
  return value;
}

List<Object?> _list(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is! List<Object?>) {
    throw FormatException('Invalid $key.');
  }
  return value;
}

String _string(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is! String || value.isEmpty) {
    throw FormatException('Invalid $key.');
  }
  return value;
}

int _integer(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is! int || value < 0) {
    throw FormatException('Invalid $key.');
  }
  return value;
}

double _number(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is! num || !value.isFinite) {
    throw FormatException('Invalid $key.');
  }
  return value.toDouble();
}

double? _optionalNumber(Map<Object?, Object?> map, String key) =>
    map[key] == null ? null : _number(map, key);
