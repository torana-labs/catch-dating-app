// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_domain_classes.mjs
// Then run: dart run build_runner build
//
// Data shape emitted from contracts/firestore/swipes.schema.json.
// Derived behavior, if any, lives in a hand-written companion extension file.
import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

// Hand-written derived behavior for this data shape lives in the
// companion file below; it is re-exported so consumers of this file
// keep seeing those getters/helpers/types unchanged.
export 'swipe_extensions.dart';

part 'swipe.freezed.dart';
part 'swipe.g.dart';

enum SwipeDirection { like, pass }

enum SwipeReactionTargetType {
  heroPhoto,
  photo,
  profilePrompt,
  compatibility,
  running,
  details,
  lifestyle,
}

@freezed
abstract class Swipe with _$Swipe {
  const factory Swipe({
    required String swiperId,
    required String targetId,
    required String eventId,
    required SwipeDirection direction,
    String? reactionTargetId,
    @JsonKey() SwipeReactionTargetType? reactionTargetType,
    String? reactionTargetLabel,
    String? reactionTargetPreview,
    String? comment,
    @TimestampConverter() required DateTime createdAt,
  }) = _Swipe;

  factory Swipe.fromJson(Map<String, dynamic> json) => _$SwipeFromJson(json);
}
