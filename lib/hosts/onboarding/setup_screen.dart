import 'dart:async';

import 'package:catch_dating_app/contexts/organizers/domain/organizer_draft.dart';
import 'package:catch_dating_app/hosts/onboarding/onboarding_controller.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_details_screen.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_done_screen.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_find_screen.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_payments_screen.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_state.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/create_organizer_controller.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/create_organizer_draft_controller.dart';
import 'package:catch_platform/errors/app_error_context.dart' as app_ops;
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Organiser setup, the `hostCreateOrganizerScreen` route: Start your page,
/// Check your details, Getting paid, Done.
///
/// It restores and saves the create-organizer draft through
/// `CreateOrganizerDraftController`, picks the logo and creates the page
/// through `CreateOrganizerController`, and shows the step
/// [hostSetupControllerProvider] is on.
class HostSetupScreen extends ConsumerStatefulWidget {
  const HostSetupScreen({super.key, this.restoreSavedDraft = true});

  /// Off for previews and tests that start from an empty page.
  final bool restoreSavedDraft;

  @override
  ConsumerState<HostSetupScreen> createState() => _HostSetupScreenState();
}

class _HostSetupScreenState extends ConsumerState<HostSetupScreen> {
  PickedOrganizerProfileImage? _logo;

  @override
  void initState() {
    super.initState();
    if (widget.restoreSavedDraft) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) unawaited(_restoreDraft());
      });
    }
  }

  Future<void> _restoreDraft() async {
    OrganizerDraft? draft;
    try {
      await CreateOrganizerDraftController.loadDraftMutation.run(ref, (
        tx,
      ) async {
        draft = await tx
            .get(createOrganizerDraftControllerProvider.notifier)
            .loadDraft();
        return draft;
      });
    } catch (_) {
      // A draft that cannot be read leaves setup empty; nothing is lost.
      return;
    }
    final restored = draft;
    if (mounted && restored != null) {
      ref.read(hostSetupControllerProvider.notifier).restore(restored);
    }
  }

  void _close() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.goNamed(Routes.hostTodayScreen.name);
    }
  }

  void _next() {
    final setup = ref.read(hostSetupControllerProvider.notifier);
    final draft = ref.read(hostSetupControllerProvider).draft;
    setup.next();
    // The draft save is best effort: a failure is logged, and the next step
    // saves again.
    unawaited(
      app_ops.runLoggingAppErrors(
        () => CreateOrganizerDraftController.saveDraftMutation.run(
          ref,
          (tx) => tx
              .get(createOrganizerDraftControllerProvider.notifier)
              .saveDraft(draft),
        ),
        context: const app_ops.AppErrorContext(
          operation: app_ops.AppOperation.localPersistence,
          action: 'save the organizer setup draft',
          resource: 'create_organizer_draft',
        ),
        logError: ref.read(errorLoggerProvider),
      ),
    );
  }

  Future<void> _pickLogo() async {
    final PickedOrganizerProfileImage? picked;
    try {
      // provider-graph: ownership-widget-async:_HostSetupScreenState._pickLogo:await:createOrganizerControllerProvider.pickProfileImage watch CAT156 -- A platform image pick through the organizer create controller; the picked file is local form media until create sends it, and a failed pick is logged. Mechanical media feedback, not business state.
      picked = await ref
          .read(createOrganizerControllerProvider.notifier)
          .pickProfileImage();
    } catch (error, stackTrace) {
      // A cancelled or failed pick keeps the current logo.
      app_ops.logAppError(
        error,
        stackTrace: stackTrace,
        context: const app_ops.AppErrorContext(
          operation: app_ops.AppOperation.plugin,
          action: 'pick the organizer logo',
          resource: 'organizer_profile_image',
        ),
        logError: ref.read(errorLoggerProvider),
      );
      return;
    }
    if (!mounted || picked == null) return;
    setState(() => _logo = picked);
    ref.read(hostSetupControllerProvider.notifier).logoPicked();
  }

  Future<void> _create() async {
    final state = ref.read(hostSetupControllerProvider);
    if (!state.detailsComplete) return;
    final draft = state.draft;
    String? organizerId;
    try {
      await CreateOrganizerController.submitMutation.run(ref, (tx) async {
        organizerId = await tx
            .get(createOrganizerControllerProvider.notifier)
            .submit(
              name: draft.name!.trim(),
              location: draft.location!,
              area: draft.area!.trim(),
              description: draft.description!.trim(),
              hostDefaults: draft.hostDefaults,
              profileImage: _logo?.image,
            );
      });
    } catch (_) {
      // The mutation holds the error; the details step shows it.
      return;
    }
    final created = organizerId;
    if (!mounted || created == null) return;
    ref.read(hostSetupControllerProvider.notifier).created(created);
    unawaited(
      CreateOrganizerDraftController.deleteDraftMutation
          .run(
            ref,
            (tx) => tx
                .get(createOrganizerDraftControllerProvider.notifier)
                .deleteDraft(),
          )
          .catchError((Object _) {}),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(hostSetupControllerProvider);
    final organizerId = state.organizerId;
    return switch (state.step) {
      HostSetupStep.start => HostSetupFindScreen(
        onClose: _close,
        onNext: _next,
      ),
      HostSetupStep.details => HostSetupDetailsScreen(
        onPickLogo: () => unawaited(_pickLogo()),
        onCreate: () => unawaited(_create()),
      ),
      HostSetupStep.payments when organizerId != null =>
        HostSetupPaymentsScreen(
          organizerId: organizerId,
          onFinish: ref.read(hostSetupControllerProvider.notifier).finish,
        ),
      HostSetupStep.done when organizerId != null => HostSetupDoneScreen(
        organizerId: organizerId,
        fallbackName: state.name.trim(),
      ),
      HostSetupStep.payments ||
      HostSetupStep.done => HostSetupFindScreen(onClose: _close, onNext: _next),
    };
  }
}
