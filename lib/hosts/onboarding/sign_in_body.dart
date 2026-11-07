import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// Sign in, as the board draws it: the kicker, two stats from a real night,
/// the promise, the phone field, Text me a code, and a way to the guest app.
class HostSignInBody extends StatelessWidget {
  const HostSignInBody({
    super.key,
    required this.countryCode,
    required this.initialPhoneNumber,
    required this.canSend,
    required this.sending,
    required this.onPhoneChanged,
    required this.onSend,
    required this.onGetCatch,
    this.phoneError,
    this.sendError,
  });

  /// The dial code the number is sent with, shown before it.
  final String countryCode;
  final String initialPhoneNumber;

  /// The number has a plausible length and nothing is in flight.
  final bool canSend;

  /// The code is being requested.
  final bool sending;
  final ValueChanged<String> onPhoneChanged;
  final VoidCallback onSend;

  /// Opens the guest app's download page.
  final VoidCallback onGetCatch;

  /// Shown under the field once the host has typed something unusable.
  final String? phoneError;

  /// Why the last request for a code failed.
  final String? sendError;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchText(
          l10n.hostOnboardingSignInKicker,
          variant: CatchTextVariant.labelKicker,
          tone: CatchTextTone.secondary,
        ),
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          children: [
            CatchMetricTile.stat(
              label: l10n.hostOnboardingSignInStatTonightLabel,
              value: l10n.hostOnboardingSignInStatTonightValue,
              note: l10n.hostOnboardingSignInStatTonightNote,
              noteTone: CatchMetricTileTone.success,
            ),
            CatchMetricTile.stat(
              label: l10n.hostOnboardingSignInStatMonthLabel,
              value: l10n.hostOnboardingSignInStatMonthValue,
              note: l10n.hostOnboardingSignInStatMonthNote,
            ),
          ],
        ),
        CatchStack(
          gap: CatchStackGap.g8,
          children: [
            CatchText(
              l10n.hostOnboardingSignInTitle,
              variant: CatchTextVariant.pageTitle,
            ),
            CatchText(
              l10n.hostOnboardingSignInLead,
              tone: CatchTextTone.secondary,
            ),
          ],
        ),
        CatchStack(
          children: [
            CatchFieldLanes.single(
              child: CatchField.input(
                key: const ValueKey<String>('host-sign-in-phone'),
                copy: catchFieldCopy(l10n),
                title: l10n.hostOnboardingSignInPhoneLabel,
                contractExemption:
                    'Sign-in number: Firebase phone auth validates it, not a stored field.',
                initialValue: initialPhoneNumber,
                prefixText: '$countryCode ',
                placeholder: l10n.hostOnboardingSignInPhonePlaceholder,
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.done,
                autofillHints: const [AutofillHints.telephoneNumberNational],
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                states: <WidgetState>{if (sending) WidgetState.disabled},
                errorText: phoneError,
                onChanged: onPhoneChanged,
                onSubmitted: (_) {
                  if (canSend) onSend();
                },
              ),
            ),
            if (sendError != null)
              CatchNotice.inline(
                body: sendError!,
                tone: CatchNoticeTone.danger,
              ),
            CatchButton(
              key: const ValueKey<String>('host-sign-in-send'),
              label: l10n.hostOnboardingSignInSendCode,
              onPressed: canSend ? onSend : null,
              status: sending
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              fullWidth: true,
            ),
          ],
        ),
        CatchStack(
          direction: CatchStackDirection.row,
          gap: CatchStackGap.g8,
          justify: CatchStackJustify.center,
          align: CatchStackAlign.center,
          wrap: true,
          children: [
            CatchText(
              l10n.hostOnboardingSignInGuestPrompt,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
            CatchButton(
              label: l10n.hostOnboardingSignInGetCatch,
              onPressed: onGetCatch,
              variant: CatchButtonVariant.quiet,
              size: CatchButtonSize.sm,
            ),
          ],
        ),
      ],
    );
  }
}
