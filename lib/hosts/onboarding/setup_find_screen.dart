import 'package:catch_dating_app/hosts/onboarding/onboarding_controller.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_find_body.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_state.dart';
import 'package:catch_kernel/city_catalog.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Setup step one of three, "Start your page": the name and where the page
/// runs. Next moves to the details; Back leaves setup.
class HostSetupFindScreen extends ConsumerWidget {
  const HostSetupFindScreen({
    super.key,
    required this.onClose,
    required this.onNext,
  });

  final VoidCallback onClose;

  /// Saves the draft and moves on.
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(hostSetupControllerProvider);
    final setup = ref.read(hostSetupControllerProvider.notifier);
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-setup-find'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.step,
          title: l10n.hostOnboardingStartTitle,
          back: CatchTopBarBack(
            label: l10n.hostOnboardingSetupBack,
            onPressed: onClose,
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
        body: HostSetupFindBody(
          state: state,
          cities: defaultCityOptions
              .where((city) => city.hostCreatable)
              .toList(growable: false),
          onNameChanged: setup.setName,
          onCityChanged: setup.setCity,
          onAreaChanged: setup.setArea,
        ),
        dock: CatchDock(
          primary: CatchDockAction(
            label: l10n.hostOnboardingSetupNext,
            onPressed: state.startComplete ? onNext : null,
          ),
        ),
      ),
    );
  }
}
