import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_controller.dart';
import 'package:catch_dating_app/platform/media/ordered_photo_picker.dart';

class CreateEventPhotoDraftState {
  const CreateEventPhotoDraftState({
    required this.photos,
    required this.nextPhotoId,
    this.maxPhotos,
  });

  const CreateEventPhotoDraftState.empty({this.maxPhotos})
    : photos = const <CreateEventPhotoDraft>[],
      nextPhotoId = 0;

  factory CreateEventPhotoDraftState.fromPicked(
    List<PickedEventPhoto> picked, {
    int? maxPhotos,
  }) {
    return CreateEventPhotoDraftState.empty(
      maxPhotos: maxPhotos,
    ).addPicked(picked);
  }

  final List<CreateEventPhotoDraft> photos;
  final int nextPhotoId;
  final int? maxPhotos;

  int? get remainingSlots =>
      maxPhotos == null ? null : maxPhotos! - photos.length;

  bool get canPickMore => remainingSlots == null || remainingSlots! > 0;

  String get signature => photos.map((photo) => photo.id).join(',');

  List<PickedEventPhoto> get pickedPhotos => [
    for (final photo in photos) photo.photo,
  ];

  List<OrderedPhotoPreview> get previews => [
    for (final photo in photos) photo.preview,
  ];

  CreateEventPhotoDraftState addPicked(
    Iterable<PickedEventPhoto> picked, {
    int? maxPhotos,
  }) {
    final resolvedMaxPhotos = maxPhotos ?? this.maxPhotos;
    final slots = resolvedMaxPhotos == null
        ? null
        : resolvedMaxPhotos - photos.length;
    if (slots != null && slots <= 0) return this;

    var nextId = nextPhotoId;
    final added = [
      for (final photo in slots == null ? picked : picked.take(slots))
        CreateEventPhotoDraft(nextId++, photo),
    ];
    if (added.isEmpty) return this;

    return CreateEventPhotoDraftState(
      photos: [...photos, ...added],
      nextPhotoId: nextId,
      maxPhotos: resolvedMaxPhotos,
    );
  }

  CreateEventPhotoDraftState removeAt(int index) {
    if (index < 0 || index >= photos.length) return this;
    return CreateEventPhotoDraftState(
      photos: [...photos.take(index), ...photos.skip(index + 1)],
      nextPhotoId: nextPhotoId,
      maxPhotos: maxPhotos,
    );
  }

  CreateEventPhotoDraftState reorder(int fromIndex, int toIndex) {
    if (fromIndex == toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= photos.length ||
        toIndex >= photos.length) {
      return this;
    }
    final reordered = [...photos];
    final moved = reordered.removeAt(fromIndex);
    reordered.insert(toIndex, moved);
    return CreateEventPhotoDraftState(
      photos: reordered,
      nextPhotoId: nextPhotoId,
      maxPhotos: maxPhotos,
    );
  }
}

class CreateEventPhotoDraft {
  const CreateEventPhotoDraft(this.id, this.photo);

  final int id;
  final PickedEventPhoto photo;

  OrderedPhotoPreview get preview =>
      OrderedPhotoPreview(id: 'picked_event_$id', bytes: photo.bytes);
}
