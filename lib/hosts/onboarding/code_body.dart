import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The code step: six digits by SMS, when a new one can be sent, the
/// autofill note and Continue.
class HostCodeBody extends StatelessWidget {
  const HostCodeBody({
    super.key,
    required this.controller,
    required this.secondsUntilResend,
    required this.canResend,
    required this.resending,
    required this.canVerify,
    required this.verifying,
    required this.onChanged,
    required this.onSubmitted,
    required this.onResend,
    required this.onVerify,
    this.verifyError,
    this.resendError,
  });

  /// Holds the digits typed or filled in from the message.
  final TextEditingController controller;

  /// Zero once a new code can be asked for.
  final int secondsUntilResend;
  final bool canResend;
  final bool resending;

  /// Six digits are in and nothing is in flight.
  final bool canVerify;
  final bool verifying;
  final ValueChanged<String> onChanged;
  final ValueChanged<String> onSubmitted;
  final VoidCallback onResend;
  final VoidCallback onVerify;

  /// Why the code was not accepted.
  final String? verifyError;

  /// Why a new code could not be sent.
  final String? resendError;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchText(
          l10n.hostOnboardingCodeHeading,
          variant: CatchTextVariant.pageTitle,
        ),
        CatchCodeInput(
          semanticsLabel: l10n.hostOnboardingCodeLabel,
          inputKey: const ValueKey<String>('host-code-input'),
          contract: CatchContractConstraints.mobileFormStateAuthOtpCode,
          controller: controller,
          autofocus: true,
          status: verifyError == null
              ? CatchCodeInputStatus.ready
              : CatchCodeInputStatus.error,
          onChanged: onChanged,
          onSubmitted: onSubmitted,
        ),
        if (verifyError != null)
          CatchNotice.inline(body: verifyError!, tone: CatchNoticeTone.danger),
        if (secondsUntilResend > 0 || resending)
          CatchText(
            l10n.hostOnboardingCodeResendIn(
              minutes: secondsUntilResend ~/ 60,
              seconds: (secondsUntilResend % 60).toString().padLeft(2, '0'),
            ),
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          )
        else
          CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g8,
            align: CatchStackAlign.center,
            wrap: true,
            children: [
              CatchText(
                l10n.hostOnboardingCodeResendPrompt,
                variant: CatchTextVariant.bodySmall,
                tone: CatchTextTone.secondary,
              ),
              CatchButton(
                key: const ValueKey<String>('host-code-resend'),
                label: l10n.hostOnboardingCodeResend,
                onPressed: canResend ? onResend : null,
                variant: CatchButtonVariant.quiet,
                size: CatchButtonSize.sm,
              ),
            ],
          ),
        if (resendError != null)
          CatchNotice.inline(body: resendError!, tone: CatchNoticeTone.danger),
        CatchNotice.inline(
          body: l10n.hostOnboardingCodeAutofill,
          tone: CatchNoticeTone.neutral,
          icon: CatchIcons.info,
        ),
        CatchButton(
          key: const ValueKey<String>('host-code-continue'),
          label: l10n.hostOnboardingCodeContinue,
          onPressed: canVerify ? onVerify : null,
          status: verifying
              ? CatchButtonStatus.loading
              : CatchButtonStatus.idle,
          fullWidth: true,
        ),
      ],
    );
  }
}
