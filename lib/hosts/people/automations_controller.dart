import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/read_models/host_form_automation_reads.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/hosts/people/automations_state.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'automations_controller.g.dart';

/// The organizer's automation rules and their newest page of runs across
/// every form, from the automation listeners.
@riverpod
Future<HostFormAutomationPage> hostPeopleAutomations(
  Ref ref,
  String organizerId,
) async {
  final saved = ref.watch(hostSavedAutomationRulesProvider(organizerId));
  final rules = await ref.watch(
    hostFormAutomationRulesProvider(organizerId, null).future,
  );
  final runs = await ref.watch(
    hostFormAutomationRunPagesProvider(organizerId, null).future,
  );
  return HostFormAutomationPage(
    rules: List.unmodifiable([
      for (final rule in rules)
        if (saved[rule.ruleId] case final newer?
            when newer.revision > rule.revision)
          newer
        else
          rule,
    ]),
    runs: runs.items,
    hasMore: runs.hasMore,
  );
}

/// Rules this screen just switched, shown until the rule listener reaches
/// their revision, so a switch does not flick back while the view catches
/// up with the command.
@riverpod
class HostSavedAutomationRules extends _$HostSavedAutomationRules {
  @override
  Map<String, HostFormAutomationRule> build(String organizerId) => const {};

  void record(HostFormAutomationRule rule) =>
      state = {...state, rule.ruleId: rule};
}

/// Automatic messages, composed from the WhatsApp setup read and the
/// automation rules; [month] is the first day of the month runs count in.
@riverpod
HostAutomationsState hostAutomationsController(
  Ref ref,
  String organizerId,
  DateTime month,
) {
  final setup = catchAsyncStateFromAsyncValue(
    ref.watch(hostMessagingSetupProvider(organizerId)),
  ).value;
  final whatsappOn = setup == null ? null : setup.connection?.isActive ?? false;
  final read = catchAsyncStateFromAsyncValue(
    ref.watch(hostPeopleAutomationsProvider(organizerId)),
  );
  final page = read.value;
  if (page == null) {
    return read.hasError
        ? HostAutomationsState(
            status: HostAutomationsStatus.error,
            whatsappOn: whatsappOn,
            error: read.error,
          )
        : HostAutomationsState(
            status: HostAutomationsStatus.loading,
            whatsappOn: whatsappOn,
          );
  }
  final next = DateTime(month.year, month.month + 1);
  final sent = page.runs
      .where(
        (run) =>
            run.status == HostFormAutomationRunStatus.succeeded &&
            !run.createdAt.isBefore(month) &&
            run.createdAt.isBefore(next),
      )
      .length;
  return HostAutomationsState(
    status: HostAutomationsStatus.ready,
    whatsappOn: whatsappOn,
    aroundEvents: [
      for (final rule in page.rules)
        if (hostAutomationRunsAroundEvents(rule.trigger)) rule,
    ],
    keepingPeople: [
      for (final rule in page.rules)
        if (!hostAutomationRunsAroundEvents(rule.trigger)) rule,
    ],
    sentThisMonth: sent,
    sentMore: page.hasMore,
  );
}

/// Reads Automatic messages again after a failure: the automation
/// listeners open again, and so does the WhatsApp setup read.
void refreshHostAutomations(WidgetRef ref, String organizerId) => ref
  ..invalidate(hostFormAutomationRulesProvider(organizerId, null))
  ..invalidate(hostFormAutomationRunPagesProvider(organizerId, null))
  ..invalidate(hostMessagingSetupProvider(organizerId));

/// The existing automation command: turn one rule on or off, fenced by its
/// revision.
@riverpod
HostAutomationsCommands hostAutomationsCommands(Ref ref) =>
    HostAutomationsCommands(
      ref.watch(hostFormsRepositoryProvider),
      onSaved: (rule) => ref
          .read(hostSavedAutomationRulesProvider(rule.organizerId).notifier)
          .record(rule),
    );

class HostAutomationsCommands {
  const HostAutomationsCommands(this._forms, {this.onSaved});

  static final switchMutation = Mutation<HostFormAutomationRule>();

  final HostFormsRepository _forms;

  /// Receives the rule the command saved, before the listener shows it.
  final void Function(HostFormAutomationRule rule)? onSaved;

  Future<HostFormAutomationRule> setEnabled({
    required HostFormAutomationRule rule,
    required bool enabled,
  }) async {
    final saved = await _forms.setAutomationEnabled(
      organizerId: rule.organizerId,
      ruleId: rule.ruleId,
      expectedRevision: rule.revision,
      enabled: enabled,
    );
    onSaved?.call(saved);
    return saved;
  }
}
