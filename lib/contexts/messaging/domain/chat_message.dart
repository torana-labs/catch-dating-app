import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'chat_message.freezed.dart';
part 'chat_message.g.dart';

@freezed
abstract class ChatMessage with _$ChatMessage {
  const factory ChatMessage({
    @JsonKey(includeToJson: false) required String id,
    required String senderId,
    required String text,
    String? imageUrl,
    @NullableTimestampConverter() DateTime? sentAt,
  }) = _ChatMessage;

  factory ChatMessage.fromJson(Map<String, dynamic> json) =>
      _$ChatMessageFromJson(json);
}
