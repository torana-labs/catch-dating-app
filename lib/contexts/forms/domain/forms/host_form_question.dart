import 'package:catch_dating_app/contexts/forms/domain/forms/form_definition_fields.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/profile_schema_contracts.g.dart';
import 'package:meta/meta.dart';

enum HostFormQuestionKind {
  shortText,
  longText,
  singleChoice,
  multiChoice,
  date,
  phone,
  email,
  url,
  number,
  boolean,
  file,
  acknowledgement,
  signature,
}

enum HostFormPrivacyClass { contact, profile, sensitive, organizerCustom }

enum HostFormPrefillPolicy { never, participantReviewRequired }

enum HostFormPresentation { detailOnly, filterable, sortable }

enum HostFormAnswerDestination { organizerOnly, catchProfile, organizerCard }

enum HostFormPatternPreset {
  lettersAndSpaces,
  alphanumeric,
  postalCode,
  handle,
}

const Object _unset = Object();

@immutable
class HostFormQuestion {
  HostFormQuestion.fromMap(Map<String, Object?> json)
    : _json = Map.unmodifiable(formDefinitionDeepStringMap(json));

  factory HostFormQuestion.create({
    required String questionId,
    required HostFormQuestionKind kind,
  }) {
    final choice =
        kind == HostFormQuestionKind.singleChoice ||
        kind == HostFormQuestionKind.multiChoice;
    return HostFormQuestion.fromMap({
      'questionId': questionId,
      'key': 'question_${questionId.replaceAll(RegExp('[^A-Za-z0-9_]'), '_')}',
      'label': 'Untitled question',
      'helpText': null,
      'kind': kind.name,
      'required': false,
      'options': choice
          ? [
              {
                'optionId': '${questionId}_option_1',
                'label': 'Option 1',
                'value': 'option_1',
              },
              {
                'optionId': '${questionId}_option_2',
                'label': 'Option 2',
                'value': 'option_2',
              },
            ]
          : <Object?>[],
      'canonicalFieldId': null,
      'privacyClass': 'organizerCustom',
      'prefillPolicy': 'never',
      'hostPresentation': 'detailOnly',
      'validation': const {
        'minLength': null,
        'maxLength': null,
        'minNumber': null,
        'maxNumber': null,
        'earliestDate': null,
        'latestDate': null,
        'minSelections': null,
        'maxSelections': null,
        'maxFileCount': null,
        'maxFileSizeBytes': null,
        'allowedMimeTypes': <Object?>[],
        'patternPreset': null,
        'customError': null,
      },
    });
  }

  final Map<String, Object?> _json;

  String get questionId => formDefinitionStringValue(_json['questionId']);
  String get label => formDefinitionStringValue(_json['label']);
  String? get helpText => formDefinitionNullableString(_json['helpText']);
  HostFormQuestionKind get kind => formDefinitionEnumByName(
    HostFormQuestionKind.values,
    formDefinitionStringValue(_json['kind']),
    'form question kind',
  );
  String? get canonicalFieldId =>
      formDefinitionNullableString(_json['canonicalFieldId']);

  HostFormAnswerDestination get answerDestination => formDefinitionEnumByName(
    HostFormAnswerDestination.values,
    formDefinitionStringValue(_json['answerDestination'] ?? 'organizerOnly'),
    'form answer destination',
  );

  /// A private card mapping alone never proposes an answer to attendees.
  bool get proposesEventProfile =>
      formDefinitionDeepStringMap(_json['answerAudience'])['mode'] ==
      'eventMembersWithConsent';

  bool get canPrepareOrganizerCard =>
      kind != HostFormQuestionKind.acknowledgement &&
      kind != HostFormQuestionKind.signature;

  bool get canPrepareCatchProfile {
    final field = canonicalFieldId == null
        ? null
        : schemaPersonFieldForId(canonicalFieldId!);
    return canPrepareOrganizerCard &&
        field != null &&
        field.authority != 'derived' &&
        (field.questionKind == kind.name ||
            (field.questionKind == 'shortText' &&
                kind == HostFormQuestionKind.singleChoice));
  }

  List<HostFormAnswerDestination> get availableAnswerDestinations => [
    HostFormAnswerDestination.organizerOnly,
    if (canPrepareCatchProfile) HostFormAnswerDestination.catchProfile,
    if (canPrepareOrganizerCard) HostFormAnswerDestination.organizerCard,
  ];

  static bool supportsPersonField(String fieldId, HostFormQuestionKind kind) {
    final field = schemaPersonFieldForId(fieldId);
    return field?.questionKind == kind.name ||
        (fieldId == 'instagramHandle' && kind == HostFormQuestionKind.url);
  }

  List<String> get availablePersonFieldIds => [
    for (final field in schemaPersonFieldCatalog)
      if (supportsPersonField(field.id, kind) || field.id == canonicalFieldId)
        field.id,
  ];

