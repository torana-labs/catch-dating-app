import 'package:catch_dating_app/contexts/profiles/domain/profile_photo_policy.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'profile_photo.freezed.dart';
part 'profile_photo.g.dart';

@freezed
abstract class ProfilePhoto with _$ProfilePhoto {
  const ProfilePhoto._();

  const factory ProfilePhoto({
    required String id,
    required String url,
    required String thumbnailUrl,
    required String storagePath,
    required String thumbnailStoragePath,
    required int position,
    @TimestampConverter() required DateTime createdAt,
    @TimestampConverter() required DateTime updatedAt,
    PhotoPromptAnswer? prompt,
    ProfilePhotoModeration? moderation,
  }) = _ProfilePhoto;

  factory ProfilePhoto.uploaded({
    required int position,
    required String url,
    required String storagePath,
    required DateTime now,
    PhotoPromptAnswer? prompt,
  }) {
    return ProfilePhoto(
      id: profilePhotoIdForStoragePath(storagePath, position),
      url: url,
      thumbnailUrl: url,
      storagePath: storagePath,
      thumbnailStoragePath: thumbnailStoragePathForStoragePath(storagePath),
      prompt: prompt,
      moderation: const ProfilePhotoModeration(status: 'pending'),
      position: position,
      createdAt: now,
      updatedAt: now,
    );
  }

  @override
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'url': url,
    'thumbnailUrl': thumbnailUrl,
    'storagePath': storagePath,
    'thumbnailStoragePath': thumbnailStoragePath,
    if (prompt != null) 'prompt': photoPromptSelectionToJson(prompt!),
    if (moderation != null) 'moderation': moderation!.toJson(),
    'position': position,
    'createdAt': const TimestampConverter().toJson(createdAt),
    'updatedAt': const TimestampConverter().toJson(updatedAt),
  };

  factory ProfilePhoto.fromJson(Map<String, dynamic> json) =>
      _$ProfilePhotoFromJson(json);
}

@freezed
abstract class ProfilePhotoModeration with _$ProfilePhotoModeration {
  const ProfilePhotoModeration._();

  const factory ProfilePhotoModeration({
    required String status,
    String? reason,
    @NullableTimestampConverter() DateTime? reviewedAt,
  }) = _ProfilePhotoModeration;

  factory ProfilePhotoModeration.fromJson(Map<String, dynamic> json) =>
      _$ProfilePhotoModerationFromJson(json);
}

List<ProfilePhoto> normalizeProfilePhotos(Iterable<ProfilePhoto> photos) {
  final byId = <String, ProfilePhoto>{};
  for (final photo in photos) {
    final url = photo.url.trim();
    if (url.isEmpty) continue;
    final thumbnailUrl = photo.thumbnailUrl.trim().isNotEmpty
        ? photo.thumbnailUrl.trim()
        : url;
    final storagePath = photo.storagePath.trim();
    final thumbnailStoragePath = photo.thumbnailStoragePath.trim().isNotEmpty
        ? photo.thumbnailStoragePath.trim()
        : thumbnailStoragePathForStoragePath(storagePath);
    if (storagePath.isEmpty || thumbnailStoragePath.isEmpty) continue;

    final position = photo.position.clamp(0, maximumProfilePhotoCount - 1);
    final normalized = photo.copyWith(
      id: photo.id.trim().isNotEmpty
          ? photo.id.trim()
          : profilePhotoIdForStoragePath(storagePath, photo.position),
      url: url,
      thumbnailUrl: thumbnailUrl,
      storagePath: storagePath,
      thumbnailStoragePath: thumbnailStoragePath,
      prompt: _normalizeEmbeddedPhotoPrompt(photo.prompt, position),
      position: position,
    );
    byId[normalized.id] = normalized;
  }

  final ordered = byId.values.toList(growable: false)
    ..sort((a, b) => a.position.compareTo(b.position));
  return ensureUniquePhotoPrompts(
    ordered.take(maximumProfilePhotoCount),
  ).toList(growable: false);
}

List<ProfilePhoto> ensureUniquePhotoPrompts(
  Iterable<ProfilePhoto> photos, {
  int? preferredPosition,
}) {
  final ordered = photos.toList(growable: false)
    ..sort((a, b) => a.position.compareTo(b.position));
  final usedPromptIds = <String>{};

  final preferredPrompt = preferredPosition == null
      ? null
      : ordered
            .where((photo) => photo.position == preferredPosition)
            .firstOrNull
            ?.prompt;
  if (preferredPrompt != null) usedPromptIds.add(preferredPrompt.promptId);

  return [
    for (final photo in ordered)
      if (photo.position == preferredPosition)
        photo
      else if (photo.prompt == null)
        photo
      else if (usedPromptIds.add(photo.prompt!.promptId))
        photo
      else
        photo.copyWith(prompt: null),
  ];
}

PhotoPromptAnswer? _normalizeEmbeddedPhotoPrompt(
  PhotoPromptAnswer? prompt,
  int position,
) {
  if (prompt == null) return null;
  final promptId = prompt.promptId.trim();
  final storedPrompt = prompt.prompt.trim();
  return PhotoPromptAnswer(
    photoIndex: position,
    promptId: promptId,
    prompt: photoPromptTitle(
      promptId,
      fallback: storedPrompt.isEmpty ? null : storedPrompt,
    ),
    caption: normalizePhotoPromptCaption(prompt.caption),
  );
}

