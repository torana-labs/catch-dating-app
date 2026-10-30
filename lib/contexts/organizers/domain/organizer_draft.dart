import 'dart:convert';

import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'organizer_draft.freezed.dart';
part 'organizer_draft.g.dart';

@freezed
abstract class OrganizerDraft with _$OrganizerDraft {
  const factory OrganizerDraft({
    required DateTime savedAt,
    String? name,
    String? area,
    String? description,
    String? location,
    String? instagramHandle,
    String? phoneNumber,
    String? email,
    @Default(OrganizerType.club) OrganizerType organizerType,
    @Default(OrganizerHostDefaults()) OrganizerHostDefaults hostDefaults,
  }) = _OrganizerDraft;

  factory OrganizerDraft.fromJson(Map<String, dynamic> json) =>
      _$OrganizerDraftFromJson(json);

  static OrganizerDraft? fromJsonString(String jsonString) =>
      OrganizerDraft.fromJson(jsonDecode(jsonString) as Map<String, dynamic>);

  static String toJsonString(OrganizerDraft draft) => jsonEncode(draft.toJson());
}

extension OrganizerDraftX on OrganizerDraft {
  bool get isEmpty =>
      name == null &&
      area == null &&
      description == null &&
      location == null &&
      instagramHandle == null &&
      phoneNumber == null &&
      email == null &&
      organizerType == OrganizerType.club &&
      hostDefaults == const OrganizerHostDefaults();
}
