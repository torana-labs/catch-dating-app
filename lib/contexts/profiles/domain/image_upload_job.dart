enum ImageUploadJobStage {
  queued,
  picking,
  preparing,
  uploading,
  attaching,
  complete,
  failed,
  cancelled,
}

extension ImageUploadJobStageState on ImageUploadJobStage {
  bool get isActive =>
      this == ImageUploadJobStage.queued ||
      this == ImageUploadJobStage.picking ||
      this == ImageUploadJobStage.preparing ||
      this == ImageUploadJobStage.uploading ||
      this == ImageUploadJobStage.attaching;
}

class ImageUploadProgress {
  const ImageUploadProgress({required this.stage, required this.fraction});

  final ImageUploadJobStage stage;
  final double fraction;
}

class ImageUploadJobState {
  const ImageUploadJobState({
    required this.stage,
    this.progress = 0,
    this.error,
  });

  const ImageUploadJobState.queued()
    : stage = ImageUploadJobStage.queued,
      progress = 0,
      error = null;

  final ImageUploadJobStage stage;
  final double progress;
  final Object? error;

  bool get isActive => stage.isActive;
  bool get canRetry => stage == ImageUploadJobStage.failed;

  ImageUploadJobState copyWith({
    ImageUploadJobStage? stage,
    double? progress,
    Object? error = _unset,
  }) {
    return ImageUploadJobState(
      stage: stage ?? this.stage,
      progress: (progress ?? this.progress).clamp(0, 1),
      error: identical(error, _unset) ? this.error : error,
    );
  }
}

class ImageUploadCancellationToken {
  bool _isCancellationRequested = false;
  Future<bool> Function()? _cancel;

  bool get isCancellationRequested => _isCancellationRequested;

  Future<void> bind(Future<bool> Function() cancel) async {
    _cancel = cancel;
    if (_isCancellationRequested) await cancel();
  }

  Future<bool> cancel() async {
    _isCancellationRequested = true;
    final cancel = _cancel;
    return cancel == null ? false : cancel();
  }
}

const Object _unset = Object();
