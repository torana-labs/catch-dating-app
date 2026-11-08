import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment_features.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_rules_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_rules_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_rules_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_top_bar.dart';
import 'package:catch_dating_app/hosts/live/formats/widgets/formats_rule_sheet.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Grouping by form answers, on the day theme: the rules that use booking
/// answers to shape groups, with the rule sheet over them.
///
/// It watches [hostFormatsRulesControllerProvider]. Adding, changing or
/// removing a rule saves the whole set with the existing
/// `configureEventAssignmentFeatures`, fenced by the rules revision, then
/// asks for the preview again: the preview is a callable, not a listener.
/// Rules never grant answer use; each guest still agrees on their own.
class HostFormatsRulesScreen extends ConsumerStatefulWidget {
  const HostFormatsRulesScreen({
    super.key,
    required this.event,
    this.adding = false,
  });

  final Event event;

  /// Opens with the rule sheet up, for previews.
  final bool adding;

  @override
  ConsumerState<HostFormatsRulesScreen> createState() =>
      _HostFormatsRulesScreenState();
}

class _HostFormatsRulesScreenState
    extends ConsumerState<HostFormatsRulesScreen> {
  late bool _sheet = widget.adding;
  HostFormatsRule? _editing;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final event = widget.event;
    final state = ref.watch(hostFormatsRulesControllerProvider(event));
    final saving = ref
        .watch(EventSuccessController.configureAssignmentFeaturesMutation)
        .isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [EventSuccessController.configureAssignmentFeaturesMutation],
      errorContext: AppErrorContext.event,
    );
    final open = _sheet && state.status == HostFormatsRulesStatus.ready;
    return PopScope(
      canPop: !open,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && open) setState(_close);
      },
      child: CatchRoot(
        format: CatchFormat.courts,
        child: CatchScreen(
          key: const ValueKey<String>('host-formats-rules-screen'),
          topBar: hostFormatsToolTopBar(
            context,
            event: event,
            title: l10n.hostFormatsRulesTitle,
          ),
          body: HostFormatsRulesBody(
            state: state,
            onAdd: () => setState(() {
              _editing = null;
              _sheet = true;
            }),
            onOpen: (rule) => setState(() {
              _editing = rule;
              _sheet = true;
            }),
            onRetry: () =>
                ref.invalidate(hostFormatsRulesPreviewProvider(event.id)),
          ),
          overlay: open
              ? HostFormatsRuleSheet(
                  key: ValueKey<String?>(_editing?.rule.featureId),
                  sources: state.sources,
                  current: _editing?.rule,
                  saving: saving,
                  onSave: (rule) => unawaited(_save(state, rule)),
                  onRemove: () => unawaited(_save(state, null)),
                )
              : null,
        ),
      ),
    );
  }

  void _close() {
    _sheet = false;
    _editing = null;
  }

  /// Saves the rules with [rule] added or put in place of the one being
  /// changed; a null [rule] removes it.
  Future<void> _save(
    HostFormatsRulesState state,
    EventSuccessAssignmentFeatureRule? rule,
  ) async {
    final replaced = _editing?.rule.featureId;
    final rules = [
      for (final saved in state.rules)
        if (saved.rule.featureId != replaced &&
            saved.rule.featureId != rule?.featureId)
          saved.rule,
      ?rule,
    ];
    final random = Random.secure();
    final requestId = List.generate(
      16,
      (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
    ).join();
    final saved = context.l10n.hostFormatsRulesSaved;
    try {
      await EventSuccessController.configureAssignmentFeaturesMutation.run(
        ref,
        (tx) => tx
            .get(eventSuccessControllerProvider.notifier)
            .configureAssignmentFeatures(
              eventId: widget.event.id,
              expectedRevision: state.revision,
              requestId: 'rules:$requestId',
              rules: rules,
            ),
      );
    } on Object {
      // The mutation's error shows as a notice.
      return;
    }
    if (!mounted) return;
    ref.invalidate(hostFormatsRulesPreviewProvider(widget.event.id));
    setState(_close);
    showCatchNotice(context, saved);
  }
}
