import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/organizers/shared/organizer_placeholder_cover.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Shared club-cover resolver for editorial cards and detail heroes.
class OrganizerCover extends StatelessWidget {
  const OrganizerCover({
    super.key,
    required this.organizer,
    this.compact = false,
    this.semanticLabel,
  });

  final Organizer organizer;
  final bool compact;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final url = organizer.primaryOrganizerPhotoUrl?.trim();
    final fallback = OrganizerPlaceholderCover(organizer: organizer, compact: compact);
    if (url == null || url.isEmpty) return fallback;
    return CatchGradedImage(
      child: CatchNetworkImage(
        url,
        semanticLabel: semanticLabel,
        errorBuilder: (_, _, _) => fallback,
      ),
    );
  }
}