  bool get required => _json['required'] == true;
  HostFormPrivacyClass get privacyClass => formDefinitionEnumByName(
    HostFormPrivacyClass.values,
    formDefinitionStringValue(_json['privacyClass']),
    'form privacy class',
  );
  HostFormPrefillPolicy get prefillPolicy => formDefinitionEnumByName(
    HostFormPrefillPolicy.values,
    formDefinitionStringValue(_json['prefillPolicy']),
    'form prefill policy',
  );
  HostFormPresentation get hostPresentation => formDefinitionEnumByName(
    HostFormPresentation.values,
    formDefinitionStringValue(_json['hostPresentation']),
    'form host presentation',
  );
  HostFormQuestionValidation get validation => HostFormQuestionValidation._(
    formDefinitionDeepStringMap(_json['validation']),
  );
  List<HostFormQuestionOption> get options =>
      formDefinitionJsonList(_json['options'])
          .map(
            (item) =>
                HostFormQuestionOption._(formDefinitionDeepStringMap(item)),
          )
          .toList(growable: false);

  Map<String, Object?> toJson() => formDefinitionDeepStringMap(_json);

  HostFormQuestion copyWith({
    String? label,
    String? helpText,
    bool clearHelpText = false,
    HostFormQuestionKind? kind,
    bool? required,
    String? canonicalFieldId,
    bool clearCanonicalField = false,
    HostFormPrivacyClass? privacyClass,
    HostFormPrefillPolicy? prefillPolicy,
    HostFormPresentation? hostPresentation,
    HostFormAnswerDestination? answerDestination,
    bool? eventProfileAudience,
    HostFormQuestionValidation? validation,
  }) {
    final next = toJson();
    if (label != null) next['label'] = label;
    if (helpText != null || clearHelpText) {
      next['helpText'] = clearHelpText ? null : helpText;
    }
    if (required != null) next['required'] = required;
    if (canonicalFieldId != null || clearCanonicalField) {
      final field = clearCanonicalField
          ? null
          : schemaPersonFieldForId(canonicalFieldId!);
      if (!clearCanonicalField &&
          (field == null ||
              !supportsPersonField(field.id, kind ?? this.kind))) {
        throw ArgumentError.value(canonicalFieldId, 'canonicalFieldId');
      }
      next['canonicalFieldId'] = field?.id;
      if (field != null) {
        next['privacyClass'] = field.privacyClass;
        next['hostPresentation'] = 'detailOnly';
      }
    }
    if (privacyClass != null) next['privacyClass'] = privacyClass.name;
    if (prefillPolicy != null) next['prefillPolicy'] = prefillPolicy.name;
    if (hostPresentation != null) {
      next['hostPresentation'] = hostPresentation.name;
    }
    if (validation != null) next['validation'] = validation.toJson();
    if (kind != null && kind != this.kind) {
      next['kind'] = kind.name;
      final mapped = next['canonicalFieldId'] as String?;
      if (mapped != null && !supportsPersonField(mapped, kind)) {
        next['canonicalFieldId'] = null;
        next['prefillPolicy'] = 'never';
      }
      final choice =
          kind == HostFormQuestionKind.singleChoice ||
          kind == HostFormQuestionKind.multiChoice;
      if (!choice) {
        next['options'] = <Object?>[];
      } else if (formDefinitionJsonList(next['options']).isEmpty) {
        next['options'] = [
          {
            'optionId': '${questionId}_option_1',
            'label': 'Option 1',
            'value': 'option_1',
          },
          {
            'optionId': '${questionId}_option_2',
            'label': 'Option 2',
            'value': 'option_2',
          },
        ];
      }
    }
    final candidate = HostFormQuestion.fromMap(next);
    final destination = answerDestination ?? candidate.answerDestination;
    if (!candidate.availableAnswerDestinations.contains(destination)) {
      if (answerDestination != null) {
        throw ArgumentError.value(answerDestination, 'answerDestination');
      }
      // Clearing a mapping or changing type never broadens sharing. The Host
      // must explicitly choose a valid profile building block again.
      next['answerDestination'] = HostFormAnswerDestination.organizerOnly.name;
    } else if (answerDestination != null) {
      next['answerDestination'] = answerDestination.name;
      if (answerDestination != HostFormAnswerDestination.organizerOnly &&
          candidate.kind == HostFormQuestionKind.file) {
        next['validation'] = candidate.validation
            .copyWith(
              maxFileCount: 1,
              maxFileSizeBytes: 10 * 1024 * 1024,
              allowedMimeTypes: const ['image/jpeg', 'image/png', 'image/webp'],
            )
            .toJson();
      }
    }
    if (next['answerDestination'] !=
            HostFormAnswerDestination.organizerCard.name ||
        (kind ?? this.kind) == HostFormQuestionKind.file ||
        eventProfileAudience == false) {
      next.remove('answerAudience');
    } else if (eventProfileAudience == true) {
      next['answerAudience'] = {
        'mode': 'eventMembersWithConsent',
        'eventProfileSlot': 'customRow',
      };
    }
    return HostFormQuestion.fromMap(next);
  }

  HostFormQuestion replaceOption(int index, HostFormQuestionOption option) {
    final next = toJson();
    final options = formDefinitionJsonList(next['options']);
    options[index] = option.toJson();
    next['options'] = options;
    return HostFormQuestion.fromMap(next);
  }

