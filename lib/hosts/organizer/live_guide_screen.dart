import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/update_organizer_patch.dart';
import 'package:catch_dating_app/hosts/organizer/live_guide_body.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_controller.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_screen.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/host_organizer_defaults_saver.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/host_organizer_edit_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The live event guide every new event of this organizer starts with: on
/// or off, and the ready-to-run plan for its main activity.
///
/// It reads the organizer through [watchHostOrganizerScope] and saves each
/// change through the existing organizer update as host defaults, queued
/// and reconciled by [HostOrganizerDefaultsSaver]. Only the owner changes
/// it; a manager sees whether it is on.
class OrganizerLiveGuideScreen extends ConsumerWidget {
  const OrganizerLiveGuideScreen({super.key, required this.organizerId});

  final String organizerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final read = watchHostOrganizerScope(ref, organizerId: organizerId);
    final scope = read.scope;
    final organizer = scope?.organizer;
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-organizer-live-guide-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostsHostOrganizerEditTabLabelLiveEventGuide,
          kicker: organizer?.name,
          back: CatchTopBarBack(label: l10n.hostOrganizerBack),
        ),
        body: scope == null || organizer == null
            ? HostOrganizerScopeBody(
                gap: read.gap,
                error: read.error,
                onRetry: () => retryHostOrganizerScope(ref),
              )
            : _LiveGuideEditor(
                key: ValueKey<String>(organizer.id),
                organizer: organizer,
                isOwner: scope.isOwner,
              ),
      ),
    );
  }
}

/// Holds the defaults saver for one organizer while its guide is open.
class _LiveGuideEditor extends ConsumerStatefulWidget {
  const _LiveGuideEditor({
    super.key,
    required this.organizer,
    required this.isOwner,
  });

  final Organizer organizer;
  final bool isOwner;

  @override
  ConsumerState<_LiveGuideEditor> createState() => _LiveGuideEditorState();
}

class _LiveGuideEditorState extends ConsumerState<_LiveGuideEditor> {
  late final HostOrganizerDefaultsSaver _saver = HostOrganizerDefaultsSaver(
    initial: widget.organizer.hostDefaults,
    writer: (defaults) =>
        HostOrganizerEditController.updateOrganizerMutation.run(
          ref,
          (tx) => tx
              .get(hostOrganizerEditControllerProvider)
              .updateOrganizer(
                organizerId: widget.organizer.id,
                patch: UpdateOrganizerPatch(hostDefaults: defaults),
              ),
        ),
    errorMessageFor: (error) => appErrorMessage(
      error,
      l10n: context.l10n,
      context: AppErrorContext.organizer,
    ),
  )..addListener(_changed);

  void _changed() {
    if (mounted) setState(() {});
  }

  @override
  void didUpdateWidget(covariant _LiveGuideEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    _saver.reconcile(widget.organizer.hostDefaults);
  }

  @override
  void dispose() {
    _saver
      ..removeListener(_changed)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => OrganizerLiveGuideBody(
    defaults: widget.isOwner
        ? _saver.optimistic
        : widget.organizer.hostDefaults,
    editable: widget.isOwner,
    errorMessage: _saver.errorMessage,
    onChanged: (update) => _saver.apply(
      (current) => current.copyWithEventSuccessForActivity(
        activityKind: current.primaryActivityKind,
        defaults: update(
          current.eventSuccessForActivity(current.primaryActivityKind),
        ),
      ),
    ),
  );
}
