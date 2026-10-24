import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_runtime_draft.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_runtime_sender.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Explicit channel order with named, server-reviewed sender choices.
class EventAssistanceRuntimeChannelsSection extends StatelessWidget {
  const EventAssistanceRuntimeChannelsSection({
    super.key,
    required this.draft,
    required this.choices,
    required this.moreRoutes,
    required this.enabled,
    required this.onChanged,
    required this.onMore,
    this.loadingRoute,
  });
  final AssistanceRuntimeDraft draft;
  final List<AssistanceRuntimeSenderChoice> choices;
  final Set<AssistanceMessageRoute> moreRoutes;
  final AssistanceMessageRoute? loadingRoute;
  final bool enabled;
  final ValueChanged<AssistanceRuntimeDraft> onChanged;
  final ValueChanged<AssistanceMessageRoute> onMore;
  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final channelFields = <Widget>[];
    for (var index = 0; index < 3 && index <= draft.routes.length; index++) {
      final saved = index < draft.routes.length ? draft.routes[index] : null;
      final selected = saved == null
          ? null
          : choices
                .where(
                  (choice) =>
                      choice.route == saved.route &&
                      choice.senderId == saved.senderId,
                )
                .firstOrNull;
      final options = <String, AssistanceRuntimeSenderChoice>{
        for (final choice in choices)
          if (choice.canSelect &&
              !draft.routes.indexed.any(
                (route) => route.$1 != index && route.$2.route == choice.route,
              ))
            '${choice.route.name}:${choice.senderId}': choice,
      };
      final selectedId = selected == null
          ? null
          : '${selected.route.name}:${selected.senderId}';
      channelFields.add(
        CatchFieldLanes.single(
          child: CatchField<String>.select(
            copy: catchFieldCopy(l),
            key: ValueKey('runtime.channel.$index'),
            title: [
              l.eventAssistanceRuntimeFirst,
              l.eventAssistanceRuntimeSecond,
              l.eventAssistanceRuntimeThird,
            ][index],
            contractExemption:
                'Maps reviewed eligible sender identities to a unique ordered runtime route list; labels never become sender IDs.',
            values: ['off', ...options.keys],
            value: saved == null
                ? 'off'
                : options.containsKey(selectedId)
                ? selectedId
                : null,
            itemLabelBuilder: (value) => value == 'off'
                ? l.eventAssistanceRuntimeNone
                : runtimeSenderLabel(l, options[value]!),
            helperText: saved == null
                ? null
                : selected == null || !selected.canSelect
                ? l.eventAssistanceRuntimeSenderMissing
                : selected.displayAddress,
            onChanged: enabled
                ? (value) {
                    if (value != null) {
                      onChanged(
                        draft.withRoute(
                          index,
                          value == 'off' ? null : options[value]!,
                        ),
                      );
                    }
                  }
                : null,
            states: {if (!enabled) WidgetState.disabled},
          ),
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          l.eventAssistanceRuntimeChannels,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        gapH8,
        CatchText(
          l.eventAssistanceRuntimeChannelBody,
          variant: CatchTextVariant.supporting,
        ),
        CatchSection.fieldRows(first: true, children: channelFields),
        if (choices.every((c) => !c.canSelect)) ...[
          gapH12,
          CatchText(
            l.eventAssistanceRuntimeNoSenders,
            variant: CatchTextVariant.supporting,
          ),
        ],
        for (final c in choices.where((c) => !c.canSelect)) ...[
          gapH8,
          CatchText(
            '${runtimeSenderLabel(l, c)}\n${runtimeSenderIssue(l, c.availability)}',
            variant: CatchTextVariant.supporting,
          ),
        ],
        for (final route in moreRoutes)
          CatchButton(
            key: ValueKey('runtime.more.${route.name}'),
            label: switch (route) {
              AssistanceMessageRoute.catchEventSms =>
                l.eventAssistanceRuntimeMoreSms,
              AssistanceMessageRoute.catchEventRcs =>
                l.eventAssistanceRuntimeMoreRcs,
              AssistanceMessageRoute.organizerEventWhatsapp =>
                l.eventAssistanceRuntimeMoreWhatsapp,
            },
            variant: CatchButtonVariant.ghost,
            onPressed: enabled && loadingRoute == null
                ? () => onMore(route)
                : null,
          ),
        if (loadingRoute != null) const CatchLoadingIndicator(),
      ],
    );
  }
}
