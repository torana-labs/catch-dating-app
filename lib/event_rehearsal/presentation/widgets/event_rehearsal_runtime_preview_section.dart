import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_delivery_outcome.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_runtime_draft.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/event_success/event_success.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Practice choices carry route kinds and synthetic receipts, never sender IDs.
class EventRehearsalRuntimePreviewSection extends StatelessWidget {
  const EventRehearsalRuntimePreviewSection({
    super.key,
    required this.draft,
    required this.enabled,
    required this.consumedPrefix,
    required this.onChanged,
    required this.showOutcomes,
  });
  final RehearsalRuntimeDraft draft;
  final bool enabled, showOutcomes;
  final int consumedPrefix;
  final ValueChanged<RehearsalRuntimeDraft> onChanged;
  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final choices = {
      for (final o in rehearsalOutcomeChoices) rehearsalOutcomeKey(o): o,
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!showOutcomes) ...[
          CatchText(
            l.hostEventRehearsalUpdatesChannels,
            variant: CatchTextVariant.supporting,
          ),
          CatchSection.fieldRows(
            children: [
              for (var i = 0; i < 3 && i <= draft.routes.length; i++)
                if (!enabled)
                  CatchField.content(
                    copy: catchFieldCopy(l),
                    title: [
                      l.eventAssistanceRuntimeFirst,
                      l.eventAssistanceRuntimeSecond,
                      l.eventAssistanceRuntimeThird,
                    ][i],
                    body: i < draft.routes.length
                        ? runtimeRouteLabel(l, draft.routes[i])
                        : l.eventAssistanceRuntimeNone,
                  )
                else
                  CatchField<String>.select(
                    copy: catchFieldCopy(l),
                    key: ValueKey('practice.channel.$i'),
                    title: [
                      l.eventAssistanceRuntimeFirst,
                      l.eventAssistanceRuntimeSecond,
                      l.eventAssistanceRuntimeThird,
                    ][i],
                    contractExemption:
                        'A unique ordered list of synthetic route kinds; no sender identity or live capability is inferred.',
                    values: [
                      'off',
                      for (final r in AssistanceMessageRoute.values)
                        if (!draft.routes.indexed.any(
                          (v) => v.$1 != i && v.$2 == r,
                        ))
                          r.name,
                    ],
                    value: i < draft.routes.length
                        ? draft.routes[i].name
                        : 'off',
                    itemLabelBuilder: (r) => r == 'off'
                        ? l.eventAssistanceRuntimeNone
                        : runtimeRouteLabel(
                            l,
                            AssistanceMessageRoute.values.byName(r),
                          ),
                    onChanged: enabled
                        ? (r) {
                            if (r != null) {
                              onChanged(
                                draft.withRoute(
                                  i,
                                  r == 'off'
                                      ? null
                                      : AssistanceMessageRoute.values.byName(r),
                                ),
                              );
                            }
                          }
                        : null,
                    states: {if (!enabled) WidgetState.disabled},
                  ),
            ],
          ),
        ],
        if (showOutcomes) ...[
          Text(
            l.hostEventRehearsalUpdatesScript,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          gapH8,
          CatchText(
            l.hostEventRehearsalUpdatesScriptBody,
            variant: CatchTextVariant.supporting,
          ),
          CatchSection.fieldRows(
            children: [
              for (final item in draft.outcomes.indexed)
                if (!enabled || item.$1 < consumedPrefix)
                  CatchField.content(
                    copy: catchFieldCopy(l),
                    title: l.hostEventRehearsalUpdatesAttempt(
                      number: item.$1 + 1,
                    ),
                    bodyMaxLines: 8,
                    body:
                        '${rehearsalOutcomeLabel(l, item.$2)}${item.$1 < consumedPrefix ? '\n${l.hostEventRehearsalUpdatesUsed}' : ''}',
                  )
                else
                  CatchField<String>.select(
                    copy: catchFieldCopy(l),
                    key: ValueKey('practice.outcome.${item.$1}'),
                    title: l.hostEventRehearsalUpdatesAttempt(
                      number: item.$1 + 1,
                    ),
                    helperText: item.$1 < consumedPrefix
                        ? l.hostEventRehearsalUpdatesUsed
                        : null,
                    contractExemption:
                        'Closed synthetic receipt union; consumed outcomes cannot be changed and the script is bounded to six entries.',
                    values: choices.keys.toList(),
                    value: rehearsalOutcomeKey(item.$2),
                    itemLabelBuilder: (key) =>
                        rehearsalOutcomeLabel(l, choices[key]!),
                    onChanged: enabled && item.$1 >= consumedPrefix
                        ? (key) {
                            if (key == null) return;
                            final next = [...draft.outcomes];
                            next[item.$1] = choices[key]!;
                            onChanged(draft.copy(outcomes: next));
                          }
                        : null,
                    states: {
                      if (!enabled || item.$1 < consumedPrefix)
                        WidgetState.disabled,
                    },
                  ),
            ],
          ),
          if (enabled && draft.outcomes.length < 6)
            CatchButton(
              key: const ValueKey('practice.addOutcome'),
              label: l.hostEventRehearsalUpdatesAddOutcome,
              variant: CatchButtonVariant.ghost,
              onPressed: () => onChanged(
                draft.copy(
                  outcomes: [...draft.outcomes, rehearsalOutcomeChoices.first],
                ),
              ),
            ),
          if (enabled &&
              draft.outcomes.length > 1 &&
              draft.outcomes.length > consumedPrefix)
            CatchButton(
              key: const ValueKey('practice.removeOutcome'),
              label: l.hostEventRehearsalUpdatesRemoveOutcome,
              variant: CatchButtonVariant.ghost,
              onPressed: () => onChanged(
                draft.copy(
                  outcomes: draft.outcomes.sublist(
                    0,
                    draft.outcomes.length - 1,
                  ),
                ),
              ),
            ),
        ],
      ],
    );
  }
}

String rehearsalOutcomeLabel(
  AppLocalizations l,
  RehearsalDeliveryOutcome outcome,
) => switch (outcome) {
  RehearsalDeliveryConfirmed(:final result) => switch (result) {
    RehearsalConfirmedDelivery.delivered =>
      l.hostEventRehearsalUpdatesDelivered,
    RehearsalConfirmedDelivery.read => l.hostEventRehearsalUpdatesRead,
    RehearsalConfirmedDelivery.accepted => l.hostEventRehearsalUpdatesAccepted,
    RehearsalConfirmedDelivery.revoked => l.hostEventRehearsalUpdatesRevoked,
  },
  RehearsalDeliveryFailed(:final classification) => switch (classification) {
    RehearsalDeliveryFailure.technical => l.hostEventRehearsalUpdatesTechnical,
    RehearsalDeliveryFailure.policy => l.hostEventRehearsalUpdatesPolicy,
    RehearsalDeliveryFailure.suppressed =>
      l.hostEventRehearsalUpdatesSuppressed,
    RehearsalDeliveryFailure.invalidRecipient =>
      l.hostEventRehearsalUpdatesInvalidRecipient,
  },
  RehearsalDeliveryUnknown(:final reason) => switch (reason) {
    RehearsalDeliveryUncertainty.timeout => l.hostEventRehearsalUpdatesTimeout,
    RehearsalDeliveryUncertainty.connectionLost =>
      l.hostEventRehearsalUpdatesConnectionLost,
    RehearsalDeliveryUncertainty.workerInterrupted =>
      l.hostEventRehearsalUpdatesInterrupted,
  },
};
