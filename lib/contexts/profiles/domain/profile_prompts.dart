import 'package:catch_dating_app/contexts/profiles/domain/profile_validation.dart';
import 'package:catch_dating_app/l10n/generated/structured_domain_copy.g.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/profile_schema_contracts.g.dart'
    as schema_contracts;
import 'package:freezed_annotation/freezed_annotation.dart';

part 'profile_prompts.freezed.dart';
part 'profile_prompts.g.dart';

/// App-facing prompt helpers backed by the generated schema contract.
///
/// Add, remove, or reorder prompts in `contracts/catalogs/`. The stored
/// profile documents keep stable ids; display copy resolves through this file.
const profilePromptPerfectEventId =
    schema_contracts.schemaProfilePromptPerfectEventId;
const maxProfilePromptAnswers = schema_contracts.schemaMaxProfilePromptAnswers;
const maxPhotoPromptCaptions = schema_contracts.schemaMaxPhotoPromptCaptions;

class ProfilePromptDefinition {
  const ProfilePromptDefinition({
    required this.id,
    required this.title,
    required this.placeholder,
  });

  final String id;
  final String title;
  final String placeholder;
}

class PhotoPromptDefinition {
  const PhotoPromptDefinition({
    required this.id,
    required this.title,
    required this.placeholder,
  });

  final String id;
  final String title;
  final String placeholder;
}

final profilePromptCatalog = schema_contracts.schemaProfilePromptCatalog
    .map(
      (definition) => ProfilePromptDefinition(
        id: definition.id,
        title: definition.title,
        placeholder: definition.placeholder,
      ),
    )
    .toList(growable: false);

const defaultProfilePromptIds = schema_contracts.schemaDefaultProfilePromptIds;

final photoPromptCatalog = schema_contracts.schemaPhotoPromptCatalog
    .map(
      (definition) => PhotoPromptDefinition(
        id: definition.id,
        title: definition.title,
        placeholder: definition.placeholder,
      ),
    )
    .toList(growable: false);

@freezed
abstract class ProfilePromptAnswer with _$ProfilePromptAnswer {
  const ProfilePromptAnswer._();

  const factory ProfilePromptAnswer({
    required String promptId,
    required String prompt,
    @Default('') String answer,
  }) = _ProfilePromptAnswer;

  factory ProfilePromptAnswer.fromJson(Map<String, dynamic> json) =>
      _$ProfilePromptAnswerFromJson(json);

  String get displayPrompt => profilePromptTitle(promptId, fallback: prompt);
}

@freezed
abstract class PhotoPromptAnswer with _$PhotoPromptAnswer {
  const PhotoPromptAnswer._();

  const factory PhotoPromptAnswer({
    required int photoIndex,
    required String promptId,
    required String prompt,
    @Default('') String caption,
  }) = _PhotoPromptAnswer;

  factory PhotoPromptAnswer.fromJson(Map<String, dynamic> json) =>
      _$PhotoPromptAnswerFromJson(json);

  String get displayPrompt => photoPromptTitle(promptId, fallback: prompt);
}

ProfilePromptDefinition profilePromptDefinition(String promptId) {
  return profilePromptCatalog.firstWhere(
    (definition) => definition.id == promptId,
    orElse: () => ProfilePromptDefinition(
      id: promptId,
      title: promptId,
      placeholder: StructuredDomainCopy.profilePromptFallbackAnswer,
    ),
  );
}

PhotoPromptDefinition photoPromptDefinition(String promptId) {
  return photoPromptCatalog.firstWhere(
    (definition) => definition.id == promptId,
    orElse: () => PhotoPromptDefinition(
      id: promptId,
      title: promptId,
      placeholder: StructuredDomainCopy.photoPromptFallbackChoose,
    ),
  );
}

PhotoPromptDefinition defaultPhotoPromptForIndex(int index) {
  if (index < 0) return photoPromptCatalog.first;
  return photoPromptCatalog[index % photoPromptCatalog.length];
}

