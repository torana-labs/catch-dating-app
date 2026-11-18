import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_photo_models.dart';

/// An album page shows at most this many photos, as the callable did.
const programPhotosShown = 60;

/// The photo records of a programme, newest first, ties by photo id.
List<Map<Object?, Object?>> _newestFirst(List<Map<Object?, Object?>> rows) =>
    [...rows]..sort((a, b) {
      final byTime = (b['createdAtMillis']! as int).compareTo(
        a['createdAtMillis']! as int,
      );
      return byTime != 0
          ? byTime
          : (a['photoId']! as String).compareTo(b['photoId']! as String);
    });

List<Map<Object?, Object?>> _album(
  List<Map<Object?, Object?>> sorted,
  String? functionId,
) => [
  for (final row in sorted)
    if (row['status'] == 'visible' && row['functionId'] == functionId) row,
];

/// The photos a screen showing [functionId] (or every photo) needs signed
/// URLs for: the cover of each album and the photos listed.
List<String> programPhotoIdsToSign(
  List<Map<Object?, Object?>> rows,
  List<ProgramFunction> functions,
  String? functionId,
) {
  final sorted = _newestFirst(rows);
  final ids = <String>{};
  for (final function in [
    for (final f in functions)
      if (f.status != ProgramFunctionStatus.cancelled) f,
  ]) {
    final first = _album(sorted, function.functionId).firstOrNull;
    if (first != null) ids.add(first['photoId']! as String);
  }
  final unfiled = _album(sorted, null).firstOrNull;
  if (unfiled != null) ids.add(unfiled['photoId']! as String);
  for (final row in _shown(sorted, functionId)) {
    ids.add(row['photoId']! as String);
  }
  return ids.toList(growable: false);
}

List<Map<Object?, Object?>> _shown(
  List<Map<Object?, Object?>> sorted,
  String? functionId,
) =>
    (functionId == null
            ? sorted
            : [
                for (final row in sorted)
                  if (row['functionId'] == functionId) row,
              ])
        .take(programPhotosShown)
        .toList(growable: false);

/// What `listProgramPhotos` returned, from the `programPhotos` rows the
/// account lists, the programme's functions and the URLs the server signed
/// for them ([urls] by photo id, [coverUrl] for the programme cover).
ProgramPhotos programPhotosFromViews({
  required String programId,
  required String? functionId,
  required List<Map<Object?, Object?>> rows,
  required List<ProgramFunction> functions,
  required Map<String, String> urls,
  required String? coverUrl,
}) {
  final sorted = _newestFirst(rows);
  final ordered = [
    for (final f in functions)
      if (f.status != ProgramFunctionStatus.cancelled) f,
  ]..sort((a, b) => a.startsAt.compareTo(b.startsAt));
  ProgramPhotoAlbum album(String? id, String? name, DateTime? startsAt) {
    final photos = _album(sorted, id);
    return ProgramPhotoAlbum(
      functionId: id,
      name: name,
      startsAt: startsAt,
      photoCount: photos.length,
      coverUrl: photos.isEmpty ? null : urls[photos.first['photoId']],
    );
  }

  final unfiled = _album(sorted, null);
  return ProgramPhotos(
    programId: programId,
    functionId: functionId,
    coverUrl: coverUrl,
    albums: [
      for (final f in ordered) album(f.functionId, f.name, f.startsAt),
      if (unfiled.isNotEmpty) album(null, null, null),
    ],
    photos: [
      for (final row in _shown(sorted, functionId))
        ProgramPhoto(
          photoId: row['photoId']! as String,
          functionId: row['functionId'] as String?,
          caption: row['caption'] as String?,
          status: ProgramPhotoStatus.values.byName(row['status']! as String),
          url: urls[row['photoId']],
          revision: row['revision']! as int,
        ),
    ],
  );
}
