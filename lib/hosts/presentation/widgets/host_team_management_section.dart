import 'dart:async';

import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/host_team_management_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/platform/riverpod_ui/mutation_error_util.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HostTeamManagementSection extends ConsumerWidget {
  const HostTeamManagementSection({
    super.key,
    required this.organizer,
    required this.currentUid,
    required this.canManage,
  });

  final Organizer organizer;
  final String currentUid;
  final bool canManage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hosts = organizer.displayHostProfiles;
    final addMutation = ref.watch(HostTeamManagementController.addHostMutation);
    final removeMutation = ref.watch(
      HostTeamManagementController.removeHostMutation,
    );
    final transferMutation = ref.watch(
      HostTeamManagementController.transferOwnershipMutation,
    );
    final addPending = addMutation.isPending;
    final removePending = removeMutation.isPending;
    final transferPending = transferMutation.isPending;
    final actionPending = addPending || removePending || transferPending;
    final actionError = _firstErrorMutation([
      addMutation,
      removeMutation,
      transferMutation,
    ]);

    Future<void> showAddHostSheet() async {
      final addHostFailureReason = context
          .l10n
          .hostsHostTeamManagementSectionVisiblecopyHostteammanagementsectionShowaddhostsheetFailed;
      final added = await showCatchBottomSheet<bool>(
        context: context,
        builder: (_) => HostTeamAddHostSheet(
          clubId: organizer.id,
          actionState: HostTeamAddHostActionState(
            isSaving: addMutation.isPending,
            errorMessage: addMutation.hasError
                ? mutationErrorMessage(
                    addMutation,
                    l10n: context.l10n,
                    context: AppErrorContext.organizer,
                  )
                : null,
          ),
          onAddHost: (phone) async {
            try {
              await HostTeamManagementController.addHostMutation.run(
                ref,
                (tx) => tx
                    .get(hostTeamManagementControllerProvider.notifier)
                    .addHostByPhone(clubId: organizer.id, phoneNumber: phone),
              );
            } catch (error, stackTrace) {
              ref
                  .read(errorLoggerProvider)
                  .logError(error, stackTrace, reason: addHostFailureReason);
              rethrow;
            }
          },
        ),
      );
      if (added == true && context.mounted) {
        showCatchNotice(
          context,
          context.l10n.hostsHostTeamManagementSectionVisiblecopyHostAdded,
        );
      }
    }

    Future<void> confirmHostAction(
      HostTeamHostAction action,
      OrganizerHostProfile host,
    ) async {
      final actionFailureReason = context
          .l10n
          .hostsHostTeamManagementSectionVisiblecopyHostteammanagementsectionConfirmhostactionFailed;
      final confirmation = HostTeamHostActionConfirmation(
        action: action,
        host: host,
      );
      final confirmed = await showHostTeamHostActionDialog(
        context: context,
        confirmation: confirmation,
      );
      if (confirmed != true) return;

      try {
        switch (action) {
          case HostTeamHostAction.remove:
            await HostTeamManagementController.removeHostMutation.run(
              ref,
              (tx) => tx
                  .get(hostTeamManagementControllerProvider.notifier)
                  .removeHost(clubId: organizer.id, uid: host.uid),
            );
          case HostTeamHostAction.transferOwnership:
            await HostTeamManagementController.transferOwnershipMutation.run(
              ref,
              (tx) => tx
                  .get(hostTeamManagementControllerProvider.notifier)
                  .transferOwnership(clubId: organizer.id, uid: host.uid),
            );
        }
      } catch (error, stackTrace) {
        ref
            .read(errorLoggerProvider)
            .logError(error, stackTrace, reason: actionFailureReason);
        return;
      }
      if (!context.mounted) return;
      showCatchNotice(context, confirmation.successMessage(context.l10n));
    }

    return CatchSection.fieldRows(
      title: context.l10n.hostsHostTeamManagementSectionTitleHostTeam,
      children: [
        if (canManage && actionError != null)
          CatchField.content(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsHostTeamManagementSectionTitleHostTeam,
            body: mutationErrorMessage(
              actionError,
              l10n: context.l10n,
              context: AppErrorContext.organizer,
            ),
            icon: CatchIcons.error,
            tone: CatchFieldTone.danger,
          ),
        if (hosts.isEmpty)
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context
                .l10n
                .hostsHostTeamManagementSectionTextNoHostTeamMembers,
            icon: CatchIcons.people,
          )
        else
          for (final host in hosts)
            HostTeamOwnerHostRow(
              host: host,
              canManage: canManage && host.uid != currentUid && !actionPending,
              onTransfer: () => unawaited(
                confirmHostAction(HostTeamHostAction.transferOwnership, host),
              ),
              onRemove: () =>
                  unawaited(confirmHostAction(HostTeamHostAction.remove, host)),
            ),
        if (canManage)
          CatchField.add(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsHostTeamManagementSectionTitleAddHost,
            icon: CatchIcons.addPerson,
            onTap: actionPending ? null : () => unawaited(showAddHostSheet()),
          ),
      ],
    );
  }
}