String profilePromptTitle(String promptId, {String? fallback}) {
  final definition = profilePromptCatalog
      .where((definition) => definition.id == promptId)
      .firstOrNull;
  return definition?.title ?? fallback ?? promptId;
}

String photoPromptTitle(String promptId, {String? fallback}) {
  final definition = photoPromptCatalog
      .where((definition) => definition.id == promptId)
      .firstOrNull;
  return definition?.title ?? fallback ?? promptId;
}

ProfilePromptAnswer profilePromptAnswerFor({
  required ProfilePromptDefinition definition,
  required String answer,
}) {
  return ProfilePromptAnswer(
    promptId: definition.id,
    prompt: definition.title,
    answer: normalizeProfilePromptAnswer(answer),
  );
}

PhotoPromptAnswer photoPromptAnswerFor({
  required int photoIndex,
  required PhotoPromptDefinition definition,
  String caption = '',
}) {
  return PhotoPromptAnswer(
    photoIndex: photoIndex,
    promptId: definition.id,
    prompt: definition.title,
    caption: normalizePhotoPromptCaption(caption),
  );
}

List<ProfilePromptAnswer> normalizeProfilePromptAnswers(
  Iterable<ProfilePromptAnswer> answers, {
  String? legacyBio,
}) {
  final orderedPromptIds = <String>[];
  final byPromptId = <String, ProfilePromptAnswer>{};

  for (final answer in answers) {
    final promptId = answer.promptId.trim();
    if (promptId.isEmpty) continue;
    final normalizedAnswer = normalizeProfilePromptAnswer(answer.answer);
    if (normalizedAnswer.isEmpty) continue;
    final definition = profilePromptDefinition(promptId);
    if (!byPromptId.containsKey(promptId)) orderedPromptIds.add(promptId);
    byPromptId[promptId] = answer.copyWith(
      promptId: promptId,
      prompt: definition.title,
      answer: normalizedAnswer,
    );
  }

  if (byPromptId.isEmpty) {
    final migratedBio = normalizeProfilePromptAnswer(legacyBio ?? '');
    if (migratedBio.isNotEmpty) {
      final definition = profilePromptDefinition(profilePromptPerfectEventId);
      orderedPromptIds.add(definition.id);
      byPromptId[definition.id] = profilePromptAnswerFor(
        definition: definition,
        answer: migratedBio,
      );
    }
  }

  final ordered = <ProfilePromptAnswer>[
    for (final promptId in orderedPromptIds)
      if (byPromptId.containsKey(promptId)) byPromptId[promptId]!,
  ];
  return ordered.take(maxProfilePromptAnswers).toList(growable: false);
}

List<PhotoPromptAnswer> normalizePhotoPromptAnswers(
  Iterable<PhotoPromptAnswer> answers,
) {
  final byPhotoIndex = <int, PhotoPromptAnswer>{};

  for (final answer in answers) {
    final index = answer.photoIndex;
    if (index < 0 || index >= maxPhotoPromptCaptions) continue;
    final normalizedCaption = normalizePhotoPromptCaption(answer.caption);
    final definition = photoPromptDefinition(answer.promptId.trim());
    byPhotoIndex[index] = answer.copyWith(
      photoIndex: index,
      promptId: definition.id,
      prompt: definition.title,
      caption: normalizedCaption,
    );
  }

  final ordered = byPhotoIndex.values.toList(growable: false)
    ..sort((a, b) => a.photoIndex.compareTo(b.photoIndex));
  final usedPromptIds = <String>{};
  return [
    for (final answer in ordered)
      if (usedPromptIds.add(answer.promptId)) answer,
  ];
}

List<Map<String, dynamic>> profilePromptsToJson(
  Iterable<ProfilePromptAnswer> answers,
) {
  return normalizeProfilePromptAnswers(
    answers,
  ).map((answer) => answer.toJson()).toList(growable: false);
}

