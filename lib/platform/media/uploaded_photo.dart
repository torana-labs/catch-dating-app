import 'package:cloud_firestore/cloud_firestore.dart';

class UploadedPhoto {
  const UploadedPhoto({
    required this.id,
    required this.url,
    required this.storagePath,
    required this.position,
    required this.createdAt,
    required this.updatedAt,
    this.thumbnailUrl,
    this.thumbnailStoragePath,
  });

  factory UploadedPhoto.fromJson(Map<String, dynamic> json) {
    return UploadedPhoto(
      id: json['id'] as String,
      url: json['url'] as String,
      storagePath: json['storagePath'] as String,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      thumbnailStoragePath: json['thumbnailStoragePath'] as String?,
      position: json['position'] as int,
      createdAt: _dateTimeFromJson(json['createdAt']),
      updatedAt: _dateTimeFromJson(json['updatedAt']),
    );
  }

  factory UploadedPhoto.fromUpload({
    required String url,
    required String storagePath,
    required int position,
    DateTime? now,
  }) {
    final createdAt = now ?? DateTime.now();
    return UploadedPhoto(
      id: _uploadedPhotoIdForStoragePath(storagePath, position),
      url: url,
      storagePath: storagePath,
      position: position,
      createdAt: createdAt,
      updatedAt: createdAt,
    );
  }

  final String id;
  final String url;
  final String storagePath;
  final String? thumbnailUrl;
  final String? thumbnailStoragePath;
  final int position;
  final DateTime createdAt;
  final DateTime updatedAt;

  String get thumbnailOrUrl {
    final thumbnail = thumbnailUrl?.trim();
    return thumbnail == null || thumbnail.isEmpty ? url : thumbnail;
  }

  UploadedPhoto copyWith({
    String? id,
    String? url,
    String? storagePath,
    Object? thumbnailUrl = _unset,
    Object? thumbnailStoragePath = _unset,
    int? position,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UploadedPhoto(
      id: id ?? this.id,
      url: url ?? this.url,
      storagePath: storagePath ?? this.storagePath,
      thumbnailUrl: identical(thumbnailUrl, _unset)
          ? this.thumbnailUrl
          : thumbnailUrl as String?,
      thumbnailStoragePath: identical(thumbnailStoragePath, _unset)
          ? this.thumbnailStoragePath
          : thumbnailStoragePath as String?,
      position: position ?? this.position,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, Object?> toJson() => {
    'id': id,
    'url': url,
    'storagePath': storagePath,
    'thumbnailUrl': thumbnailUrl,
    'thumbnailStoragePath': thumbnailStoragePath,
    'position': position,
    'createdAt': Timestamp.fromDate(createdAt),
    'updatedAt': Timestamp.fromDate(updatedAt),
  };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UploadedPhoto &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          url == other.url &&
          storagePath == other.storagePath &&
          thumbnailUrl == other.thumbnailUrl &&
          thumbnailStoragePath == other.thumbnailStoragePath &&
          position == other.position &&
          createdAt == other.createdAt &&
          updatedAt == other.updatedAt;

  @override
  int get hashCode => Object.hash(
    id,
    url,
    storagePath,
    thumbnailUrl,
    thumbnailStoragePath,
    position,
    createdAt,
    updatedAt,
  );
}

const Object _unset = Object();

DateTime _dateTimeFromJson(Object? value) {
  if (value is Timestamp) return value.toDate();
  if (value is DateTime) return value;
  if (value is String) return DateTime.parse(value);
  if (value is int) return DateTime.fromMillisecondsSinceEpoch(value);
  return DateTime.fromMillisecondsSinceEpoch(0);
}

String _uploadedPhotoIdForStoragePath(String storagePath, int position) {
  final segments = storagePath.split('/');
  var sourceName = segments.last.replaceFirst(RegExp(r'\.[^.]+$'), '');
  if (sourceName == 'original' && segments.length >= 2) {
    sourceName = segments[segments.length - 2];
  }
  final token = sourceName.replaceAll(RegExp(r'[^A-Za-z0-9_-]+'), '_');
  return token.isEmpty ? 'photo_$position' : token;
}
