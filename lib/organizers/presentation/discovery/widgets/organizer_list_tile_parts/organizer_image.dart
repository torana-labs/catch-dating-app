part of '../organizer_list_tile.dart';

class OrganizerImage extends StatelessWidget {
  const OrganizerImage({
    super.key,
    required this.organizer,
    this.preferProfileImage = false,
    this.coverOnly = false,
    this.fallbackCompact = true,
  });

  final Organizer organizer;
  final bool preferProfileImage;
  final bool coverOnly;
  final bool fallbackCompact;

  @override
  Widget build(BuildContext context) {
    final String? imageUrl;
    if (coverOnly) {
      imageUrl = organizer.imageUrl;
    } else if (preferProfileImage) {
      imageUrl = organizer.profileImageUrl ?? organizer.imageUrl;
    } else {
      imageUrl = organizer.imageUrl ?? organizer.profileImageUrl;
    }

    final placeholder = OrganizerPlaceholderCover(
      organizer: organizer,
      compact: fallbackCompact,
    );

    if (imageUrl != null && imageUrl.isNotEmpty) {
      return CatchGradedImage(
        child: CatchNetworkImage(
          imageUrl,
          errorBuilder: (_, _, _) => placeholder,
        ),
      );
    }
    return placeholder;
  }
}
