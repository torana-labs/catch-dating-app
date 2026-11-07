import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/contexts/messaging/parts/messaging_switch_row.dart';
import 'package:catch_dating_app/hosts/people/automations_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// Automatic messages in board order: the WhatsApp switch tile, how many
/// ran this month, the rules around each event, the rules that keep people
/// coming, and Add an automatic message.
class HostAutomationsBody extends StatelessWidget {
  const HostAutomationsBody({
    super.key,
    required this.state,
    required this.onWhatsapp,
    required this.onSwitch,
    required this.onAdd,
    required this.onRetry,
    this.changing = const <String>{},
  });

  final HostAutomationsState state;

  /// Opens the WhatsApp setup, which connects or disconnects the sender.
  final VoidCallback onWhatsapp;
  final void Function(HostFormAutomationRule rule, bool enabled) onSwitch;
  final VoidCallback onAdd;
  final VoidCallback onRetry;

  /// Rules with an on or off change on its way.
  final Set<String> changing;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final numbers = NumberFormat.decimalPattern(
      Localizations.localeOf(context).toLanguageTag(),
    );
    final whatsapp = CatchSurface(
      padding: CatchSurfacePadding.sm,
      child: MessagingSwitchRow(
        key: const ValueKey<String>('host-automations-whatsapp'),
        title: l10n.hostPeopleAutomationsWhatsapp,
        note: l10n.hostPeopleAutomationsWhatsappNote,
        value: state.whatsappOn ?? false,
        onChanged: state.whatsappOn == null ? null : (_) => onWhatsapp(),
      ),
    );
    final Widget rules = switch (state.status) {
      HostAutomationsStatus.loading => const CatchLoadingIndicator(),
      HostAutomationsStatus.error => CatchErrorState(
        title: l10n.hostPeopleAutomationsErrorTitle,
        message: l10n.hostPeopleAutomationsErrorBody,
        retryLabel: l10n.hostPeopleRetry,
        onRetry: onRetry,
        mode: CatchErrorStateMode.inline,
      ),
      HostAutomationsStatus.ready => CatchStack(
        gap: CatchStackGap.g16,
        children: [
          CatchMetricTile.stat(
            label: l10n.hostPeopleAutomationsSent,
            value: state.sentMore
                ? l10n.hostPeopleCountAtLeast(
                    count: numbers.format(state.sentThisMonth),
                  )
                : numbers.format(state.sentThisMonth),
          ),
          _HostAutomationsSection(
            title: l10n.hostPeopleAutomationsAroundTitle,
            kicker: l10n.hostPeopleAutomationsAroundKicker,
            rules: state.aroundEvents,
            changing: changing,
            onSwitch: onSwitch,
          ),
          _HostAutomationsSection(
            title: l10n.hostPeopleAutomationsKeepingTitle,
            kicker: l10n.hostPeopleAutomationsKeepingKicker,
            rules: state.keepingPeople,
            changing: changing,
            onSwitch: onSwitch,
          ),
        ],
      ),
    };
    return CatchPageBody(
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          whatsapp,
          rules,
          CatchButton(
            label: l10n.hostPeopleAutomationsAdd,
            variant: CatchButtonVariant.secondary,
            leading: CatchIcon(CatchIcons.add, size: CatchIconSize.md),
            fullWidth: true,
            onPressed: onAdd,
          ),
        ],
      ),
    );
  }
}

/// One group of rules, each a switch row with when it runs.
class _HostAutomationsSection extends StatelessWidget {
  const _HostAutomationsSection({
    required this.title,
    required this.kicker,
    required this.rules,
    required this.changing,
    required this.onSwitch,
  });

  final String title;
  final String kicker;
  final List<HostFormAutomationRule> rules;
  final Set<String> changing;
  final void Function(HostFormAutomationRule rule, bool enabled) onSwitch;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchSection(
      title: title,
      kicker: kicker,
      empty: l10n.hostPeopleAutomationsEmpty,
      children: [
        for (final rule in rules)
          MessagingSwitchRow(
            key: ValueKey<String>('host-automation-${rule.ruleId}'),
            title: rule.name,
            note: hostAutomationTrigger(l10n, rule.trigger),
            value: rule.enabled,
            onChanged: changing.contains(rule.ruleId)
                ? null
                : (enabled) => onSwitch(rule, enabled),
          ),
      ],
    );
  }
}

/// When a rule runs, in the host's words.
String hostAutomationTrigger(
  AppLocalizations l10n,
  HostFormAutomationTrigger trigger,
) => switch (trigger) {
  HostFormAutomationTrigger.eventAttended =>
    l10n.hostPeopleAutomationsWhenAttended,
  HostFormAutomationTrigger.applicationAccepted =>
    l10n.hostPeopleAutomationsWhenAccepted,
  HostFormAutomationTrigger.responseSubmitted =>
    l10n.hostPeopleAutomationsWhenAnswered,
  HostFormAutomationTrigger.responseWithdrawn =>
    l10n.hostPeopleAutomationsWhenWithdrawn,
  HostFormAutomationTrigger.answerMatches =>
    l10n.hostPeopleAutomationsWhenMatches,
};
