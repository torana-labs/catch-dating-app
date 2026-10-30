import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_screen_state.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_view_model.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_detail_body.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Live, consumer-facing Club Detail composition for an owner-facing read-only
/// preview. The selected [initialOrganizer] renders immediately while live detail
/// data hydrates, matching the consumer route's initial-club fallback policy.
class OrganizerDetailReadOnlyPreview extends ConsumerWidget {
  const OrganizerDetailReadOnlyPreview({
    super.key,
    required this.initialOrganizer,
    required this.currentUid,
  });

  final Organizer initialOrganizer;
  final String? currentUid;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final viewModelAsync = ref.watch(
      organizerDetailViewModelProvider(initialOrganizer.id),
    );

    return viewModelAsync.when(
      loading: () => SliverIgnorePointer(
        sliver: OrganizerDetailSliverBody(
          state: OrganizerDetailBodyState.publicPreview(
            organizer: initialOrganizer,
            uid: currentUid,
            isAuthenticated: currentUid != null,
          ),
          presentationMode:
              OrganizerDetailPresentationMode.embeddedReadOnlyPreview,
        ),
      ),
      error: (error, _) => CatchLocalizedSliverErrorState(
        error,
        context: AppErrorContext.organizer,
        fillRemaining: false,
        onRetry: () => ref.invalidate(
          organizerDetailViewModelProvider(initialOrganizer.id),
        ),
      ),
      data: (viewModel) {
        if (viewModel == null) {
          return CatchSliverErrorState(
            retryLabel: context.l10n.sharedActionTryAgain,
            title: context
                .l10n
                .organizersOrganizerDetailScreenTitleOrganizerNotFound,
            message: context
                .l10n
                .organizersOrganizerDetailScreenMessageThisOrganizerIsNo,
            icon: CatchIcons.people,
            fillRemaining: false,
            onRetry: () => ref.invalidate(
              organizerDetailViewModelProvider(initialOrganizer.id),
            ),
          );
        }

        return SliverIgnorePointer(
          sliver: OrganizerDetailSliverBody(
            state: OrganizerDetailBodyState.publicPreview(
              organizer: viewModel.organizer,
              upcomingEvents: viewModel.upcomingEvents,
              reviews: viewModel.reviews,
              userProfile: viewModel.userProfile,
              uid: viewModel.uid,
              isAuthenticated: viewModel.isAuthenticated,
            ),
            presentationMode:
                OrganizerDetailPresentationMode.embeddedReadOnlyPreview,
          ),
        );
      },
    );
  }
}