List<Map<String, dynamic>> photoPromptsToJson(
  Iterable<PhotoPromptAnswer> answers,
) {
  return normalizePhotoPromptAnswers(
    answers,
  ).map(photoPromptSelectionToJson).toList(growable: false);
}

Map<String, dynamic> photoPromptSelectionToJson(PhotoPromptAnswer answer) {
  final normalizedCaption = normalizePhotoPromptCaption(answer.caption);
  return <String, dynamic>{
    'photoIndex': answer.photoIndex,
    'promptId': answer.promptId,
    'prompt': answer.displayPrompt,
    if (normalizedCaption.isNotEmpty) 'caption': normalizedCaption,
  };
}

ProfilePromptAnswer? profilePromptById(
  Iterable<ProfilePromptAnswer> answers,
  String promptId,
) {
  for (final answer in normalizeProfilePromptAnswers(answers)) {
    if (answer.promptId == promptId) return answer;
  }
  return null;
}

PhotoPromptAnswer? photoPromptByIndex(
  Iterable<PhotoPromptAnswer> answers,
  int photoIndex,
) {
  for (final answer in normalizePhotoPromptAnswers(answers)) {
    if (answer.photoIndex == photoIndex) return answer;
  }
  return null;
}

List<ProfilePromptAnswer> replaceProfilePromptAnswer({
  required Iterable<ProfilePromptAnswer> current,
  required ProfilePromptDefinition definition,
  required String answer,
}) {
  final byPromptId = {
    for (final prompt in normalizeProfilePromptAnswers(current))
      prompt.promptId: prompt,
  };
  final normalized = normalizeProfilePromptAnswer(answer);
  if (normalized.isEmpty) {
    byPromptId.remove(definition.id);
  } else {
    byPromptId[definition.id] = profilePromptAnswerFor(
      definition: definition,
      answer: normalized,
    );
  }
  return normalizeProfilePromptAnswers(byPromptId.values);
}

List<ProfilePromptAnswer> replaceProfilePromptAnswerAtIndex({
  required Iterable<ProfilePromptAnswer> current,
  required int index,
  required ProfilePromptDefinition definition,
  required String answer,
}) {
  RangeError.checkValueInInterval(
    index,
    0,
    maxProfilePromptAnswers - 1,
    'index',
  );
  final prompts = normalizeProfilePromptAnswers(current).toList();
  if (index < prompts.length) {
    prompts.removeAt(index);
  }
  prompts.removeWhere((prompt) => prompt.promptId == definition.id);
  final normalized = normalizeProfilePromptAnswer(answer);
  if (normalized.isNotEmpty) {
    final insertionIndex = index > prompts.length ? prompts.length : index;
    prompts.insert(
      insertionIndex,
      profilePromptAnswerFor(definition: definition, answer: normalized),
    );
  }
  return normalizeProfilePromptAnswers(prompts);
}

List<PhotoPromptAnswer> replacePhotoPromptAnswer({
  required Iterable<PhotoPromptAnswer> current,
  required int photoIndex,
  required PhotoPromptDefinition definition,
  String caption = '',
}) {
  final normalized = normalizePhotoPromptCaption(caption);
  final normalizedAnswer = photoPromptAnswerFor(
    photoIndex: photoIndex,
    definition: definition,
    caption: normalized,
  );
  final byPhotoIndex = {
    for (final prompt in normalizePhotoPromptAnswers(current))
      if (prompt.promptId != normalizedAnswer.promptId)
        prompt.photoIndex: prompt,
  };
  byPhotoIndex[photoIndex] = normalizedAnswer;
  return normalizePhotoPromptAnswers(byPhotoIndex.values);
}

String normalizeProfilePromptAnswer(String value) =>
    collapseStackedPromptBlankLines(value).trim();

String normalizePhotoPromptCaption(String value) =>
    collapseStackedPromptBlankLines(value).trim();
