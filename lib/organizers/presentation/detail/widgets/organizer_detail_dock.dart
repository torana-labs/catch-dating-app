import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_membership_controller.dart';
import 'package:catch_dating_app/organizers/shared/organizer_action_keys.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Membership role the [OrganizerDetailDock] renders for.
enum OrganizerDetailDockRole { guest, visitor, member, owner }

/// Design-system `ClubDock` (`components/organizers/ClubDock`): the persistent bottom
/// bar of a club detail screen, stateful over membership role — BookingDock's
/// club sibling. `visitor` shows the member count + an **activity-pigmented**
/// Join CTA (the one sanctioned use of the club pigment on an action); `member`
/// shows the count + a notifications bell + a quiet "Joined" control; `owner`
/// shows Manage + a New-event pair; `guest` shows an ink "Sign in to join". The
/// mono [footnote] carries the state's quiet facts.
class OrganizerDetailDock extends StatelessWidget {
  const OrganizerDetailDock({
    super.key,
    required this.state,
    required this.activityKind,
    this.members,
    this.membersLabel = 'MEMBERS',
    this.notificationsEnabled = true,
    this.footnote,
    this.joinKey,
    this.manageKey,
    this.isJoinLoading = false,
    this.isBellLoading = false,
    this.onJoin,
    this.onSignIn,
    this.onBell,
    this.onManage,
    this.onCreate,
  });

  final OrganizerDetailDockRole state;
  final ActivityKind activityKind;
  final int? members;
  final String membersLabel;
  final bool notificationsEnabled;
  final String? footnote;
  final Key? joinKey;
  final Key? manageKey;
  final bool isJoinLoading;
  final bool isBellLoading;
  final VoidCallback? onJoin;
  final VoidCallback? onSignIn;
  final VoidCallback? onBell;
  final VoidCallback? onManage;
  final VoidCallback? onCreate;

  @override
  Widget build(BuildContext context) {
    final activity = ActivityPalette.resolve(context, activityKind);
    final t = CatchTokens.of(context);
    final showCount = members != null && state != OrganizerDetailDockRole.owner;

    return CatchDock(
      padding: CatchInsets.organizerDetailDock,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              if (showCount) ...[
                OrganizerMemberCountText(members: members!, label: membersLabel),
                const SizedBox(width: CatchSpacing.s3),
              ],
              _OrganizerDetailDockControls(
                state: state,
                activity: activity,
                notificationsEnabled: notificationsEnabled,
                joinKey: joinKey,
                manageKey: manageKey,
                isJoinLoading: isJoinLoading,
                isBellLoading: isBellLoading,
                onJoin: onJoin,
                onSignIn: onSignIn,
                onBell: onBell,
                onManage: onManage,
                onCreate: onCreate,
              ),
            ],
          ),
          if (footnote != null && footnote!.isNotEmpty) ...[
            const SizedBox(height: CatchSpacing.micro10),
            Text(
              footnote!,
              textAlign: TextAlign.center,
              style: CatchTextStyles.monoLabel(
                context,
                color: t.ink3,
              ).copyWith(fontSize: 9),
            ),
          ],
        ],
      ),
    );
  }
}

class _OrganizerDetailDockControls extends StatelessWidget {
  const _OrganizerDetailDockControls({
    required this.state,
    required this.activity,
    required this.notificationsEnabled,
    required this.joinKey,
    required this.manageKey,
    required this.isJoinLoading,
    required this.isBellLoading,
    required this.onJoin,
    required this.onSignIn,
    required this.onBell,
    required this.onManage,
    required this.onCreate,
  });

  final OrganizerDetailDockRole state;
  final ActivityStyle activity;
  final bool notificationsEnabled;
  final Key? joinKey;
  final Key? manageKey;
  final bool isJoinLoading;
  final bool isBellLoading;
  final VoidCallback? onJoin;
  final VoidCallback? onSignIn;
  final VoidCallback? onBell;
  final VoidCallback? onManage;
  final VoidCallback? onCreate;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: switch (state) {
        OrganizerDetailDockRole.guest => CatchButton(
          label: context.l10n.organizersOrganizerDetailDockLabelSignInToJoin,
          leading: Icon(CatchIcons.locked),
          onPressed: onSignIn,
          fullWidth: true,
        ),
        OrganizerDetailDockRole.visitor => CatchButton(
          key: joinKey,
          label: context.l10n.organizersOrganizerDetailDockLabelJoinOrganizer,
          leading: Icon(CatchIcons.add),
          accentColor: activity.accent,
          status: (isJoinLoading)
              ? CatchButtonStatus.loading
              : CatchButtonStatus.idle,
          onPressed: onJoin,
          fullWidth: true,
        ),
        OrganizerDetailDockRole.member => Row(
          children: [
            OrganizerBellButton(
              active: notificationsEnabled,
              accent: activity.accent,
              isLoading: isBellLoading,
              onPressed: onBell,
            ),
            const SizedBox(width: CatchSpacing.s3),
            Expanded(
              child: CatchButton(
                key: manageKey,
                label: context.l10n.organizersOrganizerDetailDockLabelJoined,
                leading: Icon(CatchIcons.success),
                variant: CatchButtonVariant.secondary,
                status: (isJoinLoading)
                    ? CatchButtonStatus.loading
                    : CatchButtonStatus.idle,
                onPressed: onManage,
                fullWidth: true,
              ),
            ),
          ],
        ),
        OrganizerDetailDockRole.owner => Row(
          children: [
            Expanded(
              child: CatchButton(
                label: context.l10n.organizersOrganizerDetailDockLabelManage,
                leading: Icon(CatchIcons.settings),
                variant: CatchButtonVariant.secondary,
                onPressed: onManage,
                fullWidth: true,
              ),
            ),
            const SizedBox(width: CatchSpacing.s3),
            Expanded(
              flex: 2,
              child: CatchButton(
                label: context.l10n.organizersOrganizerDetailDockLabelNewEvent,
                leading: Icon(CatchIcons.add),
                accentColor: activity.accent,
                onPressed: onCreate,
                fullWidth: true,
              ),
            ),
          ],
        ),
      },
    );
  }
}

