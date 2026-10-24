import 'dart:async';

import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_grid.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_upload_controller.dart';
import 'package:catch_dating_app/image_uploads/shared/profile_photo_editor_screen.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_controller.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_step.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_photos_step_state.dart';
import 'package:catch_dating_app/onboarding/shared/onboarding_step_layout.dart';
import 'package:catch_dating_app/user_profile/data/user_profile_repository.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class OnboardingPhotosBody extends ConsumerWidget {
  const OnboardingPhotosBody({super.key, this.profileCompletionOnly = false});

  final bool profileCompletionOnly;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileState = catchAsyncStateFromAsyncValue(
      ref.watch(watchUserProfileProvider),
    );
    final profilePhotos =
        profileState.value?.effectiveProfilePhotos ?? const [];
    final uploadState = ref.watch(photoUploadControllerProvider);
    final state = OnboardingPhotosState.from(
      profilePhotos: profilePhotos,
      loadingIndices: uploadState.loadingIndices,
      profileCompletionOnly: profileCompletionOnly,
    );

    ref.listen(photoUploadControllerProvider, (_, state) {
      if (state.uploadError != null) {
        showCatchNotice(
          context,
          context.l10n.onboardingPhotosPageVisiblecopyUploadFailedPleaseTry,
          dedupeKey: 'onboarding.photo-upload-failed',
          tone: CatchNoticeTone.danger,
        );
      }
    });

    return OnboardingPhotosStep(
      state: state,
      callbacks: OnboardingPhotosCallbacks(
        onContinue: state.canContinue
            ? () => ref
                  .read(onboardingControllerProvider.notifier)
                  .goToStepAndSaveDraft(OnboardingStep.prompts)
            : null,
        onSlotTapped: (intent) {
          unawaited(
            openProfilePhotoEditor(
              context: context,
              ref: ref,
              index: intent.index,
              photo: intent.photo,
              canDelete: intent.canDelete,
            ),
          );
        },
        onDeletePhoto: (index) {
          unawaited(
            PhotoUploadController.uploadPhotoMutation.run(ref, (tx) async {
              await tx
                  .get(photoUploadControllerProvider.notifier)
                  .deletePhoto(index);
            }),
          );
        },
        onReorderPhoto: (fromIndex, toIndex) {
          unawaited(
            PhotoUploadController.uploadPhotoMutation.run(ref, (tx) async {
              await tx
                  .get(photoUploadControllerProvider.notifier)
                  .reorderPhoto(fromIndex: fromIndex, toIndex: toIndex);
            }),
          );
        },
      ),
    );
  }
}

class OnboardingPhotosStep extends StatelessWidget {
  const OnboardingPhotosStep({
    super.key,
    required this.state,
    required this.callbacks,
  });

  final OnboardingPhotosState state;
  final OnboardingPhotosCallbacks callbacks;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return OnboardingStepLayout(
      footer: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchButton(
            label: context.l10n.onboardingPhotosPageLabelContinue,
            onPressed: callbacks.onContinue,
            fullWidth: true,
            size: CatchButtonSize.lg,
          ),
          if (state.continueHint(context.l10n) case final continueHint?) ...[
            gapH12,
            CatchText(
              continueHint,
              variant: CatchTextVariant.supporting,
              color: t.ink2,
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
      children: [
        CatchSectionList(
          emptyStateOmitted: true,
          gap: CatchSpacing.s3,
          children: [
            CatchSection.plain(
              child: PhotoGrid(
                profilePhotos: state.profilePhotos,
                loadingIndices: state.loadingIndices,
                canDeletePhotos: state.canDeletePhotos,
                onSlotTapped: (index) =>
                    callbacks.onSlotTapped(state.slotIntent(index)),
                onDeletePhoto: callbacks.onDeletePhoto,
                onReorderPhoto: callbacks.onReorderPhoto,
              ),
            ),
            CatchSection.plain(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(CatchIcons.bolt, size: CatchIcon.xs, color: t.accent),
                  gapW8,
                  Expanded(
                    child: CatchText(
                      state.supportingCopy(context.l10n),
                      variant: CatchTextVariant.supporting,
                      color: t.ink2,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}
