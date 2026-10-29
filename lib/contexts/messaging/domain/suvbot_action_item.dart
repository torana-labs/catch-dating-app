/// A single item in the Suvbot demo-controls action list.
///
/// Moved from `chats/data/suvbot_repository.dart` (where it was defined as a
/// data-layer class) to the domain layer so presentation widgets can depend on
/// it without violating layering.
final class SuvbotActionItem {
  const SuvbotActionItem({
    required this.id,
    required this.label,
    required this.description,
    required this.icon,
    this.destructive = false,
    this.requiresText = false,
  });

  factory SuvbotActionItem.fromCallableData(Object? data) {
    if (data case final Map<Object?, Object?> map) {
      return SuvbotActionItem(
        id: _stringField(map, 'id'),
        label: _stringField(map, 'label'),
        description: _stringField(map, 'description'),
        icon: _stringField(map, 'icon'),
        destructive: map['destructive'] == true,
        requiresText: map['requiresText'] == true,
      );
    }

    throw StateError('Suvbot action response was malformed.');
  }

  final String id;
  final String label;
  final String description;
  final String icon;
  final bool destructive;
  final bool requiresText;

  static String _stringField(Map<Object?, Object?> map, String key) {
    final value = map[key];
    if (value is String && value.trim().isNotEmpty) return value;
    throw StateError('Suvbot action response was missing $key.');
  }
}
