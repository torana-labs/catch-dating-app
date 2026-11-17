import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_create_body.dart';
import 'package:catch_dating_app/programs/presentation/program_create_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_create_state.dart';
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
    final scope = uid == null
        ? null
        : (accountId: uid, organizerId: organizerId);
    final create = scope == null
        ? null
        : ref.watch(programCreateProvider(scope));
    final topBar = CatchTopBar(
      variant: CatchTopBarVariant.tool,
      title: l10n.hostProgrammeCreateTitle,
      back: CatchTopBarBack(label: l10n.hostProgrammeCreateClose, close: true),
    );
    final ready = create?.value;
    if (scope == null || ready == null) {
      final error = create?.error;
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
                    onRetry: scope == null
                        ? null
                        : () => ref.invalidate(programCreateProvider(scope)),
                  ),
          ),
        ),
      );
    }
    final notifier = ref.read(programCreateProvider(scope).notifier);
    return HostProgrammeCreateForm(
      key: ValueKey<String>('host-programme-create-$uid-$organizerId'),
      view: ready,
      onEdit: notifier.edit,
      onSubmit: notifier.submit,
      topBar: topBar,
      now: ref.watch(appClockProvider).now(),
    );
  }
}

/// The form over one create transaction: it keeps the title field and the
/// day sheets, shows [view] and sends every change through [onEdit].
class HostProgrammeCreateForm extends StatefulWidget {
  const HostProgrammeCreateForm({
    super.key,
    required this.view,
    required this.onEdit,
    required this.onSubmit,
    required this.topBar,
    required this.now,
  });

  final ProgramCreateView view;
  final ValueChanged<ProgramCreateValues> onEdit;
  final Future<String?> Function() onSubmit;
  final CatchTopBar topBar;
  final DateTime now;

  @override
  State<HostProgrammeCreateForm> createState() =>
      _HostProgrammeCreateFormState();
}

class _HostProgrammeCreateFormState extends State<HostProgrammeCreateForm> {
  late final _title = TextEditingController(text: widget.view.values.title);

  @override
  void dispose() {
    _title.dispose();
    super.dispose();
  }

  Future<void> _pickDay(HostProgrammeCreateDay which) async {
    final values = widget.view.values;
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
    if (day == null || !mounted || widget.view.fieldsLocked) return;
    final current = widget.view.values;
    widget.onEdit(
      first
          ? current.copyWith(startsAt: day)
          : current.copyWith(
              endsAt: DateTime(day.year, day.month, day.day, 23, 59),
            ),
    );
  }

  Future<void> _submit() async {
    final id = await widget.onSubmit();
    if (!mounted || id == null) return;
    context.goNamed(
      Routes.hostProgramWorkspaceScreen.name,
      pathParameters: {'programId': id},
    );
  }

  Future<void> _close() async {
    final view = widget.view;
    final values = view.values;
    final hasDraft =
        values.title.isNotEmpty ||
        values.kind != null ||
        values.startsAt != null ||
        values.endsAt != null;
    if (hasDraft && !view.confirmed && !view.actorChanged) {
      final l10n = context.l10n;
      final leave = await showCatchConfirmDialog(
        context: context,
        copy: catchDialogCopy(l10n),
        title: l10n.hostProgrammeCreateLeaveTitle,
        message: view.commandPending
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
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final view = widget.view;
    final error = view.actorChanged
        ? l10n.hostProgrammeCreateActorChanged
        : view.error == null
        ? null
        : appErrorMessage(
            view.error!,
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
            onPressed: view.saving ? null : () => unawaited(_close()),
          ),
        ),
        dock: CatchDock(
          primary: CatchDockAction(
            label: l10n.hostProgrammeCreateSubmit,
            loading: view.saving,
            onPressed: view.saving || view.actorChanged
                ? null
                : () => unawaited(_submit()),
          ),
          secondary: CatchDockAction(
            label: l10n.hostProgrammeCreateCancel,
            onPressed: view.saving ? null : () => unawaited(_close()),
          ),
        ),
        body: HostProgrammeCreateBody(
          values: view.values,
          showErrors: view.showErrors,
          locked: view.fieldsLocked,
          titleField: _title,
          error: error,
          onKind: (kind) => widget.onEdit(view.values.copyWith(kind: kind)),
          onTitle: (title) => widget.onEdit(view.values.copyWith(title: title)),
          onDay: (which) => unawaited(_pickDay(which)),
          onTimezone: (timezone) =>
              widget.onEdit(view.values.copyWith(timezone: timezone)),
        ),
      ),
    );
  }
}
