import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

/// Whether a programme photo is shown in its album.
enum ProgramPhotoStatus { visible, hidden }

/// One function's album (or the photos filed under none).
class ProgramPhotoAlbum {
  const ProgramPhotoAlbum({
    required this.functionId,
    required this.name,
    required this.startsAt,
    required this.photoCount,
    required this.coverUrl,
  });

  factory ProgramPhotoAlbum.fromMap(Map<Object?, Object?> map) =>
      ProgramPhotoAlbum(
        functionId: map['functionId'] as String?,
        name: map['name'] as String?,
        startsAt: nullableDateTime(map['startsAtMillis']),
        photoCount: requiredInt(map, 'photoCount'),
        coverUrl: map['coverUrl'] as String?,
      );

  /// Null for photos filed under no function.
  final String? functionId;
  final String? name;
  final DateTime? startsAt;
  final int photoCount;

  /// Signed for a few minutes.
  final String? coverUrl;
}

/// One programme photo.
class ProgramPhoto {
  const ProgramPhoto({
    required this.photoId,
    required this.functionId,
    required this.caption,
    required this.status,
    required this.url,
    required this.revision,
  });

  factory ProgramPhoto.fromMap(Map<Object?, Object?> map) => ProgramPhoto(
    photoId: requiredString(map, 'photoId'),
    functionId: map['functionId'] as String?,
    caption: map['caption'] as String?,
    status: nullableEnum(map['status'], ProgramPhotoStatus.values)!,
    url: map['url'] as String?,
    revision: requiredInt(map, 'revision'),
  );

  final String photoId;
  final String? functionId;
  final String? caption;
  final ProgramPhotoStatus status;
  final String? url;
  final int revision;
}

/// `listProgramPhotos`: albums, one album's photos and the cover.
class ProgramPhotos {
  const ProgramPhotos({
    required this.programId,
    required this.functionId,
    required this.coverUrl,
    required this.albums,
    required this.photos,
  });

  factory ProgramPhotos.fromCallableData(Object? value) {
    final map = requiredMap(value, 'programme photos');
    return ProgramPhotos(
      programId: requiredString(map, 'programId'),
      functionId: map['functionId'] as String?,
      coverUrl: map['coverUrl'] as String?,
      albums: mapList(
        map['albums'],
        'albums',
      ).map(ProgramPhotoAlbum.fromMap).toList(growable: false),
      photos: mapList(
        map['photos'],
        'photos',
      ).map(ProgramPhoto.fromMap).toList(growable: false),
    );
  }

  final String programId;
  final String? functionId;
  final String? coverUrl;
  final List<ProgramPhotoAlbum> albums;
  final List<ProgramPhoto> photos;
}
