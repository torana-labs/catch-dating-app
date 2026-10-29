import 'package:catch_dating_app/contexts/profiles/domain/image_upload_job.dart';

class PhotoUploadState {
  const PhotoUploadState({this.jobs = const {}, this.uploadError});

  factory PhotoUploadState.fromLegacy({
    Set<int> loadingIndices = const {},
    Object? uploadError,
  }) {
    return PhotoUploadState(
      jobs: {
        for (final index in loadingIndices)
          index: const ImageUploadJobState(
            stage: ImageUploadJobStage.uploading,
          ),
      },
      uploadError: uploadError,
    );
  }

  final Map<int, ImageUploadJobState> jobs;
  final Object? uploadError;

  Set<int> get loadingIndices => {
    for (final entry in jobs.entries)
      if (entry.value.isActive) entry.key,
  };

  ImageUploadJobState? jobFor(int index) => jobs[index];

  PhotoUploadState withJob(int index, ImageUploadJobState job) =>
      PhotoUploadState(jobs: {...jobs, index: job}, uploadError: job.error);
}
