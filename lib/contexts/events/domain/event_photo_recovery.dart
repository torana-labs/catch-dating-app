import 'dart:convert';

import 'package:catch_dating_app/core/cryptography/sha256_digest.dart';

enum EventPhotoRecoveryPhase {
  uploading,
  uploadFailed,
  awaitingAttachment,
  attachmentUnknown,
  cleanupPending,
  conflict,
  complete,
}

/// Durable identity of an already committed event, independent of a local draft.
class EventPhotoRecoveryScope {
  EventPhotoRecoveryScope({
    required this.accountId,
    required this.organizerId,
    required this.eventId,
  }) {
    if (![accountId, organizerId, eventId].every(_documentId.hasMatch)) {
      throw const FormatException('Invalid event photo recovery scope');
    }
  }

  final String accountId;
  final String organizerId;
  final String eventId;

  String get key => jsonEncode([organizerId, eventId]);

  @override
  bool operator ==(Object other) =>
      other is EventPhotoRecoveryScope &&
      accountId == other.accountId &&
      organizerId == other.organizerId &&
      eventId == other.eventId;

  @override
  int get hashCode => Object.hash(accountId, organizerId, eventId);
}

/// Only attachment metadata survives restart. Picker bytes and paths do not.
class EventPhotoRecoveryUpload {
  EventPhotoRecoveryUpload({
    required this.mediaId,
    required this.url,
    required this.storagePath,
    required this.position,
  }) {
    final uri = Uri.tryParse(url);
    if (!_mediaId.hasMatch(mediaId) ||
        uri == null ||
        uri.scheme != 'https' ||
        uri.host.isEmpty ||
        url.length > 2048 ||
        position < 0) {
      throw const FormatException('Invalid recovered event photo');
    }
  }

  factory EventPhotoRecoveryUpload.fromJson(Map<String, Object?> json) =>
      EventPhotoRecoveryUpload(
        mediaId: json['mediaId']! as String,
        url: json['url']! as String,
        storagePath: json['storagePath']! as String,
        position: json['position']! as int,
      );

  final String mediaId;
  final String url;
  final String storagePath;
  final int position;

  Map<String, Object?> toJson() => {
    'mediaId': mediaId,
    'url': url,
    'storagePath': storagePath,
    'position': position,
  };
}

/// Immutable request identity plus revision-fenced local progress. The server's
/// matching receipt, rather than a later event snapshot, resolves attachment.
class EventPhotoRecovery {
  EventPhotoRecovery({
    required this.scope,
    required this.requestId,
    required this.createdAtMillis,
    required this.expectedMediaHash,
    required Iterable<String> mediaIds,
    this.sourceDraftId,
    this.revision = 0,
    this.phase = EventPhotoRecoveryPhase.uploading,
    Iterable<EventPhotoRecoveryUpload> uploads = const [],
    Iterable<String> cleanupPaths = const [],
    Map<String, bool> abandonedUploads = const {},
    this.requiresReview = false,
    this.uploadingMediaId,
    this.uploadAttempt = 0,
  }) : mediaIds = List.unmodifiable(mediaIds),
       uploads = List.unmodifiable(uploads),
       cleanupPaths = List.unmodifiable(cleanupPaths),
       abandonedUploads = Map.unmodifiable(abandonedUploads) {
    _validate();
  }

  factory EventPhotoRecovery.fromJson(Map<String, Object?> json) =>
      EventPhotoRecovery(
        scope: EventPhotoRecoveryScope(
          accountId: json['accountId']! as String,
          organizerId: json['organizerId']! as String,
          eventId: json['eventId']! as String,
        ),
        requestId: json['clientOperationId']! as String,
        createdAtMillis: json['createdAtMillis']! as int,
        expectedMediaHash: json['expectedMediaHash']! as String,
        mediaIds: (json['mediaIds']! as List).cast<String>(),
        sourceDraftId: json['sourceDraftId'] as String?,
        revision: json['revision'] as int? ?? 0,
        phase: json['phase'] == null
            ? EventPhotoRecoveryPhase.uploading
            : EventPhotoRecoveryPhase.values.byName(json['phase']! as String),
        uploads: [
          for (final value in json['uploads'] as List? ?? const [])
            EventPhotoRecoveryUpload.fromJson(
              (value as Map).cast<String, Object?>(),
            ),
        ],
        cleanupPaths: (json['cleanupPaths'] as List? ?? const [])
            .cast<String>(),
        abandonedUploads: (json['abandonedUploads'] as Map? ?? const {})
            .cast<String, bool>(),
        requiresReview: json['status'] == 'needsReview',
        uploadingMediaId: json['uploadingMediaId'] as String?,
        uploadAttempt: json['uploadAttempt'] as int? ?? 0,
      );

