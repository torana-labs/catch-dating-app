import 'package:catch_dating_app/contexts/profiles/profiles.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';

enum CrossPathsSuggestionReason {
  attendingEvent('attending_event'),
  viewerAttending('viewer_attending'),
  bookingAvailable('booking_available'),
  mutualPreferences('mutual_preferences'),
  showcaseReady('showcase_ready');

  const CrossPathsSuggestionReason(this.wireValue);

  final String wireValue;

  static CrossPathsSuggestionReason fromWire(String value) => values.firstWhere(
    (reason) => reason.wireValue == value,
    orElse: () => throw FormatException(
      'Unsupported Cross Paths suggestion reason: $value',
    ),
  );
}

enum CrossPathsViewerBookingStatus {
  signedUp,
  canBookNow;

  static CrossPathsViewerBookingStatus fromWire(String value) =>
      values.firstWhere(
        (status) => status.name == value,
        orElse: () => throw FormatException(
          'Unsupported Cross Paths booking status: $value',
        ),
      );
}

class CrossPathsSuggestionEvent {
  const CrossPathsSuggestionEvent({
    required this.eventId,
    required this.organizerId,
    required this.startTime,
    required this.endTime,
    required this.meetingPoint,
    required this.activityKind,
    required this.photoUrl,
    required this.viewerBookingStatus,
    this.pairHoldAvailable = false,
  });

  final String eventId;
  final String? organizerId;
  final DateTime startTime;
  final DateTime endTime;
  final String meetingPoint;
  final ActivityKind activityKind;
  final String? photoUrl;
  final CrossPathsViewerBookingStatus viewerBookingStatus;
  final bool pairHoldAvailable;
}

class CrossPathsSuggestion {
  const CrossPathsSuggestion({
    required this.profile,
    required this.event,
    required this.reasonCodes,
    required this.suggestionToken,
    required this.tokenExpiresAt,
    this.rankingVersion = 1,
  });

  factory CrossPathsSuggestion.fromCallableData(
    Object? value, {
    int rankingVersion = 1,
  }) {
    final json = _stringMap(value, 'suggestion');
    final person = _stringMap(json['person'], 'suggestion.person');
    final event = _stringMap(json['event'], 'suggestion.event');
    final uid = _requiredString(person, 'uid');
    final photoUrls = _stringList(person['photoUrls'], 'person.photoUrls');
    _requireLengthBetween(photoUrls, 3, 6, 'person.photoUrls');
    final promptValues = _objectList(
      person['promptAnswers'],
      'person.promptAnswers',
    );
    _requireLengthBetween(promptValues, 3, 3, 'person.promptAnswers');
    final age = _requiredInt(person, 'age');
    if (age < 18 || age > 99) {
      throw const FormatException('person.age must be between 18 and 99.');
    }
    final reasonCodes = _stringList(
      json['reasonCodes'],
      'suggestion.reasonCodes',
    );
    _requireLengthBetween(reasonCodes, 4, 5, 'suggestion.reasonCodes');
    if (reasonCodes.toSet().length != reasonCodes.length) {
      throw const FormatException(
        'suggestion.reasonCodes must contain unique values.',
      );
    }
    final suggestionToken = _requiredString(json, 'suggestionToken');
    if (suggestionToken.length < 40 || suggestionToken.length > 4096) {
      throw const FormatException(
        'suggestion.suggestionToken has an invalid length.',
      );
    }
    final now = DateTime.fromMillisecondsSinceEpoch(0, isUtc: true);

    return CrossPathsSuggestion(
      profile: PublicProfile(
        uid: uid,
        name: _requiredString(person, 'name'),
        age: age,
        gender: _enumByName(
          Gender.values,
          _requiredString(person, 'gender'),
          'person.gender',
        ),
        city: _nullableString(person['city'], 'person.city'),
        profilePhotos: [
          for (final (index, url) in photoUrls.indexed)
            ProfilePhoto(
              id: 'cross_paths_${uid}_$index',
              url: url,
              thumbnailUrl: url,
              storagePath: 'cross_paths/$uid/$index',
              thumbnailStoragePath: 'cross_paths/$uid/$index-thumb',
              position: index,
              createdAt: now,
              updatedAt: now,
            ),
        ],
        profilePrompts: [
          for (final (index, rawPrompt) in promptValues.indexed)
            () {
              final prompt = _stringMap(
                rawPrompt,
                'person.promptAnswers[$index]',
              );
              return ProfilePromptAnswer(
                promptId: index < defaultProfilePromptIds.length
                    ? defaultProfilePromptIds[index]
                    : 'cross_paths_prompt_$index',
                prompt: _requiredString(prompt, 'prompt'),
                answer: _requiredString(prompt, 'answer'),
              );
            }(),
        ],
        relationshipGoal: _enumByName(
          RelationshipGoal.values,
          _requiredString(person, 'relationshipGoal'),
          'person.relationshipGoal',
        ),
      ),
      event: CrossPathsSuggestionEvent(
        eventId: _requiredString(event, 'eventId'),
        organizerId: _nullableString(event['organizerId'], 'event.organizerId'),
        startTime: _requiredDateTime(event, 'startTime'),
        endTime: _requiredDateTime(event, 'endTime'),
        meetingPoint: _requiredString(event, 'meetingPoint'),
        activityKind: _enumByName(
          ActivityKind.values,
          _requiredString(event, 'activityKind'),
          'event.activityKind',
        ),
        photoUrl: _nullableString(event['photoUrl'], 'event.photoUrl'),
        viewerBookingStatus: CrossPathsViewerBookingStatus.fromWire(
          _requiredString(event, 'viewerBookingStatus'),
        ),
        pairHoldAvailable: event['pairHoldAvailable'] == true,
      ),
      reasonCodes: reasonCodes
          .map(CrossPathsSuggestionReason.fromWire)
          .toList(growable: false),
      suggestionToken: suggestionToken,
      tokenExpiresAt: _requiredDateTime(json, 'tokenExpiresAt'),
      rankingVersion: rankingVersion,
    );
  }

