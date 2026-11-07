import 'dart:async';

import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_payments_body.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_state.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Setup step three of three, "Getting paid".
///
/// It reads the page's Razorpay connection through the payouts connection
/// controller; Connect Razorpay runs its `connect` (or `reconnect` for a
/// stale connection), which opens Razorpay's sign-in. Finish and Skip for
/// now both move to Done: payouts can be connected later from Payouts.
class HostSetupPaymentsScreen extends ConsumerWidget {
  const HostSetupPaymentsScreen({
    super.key,
    required this.organizerId,
    required this.onFinish,
  });

  final String organizerId;
  final VoidCallback onFinish;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final provider = hostFormPaymentControllerProvider(organizerId);
    final setup = ref.watch(provider);
    final value = setup.asData?.value;
    final status = hostSetupPayoutStatus(setup);
    final error = value?.error ?? (value == null ? setup.error : null);
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-setup-payments'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.step,
          title: l10n.hostOnboardingPaymentsTitle,
          step: CatchTopBarStep(
            index: HostSetupState.stepCount,
            total: HostSetupState.stepCount,
            label: l10n.hostOnboardingSetupStep(
              index: HostSetupState.stepCount,
              total: HostSetupState.stepCount,
            ),
          ),
        ),
        body: HostSetupPaymentsBody(
          status: status,
          pending: value?.pending ?? false,
          error: error == null
              ? null
              : appErrorMessage(
                  error,
                  l10n: l10n,
                  context: AppErrorContext.payments,
                ),
          onConnect: () {
            final notifier = ref.read(provider.notifier);
            unawaited(
              status == HostSetupPayoutStatus.needsReconnect
                  ? notifier.reconnect()
                  : notifier.connect(),
            );
          },
        ),
        dock: CatchDock(
          primary: CatchDockAction(
            label: l10n.hostOnboardingPaymentsFinish,
            onPressed: onFinish,
          ),
          secondary: status == HostSetupPayoutStatus.connected
              ? null
              : CatchDockAction(
                  label: l10n.hostOnboardingPaymentsSkip,
                  onPressed: onFinish,
                ),
        ),
      ),
    );
  }
}

/// The payouts step's status from the connection read.
HostSetupPayoutStatus hostSetupPayoutStatus(
  AsyncValue<HostFormPaymentSetupState> value,
) {
  final setup = value.asData?.value.setup;
  if (setup == null) {
    return value.hasError
        ? HostSetupPayoutStatus.unavailable
        : HostSetupPayoutStatus.loading;
  }
  if (!setup.available) return HostSetupPayoutStatus.unavailable;
  return switch (setup.razorpayConnectionState) {
    HostRazorpayConnectionState.notConnected =>
      HostSetupPayoutStatus.notConnected,
    HostRazorpayConnectionState.connecting => HostSetupPayoutStatus.connecting,
    HostRazorpayConnectionState.ready => HostSetupPayoutStatus.connected,
    HostRazorpayConnectionState.needsReconnect =>
      HostSetupPayoutStatus.needsReconnect,
  };
}
