import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/dialogs/confirm_danger_dialog.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/mutation_error_util.dart';
import 'package:catch_dating_app/reviews/shared/review_keys.dart';
import 'package:catch_dating_app/reviews/shared/star_rating_row.dart';
import 'package:catch_dating_app/reviews/shared/write_review_controller.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Shows a bottom sheet for creating or editing a review.
///
/// Pass [existingReview] to pre-fill and switch to edit mode.
Future<void> showWriteReviewSheet({
  required BuildContext context,
  required String clubId,
  required String eventId,
  required UserProfile reviewer,
  Review? existingReview,
}) {
  return showCatchBottomSheet(
    context: context,
    builder: (_) => WriteReviewSheet(
      clubId: clubId,
      eventId: eventId,
      reviewer: reviewer,
      existingReview: existingReview,
    ),
  );
}

class WriteReviewSheet extends ConsumerStatefulWidget {
  const WriteReviewSheet({
    super.key,
    required this.clubId,
    required this.eventId,
    required this.reviewer,
    this.existingReview,
  });

  final String clubId;
  final String eventId;
  final UserProfile reviewer;
  final Review? existingReview;

  @override
  ConsumerState<WriteReviewSheet> createState() => _WriteReviewSheetState();
}

class _WriteReviewSheetState extends ConsumerState<WriteReviewSheet> {
  late int _rating;
  late final TextEditingController _commentController;
  bool _didResetMutations = false;

  bool get _isEdit => widget.existingReview != null;

  @override
  void initState() {
    super.initState();
    _rating = widget.existingReview?.rating ?? 0;
    _commentController = TextEditingController(
      text: widget.existingReview?.comment ?? '',
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_didResetMutations) return;
    _didResetMutations = true;
    WriteReviewController.submitMutation.reset(ref);
    WriteReviewController.deleteMutation.reset(ref);
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_rating == 0 || _writePending) return;
    try {
      await WriteReviewController.submitMutation.run(ref, (tx) async {
        await tx
            .get(writeReviewControllerProvider.notifier)
            .submit(
              clubId: widget.clubId,
              eventId: widget.eventId,
              reviewerUserId: widget.reviewer.uid,
              reviewerName: widget.reviewer.name,
              rating: _rating,
              comment: _commentController.text.trim(),
              existingReview: widget.existingReview,
            );
      });
    } catch (_) {
      // Inline CatchBanner owns user-facing error display.
    }
  }

  Future<void> _confirmDelete() async {
    if (_writePending) return;
    final review = widget.existingReview;
    if (review == null) return;

    final confirmed = await showConfirmDangerDialog(
      context: context,
      title: context.l10n.reviewsWriteReviewSheetTitleDeleteReview,
      message: context.l10n.reviewsWriteReviewSheetMessageThisRemovesYourReview,
      confirmLabel: context.l10n.sharedActionDelete,
    );
    if (confirmed != true || !mounted || _writePending) return;

    try {
      await WriteReviewController.deleteMutation.run(ref, (tx) async {
        await tx.get(writeReviewControllerProvider.notifier).delete(review.id);
      });
    } catch (_) {
      // Inline CatchBanner owns user-facing error display.
    }
  }

  @override
  Widget build(BuildContext context) {
    final mutation = ref.watch(WriteReviewController.submitMutation);
    final deleteMutation = ref.watch(WriteReviewController.deleteMutation);
    final submitting = mutation.isPending || deleteMutation.isPending;

    ref.listen(WriteReviewController.submitMutation, (prev, next) {
      if (prev?.isPending == true && next.isSuccess) {
        Navigator.of(context).pop();
      }
    });
    ref.listen(WriteReviewController.deleteMutation, (prev, next) {
      if (prev?.isPending == true && next.isSuccess) {
        Navigator.of(context).pop();
      }
    });

    return PopScope(
      canPop: !submitting,
      child: CatchSheet(
        title: _isEdit
            ? context.l10n.reviewsWriteReviewSheetTitleEditReview
            : context.l10n.reviewsWriteReviewSheetTitleWriteAReview,
        keyboardSafe: true,
        padding: EdgeInsets.fromLTRB(
          CatchSpacing.s4,
          CatchSpacing.s3,
          CatchSpacing.s4,
          CatchSpacing.s4 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        footer: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_isEdit) ...[
              CatchButton(
                key: ReviewKeys.deleteReviewButton,
                label: context.l10n.reviewsWriteReviewSheetLabelDeleteReview,
                onPressed: submitting ? null : _confirmDelete,
                status: (deleteMutation.isPending)
                    ? CatchButtonStatus.loading
                    : CatchButtonStatus.idle,
                variant: CatchButtonVariant.danger,
                fullWidth: true,
              ),
              gapH12,
            ],
            CatchButton(
              key: ReviewKeys.submitReviewButton,
              label: _isEdit
                  ? context.l10n.reviewsWriteReviewSheetLabelSave
                  : context.l10n.reviewsWriteReviewSheetLabelSubmit,
              onPressed: _rating == 0 || submitting ? null : _submit,
              status: (mutation.isPending)
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              fullWidth: true,
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            StarRatingPicker(
              rating: _rating,
              onChanged: (r) => setState(() => _rating = r),
              keyBuilder: ReviewKeys.ratingStar,
              enabled: !submitting,
            ),
            gapH16,
            CatchField.input(
              copy: catchFieldCopy(context.l10n),
              key: ReviewKeys.commentField,
              title: context.l10n.reviewsWriteReviewSheetTitleReview,
              contract: CatchContractConstraints
                  .createEventReviewCallablePayloadComment,
              labelMode: CatchFieldLabelTextMode.optional,
              controller: _commentController,
              states: <WidgetState>{if (submitting) WidgetState.disabled},
              maxLines: 3,
              placeholder: context
                  .l10n
                  .reviewsWriteReviewSheetPlaceholderShareYourExperience,
              textCapitalization: TextCapitalization.sentences,
            ),
            if (mutation.hasError) ...[
              gapH12,
              CatchBanner.error(
                message: mutationErrorMessage(mutation, l10n: context.l10n),
              ),
            ],
            if (deleteMutation.hasError) ...[
              gapH12,
              CatchBanner.error(
                message: mutationErrorMessage(
                  deleteMutation,
                  l10n: context.l10n,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  bool get _writePending =>
      ref.read(WriteReviewController.submitMutation).isPending ||
      ref.read(WriteReviewController.deleteMutation).isPending;
}