  final EventPhotoRecoveryScope scope;
  final String requestId;
  final int createdAtMillis;
  final String expectedMediaHash;
  final List<String> mediaIds;
  final String? sourceDraftId;
  final int revision;
  final EventPhotoRecoveryPhase phase;
  final List<EventPhotoRecoveryUpload> uploads;
  final List<String> cleanupPaths;

  /// A lost uploader may finish after its execution lease. Absence alone does
  /// not settle these objects; only that uploader's terminal acknowledgement
  /// permits cleanup. Unknown obligations survive successful attachment too.
  final Map<String, bool> abandonedUploads;
  final bool requiresReview;
  final String? uploadingMediaId;
  final int uploadAttempt;

  bool get isResolved =>
      phase == EventPhotoRecoveryPhase.complete && abandonedUploads.isEmpty;

  // Retry bytes use fresh immutable object identities. An old compensation
  // request can finish after its lease; it must never delete a retry's bytes.
  String mediaIdAt(int index) => uploadAttempt == 0
      ? mediaIds[index]
      : eventPhotoRecoveryHash([
          requestId,
          mediaIds[index],
          uploadAttempt,
        ]).substring(0, 24);

  bool get attachmentAttempted => const {
    EventPhotoRecoveryPhase.attachmentUnknown,
    EventPhotoRecoveryPhase.conflict,
    EventPhotoRecoveryPhase.complete,
  }.contains(phase);

  String pathFor(String mediaId) =>
      'events/${scope.eventId}/media/$mediaId/original.jpg';

  Map<String, Object?> get intentJson => {
    'clientOperationId': requestId,
    'createdAtMillis': createdAtMillis,
    'accountId': scope.accountId,
    'organizerId': scope.organizerId,
    'eventId': scope.eventId,
    'expectedMediaHash': expectedMediaHash,
    'mediaIds': mediaIds,
    'sourceDraftId': sourceDraftId,
  };

  Map<String, Object?> toJson() => {
    ...intentJson,
    'revision': revision,
    'phase': phase.name,
    'uploads': [for (final photo in uploads) photo.toJson()],
    'cleanupPaths': cleanupPaths,
    'abandonedUploads': abandonedUploads,
    'uploadingMediaId': uploadingMediaId,
    'uploadAttempt': uploadAttempt,
  };

  EventPhotoRecovery next({
    EventPhotoRecoveryPhase? phase,
    Iterable<EventPhotoRecoveryUpload>? uploads,
    Iterable<String>? cleanupPaths,
    Map<String, bool>? abandonedUploads,
    String? uploadingMediaId,
    int? uploadAttempt,
  }) => EventPhotoRecovery(
    scope: scope,
    requestId: requestId,
    createdAtMillis: createdAtMillis,
    expectedMediaHash: expectedMediaHash,
    mediaIds: mediaIds,
    sourceDraftId: sourceDraftId,
    revision: revision + 1,
    phase: phase ?? this.phase,
    uploads: uploads ?? this.uploads,
    cleanupPaths: cleanupPaths ?? this.cleanupPaths,
    abandonedUploads: abandonedUploads ?? this.abandonedUploads,
    uploadingMediaId: uploadingMediaId,
    uploadAttempt: uploadAttempt ?? this.uploadAttempt,
  );

