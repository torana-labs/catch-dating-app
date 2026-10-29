part of 'ordered_photo_picker.dart';

extension _OrderedPhotoPickerActions on _OrderedPhotoPickerState {
  Future<void> _openManager(
    BuildContext context,
    List<OrderedPhotoPreview> photos,
  ) {
    return Navigator.of(context, rootNavigator: true).push<void>(
      MaterialPageRoute<void>(
        fullscreenDialog: true,
        builder: (_) => OrderedPhotoManagerScreen(
          photos: photos,
          onAddPhotos: widget.onAddPhotos,
          onRemovePhoto: widget.onRemovePhoto,
          onReorderPhoto: widget.onReorderPhoto,
          onRetryPhoto: widget.onRetryPhoto,
          onAddPhotosInManager: widget.onAddPhotosInManager,
          canAdd: widget.maxPhotos == null || photos.length < widget.maxPhotos!,
        ),
      ),
    );
  }
}

extension _OrderedPhotoManagerActions on _OrderedPhotoManagerScreenState {
  void _syncCallerPhotos() {
    final photos = widget.photosListenable?.value;
    if (!mounted || photos == null) return;
    _setLocalState(() => _photos = [...photos]);
  }

  bool get _canReorder => widget.onReorderPhoto != null && _photos.length > 1;

  void _move(int fromIndex, int toIndex) {
    if (fromIndex == toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= _photos.length ||
        toIndex >= _photos.length) {
      return;
    }
    _setLocalState(() {
      final moved = _photos.removeAt(fromIndex);
      _photos.insert(toIndex, moved);
    });
    widget.onReorderPhoto?.call(fromIndex, toIndex);
  }

  void _remove(int index) {
    if (index < 0 || index >= _photos.length) return;
    _setLocalState(() => _photos.removeAt(index));
    widget.onRemovePhoto?.call(index);
  }

  void _retry(int index) {
    if (index < 0 || index >= _photos.length || widget.onRetryPhoto == null) {
      return;
    }
    widget.onRetryPhoto!(index);
    _setLocalState(() {
      final photo = _photos[index];
      _photos[index] = OrderedPhotoPreview(
        id: photo.id,
        bytes: photo.bytes,
        imageUrl: photo.imageUrl,
        status: OrderedPhotoStatus.uploading,
        progress: photo.progress,
        error: photo.error,
      );
    });
  }

  Future<void> _addPhotos() async {
    if (_adding) return;
    final addInManager = widget.onAddPhotosInManager;
    if (addInManager == null) {
      Navigator.of(context).pop();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        widget.onAddPhotos?.call();
      });
      return;
    }
    _setLocalState(() => _adding = true);
    try {
      final added = await addInManager();
      if (mounted && added.isNotEmpty && widget.photosListenable == null) {
        _setLocalState(() => _photos.addAll(added));
      }
    } finally {
      if (mounted) _setLocalState(() => _adding = false);
    }
  }
}
