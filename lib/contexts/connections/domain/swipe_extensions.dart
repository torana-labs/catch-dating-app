import 'package:catch_dating_app/contexts/connections/domain/swipe.dart';

/// Hand-written helpers and view-model types that accompany the generated
/// [Swipe] data shape (emitted from `contracts/firestore/swipes.schema.json`
/// by `tool/contracts/generate_domain_classes.mjs`).
const maxSwipeReactionCommentLength = 240;

String? normalizeSwipeReactionComment(String? comment) {
  final trimmed = comment?.trim();
  if (trimmed == null || trimmed.isEmpty) return null;
  if (trimmed.length > maxSwipeReactionCommentLength) {
    throw ArgumentError.value(
      comment,
      'comment',
      'Reaction comments must be $maxSwipeReactionCommentLength characters or fewer.',
    );
  }
  return trimmed;
}

class ProfileReactionTarget {
  const ProfileReactionTarget({
    required this.id,
    required this.type,
    required this.label,
    required this.preview,
  });

  final String id;
  final SwipeReactionTargetType type;
  final String label;
  final String preview;
}
