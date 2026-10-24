import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/mutation_error_util.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/reviews/domain/review.dart';
import 'package:catch_dating_app/reviews/shared/review_keys.dart';
import 'package:catch_dating_app/reviews/shared/star_rating_row.dart';
import 'package:catch_dating_app/reviews/shared/write_review_controller.dart';
import 'package:catch_dating_app/reviews/shared/write_review_sheet.dart';
import 'package:catch_dating_app/user_profile/domain/user_profile.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum ReviewsEmptyPresentation { hidden, inline, contained, standalone }

/// Read-only club review aggregate.
///
/// Reviews are event-scoped, so club pages must never expose review creation.
class ClubReviewsSection extends StatelessWidget {
  const ClubReviewsSection({
    super.key,
    required this.reviews,
    required this.currentUid,
    this.maxVisibleReviews = 3,
  });

  final List<Review> reviews;
  final String? currentUid;
  final int maxVisibleReviews;

  @override
  Widget build(BuildContext context) {
    return ReviewsPreviewSection(
      reviews: reviews,
      currentUid: currentUid,
      maxVisibleReviews: maxVisibleReviews,
      emptyPresentation: ReviewsEmptyPresentation.contained,
      showHeader: false,
      emptyMessage:
          context.l10n.reviewsReviewsSectionMessageReviewsAppearAfterMembers,
    );
  }
}

/// Event-scoped reviews with write/edit CTA for attended attendees.
class EventReviewsSection extends StatelessWidget {
  const EventReviewsSection({
    super.key,
    required this.clubId,
    required this.eventId,
    required this.reviews,
    required this.currentUid,
    required this.userProfile,
    this.canWrite = false,
    this.canRespond = false,
  });

  final String clubId;
  final String eventId;
  final List<Review> reviews;
  final String? currentUid;
  final UserProfile? userProfile;

  final bool canWrite;
  final bool canRespond;

  @override
  Widget build(BuildContext context) {
    final canWriteEventReview = userProfile != null && canWrite;
    final existingReview = canWriteEventReview && currentUid != null
        ? reviews.where((r) => r.reviewerUserId == currentUid).firstOrNull
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ReviewsPreviewSection(
          reviews: reviews,
          currentUid: currentUid,
          showAllAction: reviews.length > 3,
          emptyPresentation: canWriteEventReview
              ? ReviewsEmptyPresentation.inline
              : ReviewsEmptyPresentation.hidden,
          showHeader: false,
          emptyMessage: context
              .l10n
              .reviewsReviewsSectionMessageBeTheFirstToReviewThisEvent,
          emptyAction: canWriteEventReview
              ? CatchButton.text(
                  key: ReviewKeys.writeReviewButton,
                  label: context.l10n.reviewsReviewsSectionLabelWriteAReview,
                  onPressed: () => showWriteReviewSheet(
                    context: context,
                    clubId: clubId,
                    eventId: eventId,
                    reviewer: userProfile!,
                    existingReview: existingReview,
                  ),
                )
              : null,
          onEditReview: canWriteEventReview
              ? (review) => showWriteReviewSheet(
                  context: context,
                  clubId: clubId,
                  eventId: eventId,
                  reviewer: userProfile!,
                  existingReview: review,
                )
              : null,
          onRespondToReview: canRespond
              ? (review) =>
                    showReviewResponseSheet(context: context, review: review)
              : null,
        ),

        // Review writes are event-scoped so one user can review each event once.
        if (canWriteEventReview && reviews.isNotEmpty) ...[
          gapH12,
          CatchButton(
            key: ReviewKeys.writeReviewButton,
            label: existingReview != null
                ? context.l10n.reviewsReviewsSectionLabelEditYourReview
                : context.l10n.reviewsReviewsSectionLabelWriteAReview,
            onPressed: () => showWriteReviewSheet(
              context: context,
              clubId: clubId,
              eventId: eventId,
              reviewer: userProfile!,
              existingReview: existingReview,
            ),
            variant: CatchButtonVariant.secondary,
            fullWidth: true,
          ),
        ],
      ],
    );
  }
}