enum HostTeamHostAction { remove, transferOwnership }

class HostTeamHostActionConfirmation {
  const HostTeamHostActionConfirmation({
    required this.action,
    required this.host,
  });

  final HostTeamHostAction action;
  final OrganizerHostProfile host;

  String title(AppLocalizations l10n) {
    return switch (action) {
      HostTeamHostAction.remove =>
        l10n.hostsHostTeamManagementSectionTitleRemoveHost,
      HostTeamHostAction.transferOwnership =>
        l10n.hostsHostTeamManagementSectionTitleTransferOwnership,
    };
  }

  String message(AppLocalizations l10n) {
    return switch (action) {
      HostTeamHostAction.remove =>
        l10n.hostsHostTeamManagementSectionMessageDisplaynameWillStayA(
          displayName: host.displayName,
        ),
      HostTeamHostAction.transferOwnership =>
        l10n.hostsHostTeamManagementSectionMessageDisplaynameWillBecomeThe(
          displayName: host.displayName,
        ),
    };
  }

  List<CatchDialogAction<bool>> actions(AppLocalizations l10n) {
    return [
      CatchDialogAction(
        label: l10n.hostsHostTeamManagementSectionLabelCancel,
        value: false,
      ),
      switch (action) {
        HostTeamHostAction.remove => CatchDialogAction(
          label: l10n.hostsHostTeamManagementSectionLabelRemove,
          value: true,
          isDestructive: true,
        ),
        HostTeamHostAction.transferOwnership => CatchDialogAction(
          label: l10n.hostsHostTeamManagementSectionLabelTransfer,
          value: true,
          isDefault: true,
        ),
      },
    ];
  }

  String successMessage(AppLocalizations l10n) {
    return switch (action) {
      HostTeamHostAction.remove =>
        l10n.hostsHostTeamManagementSectionSuccessmessageDisplaynameRemoved(
          displayName: host.displayName,
        ),
      HostTeamHostAction.transferOwnership =>
        l10n.hostsHostTeamManagementSectionSuccessmessageOwnershipTransferredToDisplayname(
          displayName: host.displayName,
        ),
    };
  }
}

Future<bool?> showHostTeamHostActionDialog({
  required BuildContext context,
  required HostTeamHostActionConfirmation confirmation,
}) {
  return showCatchAdaptiveDialog<bool>(
    context: context,
    title: confirmation.title(context.l10n),
    message: confirmation.message(context.l10n),
    actions: confirmation.actions(context.l10n),
  );
}

class HostTeamOwnerHostRow extends StatelessWidget {
  const HostTeamOwnerHostRow({
    super.key,
    required this.host,
    required this.canManage,
    required this.onTransfer,
    required this.onRemove,
  });

