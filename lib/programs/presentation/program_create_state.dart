import 'package:catch_dating_app/contexts/programmes/domain/program_calendar.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:flutter/foundation.dart';

enum ProgramCreateField { title, kind, timezone, start, end }

enum ProgramCreateValidation {
  required,
  tooLong,
  invalidTimezone,
  invalidDate,
  endAfterStart,
}

/// The form and the submitted command use the same immutable values. A retry
/// never substitutes later edits for a command whose response may be lost.
@immutable
class ProgramCreateValues {
  const ProgramCreateValues({
    this.title = '',
    this.kind,
    this.timezone = '',
    this.startsAt,
    this.endsAt,
  });

  final String title;
  final ProgramKind? kind;
  final String timezone;
  final DateTime? startsAt;
  final DateTime? endsAt;

  ProgramCreateValues copyWith({
    String? title,
    ProgramKind? kind,
    String? timezone,
    DateTime? startsAt,
    DateTime? endsAt,
  }) => ProgramCreateValues(
    title: title ?? this.title,
    kind: kind ?? this.kind,
    timezone: timezone ?? this.timezone,
    startsAt: startsAt ?? this.startsAt,
    endsAt: endsAt ?? this.endsAt,
  );

  Map<ProgramCreateField, ProgramCreateValidation> get errors {
    final result = <ProgramCreateField, ProgramCreateValidation>{};
    void text(ProgramCreateField field, String value, int maximum) {
      if (value.trim().isEmpty) {
        result[field] = ProgramCreateValidation.required;
      } else if (value.trim().runes.length > maximum) {
        result[field] = ProgramCreateValidation.tooLong;
      }
    }

    text(
      ProgramCreateField.title,
      title,
      CatchContractConstraints
          .createOrganizerProgramCallablePayloadTitle
          .maxLength!,
    );
    text(
      ProgramCreateField.timezone,
      timezone,
      CatchContractConstraints
          .createOrganizerProgramCallablePayloadTimezone
          .maxLength!,
    );
    if (!result.containsKey(ProgramCreateField.timezone) &&
        !isProgramTimeZone(timezone)) {
      result[ProgramCreateField.timezone] =
          ProgramCreateValidation.invalidTimezone;
    }
    if (kind == null) {
      result[ProgramCreateField.kind] = ProgramCreateValidation.required;
    }
    void date(ProgramCreateField field, DateTime? value) {
      if (value == null) {
        result[field] = ProgramCreateValidation.required;
      } else if (value.millisecondsSinceEpoch <
              CatchContractConstraints
                  .createOrganizerProgramCallablePayloadStartsAtMillis
                  .minimum! ||
          value.millisecondsSinceEpoch >
              CatchContractConstraints
                  .createOrganizerProgramCallablePayloadStartsAtMillis
                  .maximum!) {
        result[field] = ProgramCreateValidation.invalidDate;
      }
    }

    date(ProgramCreateField.start, startsAt);
    date(ProgramCreateField.end, endsAt);
    if (startsAt != null && endsAt != null && !endsAt!.isAfter(startsAt!)) {
      result[ProgramCreateField.end] = ProgramCreateValidation.endAfterStart;
    }
    return Map.unmodifiable(result);
  }
}
