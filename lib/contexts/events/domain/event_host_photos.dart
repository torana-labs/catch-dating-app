import 'package:meta/meta.dart';

/// Who is asking for an event's host photos.
///
/// `host` is an organizer owner or manager, who may add and remove photos;
/// `guest` is a guest who checked in; everyone else is `none` and sees no
/// photos.
enum EventHostPhotoAccess { host, guest, none }

/// One photo the event's host team shared with checked-in guests.
///
/// The image URLs are short-lived signed URLs; reload the album once
/// [EventHostPhotoAlbum.urlsExpireAt] has passed.
@immutable
class EventHostPhoto {
  const EventHostPhoto({
    required this.photoId,
    required this.thumbnailUrl,
    required this.displayUrl,
    required this.width,
    required this.height,
    required this.uploadedByUid,
    required this.createdAt,
  });

  factory EventHostPhoto.fromMap(Map<Object?, Object?> map) => EventHostPhoto(
    photoId: _string(map, 'photoId'),
    thumbnailUrl: _string(map, 'thumbnailUrl'),
    displayUrl: _string(map, 'displayUrl'),
    width: _int(map, 'width'),
    height: _int(map, 'height'),
    uploadedByUid: _string(map, 'uploadedByUid'),
    createdAt: DateTime.fromMillisecondsSinceEpoch(
      _int(map, 'createdAtMillis'),
    ),
  );

  final String photoId;
  final String thumbnailUrl;
  final String displayUrl;
  final int width;
  final int height;
  final String uploadedByUid;
  final DateTime createdAt;

  double get aspectRatio => height <= 0 ? 1 : width / height;

  @override
  bool operator ==(Object other) =>
      other is EventHostPhoto &&
      other.photoId == photoId &&
      other.thumbnailUrl == thumbnailUrl &&
      other.displayUrl == displayUrl &&
      other.width == width &&
      other.height == height &&
      other.uploadedByUid == uploadedByUid &&
      other.createdAt == createdAt;

  @override
  int get hashCode => Object.hash(
    photoId,
    thumbnailUrl,
    displayUrl,
    width,
    height,
    uploadedByUid,
    createdAt,
  );
}

/// The photos an event's host team shared, newest first.
@immutable
class EventHostPhotoAlbum {
  const EventHostPhotoAlbum({
    required this.eventId,
    required this.organizerName,
    required this.access,
    required this.maxPhotos,
    required this.photos,
    required this.urlsExpireAt,
  });

  const EventHostPhotoAlbum.empty(this.eventId)
    : organizerName = null,
      access = EventHostPhotoAccess.none,
      maxPhotos = 0,
      photos = const [],
      urlsExpireAt = null;

  factory EventHostPhotoAlbum.fromMap(Map<Object?, Object?> map) {
    final rawPhotos = map['photos'];
    if (rawPhotos is! List<Object?>) {
      throw const FormatException('Invalid host photos payload.');
    }
    final organizerName = map['organizerName'];
    return EventHostPhotoAlbum(
      eventId: _string(map, 'eventId'),
      organizerName: organizerName is String && organizerName.isNotEmpty
          ? organizerName
          : null,
      access: EventHostPhotoAccess.values.byName(_string(map, 'access')),
      maxPhotos: _int(map, 'maxPhotos'),
      photos: [
        for (final photo in rawPhotos) EventHostPhoto.fromMap(_map(photo)),
      ],
      urlsExpireAt: DateTime.fromMillisecondsSinceEpoch(
        _int(map, 'urlsExpireAtMillis'),
      ),
    );
  }

  final String eventId;
  final String? organizerName;
  final EventHostPhotoAccess access;
  final int maxPhotos;
  final List<EventHostPhoto> photos;
  final DateTime? urlsExpireAt;

  bool get canManage => access == EventHostPhotoAccess.host;
  bool get isEmpty => photos.isEmpty;
  int get remainingSlots =>
      (maxPhotos - photos.length).clamp(0, maxPhotos).toInt();

  EventHostPhotoAlbum copyWith({List<EventHostPhoto>? photos}) =>
      EventHostPhotoAlbum(
        eventId: eventId,
        organizerName: organizerName,
        access: access,
        maxPhotos: maxPhotos,
        photos: photos ?? this.photos,
        urlsExpireAt: urlsExpireAt,
      );
}

Map<Object?, Object?> _map(Object? value) {
  if (value is Map<Object?, Object?>) return value;
  throw const FormatException('Invalid host photo payload.');
}

String _string(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('Invalid host photo field "$key".');
}

int _int(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is int) return value;
  if (value is num && value == value.roundToDouble()) return value.toInt();
  throw FormatException('Invalid host photo field "$key".');
}
