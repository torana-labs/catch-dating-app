import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/update_organizer_patch.dart';
import 'package:catch_dating_app/hosts/organizer/event_policy_body.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_controller.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_screen.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/host_organizer_defaults_saver.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/host_organizer_edit_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The event policy every new event of this organizer starts with: the
/// main activity, admission, ages and cancellation, beside the city and
/// timezone they follow.
///
/// It reads the organizer through [watchHostOrganizerScope] and saves each
/// change through the existing organizer update as host defaults, queued
/// and reconciled by [HostOrganizerDefaultsSaver]. Only the owner changes
/// it; a manager reads it.
class OrganizerEventPolicyScreen extends ConsumerWidget {
  const OrganizerEventPolicyScreen({super.key, required this.organizerId});

  final String organizerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final read = watchHostOrganizerScope(ref, organizerId: organizerId);
    final scope = read.scope;
    final organizer = scope?.organizer;
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-organizer-event-policy-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostsHostOrganizerEditTabLabelEventDefaults,
          kicker: organizer?.name,
          back: CatchTopBarBack(label: l10n.hostOrganizerBack),
        ),
        body: scope == null || organizer == null
            ? HostOrganizerScopeBody(
                gap: read.gap,
                error: read.error,
                onRetry: () => retryHostOrganizerScope(ref),
              )
            : _EventPolicyEditor(
                key: ValueKey<String>(organizer.id),
                organizer: organizer,
                isOwner: scope.isOwner,
              ),
      ),
    );
  }
}

/// Holds the defaults saver for one organizer while its policy is open.
class _EventPolicyEditor extends ConsumerStatefulWidget {
  const _EventPolicyEditor({
    super.key,
    required this.organizer,
    required this.isOwner,
  });

  final Organizer organizer;
  final bool isOwner;

  @override
  ConsumerState<_EventPolicyEditor> createState() => _EventPolicyEditorState();
}

class _EventPolicyEditorState extends ConsumerState<_EventPolicyEditor> {
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
  void didUpdateWidget(covariant _EventPolicyEditor oldWidget) {
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
  Widget build(BuildContext context) => OrganizerEventPolicyBody(
    city: widget.organizer.location,
    defaults: widget.isOwner
        ? _saver.optimistic
        : widget.organizer.hostDefaults,
    editable: widget.isOwner,
    errorMessage: _saver.errorMessage,
    onChanged: _saver.apply,
  );
}
