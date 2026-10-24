import 'dart:async';

import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/responsive/component_breakpoints.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_invite_link.dart';
import 'package:catch_dating_app/events/domain/event_private_access.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_invite_link_state.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_manage_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_loading_skeleton.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/app_deep_links.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HostPrivateAccessAsyncBoundary extends StatelessWidget {
  const HostPrivateAccessAsyncBoundary({
    super.key,
    required this.club,
    required this.event,
    required this.accessAsync,
    required this.inviteLinksAsync,
    required this.shareMutation,
    required this.inviteLinksListState,
    required this.inviteLinksMutationError,
    required this.onRetryPrivateAccess,
    required this.onRetryInviteLinks,
    required this.onSharePrivateLink,
    required this.onCreateInviteLink,
    required this.onCopyInviteLink,
    required this.onDisableInviteLink,
  });

  final Club club;
  final Event event;
  final AsyncValue<EventPrivateAccess?> accessAsync;
  final AsyncValue<List<EventInviteLink>> inviteLinksAsync;
  final MutationState<dynamic> shareMutation;
  final HostInviteLinksListDisplayState inviteLinksListState;
  final Object? inviteLinksMutationError;
  final VoidCallback onRetryPrivateAccess;
  final VoidCallback onRetryInviteLinks;
  final ValueChanged<String> onSharePrivateLink;
  final Future<void> Function(HostInviteLinkDraft draft) onCreateInviteLink;
  final void Function(EventInviteLink link) onCopyInviteLink;
  final void Function(EventInviteLink link) onDisableInviteLink;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchAsyncBoundary<EventPrivateAccess?>(
      value: accessAsync,
      onRetry: onRetryPrivateAccess,
      loadingBuilder: (_) => HostPrivateAccessSurface(
        child: Row(
          children: [
            const HostInlineIconSkeleton(),
            gapW12,
            Expanded(
              child: CatchText(
                context.l10n.hostsHostEventManageScreenTextLoadingInviteAccess,
                maxLines: 1,

                variant: CatchTextVariant.supporting,
                color: t.ink2,
              ),
            ),
          ],
        ),
      ),
      errorBuilder: (_, error, _, onBoundaryRetry) => CatchLocalizedErrorState(
        error,
        context: AppErrorContext.event,
        mode: CatchErrorStateMode.compact,
        onRetry: onBoundaryRetry,
      ),
      builder: (context, access) {
        final privateAccessState = HostPrivateAccessDisplayState.resolve(
          l10n: context.l10n,
          access: access,
          inviteLinksState: catchAsyncStateFromAsyncValue(inviteLinksAsync),
          inviteLink: hostEventInviteUrl(
            clubId: club.id,
            eventId: event.id,
            inviteCode: access?.inviteCode,
          ),
          sharePending: shareMutation.isPending,
        );
        return HostPrivateAccessSection(
          event: event,
          state: privateAccessState,
          inviteLinksAsync: inviteLinksAsync,
          shareMutation: shareMutation,
          inviteLinksListState: inviteLinksListState,
          inviteLinksMutationError: inviteLinksMutationError,
          onRetryInviteLinks: onRetryInviteLinks,
          onSharePrivateLink: onSharePrivateLink,
          onCreateInviteLink: onCreateInviteLink,
          onCopyInviteLink: onCopyInviteLink,
          onDisableInviteLink: onDisableInviteLink,
        );
      },
    );
  }
}

class HostPrivateAccessSurface extends StatelessWidget {
  const HostPrivateAccessSurface({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return CatchSurface(
      padding: CatchInsets.content,
      borderRole: CatchBorderRole.separator,
      child: child,
    );
  }
}

class HostPrivateAccessSection extends StatelessWidget {
  const HostPrivateAccessSection({
    super.key,
    required this.event,
    required this.state,
    required this.inviteLinksAsync,
    required this.shareMutation,
    required this.inviteLinksListState,
    required this.inviteLinksMutationError,
    required this.onRetryInviteLinks,
    required this.onSharePrivateLink,
    required this.onCreateInviteLink,
    required this.onCopyInviteLink,
    required this.onDisableInviteLink,
  });