  final PublicProfile profile;
  final CrossPathsSuggestionEvent event;
  final List<CrossPathsSuggestionReason> reasonCodes;
  final String suggestionToken;
  final DateTime tokenExpiresAt;
  final int rankingVersion;

  bool get viewerIsBooked =>
      event.viewerBookingStatus == CrossPathsViewerBookingStatus.signedUp;
}

class CrossPathsSuggestionsResponse {
  const CrossPathsSuggestionsResponse({
    required this.schemaVersion,
    required this.rankingVersion,
    required this.suggestions,
  });

  factory CrossPathsSuggestionsResponse.fromCallableData(Object? value) {
    final json = _stringMap(value, 'response');
    final schemaVersion = _requiredInt(json, 'schemaVersion');
    final rankingVersion = _requiredInt(json, 'rankingVersion');
    if (schemaVersion != 1 || rankingVersion != 1) {
      throw FormatException(
        'Unsupported Cross Paths response version '
        '$schemaVersion/$rankingVersion',
      );
    }
    final suggestions = _objectList(json['suggestions'], 'suggestions')
        .map(
          (value) => CrossPathsSuggestion.fromCallableData(
            value,
            rankingVersion: rankingVersion,
          ),
        )
        .toList(growable: false);
    if (suggestions.length > 2) {
      throw const FormatException(
        'Cross Paths response exceeded the two-suggestion contract.',
      );
    }
    return CrossPathsSuggestionsResponse(
      schemaVersion: schemaVersion,
      rankingVersion: rankingVersion,
      suggestions: suggestions,
    );
  }

  final int schemaVersion;
  final int rankingVersion;
  final List<CrossPathsSuggestion> suggestions;
}

Map<String, dynamic> _stringMap(Object? value, String field) {
  if (value is! Map) throw FormatException('$field must be an object.');
  return value.map((key, child) => MapEntry(key.toString(), child));
}

List<Object?> _objectList(Object? value, String field) {
  if (value is! List) throw FormatException('$field must be an array.');
  return List<Object?>.from(value);
}

List<String> _stringList(Object? value, String field) =>
    _objectList(value, field)
        .map((item) {
          if (item is! String || item.trim().isEmpty) {
            throw FormatException('$field must contain non-empty strings.');
          }
          return item;
        })
        .toList(growable: false);

String _requiredString(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is! String || value.trim().isEmpty) {
    throw FormatException('$key must be a non-empty string.');
  }
  return value;
}

String? _nullableString(Object? value, String field) {
  if (value == null) return null;
  if (value is! String) throw FormatException('$field must be a string.');
  return value;
}

int _requiredInt(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is! int) throw FormatException('$key must be an integer.');
  return value;
}

DateTime _requiredDateTime(Map<String, dynamic> json, String key) {
  final value = _requiredString(json, key);
  final parsed = DateTime.tryParse(value);
  if (parsed == null) throw FormatException('$key must be an ISO timestamp.');
  return parsed;
}

T _enumByName<T extends Enum>(Iterable<T> values, String name, String field) =>
    values.firstWhere(
      (value) => value.name == name,
      orElse: () => throw FormatException('$field has an unsupported value.'),
    );

void _requireLengthBetween(
  List<Object?> values,
  int minimum,
  int maximum,
  String field,
) {
  if (values.length < minimum || values.length > maximum) {
    throw FormatException(
      '$field must contain between $minimum and $maximum items.',
    );
  }
}
