import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/profiles/profiles.dart';

/// Hand-written derived behavior for [EventConstraints].
///
/// The data shape (minAge/maxAge/maxMen/maxWomen) is generated from
/// `contracts/shared/event_common.schema.json#/definitions/eventConstraints`
/// by `tool/contracts/generate_domain_classes.mjs`. Everything that is
/// computed from those fields lives here so the generated file stays a pure
/// data projection.
extension EventConstraintsBehavior on EventConstraints {
  bool get hasRequirements =>
      minAge > 0 || maxAge < 99 || maxMen != null || maxWomen != null;

  List<String> get requirementLabels {
    final labels = <String>[];

    if (minAge > 0 && maxAge < 99) {
      labels.add('Age $minAge–$maxAge');
    } else if (minAge > 0) {
      labels.add('$minAge+ years');
    } else if (maxAge < 99) {
      labels.add('Up to $maxAge years');
    }

    if (maxMen != null) labels.add('Max $maxMen men');
    if (maxWomen != null) labels.add('Max $maxWomen women');

    return labels;
  }

  /// Returns the gender-specific cap for [gender], or null if uncapped.
  int? maxForGender(Gender gender) => switch (gender) {
    Gender.man => maxMen,
    Gender.woman => maxWomen,
    _ => null,
  };
}