class ReviewsPreviewSection extends StatelessWidget {
  const ReviewsPreviewSection({
    super.key,
    required this.reviews,
    required this.currentUid,
    this.maxVisibleReviews = 3,
    this.showAllAction = false,
    this.emptyPresentation = ReviewsEmptyPresentation.standalone,
    this.showHeader = true,
    this.emptyMessage,
    this.emptyAction,
    this.onEditReview,
    this.onRespondToReview,
  });

  final List<Review> reviews;
  final String? currentUid;
  final int maxVisibleReviews;
  final bool showAllAction;
  final ReviewsEmptyPresentation emptyPresentation;
  final bool showHeader;
  final String? emptyMessage;
  final Widget? emptyAction;
  final ValueChanged<Review>? onEditReview;
  final ValueChanged<Review>? onRespondToReview;

  void _showAllReviews(BuildContext context) {
    showCatchBottomSheet<void>(
      context: context,
      builder: (sheetContext) => CatchSheet.standard(
        title: context.l10n.reviewsReviewsSectionTitleAllReviewsLength(
          length: reviews.length,
        ),
        child: ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: EdgeInsets.zero,
          itemCount: reviews.length,
          separatorBuilder: (_, _) => gapH12,
          itemBuilder: (_, index) {
            final review = reviews[index];
            final isOwn = review.reviewerUserId == currentUid;
            return ReviewCard(
              review: review,
              isOwn: isOwn,
              onEdit: isOwn && onEditReview != null
                  ? () => onEditReview!(review)
                  : null,
              onRespond: onRespondToReview == null
                  ? null
                  : () => onRespondToReview!(review),
            );
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (reviews.isEmpty &&
        emptyPresentation == ReviewsEmptyPresentation.hidden) {
      return const SizedBox.shrink();
    }

    final t = CatchTokens.of(context);
    final avgRating = reviews.isEmpty
        ? null
        : reviews.map((r) => r.rating).reduce((a, b) => a + b) / reviews.length;
    final previewReviews = reviews
        .take(maxVisibleReviews)
        .toList(growable: false);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showHeader) ...[
          Row(
            children: [
              Expanded(
                child: CatchText(
                  context.l10n.reviewsReviewsSectionTextReviews,
                  variant: CatchTextVariant.titleL,
                ),
              ),
              if (avgRating != null) ...[
                StarRatingRow(
                  rating: avgRating.round(),
                  size: CatchIcon.rating,
                ),
                gapW4,
                CatchText(
                  context.l10n.reviewsReviewsSectionTextTostringasfixedLength(
                    toStringAsFixed: avgRating.toStringAsFixed(1),
                    length: reviews.length,
                  ),
                  variant: CatchTextVariant.supporting,
                  color: t.ink2,
                ),
              ],
            ],
          ),
          gapH12,
        ],

        if (reviews.isEmpty)
          CatchEmptyState(
            icon: CatchIcons.rateReviewOutlined,
            title: emptyPresentation == ReviewsEmptyPresentation.inline
                ? null
                : context.l10n.reviewsReviewsSectionTitleNoReviewsYet,
            message:
                emptyMessage ??
                (emptyPresentation == ReviewsEmptyPresentation.contained
                    ? context
                          .l10n
                          .reviewsReviewsSectionMessageReviewsAppearAfterMembers
                    : context
                          .l10n
                          .reviewsReviewsSectionMessageReviewsFromAttendeesWill),
            actions: [?emptyAction],
            surface: emptyPresentation == ReviewsEmptyPresentation.contained,
            variant: emptyPresentation == ReviewsEmptyPresentation.standalone
                ? CatchEmptyStateVariant.stacked
                : CatchEmptyStateVariant.inline,
            iconSize: emptyPresentation == ReviewsEmptyPresentation.standalone
                ? CatchIcon.tile
                : CatchIcon.row,
            iconContainerSize:
                emptyPresentation == ReviewsEmptyPresentation.standalone
                ? null
                : 44,
            padding: emptyPresentation == ReviewsEmptyPresentation.inline
                ? EdgeInsets.zero
                : emptyPresentation == ReviewsEmptyPresentation.contained
                ? CatchInsets.content
                : CatchInsets.contentVertical,
            titleStyle: CatchTextStyles.sectionTitle(context),
            messageStyle: CatchTextStyles.supporting(context, color: t.ink2),
          )
        else ...[
          for (var i = 0; i < previewReviews.length; i++) ...[
            ReviewCard(
              review: previewReviews[i],
              isOwn: previewReviews[i].reviewerUserId == currentUid,
              onEdit:
                  onEditReview != null &&
                      previewReviews[i].reviewerUserId == currentUid
                  ? () => onEditReview!(previewReviews[i])
                  : null,
              onRespond: onRespondToReview == null
                  ? null
                  : () => onRespondToReview!(previewReviews[i]),
            ),
            if (i < previewReviews.length - 1) gapH12,
          ],
          if (showAllAction && reviews.length > maxVisibleReviews) ...[
            gapH4,
            CatchButton.text(
              key: ReviewKeys.seeAllReviewsButton,
              label: context.l10n.reviewsReviewsSectionLabelSeeAllLengthReviews(
                length: reviews.length,
              ),
              onPressed: () => _showAllReviews(context),
            ),
          ],
        ],
      ],
    );
  }
}

