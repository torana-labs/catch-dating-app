part of 'program_work_repository.dart';

/// Programme photos: albums per function and the guest page cover, saved
/// for offline cold starts (image links expire within minutes, so an
/// offline album shows placeholders), and the add/change command.
extension ProgramPhotosRepositoryApi on ProgramWorkRepository {
  Future<ProgramPhotos> listPhotos({
    required String programId,
    String? functionId,
    String? snapshotAccountId,
  }) => _call(
    name: 'listProgramPhotos',
    authorityScopedRead: true,
    payload: ListProgramPhotosCallableRequest(
      programId: programId,
      functionId: functionId,
    ).toJson(),
    action: 'load the photos',
    parse: ProgramPhotos.fromCallableData,
    snapshotScope: programSnapshotScope('photos', programId, functionId),
    snapshotAccountId: snapshotAccountId,
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

/// One album (or every photo), from the live read or a bounded snapshot.
@riverpod
Future<ProgramReadView<ProgramPhotos>> programPhotosView(
  Ref ref,
  String programId,
  String? functionId,
) async {
  final accountId = _watchWorkAccount(ref);
  final result = await _readView(
    ref,
    accountId,
    programId,
    programSnapshotScope('photos', programId, functionId),
    () => ref
        .read(programWorkRepositoryProvider)
        .listPhotos(
          programId: programId,
          functionId: functionId,
          snapshotAccountId: accountId,
        ),
    ProgramPhotos.fromCallableData,
  );
  retainProgramProjection(
    ref,
    programProjectionDeadline(null, result.snapshotExpiresAt),
  );
  return result;
}