  final Event event;
  final HostPrivateAccessDisplayState state;
  final AsyncValue<List<EventInviteLink>> inviteLinksAsync;
  final MutationState<dynamic> shareMutation;
  final HostInviteLinksListDisplayState inviteLinksListState;
  final Object? inviteLinksMutationError;
  final VoidCallback onRetryInviteLinks;
  final ValueChanged<String> onSharePrivateLink;
  final Future<void> Function(HostInviteLinkDraft draft) onCreateInviteLink;
  final void Function(EventInviteLink link) onCopyInviteLink;
  final void Function(EventInviteLink link) onDisableInviteLink;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final privateAccessState = state;
    final linkAction = privateAccessState.linkAction;

    return HostPrivateAccessSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(CatchIcons.keyOutlined, color: t.primary),
              gapW10,
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CatchText(
                      context.l10n.hostsHostEventManageScreenTextPrivateAccess,
                      variant: CatchTextVariant.sectionTitle,
                    ),
                    gapH4,
                    CatchText(
                      privateAccessState.description,
                      variant: CatchTextVariant.supporting,
                      color: t.ink2,
                    ),
                  ],
                ),
              ),
              CatchBadge(
                label: context.l10n.hostsHostEventManageScreenLabelInvite,
                tone: CatchBadgeTone.brand,
              ),
            ],
          ),
          if (privateAccessState.hasInviteCode) ...[
            gapH14,
            HostEventSummaryRow(
              icon: CatchIcons.passwordRounded,
              label: context.l10n.hostsHostEventManageScreenLabelCode,
              value: linkAction.inviteCode!,
            ),
            if (linkAction.inviteLink != null)
              HostEventSummaryRow(
                icon: CatchIcons.linkRounded,
                label: context.l10n.hostsHostEventManageScreenLabelLink,
                value: linkAction.inviteLink!,
                showDivider: false,
              ),
            gapH14,
            CatchButton(
              label:
                  context.l10n.hostsHostEventManageScreenLabelSharePrivateLink,
              onPressed: !linkAction.canShare
                  ? null
                  : () => onSharePrivateLink(linkAction.inviteLink!),
              variant: CatchButtonVariant.secondary,
              leading: Icon(
                CatchIcons.platformShare(platform: Theme.of(context).platform),
              ),
              status: (shareMutation.isPending)
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              fullWidth: true,
            ),
            gapH18,
            HostInviteLinksSection(
              event: event,
              inviteCode: linkAction.inviteCode!,
              linksAsync: inviteLinksAsync,
              state: inviteLinksListState,
              mutationError: inviteLinksMutationError,
              onRetry: onRetryInviteLinks,
              onCreateInviteLink: onCreateInviteLink,
              onCopyInviteLink: onCopyInviteLink,
              onDisableInviteLink: onDisableInviteLink,
            ),
          ],
        ],
      ),
    );
  }
}

class HostInviteLinksSection extends StatelessWidget {
  const HostInviteLinksSection({
    super.key,
    required this.event,
    required this.inviteCode,
    required this.linksAsync,
    required this.state,
    required this.mutationError,
    required this.onRetry,
    required this.onCreateInviteLink,
    required this.onCopyInviteLink,
    required this.onDisableInviteLink,
  });

