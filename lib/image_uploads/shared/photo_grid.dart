import 'package:catch_dating_app/contexts/profiles/domain/profile_photo.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo_policy.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_grid_keys.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_slot_tile.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_reorderable_grid_view/entities/reorderable_animation_config.dart';
import 'package:flutter_reorderable_grid_view/widgets/widgets.dart';

/// Shared embedded layout contract for ready and loading profile photo grids.
///
/// The surrounding page owns system safe-area padding, so the nested grid must
/// not inherit [MediaQuery.padding] through [GridView]'s default behavior.
abstract final class ProfilePhotoGridLayout {
  static const EdgeInsets padding = EdgeInsets.zero;

  static const SliverGridDelegateWithFixedCrossAxisCount delegate =
      SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        mainAxisSpacing: CatchSpacing.s2,
        crossAxisSpacing: CatchSpacing.s2,
        childAspectRatio: CatchAspectRatio.portrait3x4,
      );
}

/// A 3×2 grid of photo slots for displaying and editing a user's profile photos.
///
/// Slots are filled densely: filled slots are tappable to replace, the next
/// empty slot shows a + icon and is tappable to add, remaining empty slots
/// are inactive.
class PhotoGrid extends StatefulWidget {
  const PhotoGrid({
    super.key,
    required this.profilePhotos,
    required this.onSlotTapped,
    this.loadingIndices = const {},
    this.onDeletePhoto,
    this.onReorderPhoto,
    this.canDeletePhotos = true,
    this.mainLabel = 'MAIN',
  });

  final List<ProfilePhoto> profilePhotos;
  final void Function(int index) onSlotTapped;
  final Set<int> loadingIndices;
  final void Function(int index)? onDeletePhoto;
  final void Function(int fromIndex, int toIndex)? onReorderPhoto;
  final bool canDeletePhotos;
  final String mainLabel;

  @override
  State<PhotoGrid> createState() => _PhotoGridState();
}

class _PhotoGridState extends State<PhotoGrid> {
  int? _draggedIndex;

  @override
  Widget build(BuildContext context) {
    final photos = normalizeProfilePhotos(widget.profilePhotos);
    final photosByPosition = {
      for (final photo in photos) photo.position: photo,
    };
    final canReorder =
        widget.onReorderPhoto != null &&
        widget.loadingIndices.isEmpty &&
        photos.length > 1;

    return ReorderableBuilder<int>.builder(
      itemCount: photos.length,
      animationConfig: const ReorderableAnimationConfig(
        enableAnimations: false,
      ),
      enableDraggable: canReorder,
      onDragStarted: (index) => _draggedIndex = index,
      onReorder: canReorder
          ? (reorderedListFunction) {
              final originalOrder = List<int>.generate(
                photos.length,
                (index) => index,
              );
              final reorderedOrder = reorderedListFunction(originalOrder);
              final fromIndex = _draggedIndex;
              _draggedIndex = null;
              if (fromIndex == null) return;
              final toIndex = reorderedOrder.indexOf(fromIndex);
              if (toIndex == -1 || toIndex == fromIndex) return;
              widget.onReorderPhoto!(fromIndex, toIndex);
            }
          : null,
      childBuilder: (itemBuilder) {
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: ProfilePhotoGridLayout.padding,
          gridDelegate: ProfilePhotoGridLayout.delegate,
          itemCount: maximumProfilePhotoCount,
          itemBuilder: (context, index) {
            final photo = photosByPosition[index];
            final isLoading = widget.loadingIndices.contains(index);
            final isActive = index <= photos.length;
            final slot = PhotoSlotTile(
              key: PhotoGridKeys.slot(index),
              index: index,
              url: photo?.url,
              prompt: photo?.prompt,
              badgeLabel:
                  photo != null && index == 0 && widget.mainLabel.isNotEmpty
                  ? widget.mainLabel
                  : null,
              isLoading: isLoading,
              isActive: isActive,
              onTap: () => widget.onSlotTapped(index),
              onDelete:
                  photo != null &&
                      widget.canDeletePhotos &&
                      widget.onDeletePhoto != null
                  ? () => widget.onDeletePhoto!(index)
                  : null,
            );
            if (photo == null) return slot;
            return itemBuilder(
              KeyedSubtree(
                key: ValueKey('profile_photo_${photo.storagePath}'),
                child: slot,
              ),
              index,
            );
          },
        );
      },
    );
  }
}
