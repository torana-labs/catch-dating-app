import 'package:catch_dating_app/contexts/forms/domain/forms/form_operation_fields.dart';
import 'package:meta/meta.dart';

enum HostFormConversionKind {
  crmContact,
  application,
  eventAttendeeProposal,
  followUp,
}

@immutable
class HostFormConversionPreview {
  const HostFormConversionPreview({
    required this.kind,
    required this.allowed,
    required this.fields,
    required this.warnings,
    required this.existingResultId,
  });

  factory HostFormConversionPreview.fromCallableData(Object? data) {
    final map = formOperationRequiredMap(data, 'form conversion preview');
    return HostFormConversionPreview(
      kind: formOperationEnumByName(
        HostFormConversionKind.values,
        formOperationRequiredString(map, 'kind'),
      ),
      allowed: formOperationRequiredBool(map, 'allowed'),
      fields: formOperationMapList(
        map['fields'],
        'conversion fields',
      ).map(HostFormConversionField.fromMap).toList(growable: false),
      warnings: formOperationStringList(map['warnings']),
      existingResultId: formOperationNullableString(map['existingResultId']),
    );
  }

  final HostFormConversionKind kind;
  final bool allowed;
  final List<HostFormConversionField> fields;
  final List<String> warnings;
  final String? existingResultId;
}

@immutable
class HostFormConversionField {
  const HostFormConversionField({
    required this.destinationField,
    required this.label,
    required this.value,
    required this.origin,
    required this.conflict,
  });

  factory HostFormConversionField.fromMap(Map<Object?, Object?> map) =>
      HostFormConversionField(
        destinationField: formOperationRequiredString(map, 'destinationField'),
        label: formOperationRequiredString(map, 'label'),
        value: map['value'],
        origin: formOperationRequiredString(map, 'origin'),
        conflict: formOperationNullableString(map['conflict']),
      );

  final String destinationField;
  final String label;
  final Object? value;
  final String origin;
  final String? conflict;
}

@immutable
class HostFormConversionReceipt {
  const HostFormConversionReceipt({
    required this.receiptId,
    required this.kind,
    required this.status,
    required this.resultId,
  });

  factory HostFormConversionReceipt.fromCallableData(Object? data) {
    final map = formOperationRequiredMap(data, 'form conversion receipt');
    return HostFormConversionReceipt(
      receiptId: formOperationRequiredString(map, 'receiptId'),
      kind: formOperationEnumByName(
        HostFormConversionKind.values,
        formOperationRequiredString(map, 'kind'),
      ),
      status: formOperationRequiredString(map, 'status'),
      resultId: formOperationNullableString(map['resultId']),
    );
  }

  final String receiptId;
  final HostFormConversionKind kind;
  final String status;
  final String? resultId;
}
