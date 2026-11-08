import 'package:catch_dating_app/hosts/events/event_publish_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Who can see and book: Everyone, or only the organizer's team while the
/// event is unpublished. A choice saves as soon as it is made.
class HostEventPublishBody extends StatelessWidget {
  const HostEventPublishBody({
    super.key,
    required this.state,
    required this.onPublished,
    required this.onRetry,
    this.saving = false,
  });

  final HostEventPublishState state;
  final ValueChanged<bool> onPublished;
  final VoidCallback onRetry;

  /// The publication command is on its way.
  final bool saving;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case HostEventPublishStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case HostEventPublishStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostEventsWorkspaceErrorTitle,
            message: l10n.hostEventsErrorBody,
            retryLabel: l10n.hostEventsRetry,
            onRetry: onRetry,
          ),
        );
      case HostEventPublishStatus.missing:
        return CatchPageBody.screen(
          child: CatchEmptyState(
            icon: CatchIcons.eventUnavailable,
            title: l10n.hostEventsPublishPendingTitle,
            message: l10n.hostEventsPublishPendingBody,
          ),
        );
      case HostEventPublishStatus.ready:
        break;
    }
    final canChoose = !saving && state.setupRevision != null;
    return CatchPageBody.screen(
      child: CatchStack(
        gap: CatchStackGap.g8,
        children: [
          CatchText(
            l10n.hostEventsPublishWhoCanFind,
            variant: CatchTextVariant.labelAction,
          ),
          CatchChoiceTile(
            key: const ValueKey<String>('host-event-publish-everyone'),
            variant: CatchChoiceTileVariant.row,
            title: l10n.hostEventsPublishEveryone,
            subtitle: state.published || state.canPublish
                ? l10n.hostEventsPublishEveryoneBody
                : l10n.hostEventsPublishNotReady,
            selected: state.published,
            contractExemption:
                'A publication choice committed by its own command.',
            onTap: canChoose && !state.published && state.canPublish
                ? () => onPublished(true)
                : null,
          ),
          CatchChoiceTile(
            key: const ValueKey<String>('host-event-publish-team'),
            variant: CatchChoiceTileVariant.row,
            title: l10n.hostEventsPublishTeam,
            subtitle: l10n.hostEventsPublishTeamBody,
            selected: !state.published,
            contractExemption:
                'A publication choice committed by its own command.',
            onTap: canChoose && state.published
                ? () => onPublished(false)
                : null,
          ),
        ],
      ),
    );
  }
}
