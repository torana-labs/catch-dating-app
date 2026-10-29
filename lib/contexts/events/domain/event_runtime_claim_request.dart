import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'event_runtime_claim_request.freezed.dart';
part 'event_runtime_claim_request.g.dart';

enum EventRuntimeClaimStatus { pending, approved, rejected, cancelled }

@freezed
abstract class EventRuntimeClaimRequest with _$EventRuntimeClaimRequest {
  const EventRuntimeClaimRequest._();

  const factory EventRuntimeClaimRequest({
    @JsonKey(includeToJson: false) required String id,
    required String eventId,
    required String clubId,
    required String organizerId,
    required String uid,
    required String displayName,
    required String phoneLastFour,
    @Default(<String>[]) List<String> candidateAttendeeIds,
    required EventRuntimeClaimStatus status,
    String? reviewedBy,
    String? reviewReason,
    @TimestampConverter() required DateTime createdAt,
    @TimestampConverter() required DateTime updatedAt,
    @NullableTimestampConverter() DateTime? reviewedAt,
  }) = _EventRuntimeClaimRequest;

  factory EventRuntimeClaimRequest.fromJson(Map<String, dynamic> json) =>
      _$EventRuntimeClaimRequestFromJson(json);

  bool get isPending => status == EventRuntimeClaimStatus.pending;
}
