part of 'program_work_repository.dart';

/// Programme photos: the add/change command, the signed read URLs and the
/// albums per function and guest page cover built from the live `programPhotos`
/// rows (image links expire within minutes, so an offline album shows
/// placeholders).
extension ProgramPhotosRepositoryApi on ProgramWorkRepository {
  /// The short-lived read URLs of [photoIds] (and the programme cover when
  /// asked): the one thing a phone cannot make from the `programPhotos` rows
  /// it lists. The server signs only this programme's own files.
  Future<({Map<String, String> urls, String? coverUrl})> signPhotoUrls({
    required String programId,
    required List<String> photoIds,
    bool includeCover = false,
  }) => _call(
    name: 'signProgramPhotoUrls',
    authorityScopedRead: true,
    payload: SignProgramPhotoUrlsCallableRequest(
      programId: programId,
      photoIds: photoIds,
      includeCover: includeCover,
    ).toJson(),
    action: 'load the photos',
    parse: (data) {
      final map = requiredMap(data, 'photo urls');
      return (
        urls: {
          for (final row in mapList(map['urls'], 'urls'))
            requiredString(row, 'photoId'): requiredString(row, 'url'),
        },
        coverUrl: map['coverUrl'] as String?,
      );
    },
  );

  /// Adds the uploaded photo [photoId] (revision 0) or changes its album
  /// or visibility, fenced by [expectedRevision].
  Future<int> upsertPhoto({
    required String programId,
    required String photoId,
    required int expectedRevision,
    required String requestId,
    String? functionId,
    ProgramPhotoStatus? status,
  }) => _call(
    name: 'upsertProgramPhoto',
    payload: UpsertProgramPhotoCallableRequest(
      programId: programId,
      photoId: photoId,
      functionId: functionId,
      status: status?.name,
      expectedRevision: expectedRevision,
      requestId: requestId,
    ).toJson(),
    action: 'save the photo',
    parse: (data) => requiredInt(requiredMap(data, 'photo'), 'revision'),
  );
}

/// One album (or every photo), live from `programPhotos` (#1339). The
/// album names come from the programme's function labels, which the
/// communications duty reads whatever its work list reaches (#2175); the
/// signed URLs from the server, in calls of at most 60 photos.
@riverpod
Future<ProgramReadView<ProgramPhotos>> programPhotosView(
  Ref ref,
  String programId,
  String? functionId,
) async {
  final rows = await ref.watch(
    programPhotoRowsStreamProvider(programId).future,
  );
  final functions = await ref.watch(
    programPhotoFunctionsStreamProvider(programId).future,
  );
  final ids = programPhotoIdsToSign(rows, functions, functionId);
  final repository = ref.read(programWorkRepositoryProvider);
  final urls = <String, String>{};
  String? coverUrl;
  for (var start = 0; start == 0 || start < ids.length; start += 60) {
    final signed = await repository.signPhotoUrls(
      programId: programId,
      photoIds: ids.sublist(start, min(start + 60, ids.length)),
      includeCover: start == 0,
    );
    urls.addAll(signed.urls);
    coverUrl ??= signed.coverUrl;
  }
  return (
    value: programPhotosFromViews(
      programId: programId,
      functionId: functionId,
      rows: rows,
      functions: functions,
      urls: urls,
      coverUrl: coverUrl,
    ),
    snapshotAt: null,
    snapshotExpiresAt: null,
  );
}
