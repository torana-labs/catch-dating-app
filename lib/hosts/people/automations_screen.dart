import 'dart:async';

import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/hosts/people/automations_body.dart';
import 'package:catch_dating_app/hosts/people/automations_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Automatic messages: the WhatsApp channel and the organizer's automation
/// rules, each with its switch.
///
/// It watches [hostAutomationsControllerProvider]; a switch runs the
/// existing turn-on-or-off command, the WhatsApp tile opens the existing
/// setup, and Add opens the compose screen.
class HostAutomationsScreen extends ConsumerStatefulWidget {
  const HostAutomationsScreen({super.key, required this.organizerId, this.now});

  final String organizerId;

  /// A fixed clock for previews and tests; null follows the app clock.
  final DateTime? now;

  @override
  ConsumerState<HostAutomationsScreen> createState() =>
      _HostAutomationsScreenState();
}

class _HostAutomationsScreenState extends ConsumerState<HostAutomationsScreen> {
  final Set<String> _changing = <String>{};

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final now = widget.now ?? ref.read(appClockProvider).now();
    final state = ref.watch(
      hostAutomationsControllerProvider(
        widget.organizerId,
        DateTime(now.year, now.month),
      ),
    );
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [HostAutomationsCommands.switchMutation],
      errorContext: AppErrorContext.organizer,
    );
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-automations-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostPeopleAutomationsTitle,
          kicker: l10n.hostPeopleAutomationsKicker,
          back: CatchTopBarBack(
            label: l10n.hostPeopleBack,
            onPressed: () => Navigator.of(context).maybePop(),
          ),
        ),
        body: HostAutomationsBody(
          state: state,
          changing: _changing,
          onWhatsapp: () => context.pushNamed(
            Routes.hostOrganizerMessagingScreen.name,
            queryParameters: {'organizerId': widget.organizerId},
          ),
          onSwitch: (rule, enabled) => unawaited(_switch(rule, enabled)),
          onAdd: () => context.pushNamed(
            Routes.hostNewMessageScreen.name,
            queryParameters: {'organizerId': widget.organizerId},
          ),
          onRetry: () => refreshHostAutomations(ref, widget.organizerId),
        ),
      ),
    );
  }

  Future<void> _switch(HostFormAutomationRule rule, bool enabled) async {
    setState(() => _changing.add(rule.ruleId));
    try {
      await HostAutomationsCommands.switchMutation.run(
        ref,
        (tx) => tx
            .get(hostAutomationsCommandsProvider)
            .setEnabled(rule: rule, enabled: enabled),
      );
      refreshHostAutomations(ref, widget.organizerId);
    } on Object {
      // The mutation is watched for errors, which the screen shows.
    } finally {
      if (mounted) setState(() => _changing.remove(rule.ruleId));
    }
  }
}