  final OrganizerHostProfile host;
  final bool canManage;
  final VoidCallback onTransfer;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return CatchFieldLanes.single(
      child: CatchField.content(
        copy: catchFieldCopy(context.l10n),
        title: host.displayName,
        body: host.role == OrganizerHostRole.owner
            ? context.l10n.organizersOrganizerIdentityAtomsLabelOwner
            : context.l10n.organizersOrganizerIdentityAtomsLabelHost,
        leading: CatchAvatar(
          name: host.displayName,
          imageUrl: host.avatarUrl,
          size: 42,
        ),
        leadingExtent: 42,
        actions: canManage
            ? CatchActionMenu<String>(
                key: ValueKey('host-team-actions-${host.uid}'),
                tooltip: context
                    .l10n
                    .hostsHostTeamManagementSectionTooltipHostActions,
                icon: CatchIcons.more,
                onSelected: (value) {
                  if (value ==
                      context
                          .l10n
                          .hostsHostTeamManagementSectionVisiblecopyTransfer) {
                    onTransfer();
                  }
                  if (value ==
                      context
                          .l10n
                          .hostsHostTeamManagementSectionVisiblecopyRemove) {
                    onRemove();
                  }
                },
                items: [
                  CatchActionMenuItem(
                    value: context
                        .l10n
                        .hostsHostTeamManagementSectionVisiblecopyTransfer,
                    label: context
                        .l10n
                        .hostsHostTeamManagementSectionLabelTransferOwnership,
                    icon: CatchIcons.admin,
                  ),
                  CatchActionMenuItem(
                    value: context
                        .l10n
                        .hostsHostTeamManagementSectionVisiblecopyRemove,
                    label: context
                        .l10n
                        .hostsHostTeamManagementSectionLabelRemoveHost,
                    icon: CatchIcons.personRemoved,
                    isDestructive: true,
                  ),
                ],
              )
            : null,
      ),
    );
  }
}

@immutable
class HostTeamAddHostActionState {
  const HostTeamAddHostActionState({this.isSaving = false, this.errorMessage});

  final bool isSaving;
  final String? errorMessage;
}

Future<void> _noopAddHost(String phoneNumber) async {}

class HostTeamAddHostSheet extends StatefulWidget {
  const HostTeamAddHostSheet({
    super.key,
    required this.clubId,
    this.actionState = const HostTeamAddHostActionState(),
    this.onAddHost,
  });

  final String clubId;
  final HostTeamAddHostActionState actionState;
  final Future<void> Function(String phoneNumber)? onAddHost;

  @override
  State<HostTeamAddHostSheet> createState() => _HostTeamAddHostSheetState();
}

class _HostTeamAddHostSheetState extends State<HostTeamAddHostSheet> {
  final _controller = TextEditingController();
  bool _saving = false;
  String? _errorMessage;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final phone = _controller.text.trim();
    if (phone.isEmpty || _saving) return;
    setState(() {
      _saving = true;
      _errorMessage = null;
    });
    var added = false;
    try {
      await (widget.onAddHost ?? _noopAddHost)(phone);
      added = true;
    } catch (error) {
      if (mounted) {
        setState(() {
          _errorMessage = appErrorMessage(
            error,
            l10n: context.l10n,
            context: AppErrorContext.organizer,
          );
        });
      }
      return;
    } finally {
      if (mounted && !added) {
        setState(() {
          _saving = false;
        });
      }
    }
    if (!mounted) return;
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final isSaving = widget.actionState.isSaving || _saving;
    final errorMessage = _errorMessage ?? widget.actionState.errorMessage;

    return CatchSheet.standard(
      title: context.l10n.hostsHostTeamManagementSectionTitleAddHost,
      subtitle: context
          .l10n
          .hostsHostTeamManagementSectionSubtitleEnterThePhoneNumber,
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,
        label: context.l10n.hostsHostTeamManagementSectionLabelAddHost,
        onPressed: isSaving ? null : () => unawaited(_submit()),
        status: (isSaving) ? CatchButtonStatus.loading : CatchButtonStatus.idle,

        leading: Icon(CatchIcons.addPerson),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CatchFieldLanes.single(
            child: CatchField.input(
              copy: catchFieldCopy(context.l10n),
              title:
                  context.l10n.hostsHostTeamManagementSectionTitlePhoneNumber,
              contract: CatchContractConstraints
                  .addClubHostCallablePayloadPhoneNumber,
              controller: _controller,
              leading: Icon(CatchIcons.phone),
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => unawaited(_submit()),
            ),
          ),
          if (errorMessage != null) ...[
            gapH12,
            CatchBanner.error(message: errorMessage),
          ],
        ],
      ),
    );
  }
}

MutationState? _firstErrorMutation(Iterable<MutationState> mutations) {
  for (final mutation in mutations) {
    if (mutation.hasError) return mutation;
  }
  return null;
}
