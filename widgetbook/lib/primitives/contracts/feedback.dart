import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchErrorState,
  path: '[Core primitives]/Feedback',
)
Widget catchErrorStateContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchErrorState',
    contractId: 'catch.error_state',
    states: const [
      'full-screen',
      'inline',
      'compact',
      'from-error',
      'with-retry',
      'secondary-action',
      'scaffold',
      'sliver',
      'icon',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'full-screen',
        child: SizedBox(
          height: WidgetbookPreviewLayout.stateViewportHeight,
          child: CatchErrorState(
            retryLabel: context.l10n.sharedActionTryAgain,
            title: 'Unable to load events',
            message: 'Check your connection and try again.',
            onRetry: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'inline',
        child: CatchErrorState(
          retryLabel: context.l10n.sharedActionTryAgain,
          title: 'Section failed',
          message: 'The recommendations rail could not refresh.',
          mode: CatchErrorStateMode.inline,
          onRetry: widgetbookNoop,
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'compact',
        child: CatchErrorState(
          title: 'Not available',
          message: 'This event is no longer open.',
          mode: CatchErrorStateMode.compact,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'from-error',
        child: CatchLocalizedErrorState(
          StateError('No connection'),
          mode: CatchErrorStateMode.inline,
          onRetry: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-retry',
        child: CatchErrorState(
          retryLabel: context.l10n.sharedActionTryAgain,
          title: 'Feed unavailable',
          message: 'Try refreshing the feed.',
          mode: CatchErrorStateMode.inline,
          onRetry: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'secondary-action',
        child: CatchErrorState(
          retryLabel: context.l10n.sharedActionTryAgain,
          title: 'Could not save',
          message: 'Your changes are still local.',
          mode: CatchErrorStateMode.inline,
          onRetry: widgetbookNoop,
          actions: [
            CatchButton(
              label: 'Dismiss',
              variant: CatchButtonVariant.secondary,
              onPressed: widgetbookNoop,
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'scaffold',
        child: SizedBox(
          height: WidgetbookPreviewLayout.routeViewportHeight,
          child: CatchErrorScaffold(
            retryLabel: context.l10n.sharedActionTryAgain,
            title: 'Profile unavailable',
            message: 'We could not load this profile right now.',
            onRetry: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'sliver',
        child: SizedBox(
          height: WidgetbookPreviewLayout.routeViewportHeight,
          child: CustomScrollView(
            slivers: [
              CatchSliverErrorState(
                retryLabel: context.l10n.sharedActionTryAgain,
                title: 'Feed unavailable',
                message: 'Try refreshing the feed.',
                onRetry: widgetbookNoop,
                fillRemaining: false,
              ),
            ],
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'icon',
        child: CatchIconTile.error(),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchEmptyState,
  path: '[Core primitives]/Feedback',
)
Widget catchEmptyStateContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchEmptyState',
    contractId: 'catch.empty_state',
    states: const [
      'stacked',
      'inline',
      'surface',
      'bubble-icon',
      'with-action',
      'title-only',
      'message-only',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'stacked',
        child: CatchEmptyState(
          icon: CatchIcons.event,
          title: 'No events yet',
          message: 'Follow a host to see upcoming plans.',
        ),
      ),
      WidgetbookContractStateCard(
        label: 'inline',
        child: CatchEmptyState(
          icon: CatchIcons.search,
          title: 'No matches',
          message: 'Try widening your filters.',
          variant: CatchEmptyStateVariant.inline,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'surface',
        child: CatchEmptyState(
          icon: CatchIcons.people,
          title: 'Private roster',
          message: 'Attendees appear after you join.',
          surface: true,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'bubble-icon',
        child: CatchEmptyState(
          icon: CatchIcons.people,
          title: 'Private roster',
          iconVariant: CatchIconTileVariant.bubble,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-action',
        child: CatchEmptyState(
          icon: CatchIcons.event,
          title: 'No events yet',
          message: 'Follow a host to see upcoming plans.',
          actions: [
            CatchButton(label: 'Explore hosts', onPressed: widgetbookNoop),
          ],
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'title-only',
        child: CatchEmptyState(title: 'Nothing here yet'),
      ),
      const WidgetbookContractStateCard(
        label: 'message-only',
        child: CatchEmptyState(message: 'Try changing your filters.'),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchBanner,
  path: '[Core primitives]/Feedback',
)
Widget catchBannerContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchBanner',
    contractId: 'catch.banner',
    states: const [
      'primary',
      'success',
      'warning',
      'danger',
      'neutral',
      'with-title',
      'with-action',
      'inline',
      'from-error',
      'with-retry',
    ],
    children: [
      for (final tone in CatchBannerTone.values)
        WidgetbookContractStateCard(
          label: tone.name,
          child: CatchBanner(
            message: 'Your event details are up to date.',
            tone: tone,
          ),
        ),
      const WidgetbookContractStateCard(
        label: 'with-title',
        child: CatchBanner(
          title: 'Host tip',
          message: 'Keep the first message short and specific.',
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-action',
        child: CatchBanner(
          message: 'Review your booking.',
          actions: [CatchButton.text(label: 'View', onPressed: widgetbookNoop)],
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'inline',
        child: CatchBanner.error(message: 'Card details could not be saved.'),
      ),
      WidgetbookContractStateCard(
        label: 'from-error',
        child: CatchLocalizedErrorBanner(Exception('Booking failed.')),
      ),
      WidgetbookContractStateCard(
        label: 'with-retry',
        child: CatchLocalizedErrorBanner(
          Exception('Booking failed. Try once more.'),
          onRetry: widgetbookNoop,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchNotice,
  path: '[Core primitives]/Feedback',
)
Widget catchNoticeContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchNotice',
    contractId: 'catch.notice',
    states: const [
      'status',
      'success',
      'warning',
      'danger',
      'event',
      'with-action',
      'dismissible',
      'arrival-tap-to-open',
      'arrival-swipe-to-dismiss',
      'arrival-reduced-motion',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'status',
        child: CatchNotice(
          dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
          notice: const CatchNoticeData(
            id: 'status',
            title: 'Event updated',
            message: 'The start time moved to 7:30 PM.',
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'success',
        child: CatchNotice(
          dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
          notice: const CatchNoticeData(
            id: 'success',
            title: 'Booking confirmed',
            tone: CatchNoticeTone.success,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'warning',
        child: CatchNotice(
          dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
          notice: const CatchNoticeData(
            id: 'warning',
            title: 'Update paused',
            tone: CatchNoticeTone.warning,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'danger',
        child: CatchNotice(
          dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
          notice: const CatchNoticeData(
            id: 'danger',
            title: 'Payment failed',
            message: 'Try a different card.',
            tone: CatchNoticeTone.danger,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'event',
        child: CatchNotice(
          dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
          notice: const CatchNoticeData(
            id: 'event',
            title: 'Event starts soon',
            message: 'Arrive by 7:20 PM.',
            tone: CatchNoticeTone.event,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-action',
        child: CatchNotice(
          dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
          notice: CatchNoticeData(
            id: 'action',
            title: 'Important update to your upcoming event',
            message:
                'The meeting location has moved to the north entrance. Your booking is unchanged.',
            actionLabel: 'Review updated event details',
            onAction: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'dismissible',
        child: CatchNotice(
          dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
          notice: const CatchNoticeData(
            id: 'dismissible',
            title: 'Preferences saved',
            tone: CatchNoticeTone.success,
          ),
          onDismiss: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'arrival-tap-to-open',
        child: CatchNotice(
          dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
          notice: CatchNoticeData.arrival(
            id: 'arrival-open',
            title: 'Ananya Rao',
            message: 'I’ll bring two friends next Sunday.',
            onOpen: widgetbookNoop,
          ),
          onDismiss: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'arrival-swipe-to-dismiss',
        child: CatchNotice(
          dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
          notice: CatchNoticeData.arrival(
            id: 'arrival-dismiss',
            title: 'New message',
            message: 'Swipe this notice to dismiss it.',
            onOpen: widgetbookNoop,
          ),
          onDismiss: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'arrival-reduced-motion',
        child: MediaQuery(
          data: MediaQuery.of(context).copyWith(disableAnimations: true),
          child: CatchNotice(
            dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
            notice: CatchNoticeData.arrival(
              id: 'arrival-reduced-motion',
              title: 'New message',
              message: 'Reduced motion uses the same accessible actions.',
              onOpen: widgetbookNoop,
            ),
            onDismiss: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Persistent status states',
  type: CatchBanner,
  path: '[Core primitives]/Feedback',
)
Widget catchBannerStatusContractStates(BuildContext context) {
  final t = CatchTokens.of(context);
  final offline = CatchBannerStatus(
    id: 'offline',
    label: context.l10n.sharedOfflineTitle,
    message: context.l10n.sharedOfflineBody,
    icon: CatchIcons.offline,
    color: t.warning,
  );
  final rehearsal = CatchBannerStatus(
    id: 'rehearsal',
    label: context.l10n.hostEventRehearsalBadge,
    message: context.l10n.hostEventRehearsalSyntheticGuests,
    icon: CatchIcons.people,
    color: t.danger,
    actions: [
      CatchBannerAction(
        label: context.l10n.hostEventRehearsalClockPill(time: '5:00 PM'),
        onPressed: widgetbookNoop,
      ),
      CatchBannerAction(
        label: context.l10n.hostEventRehearsalPracticeTools,
        icon: CatchIcons.more,
        onPressed: widgetbookNoop,
      ),
    ],
  );
  return WidgetbookContractFrame(
    title: 'CatchBanner.statuses',
    contractId: 'catch.banner',
    states: const ['offline', 'rehearsal', 'stacked', 'empty'],
    children: [
      WidgetbookContractStateCard(
        label: 'offline',
        child: CatchBanner.statuses(statuses: [offline]),
      ),
      WidgetbookContractStateCard(
        label: 'rehearsal',
        child: CatchBanner.statuses(statuses: [rehearsal]),
      ),
      WidgetbookContractStateCard(
        label: 'stacked',
        child: CatchBanner.statuses(statuses: [rehearsal, offline]),
      ),
      const WidgetbookContractStateCard(
        label: 'empty',
        child: CatchBanner.statuses(statuses: []),
      ),
    ],
  );
}
