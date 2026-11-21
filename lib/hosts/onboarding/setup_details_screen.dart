import 'package:catch_dating_app/hosts/onboarding/onboarding_controller.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_details_body.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_state.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/create_organizer_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/riverpod_ui/mutation_error_util.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Setup step two of three, "Check your details". Next creates the page
/// through `CreateOrganizerController.submit`; Back returns to step one.
class HostSetupDetailsScreen extends ConsumerWidget {
  const HostSetupDetailsScreen({
    super.key,
    required this.onPickLogo,
    required this.onCreate,
  });

  final VoidCallback onPickLogo;

  /// Creates the page from the draft.
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(hostSetupControllerProvider);
    final setup = ref.read(hostSetupControllerProvider.notifier);
    final submit = ref.watch(CreateOrganizerController.submitMutation);
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-setup-details'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.step,
          title: l10n.hostOnboardingDetailsTitle,
          back: CatchTopBarBack(
            label: l10n.hostOnboardingSetupBack,
            onPressed: submit.isPending ? null : setup.back,
          ),
          step: CatchTopBarStep(
            index: state.stepNumber,
            total: HostSetupState.stepCount,
            label: l10n.hostOnboardingSetupStep(
              index: state.stepNumber,
              total: HostSetupState.stepCount,
            ),
          ),
        ),
        body: HostSetupDetailsBody(
          state: state,
          onPickLogo: submit.isPending ? null : onPickLogo,
          onDescriptionChanged: setup.setDescription,
          onToggleFormat: setup.toggleFormat,
          createError: submit.hasError
              ? mutationErrorMessage(submit, l10n: l10n)
              : null,
        ),
        dock: CatchDock(
          primary: CatchDockAction(
            label: l10n.hostOnboardingSetupNext,
            loading: submit.isPending,
            onPressed: state.detailsComplete && !submit.isPending
                ? onCreate
                : null,
          ),
          secondary: CatchDockAction(
            label: l10n.hostOnboardingSetupBack,
            onPressed: submit.isPending ? null : setup.back,
          ),
        ),
      ),
    );
  }
}
