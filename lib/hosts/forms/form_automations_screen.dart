import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/hosts/forms/form_automation_editor.dart';
import 'package:catch_dating_app/hosts/forms/form_automations_body.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// What happens when someone answers one form: its automation rules, two
/// quick presets and the run history.
///
/// Reads the form's rules and runs from their listeners, and the
/// organizer's forms, tags and events for names. New (+) and a rule row
/// open the rule editor in place; a preset saves a ready rule through the
/// existing automation command.
class HostFormAutomationsScreen extends ConsumerStatefulWidget {
  const HostFormAutomationsScreen({
    super.key,
    required this.organizerId,
    this.formId,
  });

  final String organizerId;

  /// The form whose rules these are; null lists every rule.
  final String? formId;

  @override
  ConsumerState<HostFormAutomationsScreen> createState() =>
      _HostFormAutomationsScreenState();
}

class _HostFormAutomationsScreenState
    extends ConsumerState<HostFormAutomationsScreen> {
  bool _editing = false;
  HostFormAutomationRule? _rule;

  void _edit(HostFormAutomationRule? rule) => setState(() {
    _rule = rule;
    _editing = true;
  });

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final provider = hostFormAutomationsControllerProvider(
      widget.organizerId,
      widget.formId,
    );
    if (_editing) {
      return HostFormAutomationEditor(
        organizerId: widget.organizerId,
        scopeFormId: widget.formId,
        initialRule: _rule,
        onCancel: () => setState(() => _editing = false),
        onSaved: () {
          ref.invalidate(provider);
          setState(() => _editing = false);
        },
      );
    }
    final value = catchAsyncStateFromAsyncValue(ref.watch(provider));
    final sources = catchAsyncStateFromAsyncValue(
      ref.watch(hostSavedAudienceFilterOptionsProvider(widget.organizerId)),
    ).value;
    final scopeTitle = widget.formId == null
        ? l10n.hostAudienceAllAutomations
        : sources?.forms
                  .where((form) => form.id == widget.formId)
                  .firstOrNull
                  ?.title ??
              l10n.hostAudienceThisForm;
    final state = value.value;
    final Widget body;
    if (state != null) {
      body = HostFormAutomationsBody(
        formId: widget.formId,
        state: state,
        sources: sources,
        onEdit: _edit,
        onPreset: (name, kind) => unawaited(_preset(name, kind)),
        onLoadMore: ref.read(provider.notifier).loadMore,
        onRetry: () => ref.invalidate(provider),
      );
    } else if (value.hasError) {
      body = CatchPageBody.screen(
        child: CatchLocalizedErrorState(
          value.error!,
          context: AppErrorContext.forms,
          onRetry: () => ref.invalidate(provider),
        ),
      );
    } else {
      body = const CatchPageBody.screen(child: CatchLoadingIndicator());
    }
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-form-automations-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostFormAutomationsTitle,
          kicker: scopeTitle,
          back: CatchTopBarBack(label: l10n.hostFormsBack),
          actions: [
            CatchIconAction(
              key: const ValueKey<String>('automation-create'),
              tooltip: l10n.hostAutomationNew,
              size: GeneratedCatchSizeTokens.controlMd,
              onPressed: () => _edit(null),
              child: CatchIcon(CatchIcons.add),
            ),
          ],
        ),
        body: body,
      ),
    );
  }

  Future<void> _preset(String name, HostFormAutomationActionKind kind) async {
    final provider = hostFormAutomationsControllerProvider(
      widget.organizerId,
      widget.formId,
    );
    final saved = await ref
        .read(provider.notifier)
        .createPreset(
          name: name,
          trigger: HostFormAutomationTrigger.responseSubmitted,
          actions: [kind],
        );
    if (saved || !mounted) return;
    if (ref.read(provider).asData?.value.error case final error?) {
      showCatchNoticeError(context, error, errorContext: AppErrorContext.forms);
    }
  }
}