  final Event event;
  final String inviteCode;
  final AsyncValue<List<EventInviteLink>> linksAsync;
  final HostInviteLinksListDisplayState state;
  final Object? mutationError;
  final VoidCallback onRetry;
  final Future<void> Function(HostInviteLinkDraft draft) onCreateInviteLink;
  final void Function(EventInviteLink link) onCopyInviteLink;
  final void Function(EventInviteLink link) onDisableInviteLink;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final button = CatchButton(
      label: context.l10n.hostsHostEventManageScreenLabelNewLink,
      onPressed: state.isMutating
          ? null
          : () => unawaited(_createNamedLink(context)),
      variant: CatchButtonVariant.secondary,
      leading: Icon(CatchIcons.addRounded),
      status: (state.createPending)
          ? CatchButtonStatus.loading
          : CatchButtonStatus.idle,
    );
    final heading = Text(
      context.l10n.hostsHostEventManageScreenTextNamedInviteLinks,
      style: CatchTextStyles.labelL(context),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchViewport.atWidth(
          breakpoint: ComponentBreakpoints.hostInviteLinksHeaderStackBreakpoint,
          compactBuilder: (context) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              heading,
              gapH10,
              Align(alignment: Alignment.centerLeft, child: button),
            ],
          ),
          expandedBuilder: (context) => Row(
            children: [
              Expanded(child: heading),
              button,
            ],
          ),
        ),
        gapH6,
        CatchText(
          context.l10n.hostsHostEventManageScreenTextTrackWhichChannelsCreate,
          variant: CatchTextVariant.supporting,
          color: t.ink2,
        ),
        if (mutationError != null) ...[
          gapH12,
          CatchLocalizedErrorBanner(
            mutationError!,
            context: AppErrorContext.event,
          ),
        ],
        gapH12,
        CatchAsyncBoundary<List<EventInviteLink>>(
          value: linksAsync,
          onRetry: onRetry,
          loadingBuilder: (_) => CatchText(
            context.l10n.hostsHostEventManageScreenTextLoadingInviteLinks,
            variant: CatchTextVariant.supporting,
            color: t.ink2,
          ),
          errorBuilder: (_, error, _, onBoundaryRetry) =>
              CatchLocalizedErrorState(
                error,
                context: AppErrorContext.event,
                mode: CatchErrorStateMode.compact,
                onRetry: onBoundaryRetry,
              ),
          builder: (context, links) => links.isEmpty
              ? CatchText(
                  state.emptyCopy,
                  variant: CatchTextVariant.supporting,
                  color: t.ink2,
                )
              : Column(
                  children: [
                    for (final link in links)
                      HostInviteLinkRow(
                        event: event,
                        inviteCode: inviteCode,
                        link: link,
                        actionsDisabled: state.isMutating,
                        onCopyInviteLink: onCopyInviteLink,
                        onDisableInviteLink: onDisableInviteLink,
                      ),
                  ],
                ),
        ),
      ],
    );
  }

  Future<void> _createNamedLink(BuildContext context) async {
    final draft = await _showInviteLinkDialog(context);
    if (draft == null) return;
    if (!context.mounted) return;
    await onCreateInviteLink(draft);
  }
}

class HostInviteLinkRow extends StatelessWidget {
  const HostInviteLinkRow({
    super.key,
    required this.event,
    required this.inviteCode,
    required this.link,
    required this.actionsDisabled,
    required this.onCopyInviteLink,
    required this.onDisableInviteLink,
  });

