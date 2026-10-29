import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'saved_event.freezed.dart';
part 'saved_event.g.dart';

@freezed
abstract class SavedEvent with _$SavedEvent {
  const factory SavedEvent({
    @JsonKey(includeToJson: false) required String id,
    required String uid,
    required String eventId,
    @TimestampConverter() required DateTime savedAt,
  }) = _SavedEvent;

  factory SavedEvent.fromJson(Map<String, dynamic> json) =>
      _$SavedEventFromJson(json);
}

String savedEventId({required String uid, required String eventId}) =>
    '${uid}_$eventId';
