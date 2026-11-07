import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// A guest review as a system list row: the reviewer (or "A guest" when
/// anonymous), the stars, what they wrote and, for a review from a Catch
/// booking, "Booked on Catch" in the success tone.
class HostEventReviewRow extends StatelessWidget {
  const HostEventReviewRow({
    super.key,
    required this.name,
    required this.rating,
    required this.comment,
    this.anonymous = false,
    this.bookedOnCatch = false,
    this.onTap,
  });

  final String name;

  /// Stars out of five.
  final int rating;
  final String comment;
  final bool anonymous;
  final bool bookedOnCatch;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final stars = rating.clamp(0, 5);
    final text = comment.trim();
    final title = anonymous ? l10n.hostEventReportReviewAnonymous : name;
    return CatchIndexRow(
      title: title,
      onTap: onTap,
      status: '${'★' * stars}${'☆' * (5 - stars)}',
      semanticLabel: l10n.hostEventReportReviewSemantics(
        name: title,
        rating: stars,
      ),
      body: text.isEmpty ? null : text,
      meta: bookedOnCatch ? l10n.hostEventReportReviewBookedOnCatch : null,
      metaTone: bookedOnCatch
          ? CatchIndexRowTone.success
          : CatchIndexRowTone.neutral,
      density: CatchIndexRowSize.roomy,
    );
  }
}