  final Event event;
  final String inviteCode;
  final EventInviteLink link;
  final bool actionsDisabled;
  final void Function(EventInviteLink link) onCopyInviteLink;
  final void Function(EventInviteLink link) onDisableInviteLink;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final rowState = HostInviteLinkRowDisplayState.resolve(
      link: link,
      url: hostEventInviteUrl(
        clubId: event.clubId,
        eventId: event.id,
        inviteCode: inviteCode,
        inviteLinkId: link.id,
      )!,
      actionsDisabled: actionsDisabled,
    );
    final details = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: CatchSpacing.s2,
          runSpacing: CatchSpacing.s1,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(rowState.label, style: CatchTextStyles.labelL(context)),
            if (rowState.showDisabledBadge)
              CatchBadge(
                label: context.l10n.hostsHostEventManageScreenLabelDisabled,
              ),
          ],
        ),
        if (rowState.source != null) ...[
          gapH2,
          CatchText(
            rowState.source!,
            maxLines: 1,

            variant: CatchTextVariant.supporting,
            color: t.ink2,
          ),
        ],
        gapH8,
        CatchText(
          rowState.stats,
          maxLines: 2,

          variant: CatchTextVariant.supporting,
          color: t.ink2,
        ),
      ],
    );
    final actions = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Tooltip(
          message: context.l10n.hostsHostEventManageScreenMessageCopyLink,
          child: CatchIconAction(
            onPressed: rowState.actionsDisabled
                ? null
                : () => onCopyInviteLink(link),
            status: (rowState.actionsDisabled)
                ? CatchIconActionStatus.disabled
                : CatchIconActionStatus.enabled,
            child: Icon(CatchIcons.contentCopyRounded, size: CatchIcon.sm),
          ),
        ),
        if (rowState.showDisableAction) ...[
          gapW8,
          Tooltip(
            message: context.l10n.hostsHostEventManageScreenMessageDisableLink,
            child: CatchIconAction(
              onPressed: rowState.actionsDisabled
                  ? null
                  : () => onDisableInviteLink(link),
              status: (rowState.actionsDisabled)
                  ? CatchIconActionStatus.disabled
                  : CatchIconActionStatus.enabled,
              child: Icon(
                CatchIcons.hourglassDisabledRounded,
                size: CatchIcon.sm,
              ),
            ),
          ),
        ],
      ],
    );
    return Padding(
      padding: CatchInsets.sectionItemBottomGap,
      child: CatchSurface(
        padding: CatchInsets.contentDense,
        borderRole: CatchBorderRole.separator,
        child: CatchViewport.atWidth(
          breakpoint: ComponentBreakpoints.hostInviteLinkRowStackBreakpoint,
          compactBuilder: (context) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              details,
              gapH10,
              Align(alignment: Alignment.centerRight, child: actions),
            ],
          ),
          expandedBuilder: (context) => Row(
            children: [
              Expanded(child: details),
              gapW8,
              actions,
            ],
          ),
        ),
      ),
    );
  }
}

Future<HostInviteLinkDraft?> _showInviteLinkDialog(BuildContext context) async {
  final labelController = TextEditingController();
  final sourceController = TextEditingController();
  try {
    return showDialog<HostInviteLinkDraft>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) {
          final label = labelController.text.trim();
          final source = sourceController.text.trim();
          return CatchDialog(
            title: context.l10n.hostsHostEventManageScreenTitleNewInviteLink,
            actions: [
              CatchButton.text(
                label: context.l10n.hostsHostEventManageScreenLabelCancel,
                onPressed: () => Navigator.of(context).pop(),
              ),
              CatchButton.text(
                label: context.l10n.hostsHostEventManageScreenLabelCreate,
                onPressed: label.isEmpty
                    ? null
                    : () => Navigator.of(context).pop(
                        HostInviteLinkDraft(
                          label: label,
                          source: source.isEmpty ? null : source,
                        ),
                      ),
              ),
            ],
            child: CatchFieldLanes.custom(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CatchField.input(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.hostsHostEventManageScreenTitleLabel,
                    contract: CatchContractConstraints
                        .createEventInviteLinkCallablePayloadLabel,
                    controller: labelController,
                    placeholder: context
                        .l10n
                        .hostsHostEventManageScreenPlaceholderInstagramBio,
                    textCapitalization: TextCapitalization.words,
                    onChanged: (_) => setState(() {}),
                  ),
                  gapH12,
                  CatchField.input(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.hostsHostEventManageScreenTitleSource,
                    contract: CatchContractConstraints
                        .createEventInviteLinkCallablePayloadSource,
                    labelMode: CatchFieldLabelTextMode.optional,
                    controller: sourceController,
                    placeholder: context
                        .l10n
                        .hostsHostEventManageScreenPlaceholderInstagram,
                    onChanged: (_) => setState(() {}),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  } finally {
    labelController.dispose();
    sourceController.dispose();
  }
}

String? hostEventInviteUrl({
  required String clubId,
  required String eventId,
  required String? inviteCode,
  String? inviteLinkId,
}) {
  final normalizedInviteCode = inviteCode?.trim();
  if (normalizedInviteCode == null || normalizedInviteCode.isEmpty) {
    return null;
  }
  return AppDeepLinks.event(
    clubId: clubId,
    eventId: eventId,
    inviteCode: normalizedInviteCode,
    inviteLinkId: inviteLinkId,
  ).toString();
}