class ReviewCard extends StatelessWidget {
  const ReviewCard({
    super.key,
    required this.review,
    required this.isOwn,
    this.onEdit,
    this.onRespond,
  });

  final Review review;
  final bool isOwn;
  final VoidCallback? onEdit;
  final VoidCallback? onRespond;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return CatchSurface(
      borderRole: CatchBorderRole.separator,
      padding: CatchInsets.tileContentCompact,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CatchAvatar(name: review.reviewerName, size: 32),
              gapW8,
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isOwn
                          ? context.l10n.reviewsReviewsSectionTextYou
                          : review.reviewerName,
                      style: CatchTextStyles.labelL(context),
                    ),
                    StarRatingRow(
                      rating: review.rating,
                      size: CatchIcon.rating,
                    ),
                  ],
                ),
              ),
              if (isOwn && onEdit != null)
                Tooltip(
                  message: context.l10n.reviewsReviewsSectionMessageEditReview,
                  child: CatchIconAction(
                    key: ReviewKeys.editReviewButton(review.id),
                    onPressed: onEdit!,
                    child: Icon(
                      CatchIcons.editOutlined,
                      size: CatchIcon.xs,
                      color: t.primary,
                    ),
                  ),
                ),
              if (onRespond != null)
                Tooltip(
                  message: review.ownerResponse == null
                      ? context.l10n.reviewsReviewsSectionMessageRespondAsHost
                      : context
                            .l10n
                            .reviewsReviewsSectionMessageEditHostResponse,
                  child: CatchIconAction(
                    key: ReviewKeys.respondToReviewButton(review.id),
                    onPressed: onRespond!,
                    child: Icon(
                      CatchIcons.rateReviewOutlined,
                      size: CatchIcon.xs,
                      color: t.primary,
                    ),
                  ),
                ),
            ],
          ),
          if (review.comment.isNotEmpty) ...[
            gapH6,
            CatchText(
              review.comment,
              variant: CatchTextVariant.bodyLead,
              color: t.ink2,
            ),
          ],
          if (review.ownerResponse case final response?) ...[
            gapH12,
            ReviewOwnerResponseCard(response: response),
          ],
        ],
      ),
    );
  }
}

class ReviewOwnerResponseCard extends StatelessWidget {
  const ReviewOwnerResponseCard({super.key, required this.response});