class OrganizerMemberCountText extends StatelessWidget {
  const OrganizerMemberCountText({
    super.key,
    required this.members,
    required this.label,
  });

  final int members;
  final String label;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          context.l10n.organizersOrganizerDetailDockTextMembers(members: members),
          style: CatchTextStyles.numericLarge(
            context,
          ).copyWith(fontSize: 17, height: 1),
        ),
        const SizedBox(height: CatchSpacing.micro6),
        Text(
          label,
          style: CatchTextStyles.monoLabel(
            context,
            color: t.ink2,
          ).copyWith(fontSize: 9, fontWeight: FontWeight.w700),
        ),
      ],
    );
  }
}

/// Member notifications bell — the active state fills with the club's activity
/// accent (not the raw Material color scheme).
class OrganizerBellButton extends StatelessWidget {
  const OrganizerBellButton({
    super.key,
    required this.active,
    required this.accent,
    required this.isLoading,
    required this.onPressed,
  });

  final bool active;
  final Color accent;
  final bool isLoading;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final foreground = active ? CatchTokens.editorialWhite : t.ink2;
    final enabled = !isLoading && onPressed != null;

    return Semantics(
      container: true,
      button: true,
      toggled: active,
      enabled: enabled,
      label: active
          ? context.l10n.organizersOrganizerDetailDockLabelDisableOrganizerPushNotifications
          : context.l10n.organizersOrganizerDetailDockLabelEnableOrganizerPushNotifications,
      child: CatchIconAction(
        size: CatchSpacing.s12,
        backgroundColor: active ? accent : t.raised,
        onPressed: enabled ? onPressed : null,
        child: isLoading
            ? SizedBox.square(
                dimension: CatchIconSize.md,
                child: CatchLoadingIndicator(color: foreground),
              )
            : Icon(
                active ? CatchIcons.notificationsOn : CatchIcons.notifications,
                color: foreground,
              ),
      ),
    );
  }
}

/// Provider-backed [OrganizerDetailDock] for the consumer club-detail screen. Computes
/// the membership state and wires Join / Leave / notification mutations and the
/// guest sign-in route. (Owner state is host-app territory and not rendered
/// here.)
class OrganizerMembershipDock extends ConsumerWidget {
  const OrganizerMembershipDock({
    super.key,
    required this.organizer,
    required this.isMember,
    required this.isAuthenticated,
    required this.isMutating,
    required this.pushNotificationsEnabled,
    required this.isPushMutating,
  });

  final Organizer organizer;
  final bool isMember;
  final bool isAuthenticated;
  final bool isMutating;
  final bool pushNotificationsEnabled;
  final bool isPushMutating;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = !isAuthenticated
        ? OrganizerDetailDockRole.guest
        : isMember
        ? OrganizerDetailDockRole.member
        : OrganizerDetailDockRole.visitor;
    final footnote = switch (state) {
      OrganizerDetailDockRole.visitor =>
        context.l10n.organizersOrganizerDetailDockVisiblecopyFreeToJoinLeave,
      OrganizerDetailDockRole.member =>
        context.l10n.organizersOrganizerDetailDockVisiblecopyMemberManageAnytime,
      _ => null,
    };

    return OrganizerDetailDock(
      state: state,
      activityKind: organizer.hostDefaults.primaryActivityKind,
      members: organizer.memberCount,
      footnote: footnote,
      joinKey: OrganizerActionKeys.joinButton,
      manageKey: OrganizerActionKeys.leaveButton,
      notificationsEnabled: pushNotificationsEnabled,
      isJoinLoading: isMutating,
      isBellLoading: isPushMutating,
      onSignIn: () => context.go(
        Uri(
          path: Routes.authScreen.path,
          queryParameters: {'from': '/organizers/${organizer.id}'},
        ).toString(),
      ),
      onJoin: () => OrganizerMembershipController.joinMutation.run(
        ref,
        (tx) async =>
            tx.get(organizerMembershipControllerProvider.notifier).join(organizer.id),
      ),
      onManage: () => OrganizerMembershipController.leaveMutation.run(
        ref,
        (tx) async =>
            tx.get(organizerMembershipControllerProvider.notifier).leave(organizer.id),
      ),
      onBell: isMutating
          ? null
          : () => OrganizerMembershipController.pushNotificationsMutation.run(
              ref,
              (tx) async => tx
                  .get(organizerMembershipControllerProvider.notifier)
                  .setPushNotifications(
                    clubId: organizer.id,
                    enabled: !pushNotificationsEnabled,
                  ),
            ),
    );
  }
}
