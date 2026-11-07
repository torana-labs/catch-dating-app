import 'dart:async';

import 'package:catch_dating_app/auth/presentation/auth_controller.dart';
import 'package:catch_dating_app/auth/presentation/auth_input.dart';
import 'package:catch_dating_app/auth/presentation/auth_presentation_state.dart';
import 'package:catch_dating_app/hosts/onboarding/code_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Enter the code: the sign-in route's second step.
///
/// Six digits run `AuthController.verifyOtp`; Send again reruns `sendOtp`
/// once the cooldown ends; Back returns to the number. The screen owns the
/// digits and the countdown, which are UI mechanics.
class HostCodeScreen extends ConsumerStatefulWidget {
  const HostCodeScreen({
    super.key,
    this.initialCode = '',
    this.initialSecondsUntilResend,
  });

  final String initialCode;
  final int? initialSecondsUntilResend;

  @override
  ConsumerState<HostCodeScreen> createState() => _HostCodeScreenState();
}

class _HostCodeScreenState extends ConsumerState<HostCodeScreen> {
  late final TextEditingController _code;
  Timer? _tick;
  late int _secondsUntilResend;

  @override
  void initState() {
    super.initState();
    _code = TextEditingController(text: widget.initialCode);
    _secondsUntilResend =
        widget.initialSecondsUntilResend ??
        AuthOtpEntryViewState.resendCooldown.inSeconds;
    _startCountdown();
  }

  @override
  void dispose() {
    _tick?.cancel();
    _code.dispose();
    super.dispose();
  }

  void _startCountdown() {
    _tick?.cancel();
    if (_secondsUntilResend <= 0) return;
    _tick = ref.read(appClockProvider).periodic(
      CatchMotion.authOtpCooldownTick,
      (timer) {
        if (!mounted) {
          timer.cancel();
          return;
        }
        setState(() => _secondsUntilResend--);
        if (_secondsUntilResend <= 0) timer.cancel();
      },
    );
  }

  void _verify(String code) {
    if (!AuthInput.isCompleteOtpCode(code)) return;
    if (ref.read(AuthController.verifyOtpMutation).isPending) return;
    unawaited(
      AuthController.verifyOtpMutation
          .run(ref, (tx) async {
            await tx.get(authControllerProvider.notifier).verifyOtp(code);
          })
          .catchError((Object _) {}),
    );
  }

  void _changed(String value) {
    if (!ref.read(AuthController.verifyOtpMutation).isPending) {
      AuthController.verifyOtpMutation.reset(ref);
    }
    setState(() {});
    if (AuthInput.isCompleteOtpCode(value)) _verify(value);
  }

  void _resend() {
    final data = ref.read(authControllerProvider);
    if (_secondsUntilResend > 0 || data.phoneNumber.isEmpty) return;
    _code.clear();
    AuthController.verifyOtpMutation.reset(ref);
    AuthController.sendOtpMutation.reset(ref);
    setState(
      () =>
          _secondsUntilResend = AuthOtpEntryViewState.resendCooldown.inSeconds,
    );
    _startCountdown();
    unawaited(
      AuthController.sendOtpMutation
          .run(ref, (tx) async {
            await tx
                .get(authControllerProvider.notifier)
                .sendOtp(data.phoneNumber, data.countryCode);
          })
          .catchError((Object _) {}),
    );
  }

  String? _error(MutationState<void> mutation) => mutation.hasError
      ? appErrorMessage(
          (mutation as MutationError).error,
          l10n: context.l10n,
          context: AppErrorContext.auth,
        )
      : null;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final data = ref.watch(authControllerProvider);
    final verify = ref.watch(AuthController.verifyOtpMutation);
    final send = ref.watch(AuthController.sendOtpMutation);
    final view = AuthOtpEntryViewState.from(
      data: data,
      otpCode: _code.text,
      secondsUntilResend: _secondsUntilResend,
      isVerifyPending: verify.isPending,
      isSendPending: send.isPending,
    );
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-code'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostOnboardingCodeTitle,
          kicker: view.displayPhoneNumber.isEmpty
              ? null
              : l10n.hostOnboardingCodeSentTo(phone: view.displayPhoneNumber),
          back: CatchTopBarBack(
            label: l10n.hostOnboardingCodeBack,
            onPressed: view.canChangeNumber
                ? () => ref
                      .read(authControllerProvider.notifier)
                      .goToStep(AuthStep.phone)
                : null,
          ),
        ),
        body: HostCodeBody(
          controller: _code,
          secondsUntilResend: view.secondsUntilResend,
          canResend: view.canResend,
          resending: view.isSendPending,
          canVerify: view.canVerify,
          verifying: view.verifyButtonLoading,
          verifyError: _error(verify),
          resendError: _error(send),
          onChanged: _changed,
          onSubmitted: _verify,
          onResend: _resend,
          onVerify: () => _verify(_code.text),
        ),
      ),
    );
  }
}
