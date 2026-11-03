import 'package:catch_ui/catch_ui.dart' show CatchContractFieldConstraints;

/// Validates an already parsed scalar/collection using generated field bounds.
/// This is not an object/schema validator: callers still own cross-field rules,
/// object membership and nested validation. Omission differs from explicit null.
bool acceptsContractValue(
  CatchContractFieldConstraints field,
  Object? value, {
  bool omitted = false,
}) {
  if (omitted) return !field.required;
  final types = field.valueTypes;
  if (value == null) return types?.contains('null') ?? false;
  if (types != null &&
      !types.any(
        (type) => switch (type) {
          'string' => value is String,
          'integer' => value is int,
          'number' => value is num && value.isFinite,
          'boolean' => value is bool,
          'array' => value is List,
          'object' => value is Map,
          _ => false,
        },
      )) {
    return false;
  }
  if (value is String) {
    final length = value.runes.length;
    if (field.minLength != null && length < field.minLength! ||
        field.maxLength != null && length > field.maxLength! ||
        field.pattern != null && !RegExp(field.pattern!).hasMatch(value) ||
        field.enumValues != null && !field.enumValues!.contains(value)) {
      return false;
    }
  }
  if (value is num) {
    if (!value.isFinite ||
        field.minimum != null && value < field.minimum! ||
        field.maximum != null && value > field.maximum!) {
      return false;
    }
    final step = field.multipleOf;
    if (step != null &&
        ((value / step) - (value / step).round()).abs() > 1e-7) {
      return false;
    }
  }
  if (value is List) {
    if (field.minItems != null && value.length < field.minItems! ||
        field.maxItems != null && value.length > field.maxItems!) {
      return false;
    }
  }
  return true;
}
