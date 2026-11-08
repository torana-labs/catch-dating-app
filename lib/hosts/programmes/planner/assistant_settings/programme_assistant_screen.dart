import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_whatsapp_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/assistant_settings/programme_assistant_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/inbox/programme_inbox_commands.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final _random = Random.secure();

/// The guest assistant's settings (RbProgAssistant), from
/// `getProgramAssistantSettings`. Each switch or chip saves at once through
/// `updateProgramAssistantSettings`, fenced by the settings revision. The
/// "Try it" preview belongs to the assistant itself (WhatsApp lane W2).
class HostProgrammeAssistantScreen extends ConsumerStatefulWidget {
  const HostProgrammeAssistantScreen({super.key, required this.programId});

  final String programId;

  @override
  ConsumerState<HostProgrammeAssistantScreen> createState() =>
      _HostProgrammeAssistantScreenState();
}

class _HostProgrammeAssistantScreenState
    extends ConsumerState<HostProgrammeAssistantScreen> {
  bool _busy = false;

  Future<void> _change(
    ProgramAssistantSettings current,
    ProgramAssistantSettingsChange change,
  ) async {
    final l10n = context.l10n;
    setState(() => _busy = true);
    var ok = true;
    try {
      await ref
          .read(programmeInboxCommandsProvider)
          .updateAssistantSettings(
            programId: widget.programId,
            change: change,
            expectedRevision: current.revision,
            requestId:
                'assistant-${DateTime.now().microsecondsSinceEpoch}-'
                '${_random.nextInt(1 << 30)}',
          );
    } on Object {
      ok = false;
    }
    ref.invalidate(programAssistantSettingsProvider(widget.programId));
    if (!mounted) return;
    setState(() => _busy = false);
    if (!ok) {
      showCatchNotice(
        context,
        l10n.hostProgrammeInboxSaveFailed,
        tone: CatchNoticeTone.danger,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final read = catchAsyncStateFromAsyncValue(
      ref.watch(programAssistantSettingsProvider(widget.programId)),
    );
    final settings = read.value?.value;
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-assistant-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostProgrammeInboxTitle),
          title: l10n.hostProgrammeInboxAssistantTitle,
        ),
        body: HostProgrammeAssistantBody(
          status: read.hasError
              ? HostProgrammeStatus.error
              : settings == null
              ? HostProgrammeStatus.loading
              : HostProgrammeStatus.ready,
          settings: settings,
          busy: _busy,
          onChange: (change) {
            if (settings != null) unawaited(_change(settings, change));
          },
          onRetry: () => ref.invalidate(
            programAssistantSettingsProvider(widget.programId),
          ),
        ),
      ),
    );
  }
}
