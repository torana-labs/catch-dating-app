import 'dart:async';

import 'package:catch_dating_app/contexts/organizers/domain/claimable_organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_draft.dart';
import 'package:catch_dating_app/hosts/onboarding/onboarding_controller.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_details_screen.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_done_screen.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_find_screen.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_payments_screen.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_state.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/create_organizer_controller.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/create_organizer_draft_controller.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/device/external_links.dart';
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

  /// Sends the claim the form holds; review comes next.
  Future<void> _sendClaim() async {
    final claim = ref.read(hostSetupControllerProvider).claim;
    final organizer = claim.organizer;
    final role = claim.role;
    if (!claim.canSend || organizer == null || role == null) return;
    String? requestId;
    try {
      await HostOrganizerClaimController.requestMutation.run(ref, (tx) async {
        requestId = await tx
            .get(hostOrganizerClaimControllerProvider.notifier)
            .request(
              organizerId: organizer.organizerId,
              claimantName: claim.claimantName,
              role: role,
            );
        return requestId!;
      });
    } catch (_) {
      // The mutation holds the error; the claim form shows it.
      return;
    }
    final sent = requestId;
    if (!mounted || sent == null) return;
    ref.read(hostSetupControllerProvider.notifier).claimSent(sent);
  }

  /// The website's claim page, where Instagram or Luma proves the page is
  /// the host's and hands it over at once.
  void _verifyClaim() {
    final claim = ref.read(hostSetupControllerProvider).claim;
    final organizer = claim.organizer;
    if (organizer == null) return;
    final requestId = claim.requestId;
    final url = AppConfig.publicSiteUrl.resolve(
      Uri(
        path: '/claim/${organizer.organizerId}',
        queryParameters: requestId == null ? null : {'requestId': requestId},
      ).toString(),
    );
    unawaited(
      app_ops.runLoggingAppErrors(
        () async {
          await ref.read(externalLinkControllerProvider).openExternal(url);
        },
        context: const app_ops.AppErrorContext(
          operation: app_ops.AppOperation.plugin,
          action: 'open the website claim check',
          resource: 'url_launcher',
        ),
        logError: ref.read(errorLoggerProvider),
      ),
    );
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
    // Read before the pick: a failed pick that returns after the screen
    // closed is still logged.
    final logger = ref.read(errorLoggerProvider);
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
        logError: logger,
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
              signupSource: draft.signupSource,
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
    final candidates = state.step == HostSetupStep.start
        ? (ref.watch(hostClaimableOrganizersProvider).value ??
                  ClaimableOrganizers.none)
              .candidatesToOffer
        : const <ClaimableOrganizer>[];
    return switch (state.step) {
      HostSetupStep.start => HostSetupFindScreen(
        onClose: _close,
        onNext: _next,
        candidates: candidates,
        onSendClaim: () => unawaited(_sendClaim()),
        onVerifyClaim: _verifyClaim,
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
