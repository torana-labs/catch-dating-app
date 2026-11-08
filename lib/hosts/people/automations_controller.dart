import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/hosts/people/automations_state.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'automations_controller.g.dart';

/// The organizer's automation rules and their latest runs, from the
/// existing automations read across every form.
@riverpod
Future<HostFormAutomationPage> hostPeopleAutomations(
  Ref ref,
  String organizerId,
) => ref
    .watch(hostFormsRepositoryProvider)
    .listAutomations(organizerId: organizerId, formId: null);

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
    sentMore: page.nextCursor != null,
  );
}

/// Reads Automatic messages again after a failure or a change.
void refreshHostAutomations(WidgetRef ref, String organizerId) => ref
  ..invalidate(hostPeopleAutomationsProvider(organizerId))
  ..invalidate(hostMessagingSetupProvider(organizerId));

/// The existing automation command: turn one rule on or off, fenced by its
/// revision.
@riverpod
HostAutomationsCommands hostAutomationsCommands(Ref ref) =>
    HostAutomationsCommands(ref.watch(hostFormsRepositoryProvider));

class HostAutomationsCommands {
  const HostAutomationsCommands(this._forms);

  static final switchMutation = Mutation<HostFormAutomationRule>();

  final HostFormsRepository _forms;

  Future<HostFormAutomationRule> setEnabled({
    required HostFormAutomationRule rule,
    required bool enabled,
  }) => _forms.setAutomationEnabled(
    organizerId: rule.organizerId,
    ruleId: rule.ruleId,
    expectedRevision: rule.revision,
    enabled: enabled,
  );
}
