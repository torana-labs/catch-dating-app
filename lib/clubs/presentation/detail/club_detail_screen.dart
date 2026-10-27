import 'dart:async';

import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/clubs/data/club_membership_repository.dart';
import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/clubs/domain/club_membership.dart';
import 'package:catch_dating_app/clubs/presentation/detail/club_detail_screen_state.dart';
import 'package:catch_dating_app/clubs/presentation/detail/club_detail_view_model.dart';
import 'package:catch_dating_app/clubs/presentation/detail/club_host_contact_controller.dart';
import 'package:catch_dating_app/clubs/presentation/detail/club_membership_controller.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_detail_body.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_detail_dock.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_share_card.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/external_links.dart';
import 'package:catch_dating_app/core/external_share.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/exceptions/error_logger.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/user_profile/data/user_profile_repository.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ClubDetailScreen extends ConsumerWidget {
  const ClubDetailScreen({super.key, required this.clubId, this.initialClub});

  final String clubId;
  final Club? initialClub;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vmAsync = ref.watch(clubDetailViewModelProvider(clubId));

    final currentUidAsync = ref.watch(uidProvider);
    final currentUidState = catchAsyncStateFromAsyncValue(currentUidAsync);
    final currentUid = currentUidState.value;

    final currentUserProfileAsync = ref.watch(watchUserProfileProvider);
    final currentUserProfileState = catchAsyncStateFromAsyncValue(
      currentUserProfileAsync,
    );
    final currentUserProfile = currentUserProfileState.value;

    ClubMembership? currentMembership;
    if (currentUid != null) {
      final membershipAsync = ref.watch(
        watchClubMembershipProvider(clubId, currentUid),
      );
      final membershipState = catchAsyncStateFromAsyncValue(membershipAsync);
      currentMembership = membershipState.value;
      if (membershipState.hasError) {
        ref
            .read(errorLoggerProvider)
            .logError(
              membershipState.error!,
              membershipState.stackTrace,
              reason: 'Failed to load club membership in club detail',
            );
      }
    }

    if (currentUserProfileState.hasError) {
      ref
          .read(errorLoggerProvider)
          .logError(
            currentUserProfileState.error!,
            currentUserProfileState.stackTrace,
            reason: 'Failed to load user profile in club detail',
          );
    }

    final joinMutation = ref.watch(ClubMembershipController.joinMutation);
    final leaveMutation = ref.watch(ClubMembershipController.leaveMutation);
    final pushMutation = ref.watch(
      ClubMembershipController.pushNotificationsMutation,
    );
    final messageHostMutation = ref.watch(
      ClubHostContactController.startConversationMutation,
    );
    final screenState = HostClubDetailScreenState.fromState(
      viewModel: _catchAsyncState(vmAsync),
      initialClub: clubDetailInitialClubForRoute(
        clubId: clubId,
        initialClub: initialClub,
      ),
      currentUid: currentUid,
      currentUserProfile: currentUserProfile,
      currentMembership: currentMembership,
      appRole: AppConfig.appRole,
      authResolved: currentUidState.hasData || currentUidState.hasError,
    );

    if (screenState is HostClubDetailContent) {
      final bodyState = ClubDetailBodyState.fromContent(
        screenState,
        appRole: AppConfig.appRole,
        isMutating: joinMutation.isPending || leaveMutation.isPending,
        clubPushNotificationsEnabled:
            currentMembership?.pushNotificationsEnabled ?? false,
        isClubPushMutating: pushMutation.isPending,
        isMessageHostPending: messageHostMutation.isPending,
      );
      Future<void> openClubContact(ClubContactAction action) async {
        final links = ref.read(externalLinkControllerProvider);
        if (action.openExternally) {
          await links.openExternal(action.uri);
        } else {
          await links.open(action.uri);
        }
      }

      Future<void> messageHost(
        BuildContext buttonContext,
        Club club,
        ClubHostProfile host,
      ) async {
        final matchId = await ClubHostContactController
            .startConversationMutation
            .run(
              ref,
              (tx) => tx
                  .get(clubHostContactControllerProvider.notifier)
                  .startConversation(clubId: club.id, hostUid: host.uid),
            );
        if (!buttonContext.mounted) return;
        unawaited(
          buttonContext.pushNamed(
            Routes.chatScreen.name,
            pathParameters: {'matchId': matchId},
          ),
        );
      }

      listenToCatchMutationErrors(
        context,
        ref,
        mutations: [
          ClubMembershipController.joinMutation,
          ClubMembershipController.leaveMutation,
          ClubMembershipController.pushNotificationsMutation,
          ClubHostContactController.startConversationMutation,
        ],
      );
      return CatchScaffold.workspace(
        body: ClubDetailBody(
          state: bodyState,
          onShareClub: (buttonContext, club) => showClubShareCardSheet(
            buttonContext,
            club: club,
            share: ref.read(externalShareControllerProvider),
          ),
          onEventSelected: (event) => context.pushNamed(
            _eventDetailRouteName(bodyState.eventRouteTarget),
            pathParameters: {
              context.l10n.clubsClubDetailScreenBodyClubid: bodyState.club.id,
              context.l10n.clubsClubDetailScreenBodyEventid: event.id,
            },
            extra: event,
          ),
          onViewHostProfile: (hostUid) => context.pushNamed(
            Routes.publicProfileScreen.name,
            pathParameters: {
              context.l10n.clubsClubDetailScreenBodyUid: hostUid,
            },
          ),
          onMessageHost: (buttonContext, host) =>
              messageHost(buttonContext, bodyState.club, host),
          onContactSelected: openClubContact,
        ),
        footer: switch (bodyState.dockState) {
          null => null,
          final state => ClubMembershipDock(
            club: state.club,
            isMember: state.isMember,
            isAuthenticated: state.isAuthenticated,
            isMutating: state.isMutating,
            pushNotificationsEnabled: state.pushNotificationsEnabled,
            isPushMutating: state.isPushMutating,
          ),
        },
      );
    }

    return CatchScaffold.workspace(
      body: switch (screenState) {
        HostClubDetailLoading() => const CatchStateViewport.loading(
          accountForBottomOverlay: false,
        ),
        HostClubDetailError(:final error, :final retryIntent) =>
          CatchLocalizedErrorState(
            error,
            context: AppErrorContext.club,
            onRetry: () {
              switch (retryIntent) {
                case HostClubDetailRetryIntent.reloadDetail:
                  ref.invalidate(clubDetailViewModelProvider(clubId));
              }
            },
          ),
        HostClubDetailNotFound() => CatchErrorState(
          title: context.l10n.clubsClubDetailScreenTitleClubNotFound,
          message: context.l10n.clubsClubDetailScreenMessageThisClubIsNo,
          icon: CatchIcons.people,
          actions: const [CatchErrorBackButton()],
        ),
        HostClubDetailContent() => const SizedBox.shrink(),
      },
    );
  }
}

String _eventDetailRouteName(ClubDetailEventRouteTarget target) {
  return switch (target) {
    ClubDetailEventRouteTarget.consumerEventDetail =>
      Routes.eventDetailScreen.name,
    ClubDetailEventRouteTarget.hostEventDetail =>
      Routes.hostAppEventDetailScreen.name,
  };
}

CatchAsyncState<T> _catchAsyncState<T>(AsyncValue<T> value) {
  return catchAsyncStateFromAsyncValue(value);
}