  void validateSuccessor(EventPhotoRecovery next) {
    final previousUploads = jsonEncode(uploads.map((p) => p.toJson()).toList());
    final nextUploads = jsonEncode(
      next.uploads.map((p) => p.toJson()).toList(),
    );
    final preservesUploadedPrefix =
        next.uploads.length >= uploads.length &&
        jsonEncode(
              next.uploads.take(uploads.length).map((p) => p.toJson()).toList(),
            ) ==
            previousUploads;
    final allowed = switch (phase) {
      EventPhotoRecoveryPhase.uploading => {
        EventPhotoRecoveryPhase.uploading,
        EventPhotoRecoveryPhase.awaitingAttachment,
        EventPhotoRecoveryPhase.cleanupPending,
        if (mediaIds.isEmpty) EventPhotoRecoveryPhase.complete,
      },
      EventPhotoRecoveryPhase.uploadFailed => {
        EventPhotoRecoveryPhase.uploadFailed,
        EventPhotoRecoveryPhase.uploading,
      },
      EventPhotoRecoveryPhase.awaitingAttachment => {
        EventPhotoRecoveryPhase.awaitingAttachment,
        EventPhotoRecoveryPhase.attachmentUnknown,
        EventPhotoRecoveryPhase.cleanupPending,
      },
      EventPhotoRecoveryPhase.cleanupPending => {
        EventPhotoRecoveryPhase.cleanupPending,
        EventPhotoRecoveryPhase.uploadFailed,
      },
      EventPhotoRecoveryPhase.attachmentUnknown => {
        EventPhotoRecoveryPhase.attachmentUnknown,
        EventPhotoRecoveryPhase.conflict,
        EventPhotoRecoveryPhase.complete,
      },
      EventPhotoRecoveryPhase.conflict => {
        EventPhotoRecoveryPhase.conflict,
        EventPhotoRecoveryPhase.attachmentUnknown,
      },
      EventPhotoRecoveryPhase.complete => {EventPhotoRecoveryPhase.complete},
    };
    if (jsonEncode(intentJson) != jsonEncode(next.intentJson) ||
        next.revision != revision + 1 ||
        next.uploadAttempt !=
            (phase == EventPhotoRecoveryPhase.uploadFailed &&
                    next.phase == EventPhotoRecoveryPhase.uploading
                ? uploadAttempt + 1
                : uploadAttempt) ||
        !allowed.contains(next.phase) ||
        (phase == EventPhotoRecoveryPhase.uploading &&
            !preservesUploadedPrefix) ||
        (phase != EventPhotoRecoveryPhase.uploading &&
            next.phase != EventPhotoRecoveryPhase.uploadFailed &&
            previousUploads != nextUploads) ||
        (phase == EventPhotoRecoveryPhase.cleanupPending &&
            !next.cleanupPaths.every(cleanupPaths.contains)) ||
        abandonedUploads.entries.any(
          (entry) => entry.value
              ? next.abandonedUploads[entry.key] == false
              : next.abandonedUploads[entry.key] == null,
        ) ||
        next.abandonedUploads.keys.any(
          (path) =>
              !abandonedUploads.containsKey(path) &&
              (phase != EventPhotoRecoveryPhase.uploading ||
                  next.phase != EventPhotoRecoveryPhase.cleanupPending ||
                  uploadingMediaId == null ||
                  path != pathFor(uploadingMediaId!) ||
                  next.abandonedUploads[path] != false),
        )) {
      throw const FormatException('Invalid event photo recovery transition');
    }
  }

  void _validate() {
    final allowedCleanupPaths = {
      for (var i = 0; i < mediaIds.length; i++) pathFor(mediaIdAt(i)),
    };
    final fullUpload = const {
      EventPhotoRecoveryPhase.awaitingAttachment,
      EventPhotoRecoveryPhase.attachmentUnknown,
      EventPhotoRecoveryPhase.conflict,
      EventPhotoRecoveryPhase.complete,
    }.contains(phase);
    if (!_mediaId.hasMatch(requestId) ||
        createdAtMillis <= 0 ||
        createdAtMillis > 9007199254740991 ||
        revision < 0 ||
        revision > 2147483647 ||
        uploadAttempt < 0 ||
        uploadAttempt > 2147483647 ||
        abandonedUploads.keys.any(
          (path) => !RegExp(
            '^events/${scope.eventId}/media/'
            r'[A-Za-z0-9][A-Za-z0-9_-]{7,119}/original\.jpg$',
          ).hasMatch(path),
        ) ||
        !_hash.hasMatch(expectedMediaHash) ||
        (sourceDraftId != null &&
            (sourceDraftId!.isEmpty || sourceDraftId!.length > 128)) ||
        mediaIds.any((id) => !_mediaId.hasMatch(id)) ||
        mediaIds.toSet().length != mediaIds.length ||
        uploads.length > mediaIds.length ||
        (fullUpload && uploads.length != mediaIds.length) ||
        (phase != EventPhotoRecoveryPhase.cleanupPending &&
            cleanupPaths.isNotEmpty) ||
        (phase == EventPhotoRecoveryPhase.uploadFailed && uploads.isNotEmpty) ||
        cleanupPaths.toSet().length != cleanupPaths.length ||
        (uploadingMediaId != null &&
            (phase != EventPhotoRecoveryPhase.uploading ||
                uploads.length == mediaIds.length ||
                uploadingMediaId != mediaIdAt(uploads.length))) ||
        cleanupPaths.any((p) => !allowedCleanupPaths.contains(p))) {
      throw const FormatException('Invalid event photo recovery receipt');
    }
    for (final (index, upload) in uploads.indexed) {
      if (upload.position != index ||
          upload.mediaId != mediaIdAt(index) ||
          upload.storagePath != pathFor(upload.mediaId)) {
        throw const FormatException('Recovered event photo identity changed');
      }
    }
  }
}

/// Stable local integrity token; caller maps canonical server media fields to
/// the same ordered value before constructing a revision-fenced media request.
String eventPhotoRecoveryHash(Object? value) => sha256Digest(jsonEncode(value));

String eventPhotoMediaHash(
  String? cover,
  Iterable<EventPhotoRecoveryUpload> photos,
) => eventPhotoRecoveryHash([
  cover,
  [
    for (final photo in photos)
      [photo.mediaId, photo.url, photo.storagePath, photo.position],
  ],
]);

final _documentId = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$');
final _mediaId = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{7,119}$');
final _hash = RegExp(r'^[a-f0-9]{64}$');
