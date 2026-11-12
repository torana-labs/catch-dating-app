import 'dart:async';

import 'package:catch_dating_app/auth/presentation/auth_controller.dart';
import 'package:catch_dating_app/auth/presentation/auth_input.dart';
import 'package:catch_dating_app/hosts/onboarding/code_screen.dart';
import 'package:catch_dating_app/hosts/onboarding/sign_in_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/brand/live_brand.dart';
import 'package:catch_platform/device/external_links.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Catch Host's sign-in route: the phone number, then the code.
///
/// It keeps the auth flow's controller and its mutations: Text me a code
/// runs `AuthController.sendOtp`, and once a code is on its way the route
/// shows [HostCodeScreen]. Signing in moves the router on, as before.
class HostSignInScreen extends ConsumerStatefulWidget {
  const HostSignInScreen({
    super.key,
    this.initialPhoneNumber = '',
    this.initialOtpCode = '',
    this.initialResendSeconds,
  });

  final String initialPhoneNumber;

  /// Seeds the code step, for previews and tests.
  final String initialOtpCode;
  final int? initialResendSeconds;

  @override
  ConsumerState<HostSignInScreen> createState() => _HostSignInScreenState();
}

class _HostSignInScreenState extends ConsumerState<HostSignInScreen> {
  late String _phone;
  var _touched = false;

  @override
  void initState() {
    super.initState();
    final stored = ref.read(authControllerProvider).phoneNumber;
    _phone = stored.isEmpty ? widget.initialPhoneNumber : stored;
  }

  void _send() {
    if (ref.read(AuthController.sendOtpMutation).isPending) return;
    if (AuthInput.phoneNumberIssue(_phone) != null) return;
    final countryCode = ref.read(authControllerProvider).countryCode;
    unawaited(
      AuthController.sendOtpMutation
          .run(ref, (tx) async {
            await tx
                .get(authControllerProvider.notifier)
                .sendOtp(_phone.trim(), countryCode);
          })
          .catchError((Object _) {}),
    );
  }

  void _getCatch() => unawaited(_openCatchApp());

  Future<bool> _openCatchApp() async {
    final brand = await ref.read(liveBrandProvider.future);
    if (!mounted) return false;
    return ref.read(externalLinkControllerProvider).openCatchApp(brand: brand);
  }

  @override
  Widget build(BuildContext context) {
    final step = ref.watch(authControllerProvider.select((s) => s.step));
    if (step == AuthStep.otp) {
      return HostCodeScreen(
        initialCode: widget.initialOtpCode,
        initialSecondsUntilResend: widget.initialResendSeconds,
      );
    }
    final l10n = context.l10n;
    final countryCode = ref.watch(
      authControllerProvider.select((s) => s.countryCode),
    );
    final mutation = ref.watch(AuthController.sendOtpMutation);
    final phoneValid = AuthInput.phoneNumberIssue(_phone) == null;
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-sign-in'),
        topBar: const CatchTopBar(variant: CatchTopBarVariant.moment),
        body: HostSignInBody(
          countryCode: countryCode,
          initialPhoneNumber: _phone,
          canSend: phoneValid && !mutation.isPending,
          sending: mutation.isPending,
          phoneError: _touched && !phoneValid && _phone.isNotEmpty
              ? l10n.authInvalidPhoneNumber
              : null,
          sendError: mutation.hasError
              ? appErrorMessage(
                  (mutation as MutationError).error,
                  l10n: l10n,
                  context: AppErrorContext.auth,
                )
              : null,
          onPhoneChanged: (value) {
            ref.read(authControllerProvider.notifier).clearSendOtpErrorIfIdle();
            setState(() {
              _phone = value;
              _touched = true;
            });
          },
          onSend: _send,
          onGetCatch: _getCatch,
        ),
      ),
    );
  }
}
