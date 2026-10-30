import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_membership.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_screen_state.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_view_model.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_host_contact_controller.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_membership_controller.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_detail_body.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_detail_dock.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_share_card.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:catch_dating_app/platform/device/external_share.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class OrganizerDetailScreen extends ConsumerWidget {
  const OrganizerDetailScreen({
    super.key,
    required this.clubId,
    this.initialOrganizer,
  });

  final String clubId;
  final Organizer? initialOrganizer;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vmAsync = ref.watch(organizerDetailViewModelProvider(clubId));

    final currentUidAsync = ref.watch(uidProvider);
    final currentUidState = catchAsyncStateFromAsyncValue(currentUidAsync);
    final currentUid = currentUidState.value;

    final currentUserProfileAsync = ref.watch(watchUserProfileProvider);
    final currentUserProfileState = catchAsyncStateFromAsyncValue(
      currentUserProfileAsync,
    );
    final currentUserProfile = currentUserProfileState.value;

    OrganizerMembership? currentMembership;
    if (currentUid != null) {
      final membershipAsync = ref.watch(
        watchOrganizerMembershipProvider(clubId, currentUid),
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

    final joinMutation = ref.watch(OrganizerMembershipController.joinMutation);
    final leaveMutation = ref.watch(
      OrganizerMembershipController.leaveMutation,
    );
    final pushMutation = ref.watch(
      OrganizerMembershipController.pushNotificationsMutation,
    );
    final messageHostMutation = ref.watch(
      OrganizerHostContactController.startConversationMutation,
    );
    final screenState = HostOrganizerDetailScreenState.fromState(
      viewModel: _catchAsyncState(vmAsync),
      initialOrganizer: organizerDetailInitialOrganizerForRoute(
        clubId: clubId,
        initialOrganizer: initialOrganizer,
      ),
      currentUid: currentUid,
      currentUserProfile: currentUserProfile,
      currentMembership: currentMembership,
      appRole: AppConfig.appRole,
      authResolved: currentUidState.hasData || currentUidState.hasError,
    );

    if (screenState is HostOrganizerDetailContent) {
      final bodyState = OrganizerDetailBodyState.fromContent(
        screenState,
        appRole: AppConfig.appRole,
        isMutating: joinMutation.isPending || leaveMutation.isPending,
        organizerPushNotificationsEnabled:
            currentMembership?.pushNotificationsEnabled ?? false,
        isOrganizerPushMutating: pushMutation.isPending,
        isMessageHostPending: messageHostMutation.isPending,
      );
      Future<void> openOrganizerContact(OrganizerContactAction action) async {
        final links = ref.read(externalLinkControllerProvider);
        if (action.openExternally) {
          await links.openExternal(action.uri);
        } else {
          await links.open(action.uri);
        }
      }

      Future<void> messageHost(
        BuildContext buttonContext,
        Organizer organizer,
        OrganizerHostProfile host,
      ) async {
        final matchId = await OrganizerHostContactController
            .startConversationMutation
            .run(
              ref,
              (tx) => tx
                  .get(organizerHostContactControllerProvider.notifier)
                  .startConversation(clubId: organizer.id, hostUid: host.uid),
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
          OrganizerMembershipController.joinMutation,
          OrganizerMembershipController.leaveMutation,
          OrganizerMembershipController.pushNotificationsMutation,
          OrganizerHostContactController.startConversationMutation,
        ],
      );
      return CatchScaffold.workspace(
        body: OrganizerDetailBody(
          state: bodyState,
          onShareOrganizer: (buttonContext, organizer) =>
              showOrganizerShareCardSheet(
                buttonContext,
                organizer: organizer,
                share: ref.read(externalShareControllerProvider),
              ),
          onEventSelected: (event) => context.pushNamed(
            _eventDetailRouteName(bodyState.eventRouteTarget),
            pathParameters: {
              context.l10n.organizersOrganizerDetailScreenBodyOrganizerid:
                  bodyState.organizer.id,
              context.l10n.organizersOrganizerDetailScreenBodyEventid: event.id,
            },
            extra: event,
          ),
          onViewHostProfile: (hostUid) => context.pushNamed(
            Routes.publicProfileScreen.name,
            pathParameters: {
              context.l10n.organizersOrganizerDetailScreenBodyUid: hostUid,
            },
          ),
          onMessageHost: (buttonContext, host) =>
              messageHost(buttonContext, bodyState.organizer, host),
          onContactSelected: openOrganizerContact,
        ),
        footer: switch (bodyState.dockState) {
          null => null,
          final state => OrganizerMembershipDock(
            organizer: state.organizer,
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
        HostOrganizerDetailLoading() => const CatchStateViewport.loading(
          accountForBottomOverlay: false,
        ),
        HostOrganizerDetailError(:final error, :final retryIntent) =>
          CatchLocalizedErrorState(
            error,
            context: AppErrorContext.organizer,
            onRetry: () {
              switch (retryIntent) {
                case HostOrganizerDetailRetryIntent.reloadDetail:
                  ref.invalidate(organizerDetailViewModelProvider(clubId));
              }
            },
          ),
        HostOrganizerDetailNotFound() => CatchErrorState(
          title: context
              .l10n
              .organizersOrganizerDetailScreenTitleOrganizerNotFound,
          message: context
              .l10n
              .organizersOrganizerDetailScreenMessageThisOrganizerIsNo,
          icon: CatchIcons.people,
          actions: const [CatchErrorBackButton()],
        ),
        HostOrganizerDetailContent() => const SizedBox.shrink(),
      },
    );
  }
}

String _eventDetailRouteName(OrganizerDetailEventRouteTarget target) {
  return switch (target) {
    OrganizerDetailEventRouteTarget.consumerEventDetail =>
      Routes.eventDetailScreen.name,
    OrganizerDetailEventRouteTarget.hostEventDetail =>
      Routes.hostAppEventDetailScreen.name,
  };
}

CatchAsyncState<T> _catchAsyncState<T>(AsyncValue<T> value) {
  return catchAsyncStateFromAsyncValue(value);
}
