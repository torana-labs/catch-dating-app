import 'package:catch_dating_app/contexts/live/domain/event_sender_preference.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/event_success/presentation/event_message_channel_accordion.dart';
import 'package:catch_dating_app/event_success/presentation/event_message_preference_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_sender_preference_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventMessageSenderSection extends ConsumerWidget {
  const EventMessageSenderSection({super.key, required this.scope});
  final EventSenderPreferenceScope scope;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = eventSenderPreferenceControllerProvider(scope);
    final state = ref.watch(provider);
    final owner = ref.read(provider.notifier);
    final l = context.l10n;
    final channel = switch (scope.channel) {
      EventSenderChannel.sms => EventMessageChannel.sms,
      EventSenderChannel.whatsapp => EventMessageChannel.whatsapp,
      EventSenderChannel.rcs => EventMessageChannel.rcs,
    };
    void run(Future<Object?> Function() action) =>
        runEventMessageAction(context, action);
    final Widget child;
    final String summary;
    var pending = false;
    switch (state) {
      case EventSenderPreferenceLoading():
        summary = l.eventMessagesLoading;
        child = const CatchLoadingIndicator();
      case EventSenderPreferenceHidden():
        summary = l.eventMessagesUnavailable;
        child = CatchButton(
          label: l.eventMessagesRefresh,
          variant: CatchButtonVariant.quiet,
          onPressed: () => run(owner.refresh),
        );
      case EventSenderPreferenceFailure(:final error):
        summary = l.eventMessagesLoadFailed;
        child = CatchLocalizedErrorBanner(
          error,
          onRetry: () => run(owner.refresh),
        );
      case EventSenderPreferenceReady():
        final review = state.review;
        final senderNavigation = state.navigation;
        final senderIds = senderNavigation.previousSenderIds;
        final selectedIndex = senderIds.indexOf(
          senderNavigation.selectedSenderId ?? '',
        );
        void choose(String id) => runEventMessageAction(
          context,
          () => owner.choose(senderNavigation, id),
        );
        final navigation = Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (senderNavigation.isEarlier &&
                senderNavigation.configuredSenderId != null)
              CatchButton(
                label: l.eventMessagesCurrentSender,
                variant: CatchButtonVariant.secondary,
                onPressed: state.canNavigate
                    ? () => choose(senderNavigation.configuredSenderId!)
                    : null,
              ),
            if (senderIds.isNotEmpty && !senderNavigation.isEarlier)
              CatchButton(
                label: l.eventMessagesOtherSenders,
                variant: CatchButtonVariant.secondary,
                onPressed: state.canNavigate
                    ? () => choose(senderIds.first)
                    : null,
              ),
            if (senderNavigation.isEarlier)
              Wrap(
                spacing: CatchSpacing.s2,
                runSpacing: CatchSpacing.s2,
                children: [
                  if (selectedIndex > 0)
                    CatchButton(
                      label: l.eventMessagesPreviousPermission,
                      variant: CatchButtonVariant.secondary,
                      onPressed: state.canNavigate
                          ? () => choose(senderIds[selectedIndex - 1])
                          : null,
                    ),
                  if (selectedIndex >= 0 &&
                      selectedIndex + 1 < senderIds.length)
                    CatchButton(
                      label: l.eventMessagesNextPermission,
                      variant: CatchButtonVariant.secondary,
                      onPressed: state.canNavigate
                          ? () => choose(senderIds[selectedIndex + 1])
                          : null,
                    ),
                ],
              ),
            if (senderNavigation.canLoadMore)
              CatchButton(
                label: l.eventMessagesMorePermissions,
                variant: CatchButtonVariant.quiet,
                onPressed: state.canNavigate
                    ? () => runEventMessageAction(
                        context,
                        () => owner.loadMore(senderNavigation),
                      )
                    : null,
              ),
          ],
        );
        if (review == null) {
          summary = l.eventMessagesMorePermissions;
          child = navigation;
          break;
        }
        final view = review.view;
        final permission = switch (view.preference) {
          EventSenderPreference.notSet => EventMessagePermission.notSet,
          EventSenderPreference.enabled => EventMessagePermission.enabled,
          EventSenderPreference.disabled => EventMessagePermission.disabled,
          EventSenderPreference.expired => EventMessagePermission.expired,
        };
        pending =
            state.phase == EventSenderPreferencePhase.saving ||
            state.phase == EventSenderPreferencePhase.uncertain;
        summary = pending
            ? l.eventMessagesPending
            : eventMessagePermissionLabel(context, permission);
        child = EventMessagePreferenceSection(
          channel: channel,
          permission: permission,
          availability: switch (view.availability) {
            EventSenderAvailability.ready => EventMessageAvailability.ready,
            EventSenderAvailability.verifyPhone =>
              EventMessageAvailability.verifyPhone,
            EventSenderAvailability.notAdmitted =>
              EventMessageAvailability.notAdmitted,
            EventSenderAvailability.eventClosed =>
              EventMessageAvailability.eventClosed,
            EventSenderAvailability.senderUnavailable =>
              EventMessageAvailability.senderUnavailable,
            EventSenderAvailability.subscriptionUnavailable =>
              EventMessageAvailability.subscriptionUnavailable,
          },
          phase: switch (state.phase) {
            EventSenderPreferencePhase.ready => EventMessageSavePhase.ready,
            EventSenderPreferencePhase.saving => EventMessageSavePhase.saving,
            EventSenderPreferencePhase.uncertain =>
              EventMessageSavePhase.uncertain,
            EventSenderPreferencePhase.refreshRequired =>
              EventMessageSavePhase.refreshRequired,
          },
          notice: switch (state.notice) {
            EventSenderPreferenceNotice.none => EventMessageSaveNotice.none,
            EventSenderPreferenceNotice.saved => EventMessageSaveNotice.saved,
            EventSenderPreferenceNotice.changed =>
              EventMessageSaveNotice.changed,
          },
          consentText: view.consentText,
          senderName: view.senderDisplayName,
          senderPhone: switch (view) {
            EventWhatsappPreferenceView(:final sender) =>
              sender?.displayPhoneNumber,
            EventRcsPreferenceView() || EventSmsSenderPreferenceView() => null,
          },
          phoneLastFour: view.phoneLastFour,
          expiresAt: view.expiresAt,
          earlierSender: state.navigation.isEarlier,
          error: state.error,
          navigation: navigation,
          onEnable: state.canEnable
              ? () => run(() => owner.enable(review))
              : null,
          onDisable: state.canDisable
              ? () => run(() => owner.disable(review))
              : null,
          onRetry: state.canRetry ? () => run(() => owner.retry(review)) : null,
          onRefresh: state.canRefresh ? () => run(owner.refresh) : null,
        );
    }
    return EventMessageChannelAccordion(
      channel: channel,
      summary: summary,
      pending: pending,
      child: child,
    );
  }
}
