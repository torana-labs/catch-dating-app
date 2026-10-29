import 'package:catch_dating_app/contexts/profiles/profiles.dart';
import 'package:meta/meta.dart';

@immutable
class EventProfileCardSelection {
  EventProfileCardSelection({
    required this.responseId,
    required this.revision,
    required Iterable<String> questionIds,
  }) : questionIds = Set.unmodifiable(questionIds);
  factory EventProfileCardSelection.fromMap(Map<Object?, Object?> json) =>
      EventProfileCardSelection(
        responseId: json['responseId']! as String,
        revision: json['revision']! as int,
        questionIds: (json['questionIds']! as List).cast<String>(),
      );
  final String responseId;
  final int revision;
  final Set<String> questionIds;
  Map<String, Object?> toJson() => {
    'responseId': responseId,
    'revision': revision,
    'questionIds': questionIds.toList()..sort(),
  };
}

@immutable
class EventProfileSelection {
  EventProfileSelection({
    required this.profileRevision,
    required this.membershipRevision,
    required Iterable<String> coreFieldIds,
    required this.photoId,
    required this.card,
    this.firstName,
    this.introduction,
    this.termsVersion = 'event-profile-sharing-v1',
  }) : coreFieldIds = Set.unmodifiable(coreFieldIds);
  factory EventProfileSelection.fromMap(Map<Object?, Object?> json) =>
      EventProfileSelection(
        profileRevision: json['profileRevision']! as int,
        membershipRevision: json['membershipRevision']! as int,
        coreFieldIds: (json['coreFieldIds']! as List).cast<String>(),
        photoId: json['photoId'] as String?,
        card: json['card'] == null
            ? null
            : EventProfileCardSelection.fromMap(json['card']! as Map),
        firstName: json['firstName'] as String?,
        introduction: json['introduction'] as String?,
        termsVersion: json['termsVersion']! as String,
      );
  final int profileRevision, membershipRevision;
  final Set<String> coreFieldIds;
  final String? photoId;
  final EventProfileCardSelection? card;
  final String? firstName, introduction;
  final String termsVersion;
  bool get isEmpty =>
      coreFieldIds.isEmpty &&
      photoId == null &&
      card == null &&
      firstName == null &&
      introduction == null;
  Map<String, Object?> toJson() => {
    'profileRevision': profileRevision,
    'membershipRevision': membershipRevision,
    'coreFieldIds': coreFieldIds.toList()..sort(),
    'photoId': photoId,
    'card': card?.toJson(),
    if (firstName != null) 'firstName': firstName,
    if (introduction != null) 'introduction': introduction,
    'termsVersion': termsVersion,
  };
}

@immutable
class EventProfileField {
  EventProfileField({required this.id, required Object value})
    : value = value is List
          ? List<String>.unmodifiable(value.cast<String>())
          : value;
  final String id;
  final Object value;
}

@immutable
class EventProfileSettings {
  EventProfileSettings({
    required this.eventId,
    required this.organizerId,
    required this.revision,
    required this.selection,
    required this.canShare,
    required this.profileRevision,
    required this.membershipRevision,
    required Iterable<EventProfileField> coreFields,
    required Iterable<String> photoIds,
    this.preview,
  }) : coreFields = List.unmodifiable(coreFields),
       photoIds = List.unmodifiable(photoIds);
  factory EventProfileSettings.fromMap(Map<Object?, Object?> json) =>
      EventProfileSettings(
        eventId: json['eventId']! as String,
        organizerId: json['organizerId'] as String?,
        revision: json['revision']! as int,
        selection: json['selection'] == null
            ? null
            : EventProfileSelection.fromMap(json['selection']! as Map),
        canShare: json['canShare']! as bool,
        profileRevision: json['profileRevision']! as int,
        membershipRevision: json['membershipRevision'] as int?,
        coreFields: (json['coreFields']! as List).map((raw) {
          final field = raw as Map;
          return EventProfileField(
            id: field['fieldId']! as String,
            value: field['value']! as Object,
          );
        }),
        photoIds: (json['photoIds']! as List).cast<String>(),
        preview: json['preview'] == null
            ? null
            : EventParticipantProfile.fromMap(json['preview']! as Map),
      );
  final String eventId;
  final String? organizerId;
  final int revision, profileRevision;
  final int? membershipRevision;
  final bool canShare;
  final EventProfileSelection? selection;
  final List<EventProfileField> coreFields;
  final List<String> photoIds;
  final EventParticipantProfile? preview;
}

