import 'package:catch_dating_app/contexts/forms/domain/forms/form_operation_fields.dart';
import 'package:meta/meta.dart';

@immutable
class HostFormQuestionAggregate {
  const HostFormQuestionAggregate({
    required this.questionId,
    required this.label,
    required this.kind,
    required this.privacyClass,
    required this.responseCount,
    required this.choiceCounts,
    required this.numericCount,
    required this.numericSum,
    required this.numericMin,
    required this.numericMax,
  });

  factory HostFormQuestionAggregate.fromMap(Map<Object?, Object?> map) =>
      HostFormQuestionAggregate(
        questionId: formOperationRequiredString(map, 'questionId'),
        label: formOperationRequiredString(map, 'label'),
        kind: formOperationRequiredString(map, 'kind'),
        privacyClass: formOperationRequiredString(map, 'privacyClass'),
        responseCount: formOperationRequiredInt(map, 'responseCount'),
        choiceCounts: formOperationMapList(map['choiceCounts'], 'choice counts')
            .map((item) => HostFormChoiceCount.fromMap(item))
            .toList(growable: false),
        numericCount: formOperationRequiredInt(map, 'numericCount'),
        numericSum: formOperationRequiredNum(map, 'numericSum'),
        numericMin: formOperationNullableNum(map['numericMin']),
        numericMax: formOperationNullableNum(map['numericMax']),
      );

  final String questionId;
  final String label;
  final String kind;
  final String privacyClass;
  final int responseCount;
  final List<HostFormChoiceCount> choiceCounts;
  final int numericCount;
  final num numericSum;
  final num? numericMin;
  final num? numericMax;
}

@immutable
class HostFormChoiceCount {
  const HostFormChoiceCount({
    required this.value,
    required this.label,
    required this.count,
  });

  factory HostFormChoiceCount.fromMap(Map<Object?, Object?> map) =>
      HostFormChoiceCount(
        value: map['value'],
        label: formOperationRequiredString(map, 'label'),
        count: formOperationRequiredInt(map, 'count'),
      );

  final Object? value;
  final String label;
  final int count;
}

@immutable
class HostFormSourceFunnel {
  const HostFormSourceFunnel({
    required this.label,
    required this.opens,
    required this.starts,
    required this.submissions,
  });

  factory HostFormSourceFunnel.fromMap(Map<Object?, Object?> map) =>
      HostFormSourceFunnel(
        label: formOperationRequiredString(map, 'label'),
        opens: formOperationRequiredInt(map, 'opens'),
        starts: formOperationRequiredInt(map, 'starts'),
        submissions: formOperationRequiredInt(map, 'submissions'),
      );

  final String label;
  final int opens;
  final int starts;
  final int submissions;
}

@immutable
class HostFormAnalytics {
  const HostFormAnalytics({
    required this.formId,
    required this.versionId,
    required this.version,
    required this.opens,
    required this.starts,
    required this.submissions,
    required this.withdrawals,
    required this.completionRate,
    required this.medianCompletionMillis,
    required this.questions,
    required this.sources,
    required this.privacyThreshold,
  });

  factory HostFormAnalytics.fromCallableData(Object? data) {
    final map = formOperationRequiredMap(data, 'form analytics');
    return HostFormAnalytics(
      formId: formOperationRequiredString(map, 'formId'),
      versionId: formOperationRequiredString(map, 'versionId'),
      version: formOperationRequiredInt(map, 'version'),
      opens: formOperationRequiredInt(map, 'opens'),
      starts: formOperationRequiredInt(map, 'starts'),
      submissions: formOperationRequiredInt(map, 'submissions'),
      withdrawals: formOperationRequiredInt(map, 'withdrawals'),
      completionRate: formOperationRequiredNum(
        map,
        'completionRate',
      ).toDouble(),
      medianCompletionMillis: formOperationNullableInt(
        map['medianCompletionMillis'],
      ),
      questions: formOperationMapList(
        map['questions'],
        'question analytics',
      ).map(HostFormQuestionAggregate.fromMap).toList(growable: false),
      sources: formOperationMapList(
        map['sources'],
        'source analytics',
      ).map(HostFormSourceFunnel.fromMap).toList(growable: false),
      privacyThreshold: formOperationRequiredInt(map, 'privacyThreshold'),
    );
  }

  final String formId;
  final String versionId;
  final int version;
  final int opens;
  final int starts;
  final int submissions;
  final int withdrawals;
  final double completionRate;
  final int? medianCompletionMillis;
  final List<HostFormQuestionAggregate> questions;
  final List<HostFormSourceFunnel> sources;
  final int privacyThreshold;
}
