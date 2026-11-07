import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/parts/event_catch_format.dart';
import 'package:catch_dating_app/hosts/people/compose_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// The compose screen in board order: who it is from, New message, the
/// audience row with Change, the message, and the event it goes to.
class HostComposeBody extends StatelessWidget {
  const HostComposeBody({
    super.key,
    required this.state,
    required this.organizerName,
    required this.audience,
    required this.message,
    required this.onAudience,
    required this.onEvent,
    required this.onRetry,
    this.sending = false,
  });

  final HostComposeState state;
  final String organizerName;
  final HostComposeAudience audience;

  /// The message being written.
  final TextEditingController message;
  final ValueChanged<HostComposeAudience> onAudience;
  final ValueChanged<Event> onEvent;
  final VoidCallback onRetry;
  final bool sending;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final heading = CatchStack(
      gap: CatchStackGap.g4,
      children: [
        CatchText(
          l10n.hostPeopleComposeFrom(name: organizerName),
          variant: CatchTextVariant.labelKicker,
          tone: CatchTextTone.secondary,
        ),
        CatchText(
          l10n.hostPeopleComposeTitle,
          variant: CatchTextVariant.pageTitle,
        ),
      ],
    );
    final event = state.event;
    final Widget content = switch (state.status) {
      HostComposeStatus.loading => const CatchLoadingIndicator(),
      HostComposeStatus.error => CatchErrorState(
        title: l10n.hostPeopleComposeErrorTitle,
        message: l10n.hostPeopleComposeErrorBody,
        retryLabel: l10n.hostPeopleRetry,
        onRetry: onRetry,
        mode: CatchErrorStateMode.inline,
      ),
      HostComposeStatus.noEvent => CatchEmptyState(
        icon: CatchIcons.event,
        title: l10n.hostPeopleComposeNoEventTitle,
        message: l10n.hostPeopleComposeNoEventBody,
      ),
      HostComposeStatus.ready => CatchStack(
        gap: CatchStackGap.g16,
        children: [
          CatchMenu<HostComposeAudience>.anchored(
            items: [
              for (final option in HostComposeAudience.values)
                CatchMenuItem(
                  value: option,
                  label: hostComposeAudienceLabel(l10n, option),
                  sublabel: l10n.hostPeopleComposePeople(
                    count: state.recipients(option),
                  ),
                  selected: option == audience,
                  variant: CatchMenuItemVariant.choice,
                ),
            ],
            onSelected: (option, _) => onAudience(option),
            builder: (context, controller, _) => CatchIndexRow(
              key: const ValueKey<String>('host-compose-audience'),
              title: hostComposeAudienceLabel(l10n, audience),
              subtitle: l10n.hostPeopleComposePeople(
                count: state.recipients(audience),
              ),
              icon: CatchIcons.people,
              action: CatchIndexRowAction(
                label: l10n.hostPeopleChange,
                onPressed: sending ? null : controller.open,
              ),
              onTap: null,
            ),
          ),
          CatchFieldLanes.single(
            child: CatchField.input(
              key: const ValueKey<String>('host-compose-message'),
              copy: catchFieldCopy(l10n),
              title: l10n.hostPeopleComposeMessage,
              contract: CatchContractConstraints
                  .sendEventBroadcastCallablePayloadBody,
              controller: message,
              placeholder: l10n.hostPeopleComposePlaceholder,
              minLines: 5,
              maxLines: 5,
              states: {if (sending) WidgetState.disabled},
              textCapitalization: TextCapitalization.sentences,
            ),
          ),
          if (event != null)
            CatchStack(
              gap: CatchStackGap.g4,
              children: [
                CatchText(
                  l10n.hostPeopleComposeEvent,
                  variant: CatchTextVariant.labelAction,
                ),
                CatchMenu<Event>.anchored(
                  items: [
                    for (final option in state.events)
                      CatchMenuItem(
                        value: option,
                        label: option.title,
                        sublabel: AppTimeFormatters.weekdayDayMonth(
                          option.startTime,
                        ),
                        selected: option.id == event.id,
                        variant: CatchMenuItemVariant.choice,
                      ),
                  ],
                  onSelected: (option, _) => onEvent(option),
                  builder: (context, controller, _) => CatchIndexRow(
                    key: const ValueKey<String>('host-compose-event'),
                    title: event.title,
                    subtitle: hostComposeEventLine(context, event),
                    date: CatchIndexRowDate(
                      day: AppTimeFormatters.shortWeekday(event.startTime),
                      date: '${event.startTime.day}',
                      format: catchFormatForActivity(event.activityKind),
                    ),
                    action: state.events.length > 1
                        ? CatchIndexRowAction(
                            label: l10n.hostPeopleChange,
                            onPressed: sending ? null : controller.open,
                          )
                        : null,
                    onTap: null,
                  ),
                ),
              ],
            ),
        ],
      ),
    };
    return CatchPageBody(
      child: CatchStack(gap: CatchStackGap.g16, children: [heading, content]),
    );
  }
}

/// The audience row's title.
String hostComposeAudienceLabel(
  AppLocalizations l10n,
  HostComposeAudience audience,
) => switch (audience) {
  HostComposeAudience.booked => l10n.hostPeopleComposeBooked,
  HostComposeAudience.waitlist => l10n.hostPeopleComposeWaitlist,
  HostComposeAudience.everyone => l10n.hostPeopleComposeEveryone,
};

/// "7:30 PM · Harbour Room".
String hostComposeEventLine(BuildContext context, Event event) {
  final time = DateFormat.jm(
    Localizations.localeOf(context).toLanguageTag(),
  ).format(event.startTime);
  return event.locationName.trim().isEmpty
      ? time
      : '$time · ${event.locationName}';
}
