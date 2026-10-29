import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

List<PublicProfile> publicProfilesFromCallableResponse(
  Object? data, {
  required String callableName,
}) {
  if (data case final Map<Object?, Object?> map) {
    final profiles = map['profiles'];
    if (profiles is List<Object?>) {
      return profiles
          .map((raw) {
            if (raw is! Map<Object?, Object?>) {
              throw StateError('$callableName response was malformed.');
            }
            return PublicProfile.fromJson(_publicProfileJson(raw));
          })
          .toList(growable: false);
    }
  }

  throw StateError('$callableName response was malformed.');
}

Map<String, dynamic> _publicProfileJson(Map<Object?, Object?> raw) {
  final profile = Map<String, dynamic>.from(raw);
  final photos = profile['profilePhotos'];
  if (photos is List<Object?>) {
    profile['profilePhotos'] = photos
        .map((photo) {
          if (photo is! Map<Object?, Object?>) return photo;
          final normalized = Map<String, dynamic>.from(photo);
          normalized['createdAt'] = _timestampFromCallableJson(
            normalized['createdAt'],
          );
          normalized['updatedAt'] = _timestampFromCallableJson(
            normalized['updatedAt'],
          );

          final moderation = normalized['moderation'];
          if (moderation is Map<Object?, Object?>) {
            final normalizedModeration = Map<String, dynamic>.from(moderation);
            normalizedModeration['reviewedAt'] = _timestampFromCallableJson(
              normalizedModeration['reviewedAt'],
            );
            normalized['moderation'] = normalizedModeration;
          }

          return normalized;
        })
        .toList(growable: false);
  }
  return profile;
}

Object? _timestampFromCallableJson(Object? value) {
  if (value == null || value is Timestamp) return value;
  if (value case final Map<Object?, Object?> map) {
    final seconds = map['_seconds'] ?? map['seconds'];
    final nanoseconds = map['_nanoseconds'] ?? map['nanoseconds'];
    if (seconds is num && nanoseconds is num) {
      return Timestamp(seconds.toInt(), nanoseconds.toInt());
    }
  }
  return value;
}
