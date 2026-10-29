// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_domain_classes.mjs
// Then run: dart run build_runner build
//
// Data shape emitted from contracts/firestore/reviews.schema.json.
// Derived behavior, if any, lives in a hand-written companion extension file.
import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'review.freezed.dart';
part 'review.g.dart';

@freezed
abstract class Review with _$Review {
  const factory Review({
    @JsonKey(includeToJson: false) required String id,
    required String organizerId,
    String? eventId,
    String? reviewerUserId,
    required String reviewerName,
    required int rating,
    required String comment,
    @Default('verified') String verificationStatus,
    @Default('catchEvent') String source,
    @Default('published') String moderationStatus,
    @Default(false) bool isAnonymous,
    String? submittedFromPath,
    @TimestampConverter() required DateTime createdAt,
    @NullableTimestampConverter() DateTime? updatedAt,
    ReviewOwnerResponse? ownerResponse,
  }) = _Review;

  factory Review.fromJson(Map<String, dynamic> json) => _$ReviewFromJson(json);
}

@freezed
abstract class ReviewOwnerResponse with _$ReviewOwnerResponse {
  const factory ReviewOwnerResponse({
    required String hostUserId,
    required String hostName,
    String? hostAvatarUrl,
    required String message,
    @TimestampConverter() required DateTime createdAt,
    @TimestampConverter() required DateTime updatedAt,
  }) = _ReviewOwnerResponse;

  factory ReviewOwnerResponse.fromJson(Map<String, dynamic> json) =>
      _$ReviewOwnerResponseFromJson(json);
}