@immutable
class EventParticipantProfile {
  EventParticipantProfile({
    required this.eventId,
    required this.participantUid,
    required this.displayName,
    this.introduction,
    required Iterable<EventProfileField> coreFields,
    required Iterable<EventProfileField> cardFields,
    required this.photo,
  }) : coreFields = List.unmodifiable(coreFields),
       cardFields = List.unmodifiable(cardFields);
  factory EventParticipantProfile.fromMap(Map<Object?, Object?> json) =>
      EventParticipantProfile(
        eventId: json['eventId']! as String,
        participantUid: json['participantUid']! as String,
        displayName: json['displayName']! as String,
        introduction: json['introduction'] as String?,
        coreFields: (json['coreFields']! as List).map((raw) {
          final field = raw as Map;
          return EventProfileField(
            id: field['fieldId']! as String,
            value: field['value']! as Object,
          );
        }),
        cardFields: (json['cardFields']! as List).map((raw) {
          final field = raw as Map;
          return EventProfileField(
            id: field['label']! as String,
            value: field['value']! as Object,
          );
        }),
        photo: json['photo'] == null
            ? null
            : FormProfilePhotoPreview.fromMap(json['photo']! as Map),
      );
  final String eventId, participantUid, displayName;
  final String? introduction;
  final List<EventProfileField> coreFields, cardFields;
  final FormProfilePhotoPreview? photo;
}

/// A fresh review must match the event organizer and an already claimed card.
List<FormProfileField> eventCardFields(
  FormProfileReview? card,
  String? organizerId,
) {
  if (card == null ||
      organizerId == null ||
      card.organizerId != organizerId ||
      card.claimedAt == null ||
      card.cardRevision < 1) {
    return const [];
  }
  return card.fields
      .where(
        (field) =>
            field.destination == FormProfileDestination.organizerCard &&
            field.eventProfileEligible &&
            card.selectedCardQuestionIds.contains(field.questionId) &&
            field.kind != 'file' &&
            field.value != null,
      )
      .toList(growable: false);
}

/// Editor selections are private local state until an explicit save. Stale
/// revisions never preselect newly changed profile or applicant answers.
class EventProfileDraft {
  EventProfileDraft(this.settings, this.card) {
    final saved = settings.selection;
    if (saved == null ||
        (saved.membershipRevision != settings.membershipRevision &&
            !(saved.membershipRevision == 0 &&
                settings.membershipRevision == 1))) {
      return;
    }
    firstName = saved.firstName;
    introduction = saved.introduction;
    if (saved.profileRevision == settings.profileRevision) {
      coreFieldIds.addAll(
        saved.coreFieldIds.intersection(
          settings.coreFields.map((f) => f.id).toSet(),
        ),
      );
      photoId = settings.photoIds.contains(saved.photoId)
          ? saved.photoId
          : null;
    }
    if (saved.card != null &&
        card != null &&
        saved.card?.responseId == card?.responseId &&
        saved.card?.revision == card?.cardRevision) {
      questionIds.addAll(
        saved.card!.questionIds.intersection(
          eventCardFields(
            card,
            settings.organizerId,
          ).map((f) => f.questionId).toSet(),
        ),
      );
    }
  }
  final EventProfileSettings settings;
  final FormProfileReview? card;
  final coreFieldIds = <String>{};
  final questionIds = <String>{};
  String? photoId;
  String? firstName, introduction;
  EventProfileSelection? selection() {
    final result = EventProfileSelection(
      profileRevision: settings.profileRevision,
      membershipRevision: settings.membershipRevision ?? 0,
      coreFieldIds: coreFieldIds,
      photoId: photoId,
      firstName: firstName?.trim().isEmpty == true ? null : firstName?.trim(),
      introduction: introduction?.trim().isEmpty == true
          ? null
          : introduction?.trim(),
      card: questionIds.isEmpty || card == null
          ? null
          : EventProfileCardSelection(
              responseId: card!.responseId,
              revision: card!.cardRevision,
              questionIds: questionIds,
            ),
      termsVersion:
          (firstName?.trim().isNotEmpty == true ||
              introduction?.trim().isNotEmpty == true ||
              questionIds.isNotEmpty)
          ? 'event-profile-sharing-v2'
          : 'event-profile-sharing-v1',
    );
    return result.isEmpty ? null : result;
  }
}
