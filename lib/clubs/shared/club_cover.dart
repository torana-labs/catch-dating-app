import 'package:catch_dating_app/clubs/shared/club_placeholder_cover.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Shared club-cover resolver for editorial cards and detail heroes.
class ClubCover extends StatelessWidget {
  const ClubCover({
    super.key,
    required this.club,
    this.compact = false,
    this.semanticLabel,
  });

  final Club club;
  final bool compact;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final url = club.primaryClubPhotoUrl?.trim();
    final fallback = ClubPlaceholderCover(club: club, compact: compact);
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
