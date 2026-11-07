import 'dart:async';

import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_controller.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_screen.dart';
import 'package:catch_dating_app/hosts/organizer/team_body.dart';
import 'package:catch_dating_app/hosts/organizer/team_state.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/host_team_management_controller.dart';
import 'package:catch_kernel/city_catalog.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The organizer's team: who is on it, adding a host by phone, and for the
/// owner, handing over or removing someone, through the existing team
/// commands. The organizer listener brings each change back.
class TeamScreen extends ConsumerStatefulWidget {
  const TeamScreen({super.key, required this.organizerId});

  final String organizerId;

  @override
  ConsumerState<TeamScreen> createState() => _TeamScreenState();
}

/// What the owner picked for someone on the team.
enum _HostChoice { transfer, remove }

class _TeamScreenState extends ConsumerState<TeamScreen> {
  String _phone = '';
  int _revision = 0;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final read = watchHostOrganizerScope(ref, organizerId: widget.organizerId);
    final scope = read.scope;
    final organizer = scope?.organizer;
    final inviting = ref
        .watch(HostTeamManagementController.addHostMutation)
        .isPending;
    final changing =
        ref.watch(HostTeamManagementController.removeHostMutation).isPending ||
        ref
            .watch(HostTeamManagementController.transferOwnershipMutation)
            .isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        HostTeamManagementController.addHostMutation,
        HostTeamManagementController.removeHostMutation,
        HostTeamManagementController.transferOwnershipMutation,
      ],
      errorContext: AppErrorContext.organizer,
    );
    final Widget body;
    if (scope == null || organizer == null) {
      body = HostOrganizerScopeFallback(
        gap: read.gap,
        error: read.error,
        onRetry: () => retryHostOrganizerScope(ref),
      );
    } else {
      final state = TeamState(
        organizer: organizer,
        currentUid: scope.uid,
        dialCode: marketForCityName(organizer.location).dialCode,
        phone: _phone,
        inviting: inviting,
        changing: changing,
        revision: _revision,
      );
      body = TeamBody(
        state: state,
        onPhone: (phone) => setState(() => _phone = phone),
        onInvite: () => unawaited(_invite(state)),
        onHost: (host) => unawaited(_changeHost(organizer, host)),
      );
    }
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-organizer-team-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostOrganizerTeamTitle,
          kicker: organizer?.name,
          back: CatchTopBarBack(label: l10n.hostOrganizerBack),
        ),
        body: body,
      ),
    );
  }

  Future<void> _invite(TeamState state) async {
    try {
      await HostTeamManagementController.addHostMutation.run(
        ref,
        (tx) => tx
            .get(hostTeamManagementControllerProvider.notifier)
            .addHostByPhone(
              organizerId: state.organizer.id,
              phoneNumber: state.invitePhone,
            ),
      );
    } on Object {
      // The mutation listener shows the error; the number stays to retry.
      return;
    }
    if (!mounted) return;
    setState(() {
      _phone = '';
      _revision += 1;
    });
    showCatchNotice(context, context.l10n.hostOrganizerInviteSent);
  }

  Future<void> _changeHost(
    Organizer organizer,
    OrganizerHostProfile host,
  ) async {
    final l10n = context.l10n;
    final choice = await showCatchAdaptiveDialog<_HostChoice?>(
      context: context,
      title: host.displayName,
      message: l10n.hostOrganizerTeamChangeBody,
      actions: [
        CatchDialogAction(
          label: l10n.hostOrganizerTeamMakeOwner,
          value: _HostChoice.transfer,
        ),
        CatchDialogAction(
          label: l10n.hostOrganizerTeamRemove,
          value: _HostChoice.remove,
          isDestructive: true,
        ),
        CatchDialogAction(label: l10n.hostOrganizerCancel, value: null),
      ],
    );
    if (choice == null || !mounted) return;
    final confirmed = await showCatchAdaptiveDialog<bool>(
      context: context,
      title: switch (choice) {
        _HostChoice.transfer => l10n.hostOrganizerTeamMakeOwnerTitle(
          name: host.displayName,
        ),
        _HostChoice.remove => l10n.hostOrganizerTeamRemoveTitle(
          name: host.displayName,
        ),
      },
      message: switch (choice) {
        _HostChoice.transfer => l10n.hostOrganizerTeamMakeOwnerBody,
        _HostChoice.remove => l10n.hostOrganizerTeamRemoveBody,
      },
      actions: [
        CatchDialogAction(label: l10n.hostOrganizerCancel, value: false),
        CatchDialogAction(
          label: switch (choice) {
            _HostChoice.transfer => l10n.hostOrganizerTeamMakeOwner,
            _HostChoice.remove => l10n.hostOrganizerTeamRemove,
          },
          value: true,
          isDestructive: true,
        ),
      ],
    );
    if (confirmed != true || !mounted) return;
    final controller = hostTeamManagementControllerProvider.notifier;
    try {
      switch (choice) {
        case _HostChoice.transfer:
          await HostTeamManagementController.transferOwnershipMutation.run(
            ref,
            (tx) => tx
                .get(controller)
                .transferOwnership(organizerId: organizer.id, uid: host.uid),
          );
        case _HostChoice.remove:
          await HostTeamManagementController.removeHostMutation.run(
            ref,
            (tx) => tx
                .get(controller)
                .removeHost(organizerId: organizer.id, uid: host.uid),
          );
      }
    } on Object {
      // The mutation listener shows the error.
    }
  }
}
