import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_create_body.dart';
import 'package:catch_dating_app/programs/presentation/program_create_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_events_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// A new programme (RbProgCreate).
///
/// The kept create controller owns the draft, its validation, the request
/// id and the journal that recovers a lost response; Create the programme
/// runs `createOrganizerProgram` through it, confirms the saved programme
/// and opens its workspace.
class HostProgrammeCreateScreen extends ConsumerWidget {
  const HostProgrammeCreateScreen({super.key, required this.organizerId});

  final String organizerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final uid = ref.watch(uidProvider).value;
    final controller = uid == null
        ? null
        : ref.watch(
            programCreateControllerProvider((
              accountId: uid,
              organizerId: organizerId,
            )),
          );
    final topBar = CatchTopBar(
      variant: CatchTopBarVariant.tool,
      title: l10n.hostProgrammeCreateTitle,
      back: CatchTopBarBack(label: l10n.hostProgrammeCreateClose, close: true),
    );
    final ready = controller?.value;
    if (ready == null) {
      final error = controller?.error;
      return CatchRoot(
        format: CatchFormat.nightsOut,
        child: CatchScreen(
          key: const ValueKey<String>('host-programme-create-screen'),
          bodyScrolls: false,
          topBar: topBar,
          body: CatchPageBody.screen(
            child: error == null
                ? const CatchLoadingIndicator()
                : CatchErrorState(
                    title: l10n.hostProgrammeErrorTitle,
                    message: l10n.hostProgrammeErrorBody,
                    retryLabel: l10n.hostProgrammeRetry,
                    onRetry: () => ref.invalidate(
                      programCreateControllerProvider((
                        accountId: uid!,
                        organizerId: organizerId,
                      )),
                    ),
                  ),
          ),
        ),
      );
    }
    return HostProgrammeCreateForm(
      key: ValueKey<String>('host-programme-create-$uid-$organizerId'),
      controller: ready,
      topBar: topBar,
      now: ref.watch(appClockProvider).now(),
    );
  }
}

/// The form over one create controller: it keeps the title field and the
/// day sheets, and leaves every value to the controller.
class HostProgrammeCreateForm extends StatefulWidget {
  const HostProgrammeCreateForm({
    super.key,
    required this.controller,
    required this.topBar,
    required this.now,
  });

  final ProgramCreateController controller;
  final CatchTopBar topBar;
  final DateTime now;

  @override
  State<HostProgrammeCreateForm> createState() =>
      _HostProgrammeCreateFormState();
}

class _HostProgrammeCreateFormState extends State<HostProgrammeCreateForm> {
  late final _title = TextEditingController(
    text: widget.controller.values.title,
  );

  @override
  void dispose() {
    _title.dispose();
    super.dispose();
  }

  Future<void> _pickDay(HostProgrammeCreateDay which) async {
    final controller = widget.controller;
    final values = controller.values;
    final l10n = context.l10n;
    final first = which == HostProgrammeCreateDay.first;
    final day = await showCatchBottomSheet<DateTime>(
      context: context,
      builder: (_) => HostProgrammeDaySheet(
        title: first
            ? l10n.hostProgrammeCreateFirstDay
            : l10n.hostProgrammeCreateLastDay,
        today: widget.now,
        value: first ? values.startsAt : values.endsAt ?? values.startsAt,
        min: first ? null : values.startsAt,
      ),
    );
    if (day == null || !mounted || controller.fieldsLocked) return;
    final current = controller.values;
    controller.edit(
      first
          ? current.copyWith(startsAt: day)
          : current.copyWith(
              endsAt: DateTime(day.year, day.month, day.day, 23, 59),
            ),
    );
  }

  Future<void> _submit() async {
    final id = await widget.controller.submit();
    if (!mounted || id == null) return;
    context.goNamed(
      Routes.hostProgramWorkspaceScreen.name,
      pathParameters: {'programId': id},
    );
  }

  Future<void> _close() async {
    final controller = widget.controller;
    final values = controller.values;
    final hasDraft =
        values.title.isNotEmpty ||
        values.kind != null ||
        values.startsAt != null ||
        values.endsAt != null;
    if (hasDraft && !controller.confirmed && !controller.actorChanged) {
      final l10n = context.l10n;
      final leave = await showCatchConfirmDialog(
        context: context,
        copy: catchDialogCopy(l10n),
        title: l10n.hostProgrammeCreateLeaveTitle,
        message: controller.commandPending
            ? l10n.hostProgrammeCreateLeavePending
            : l10n.hostProgrammeCreateLeaveDraft,
        confirmLabel: l10n.hostProgrammeCreateLeave,
      );
      if (leave != true || !mounted) return;
    }
    if (context.canPop()) {
      context.pop();
    } else {
      context.goNamed(Routes.hostEventsScreen.name);
    }
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.controller,
    builder: (context, _) {
      final l10n = context.l10n;
      final controller = widget.controller;
      final error = controller.actorChanged
          ? l10n.hostProgrammeCreateActorChanged
          : controller.error == null
          ? null
          : appErrorMessage(
              controller.error!,
              l10n: l10n,
              context: AppErrorContext.event,
            );
      return CatchRoot(
        format: CatchFormat.nightsOut,
        child: CatchScreen(
          key: const ValueKey<String>('host-programme-create-screen'),
          bodyScrolls: false,
          topBar: CatchTopBar(
            variant: widget.topBar.variant,
            title: widget.topBar.title,
            back: CatchTopBarBack(
              label: l10n.hostProgrammeCreateClose,
              close: true,
              onPressed: controller.saving ? null : () => unawaited(_close()),
            ),
          ),
          dock: CatchDock(
            primary: CatchDockAction(
              label: l10n.hostProgrammeCreateSubmit,
              loading: controller.saving,
              onPressed: controller.saving || controller.actorChanged
                  ? null
                  : () => unawaited(_submit()),
            ),
            secondary: CatchDockAction(
              label: l10n.hostProgrammeCreateCancel,
              onPressed: controller.saving ? null : () => unawaited(_close()),
            ),
          ),
          body: HostProgrammeCreateBody(
            values: controller.values,
            showErrors: controller.showErrors,
            locked: controller.fieldsLocked,
            titleField: _title,
            error: error,
            onKind: (kind) =>
                controller.edit(controller.values.copyWith(kind: kind)),
            onTitle: (title) =>
                controller.edit(controller.values.copyWith(title: title)),
            onDay: (which) => unawaited(_pickDay(which)),
            onTimezone: (timezone) =>
                controller.edit(controller.values.copyWith(timezone: timezone)),
          ),
        ),
      );
    },
  );
}