  HostFormQuestion addOption(HostFormQuestionOption option) {
    final next = toJson();
    final options = formDefinitionJsonList(next['options'])
      ..add(option.toJson());
    next['options'] = options;
    return HostFormQuestion.fromMap(next);
  }

  HostFormQuestion removeOption(int index) {
    final next = toJson();
    final options = formDefinitionJsonList(next['options'])..removeAt(index);
    next['options'] = options;
    return HostFormQuestion.fromMap(next);
  }
}

@immutable
class HostFormQuestionValidation {
  HostFormQuestionValidation._(Map<String, Object?> json)
    : _json = Map.unmodifiable(formDefinitionDeepStringMap(json));

  final Map<String, Object?> _json;

  int? get minLength => formDefinitionNullableInt(_json['minLength']);
  int? get maxLength => formDefinitionNullableInt(_json['maxLength']);
  num? get minNumber => formDefinitionNullableNum(_json['minNumber']);
  num? get maxNumber => formDefinitionNullableNum(_json['maxNumber']);
  String? get earliestDate =>
      formDefinitionNullableString(_json['earliestDate']);
  String? get latestDate => formDefinitionNullableString(_json['latestDate']);
  int? get minSelections => formDefinitionNullableInt(_json['minSelections']);
  int? get maxSelections => formDefinitionNullableInt(_json['maxSelections']);
  int? get maxFileCount => formDefinitionNullableInt(_json['maxFileCount']);
  int? get maxFileSizeBytes =>
      formDefinitionNullableInt(_json['maxFileSizeBytes']);
  List<String> get allowedMimeTypes =>
      (_json['allowedMimeTypes'] as List?)?.whereType<String>().toList(
        growable: false,
      ) ??
      const [];
  HostFormPatternPreset? get patternPreset {
    final value = formDefinitionNullableString(_json['patternPreset']);
    return value == null
        ? null
        : formDefinitionEnumByName(
            HostFormPatternPreset.values,
            value,
            'form validation pattern',
          );
  }

  String? get customError => formDefinitionNullableString(_json['customError']);

  Map<String, Object?> toJson() => formDefinitionDeepStringMap(_json);

  HostFormQuestionValidation copyWith({
    Object? minLength = _unset,
    Object? maxLength = _unset,
    Object? minNumber = _unset,
    Object? maxNumber = _unset,
    Object? earliestDate = _unset,
    Object? latestDate = _unset,
    Object? minSelections = _unset,
    Object? maxSelections = _unset,
    Object? maxFileCount = _unset,
    Object? maxFileSizeBytes = _unset,
    List<String>? allowedMimeTypes,
    Object? patternPreset = _unset,
    Object? customError = _unset,
  }) {
    final next = toJson();
    final updates = <String, Object?>{
      if (!identical(minLength, _unset)) 'minLength': minLength,
      if (!identical(maxLength, _unset)) 'maxLength': maxLength,
      if (!identical(minNumber, _unset)) 'minNumber': minNumber,
      if (!identical(maxNumber, _unset)) 'maxNumber': maxNumber,
      if (!identical(earliestDate, _unset)) 'earliestDate': earliestDate,
      if (!identical(latestDate, _unset)) 'latestDate': latestDate,
      if (!identical(minSelections, _unset)) 'minSelections': minSelections,
      if (!identical(maxSelections, _unset)) 'maxSelections': maxSelections,
      if (!identical(maxFileCount, _unset)) 'maxFileCount': maxFileCount,
      if (!identical(maxFileSizeBytes, _unset))
        'maxFileSizeBytes': maxFileSizeBytes,
      if (!identical(patternPreset, _unset))
        'patternPreset': (patternPreset as HostFormPatternPreset?)?.name,
      if (!identical(customError, _unset)) 'customError': customError,
    };
    if (allowedMimeTypes != null) {
      updates['allowedMimeTypes'] = allowedMimeTypes;
    }
    next.addAll(updates);
    return HostFormQuestionValidation._(next);
  }
}

@immutable
class HostFormQuestionOption {
  HostFormQuestionOption._(Map<String, Object?> json)
    : _json = Map.unmodifiable(formDefinitionDeepStringMap(json));

  factory HostFormQuestionOption.create({
    required String optionId,
    required int ordinal,
  }) => HostFormQuestionOption._({
    'optionId': optionId,
    'label': 'Option $ordinal',
    'value': 'option_$ordinal',
  });

  final Map<String, Object?> _json;

  String get optionId => formDefinitionStringValue(_json['optionId']);
  String get label => formDefinitionStringValue(_json['label']);
  String get value => formDefinitionStringValue(_json['value']);

  Map<String, Object?> toJson() => formDefinitionDeepStringMap(_json);

  HostFormQuestionOption copyWith({String? label, String? value}) {
    final next = toJson();
    if (label != null) next['label'] = label;
    if (value != null) next['value'] = value;
    return HostFormQuestionOption._(next);
  }
}
