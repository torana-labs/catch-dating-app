import 'package:catch_dating_app/contexts/organizers/domain/claimable_organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_draft.dart';
import 'package:catch_dating_app/hosts/onboarding/onboarding_controller.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_claim_body.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_find_body.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_state.dart';
import 'package:catch_kernel/city_catalog.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/riverpod_ui/mutation_error_util.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Setup step one of three. When Catch found a page for the number it first
/// asks "Is this you?": "This is me" opens the claim form and, once sent,
/// review. Otherwise, or after "None of these", it is "Start your page": the
/// name and where the page runs. Next moves to the details; Back leaves
/// setup.
class HostSetupFindScreen extends ConsumerWidget {
  const HostSetupFindScreen({
    super.key,
    required this.onClose,
    required this.onNext,
    this.candidates = const [],
    this.onSendClaim,
    this.onVerifyClaim,
  });

  final VoidCallback onClose;

  /// Saves the draft and moves on.
  final VoidCallback onNext;

  /// The pages found for the number; empty while the read is off.
  final List<ClaimableOrganizer> candidates;

  /// Sends the claim the form holds.
  final VoidCallback? onSendClaim;

  /// Opens the website's instant claim check for the claimed page.
  final VoidCallback? onVerifyClaim;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(hostSetupControllerProvider);
    final setup = ref.read(hostSetupControllerProvider.notifier);
    final send = ref.watch(HostOrganizerClaimController.requestMutation);
    final claim = state.claim;
    final claimed = claim.organizer;
    final phase = switch (claimed) {
      final _? when claim.sent => _Phase.sent,
      _? => _Phase.form,
      null
          when candidates.isNotEmpty &&
              !claim.dismissed &&
              state.draft.isEmpty =>
        _Phase.found,
      null => _Phase.start,
    };
    final step = CatchTopBarStep(
      index: state.stepNumber,
      total: HostSetupState.stepCount,
      label: l10n.hostOnboardingSetupStep(
        index: state.stepNumber,
        total: HostSetupState.stepCount,
      ),
    );
    final backFromForm = send.isPending ? null : setup.cancelClaim;
    return CatchRoot(
      child: CatchScreen(
        key: ValueKey<String>(switch (phase) {
          _Phase.start => 'host-setup-find',
          _Phase.found => 'host-setup-found',
          _Phase.form => 'host-setup-claim',
          _Phase.sent => 'host-setup-claim-sent',
        }),
        topBar: phase == _Phase.sent
            ? CatchTopBar(
                variant: CatchTopBarVariant.moment,
                back: CatchTopBarBack(
                  label: l10n.hostOnboardingClaimDone,
                  close: true,
                  onPressed: onClose,
                ),
              )
            : CatchTopBar(
                variant: CatchTopBarVariant.step,
                title: switch (phase) {
                  _Phase.found => l10n.hostOnboardingFoundTitle,
                  _Phase.form => l10n.hostOnboardingClaimTitle,
                  _ => l10n.hostOnboardingStartTitle,
                },
                back: CatchTopBarBack(
                  label: l10n.hostOnboardingSetupBack,
                  onPressed: phase == _Phase.form ? backFromForm : onClose,
                ),
                step: step,
              ),
        body: switch (phase) {
          _Phase.start => HostSetupFindBody(
            state: state,
            cities: defaultCityOptions
                .where((city) => city.hostCreatable)
                .toList(growable: false),
            onNameChanged: setup.setName,
            onCityChanged: setup.setCity,
            onAreaChanged: setup.setArea,
          ),
          _Phase.found => HostSetupFoundBody(
            candidates: candidates,
            onClaim: setup.chooseClaim,
            onNotMe: setup.dismissClaim,
          ),
          _Phase.form => HostSetupClaimFormBody(
            organizer: claimed!,
            claimantName: claim.claimantName,
            role: claim.role,
            onNameChanged: setup.setClaimantName,
            onRoleChanged: setup.setClaimRole,
            sendError: send.hasError
                ? mutationErrorMessage(send, l10n: l10n)
                : null,
          ),
          _Phase.sent => HostSetupClaimSentBody(
            organizer: claimed!,
            onVerify: onVerifyClaim ?? () {},
          ),
        },
        dock: switch (phase) {
          _Phase.start => CatchDock(
            primary: CatchDockAction(
              label: l10n.hostOnboardingSetupNext,
              onPressed: state.startComplete ? onNext : null,
            ),
          ),
          _Phase.found => null,
          _Phase.form => CatchDock(
            primary: CatchDockAction(
              label: l10n.hostOnboardingClaimSend,
              loading: send.isPending,
              onPressed: claim.canSend && !send.isPending ? onSendClaim : null,
            ),
            secondary: CatchDockAction(
              label: l10n.hostOnboardingSetupBack,
              onPressed: backFromForm,
            ),
          ),
          _Phase.sent => CatchDock(
            primary: CatchDockAction(
              label: l10n.hostOnboardingClaimDone,
              onPressed: onClose,
            ),
          ),
        },
      ),
    );
  }
}

/// Which part of step one shows.
enum _Phase { start, found, form, sent }
