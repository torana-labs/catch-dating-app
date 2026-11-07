import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Where the page's Razorpay connection stands, as payouts reads it.
enum HostSetupPayoutStatus {
  /// The connection list is still being read.
  loading,
  notConnected,

  /// Razorpay has the request; the connection is not live yet.
  connecting,
  connected,

  /// An old connection can no longer take payments.
  needsReconnect,

  /// Connections are not open for this page.
  unavailable,
}

/// Setup step three: connect Razorpay, what Catch costs, and why skipping
/// is fine for free events.
class HostSetupPaymentsBody extends StatelessWidget {
  const HostSetupPaymentsBody({
    super.key,
    required this.status,
    required this.pending,
    required this.onConnect,
    this.error,
  });

  final HostSetupPayoutStatus status;

  /// A connect request is in flight.
  final bool pending;
  final VoidCallback onConnect;

  /// Why the last connect request failed.
  final String? error;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final connectLabel = status == HostSetupPayoutStatus.needsReconnect
        ? l10n.hostOnboardingPaymentsReconnect
        : l10n.hostOnboardingPaymentsConnect;
    final canConnect =
        !pending &&
        (status == HostSetupPayoutStatus.notConnected ||
            status == HostSetupPayoutStatus.needsReconnect);
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchSurface(
          block: CatchSurfaceBlock.spotlight,
          color: CatchSurfaceColor.courts,
          child: CatchStack(
            align: CatchStackAlign.start,
            children: [
              CatchText(
                l10n.hostOnboardingPaymentsConnectTitle,
                variant: CatchTextVariant.displaySm,
              ),
              CatchText(l10n.hostOnboardingPaymentsConnectBody),
              switch (status) {
                HostSetupPayoutStatus.connected => CatchBadge(
                  label: l10n.hostOnboardingPaymentsConnected,
                  tone: CatchBadgeTone.success,
                  size: CatchBadgeSize.md,
                  icon: CatchIcons.success,
                ),
                HostSetupPayoutStatus.connecting => CatchText(
                  l10n.hostOnboardingPaymentsConnecting,
                  variant: CatchTextVariant.bodySmall,
                ),
                HostSetupPayoutStatus.unavailable => CatchText(
                  l10n.hostOnboardingPaymentsUnavailable,
                  variant: CatchTextVariant.bodySmall,
                ),
                _ => CatchButton(
                  key: const ValueKey<String>('host-setup-connect'),
                  label: connectLabel,
                  onPressed: canConnect ? onConnect : null,
                  size: CatchButtonSize.md,
                  status: pending || status == HostSetupPayoutStatus.loading
                      ? CatchButtonStatus.loading
                      : CatchButtonStatus.idle,
                  trailing: CatchIcon(
                    CatchIcons.openExternal,
                    size: CatchIconSize.md,
                  ),
                ),
              },
              if (status != HostSetupPayoutStatus.connected)
                CatchText(
                  l10n.hostOnboardingPaymentsNoAccount,
                  variant: CatchTextVariant.bodySmall,
                ),
            ],
          ),
        ),
        if (error != null)
          CatchNotice.inline(body: error!, tone: CatchNoticeTone.danger),
        CatchSection(
          title: l10n.hostOnboardingPaymentsCostsTitle,
          dividers: CatchSectionPlacement.none,
          children: [
            CatchText(
              l10n.hostOnboardingPaymentsCostsBody,
              tone: CatchTextTone.secondary,
            ),
          ],
        ),
        CatchNotice.inline(
          body: l10n.hostOnboardingPaymentsFreeNotice,
          tone: CatchNoticeTone.neutral,
        ),
      ],
    );
  }
}