List<ProfilePhoto> compactProfilePhotoPositions(
  Iterable<ProfilePhoto> photos, {
  DateTime? updatedAt,
}) {
  final ordered = normalizeProfilePhotos(photos);
  return [
    for (final indexedPhoto in ordered.indexed)
      _copyProfilePhotoToPosition(
        indexedPhoto.$2,
        indexedPhoto.$1,
        updatedAt: updatedAt,
      ),
  ];
}

List<ProfilePhoto> replaceProfilePhotoAtPosition({
  required Iterable<ProfilePhoto> profilePhotos,
  required int position,
  required ProfilePhoto photo,
  required DateTime updatedAt,
}) {
  RangeError.checkValueInInterval(
    position,
    0,
    maximumProfilePhotoCount - 1,
    'position',
  );
  final next = <ProfilePhoto>[
    for (final existing in normalizeProfilePhotos(profilePhotos))
      if (existing.position != position) existing,
    _copyProfilePhotoToPosition(photo, position, updatedAt: updatedAt),
  ]..sort((a, b) => a.position.compareTo(b.position));
  return compactProfilePhotoPositions(next, updatedAt: updatedAt);
}

List<ProfilePhoto> removeProfilePhotoAtPosition({
  required Iterable<ProfilePhoto> profilePhotos,
  required int position,
  required DateTime updatedAt,
}) {
  RangeError.checkValueInInterval(
    position,
    0,
    maximumProfilePhotoCount - 1,
    'position',
  );
  return compactProfilePhotoPositions([
    for (final photo in compactProfilePhotoPositions(
      profilePhotos,
      updatedAt: updatedAt,
    ))
      if (photo.position != position) photo,
  ], updatedAt: updatedAt);
}

List<ProfilePhoto> reorderProfilePhoto({
  required Iterable<ProfilePhoto> profilePhotos,
  required int fromPosition,
  required int toPosition,
  required DateTime updatedAt,
}) {
  RangeError.checkValueInInterval(
    fromPosition,
    0,
    maximumProfilePhotoCount - 1,
    'fromPosition',
  );
  RangeError.checkValueInInterval(
    toPosition,
    0,
    maximumProfilePhotoCount - 1,
    'toPosition',
  );
  final photos = compactProfilePhotoPositions(profilePhotos);
  if (fromPosition == toPosition ||
      fromPosition >= photos.length ||
      toPosition >= photos.length) {
    return photos;
  }
  final moved = photos.removeAt(fromPosition);
  photos.insert(toPosition, moved);
  return [
    for (final indexedPhoto in photos.indexed)
      _copyProfilePhotoToPosition(
        indexedPhoto.$2,
        indexedPhoto.$1,
        updatedAt: updatedAt,
      ),
  ];
}

ProfilePhoto _copyProfilePhotoToPosition(
  ProfilePhoto photo,
  int position, {
  DateTime? updatedAt,
}) {
  final prompt = photo.prompt?.copyWith(photoIndex: position);
  final changed = photo.position != position || photo.prompt != prompt;
  return photo.copyWith(
    position: position,
    prompt: prompt,
    updatedAt: changed && updatedAt != null ? updatedAt : photo.updatedAt,
  );
}

List<Map<String, dynamic>> profilePhotosToJson(Iterable<ProfilePhoto> photos) =>
    normalizeProfilePhotos(
      photos,
    ).map((photo) => photo.toJson()).toList(growable: false);

ProfilePhoto replaceProfilePhotoPrompt({
  required ProfilePhoto photo,
  required PhotoPromptDefinition definition,
  required DateTime updatedAt,
  String caption = '',
}) {
  final normalizedCaption = normalizePhotoPromptCaption(caption);
  return photo.copyWith(
    prompt: photoPromptAnswerFor(
      photoIndex: photo.position,
      definition: definition,
      caption: normalizedCaption,
    ),
    updatedAt: updatedAt,
  );
}

List<ProfilePhoto> replaceProfilePhotoPromptAtPosition({
  required Iterable<ProfilePhoto> profilePhotos,
  required int position,
  required PhotoPromptAnswer? prompt,
  required DateTime updatedAt,
}) {
  RangeError.checkValueInInterval(
    position,
    0,
    maximumProfilePhotoCount - 1,
    'position',
  );
  final updated = [
    for (final photo in normalizeProfilePhotos(profilePhotos))
      if (photo.position == position)
        photo.copyWith(
          prompt: prompt?.copyWith(photoIndex: position),
          updatedAt: updatedAt,
        )
      else
        photo,
  ];
  return ensureUniquePhotoPrompts(
    updated,
    preferredPosition: position,
  ).toList(growable: false);
}

String thumbnailStoragePathForStoragePath(String storagePath) {
  final parts = storagePath.split('/');
  if (parts.length >= 4 && parts[0] == 'users' && parts[2] == 'photos') {
    final uid = parts[1];
    final sourceName = _stripExtension(parts.last);
    return 'users/$uid/photoThumbnails/$sourceName.jpg';
  }
  return '$storagePath.thumbnail.jpg';
}

String profilePhotoIdForStoragePath(String storagePath, int position) {
  final sourceName = _stripExtension(storagePath.split('/').last);
  final normalized = sourceName
      .replaceAll(RegExp(r'[^A-Za-z0-9_-]+'), '_')
      .replaceAll(RegExp(r'_+'), '_')
      .replaceAll(RegExp(r'^_|_$'), '');
  return normalized.isNotEmpty ? normalized : 'photo_$position';
}

String _stripExtension(String fileName) {
  final dot = fileName.lastIndexOf('.');
  return dot <= 0 ? fileName : fileName.substring(0, dot);
}
