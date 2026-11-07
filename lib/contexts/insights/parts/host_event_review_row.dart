import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// A guest review as a system list row: the reviewer, the stars, what they
/// wrote and, for a review from a Catch booking, "Booked on Catch" in the
/// success tone.
class HostEventReviewRow extends StatelessWidget {
  const HostEventReviewRow({super.key, required this.review, this.onTap});

  final Review review;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final stars = review.rating.clamp(0, 5);
    final comment = review.comment.trim();
    final booked = review.source == 'catchEvent';
    return CatchIndexRow(
      title: review.isAnonymous
          ? l10n.hostEventReportReviewAnonymous
          : review.reviewerName,
      onTap: onTap,
      status: '${'★' * stars}${'☆' * (5 - stars)}',
      semanticLabel: l10n.hostEventReportReviewSemantics(
        name: review.isAnonymous
            ? l10n.hostEventReportReviewAnonymous
            : review.reviewerName,
        rating: stars,
      ),
      body: comment.isEmpty ? null : comment,
      meta: booked ? l10n.hostEventReportReviewBookedOnCatch : null,
      metaTone: booked ? CatchIndexRowTone.success : CatchIndexRowTone.neutral,
      density: CatchIndexRowSize.roomy,
    );
  }
}
