// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_domain_classes.mjs
// Then run: dart run build_runner build
//
// Data shape emitted from contracts/shared/event_common.schema.json (#/definitions/eventConstraints).
// Derived behavior, if any, lives in a hand-written companion extension file.
import 'package:freezed_annotation/freezed_annotation.dart';

// Hand-written derived behavior for this data shape lives in the
// companion file below; it is re-exported so consumers of this file
// keep seeing those getters/helpers/types unchanged.
export 'event_constraints_extensions.dart';

part 'event_constraints.freezed.dart';
part 'event_constraints.g.dart';

@freezed
abstract class EventConstraints with _$EventConstraints {
  const factory EventConstraints({
    @Default(0) int minAge,
    @Default(99) int maxAge,
    int? maxMen,
    int? maxWomen,
  }) = _EventConstraints;

  factory EventConstraints.fromJson(Map<String, dynamic> json) =>
      _$EventConstraintsFromJson(json);
}