  final ReviewOwnerResponse response;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return CatchSurface(
      width: double.infinity,
      padding: CatchInsets.contentDense,
      radius: CatchRadius.sm,
      backgroundColor: t.accent.withValues(
        alpha: CatchOpacity.activityIconFill,
      ),
      borderSpec: CatchBorder.resolve(
        t,
        CatchBorderRole.boundary,
        color: t.accent.withValues(alpha: CatchOpacity.activityIconBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CatchAvatar(
                name: response.hostName,
                imageUrl: response.hostAvatarUrl,
                size: 24,
              ),
              gapW8,
              Expanded(
                child: CatchText(
                  context.l10n.reviewsReviewsSectionTextHostResponseHostname(
                    hostName: response.hostName,
                  ),
                  variant: CatchTextVariant.statusLabel,
                  color: t.ink,
                ),
              ),
            ],
          ),
          gapH6,
          CatchText(
            response.message,
            variant: CatchTextVariant.supporting,
            color: t.ink2,
          ),
        ],
      ),
    );
  }
}

Future<void> showReviewResponseSheet({
  required BuildContext context,
  required Review review,
}) {
  return showCatchBottomSheet<void>(
    context: context,
    builder: (_) => ReviewResponseSheet(review: review),
  );
}

class ReviewResponseSheet extends ConsumerStatefulWidget {
  const ReviewResponseSheet({super.key, required this.review});

  final Review review;

  @override
  ConsumerState<ReviewResponseSheet> createState() =>
      _ReviewResponseSheetState();
}

class _ReviewResponseSheetState extends ConsumerState<ReviewResponseSheet> {
  late final TextEditingController _messageController;
  bool _didResetMutation = false;

  @override
  void initState() {
    super.initState();
    _messageController = TextEditingController(
      text: widget.review.ownerResponse?.message ?? '',
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_didResetMutation) return;
    _didResetMutation = true;
    WriteReviewController.responseMutation.reset(ref);
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final message = _messageController.text.trim();
    if (message.isEmpty) return;
    try {
      await WriteReviewController.responseMutation.run(ref, (tx) async {
        await tx
            .get(writeReviewControllerProvider.notifier)
            .setOwnerResponse(reviewId: widget.review.id, message: message);
      });
    } catch (_) {
      // Inline CatchBanner owns user-facing error display.
    }
  }

  @override
  Widget build(BuildContext context) {
    final mutation = ref.watch(WriteReviewController.responseMutation);
    final canSubmit = _messageController.text.trim().isNotEmpty;

    ref.listen(WriteReviewController.responseMutation, (prev, next) {
      if (prev?.isPending == true && next.isSuccess) {
        Navigator.of(context).pop();
      }
    });

    return CatchSheet.standard(
      title: widget.review.ownerResponse == null
          ? context.l10n.reviewsReviewsSectionTitleRespondToReview
          : context.l10n.reviewsReviewsSectionTitleEditResponse,
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,
        key: ReviewKeys.submitOwnerResponseButton,
        label: context.l10n.reviewsReviewsSectionLabelSaveResponse,
        onPressed: !canSubmit || mutation.isPending ? null : _submit,
        status: (mutation.isPending)
            ? CatchButtonStatus.loading
            : CatchButtonStatus.idle,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            key: ReviewKeys.ownerResponseField,
            title: context.l10n.reviewsReviewsSectionTitleResponse,
            contract: CatchContractConstraints
                .setReviewResponseCallablePayloadMessage,
            controller: _messageController,
            maxLines: 4,
            placeholder:
                context.l10n.reviewsReviewsSectionPlaceholderThankTheAttendeeOr,
            textCapitalization: TextCapitalization.sentences,
            onChanged: (_) => setState(() {}),
          ),
          if (mutation.hasError) ...[
            gapH12,
            CatchBanner.error(
              message: mutationErrorMessage(mutation, l10n: context.l10n),
            ),
          ],
        ],
      ),
    );
  }
}
