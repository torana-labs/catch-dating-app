import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_planner_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_branding_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// How it looks (RbProgBranding). Save runs `updateOrganizerProgram` with
/// the branding, fenced by the programme revision.
class HostProgrammeBrandingScreen extends ConsumerStatefulWidget {
  const HostProgrammeBrandingScreen({super.key, required this.programId});

  final String programId;

  @override
  ConsumerState<HostProgrammeBrandingScreen> createState() =>
      _HostProgrammeBrandingScreenState();
}

class _HostProgrammeBrandingScreenState
    extends ConsumerState<HostProgrammeBrandingScreen> {
  ProgramBranding? _branding;
  bool? _showCredit;
  String? _hiddenCredit;
  bool _saving = false;
  String? _error;

  Future<void> _save(OrganizerProgramSettings program) async {
    final l10n = context.l10n;
    final branding = _branding ?? program.branding;
    final show = _showCredit ?? program.branding.creditLine != null;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref
          .read(programPlannerRepositoryProvider)
          .saveBranding(
            programId: widget.programId,
            expectedRevision: program.revision,
            branding: show ? branding : branding.copyWith(clearCredit: true),
          );
      refreshHostProgramme(ref, widget.programId);
      if (mounted) context.pop();
    } on Object {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = l10n.hostProgrammeBrandingSaveFailed;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final state = ref.watch(hostProgrammeControllerProvider(widget.programId));
    final program = state.program;
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-branding-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostProgrammeBackToProgramme),
          kicker: program?.title,
          title: l10n.hostProgrammeBrandingTitle,
          actions: [
            CatchButton(
              key: const ValueKey<String>('host-programme-branding-save'),
              label: l10n.hostProgrammeSave,
              size: CatchButtonSize.sm,
              status: _saving
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              onPressed: program == null || _saving
                  ? null
                  : () => unawaited(_save(program)),
            ),
          ],
        ),
        body: program == null
            ? HostProgrammeStateBody(
                status: state.status,
                onRetry: () => refreshHostProgramme(ref, widget.programId),
              )
            : HostProgrammeBrandingBody(
                program: program,
                branding: _branding ?? program.branding,
                showCredit: _showCredit ?? program.branding.creditLine != null,
                error: _error,
                onChanged: (next) => setState(() => _branding = next),
                onShowCredit: (show) => setState(() {
                  final current = _branding ?? program.branding;
                  _showCredit = show;
                  if (!show) _hiddenCredit = current.creditLine;
                  if (show && current.creditLine == null) {
                    _branding = current.copyWith(creditLine: _hiddenCredit);
                  }
                }),
              ),
      ),
    );
  }
}
