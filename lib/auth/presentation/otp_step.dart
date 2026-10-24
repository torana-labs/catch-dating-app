import 'dart:async';

import 'package:catch_dating_app/auth/presentation/auth_controller.dart';
import 'package:catch_dating_app/auth/presentation/auth_form_keys.dart';
import 'package:catch_dating_app/auth/presentation/auth_input.dart';
import 'package:catch_dating_app/auth/presentation/auth_page_presentation.dart';
import 'package:catch_dating_app/auth/presentation/auth_presentation_state.dart';
import 'package:catch_dating_app/auth/presentation/host_auth_card.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/country_markets.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/onboarding/shared/onboarding_step_layout.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class OtpStep extends ConsumerStatefulWidget {
  const OtpStep({
    super.key,
    this.presentation = AuthPagePresentation.standalone,
    this.initialCode = '',
    this.initialSecondsUntilResend,
  });

  final AuthPagePresentation presentation;
  final String initialCode;
  final int? initialSecondsUntilResend;

  @override
  ConsumerState<OtpStep> createState() => _OtpStepState();
}

class _OtpStepState extends ConsumerState<OtpStep> {
  late final TextEditingController _otpController;
  Timer? _resendTimer;
  late int _secondsUntilResend;

  @override
  void initState() {
    super.initState();
    _otpController = TextEditingController(text: widget.initialCode);
    _secondsUntilResend =
        widget.initialSecondsUntilResend ??
        AuthOtpEntryViewState.resendCooldown.inSeconds;
    _resendTimer = _createResendTimer();
  }

  @override
  void dispose() {
    _resendTimer?.cancel();
    _otpController.dispose();
    super.dispose();
  }

  void _submit(String code) {
    if (AuthInput.isCompleteOtpCode(code)) {
      if (ref.read(AuthController.verifyOtpMutation).isPending) return;

      unawaited(
        AuthController.verifyOtpMutation
            .run(ref, (tx) async {
              await tx.get(authControllerProvider.notifier).verifyOtp(code);
            })
            .catchError((Object _) {}),
      );
    }
  }

  void _handleCodeChanged(String value) {
    if (!ref.read(AuthController.verifyOtpMutation).isPending) {
      AuthController.verifyOtpMutation.reset(ref);
    }
    setState(() {});
    if (AuthInput.isCompleteOtpCode(value)) _submit(value);
  }

  void _resendOtp() {
    final data = ref.read(authControllerProvider);
    final phoneNumber = data.phoneNumber;
    final countryCode = data.countryCode;
    if (_secondsUntilResend > 0 || phoneNumber.isEmpty) {
      return;
    }

    _otpController.clear();
    AuthController.verifyOtpMutation.reset(ref);
    AuthController.sendOtpMutation.reset(ref);
    _restartResendCooldown();

    AuthController.sendOtpMutation.run(ref, (tx) async {
      await tx
          .get(authControllerProvider.notifier)
          .sendOtp(phoneNumber, countryCode);
    });
  }

  void _restartResendCooldown() {
    _resendTimer?.cancel();
    setState(
      () =>
          _secondsUntilResend = AuthOtpEntryViewState.resendCooldown.inSeconds,
    );
    _resendTimer = _createResendTimer();
  }

  Timer _createResendTimer() {
    return Timer.periodic(CatchMotion.authOtpCooldownTick, (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }

      if (_secondsUntilResend <= 1) {
        timer.cancel();
        setState(() => _secondsUntilResend = 0);
        return;
      }

      setState(() => _secondsUntilResend--);
    });
  }

  @override
  Widget build(BuildContext context) {
    final data = ref.watch(authControllerProvider);
    final verifyMutation = ref.watch(AuthController.verifyOtpMutation);
    final sendMutation = ref.watch(AuthController.sendOtpMutation);
    final viewState = AuthOtpEntryViewState.from(
      data: data,
      otpCode: _otpController.text,
      secondsUntilResend: _secondsUntilResend,
      isVerifyPending: verifyMutation.isPending,
      isSendPending: sendMutation.isPending,
    );
    final t = CatchTokens.of(context);
    final l10n = context.l10n;
    final resendStatus = viewState.secondsUntilResend <= 0
        ? l10n.authResendNowStatus
        : l10n.authResendCountdownStatus(
            minutes: viewState.secondsUntilResend ~/ 60,
            seconds: (viewState.secondsUntilResend % 60).toString().padLeft(
              2,
              '0',
            ),
          );

    if (widget.presentation == AuthPagePresentation.hostInline) {
      final verifyError = verifyMutation.hasError
          ? appErrorMessage(
              (verifyMutation as MutationError).error,
              l10n: l10n,
              context: AppErrorContext.auth,
            )
          : null;
      final resendLabel = viewState.isSendPending
          ? l10n.authHostSendingCodeAction
          : viewState.secondsUntilResend > 0
          ? l10n.authHostResendCountdownAction(
              minutes: viewState.secondsUntilResend ~/ 60,
              seconds: (viewState.secondsUntilResend % 60).toString().padLeft(
                2,
                '0',
              ),
            )
          : l10n.authHostResendCodeAction;

      final countryIso = countryIsoForDialCode(data.countryCode);
      final reflowPhoneSummary =
          MediaQuery.textScalerOf(context).scale(1) >= 1.6;
      final phoneIdentity = Row(
        children: [
          Image.asset(
            'flags/${countryIso.toLowerCase()}.png',
            package: 'country_code_picker',
            width: CatchSpacing.s6,
          ),
          gapW8,
          Text(
            data.countryCode,
            style: CatchTextStyles.fieldRowTitle(context, color: t.ink),
          ),
          gapW8,
          SizedBox(
            height: CatchSpacing.s6,
            child: VerticalDivider(
              width: CatchStroke.emphasis,
              thickness: CatchStroke.hairline,
              color: t.line2,
            ),
          ),
          gapW8,
          Expanded(
            child: Text(
              viewState.maskedNationalPhoneNumber.isEmpty
                  ? l10n.authYourNumber
                  : viewState.maskedNationalPhoneNumber,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: CatchTextStyles.fieldRowTitle(context, color: t.ink),
            ),
          ),
        ],
      );
      final editNumberButton = CatchButton(
        key: AuthFormKeys.changeNumber,
        label: l10n.authHostEditNumberAction,
        semanticsLabel: l10n.authChangeNumberAction,
        onPressed: viewState.canChangeNumber
            ? () => ref
                  .read(authControllerProvider.notifier)
                  .goToStep(AuthStep.phone)
            : null,
        variant: CatchButtonVariant.secondary,
        size: CatchButtonSize.sm,
        mode: CatchButtonMode.rounded,
        fullWidth: reflowPhoneSummary,
      );

      return HostAuthCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            CatchText(
              l10n.authOtpTitle,
              variant: CatchTextVariant.sectionTitle,
            ),
            gapH16,
            if (reflowPhoneSummary) ...[
              phoneIdentity,
              gapH12,
              editNumberButton,
            ] else
              Row(
                children: [
                  Expanded(child: phoneIdentity),
                  gapW8,
                  editNumberButton,
                ],
              ),
            gapH16,
            CatchCodeInput(
              semanticsLabel: context.l10n.coreCatchOtpCodeFieldSemanticLabel,
              inputKey: AuthFormKeys.otpField,
              contract: CatchContractConstraints.mobileFormStateAuthOtpCode,
              controller: _otpController,
              autofocus: viewState.shouldAutofocus,
              status: verifyError != null
                  ? CatchCodeInputStatus.error
                  : CatchCodeInputStatus.ready,
              height: CatchStartupTokens.authOtpDigitHeight,
              gap: CatchStartupTokens.authOtpDigitGap,
              onSubmitted: _submit,
              onChanged: _handleCodeChanged,
            ),
            if (verifyError != null) ...[
              gapH8,
              CatchText(
                verifyError,
                variant: CatchTextVariant.supporting,
                color: t.danger,
              ),
            ],
            if (sendMutation.hasError) ...[
              gapH12,
              CatchBanner.error(
                message: appErrorMessage(
                  (sendMutation as MutationError).error,
                  l10n: l10n,
                  context: AppErrorContext.auth,
                ),
              ),
            ],
            gapH12,
            if (viewState.verifyButtonLoading) ...[
              HostAuthProgressButton(label: l10n.authHostVerifyingStatus),
              gapH8,
              CatchText(
                l10n.authHostVerificationPendingHint,
                textAlign: TextAlign.center,
                variant: CatchTextVariant.supporting,
                color: t.ink2,
              ),
            ] else if (viewState.isSendPending)
              HostAuthProgressButton(
                key: AuthFormKeys.resendOtp,
                label: resendLabel,
                variant: CatchButtonVariant.secondary,
              )
            else
              CatchButton(
                key: AuthFormKeys.resendOtp,
                label: resendLabel,
                onPressed: viewState.canResend ? _resendOtp : null,
                variant: CatchButtonVariant.secondary,
                size: CatchButtonSize.lg,
                mode: CatchButtonMode.rounded,
                fullWidth: true,
              ),
          ],
        ),
      );
    }

    return OnboardingStepLayout(
      footer: CatchButton(
        label: l10n.authVerifyAction,
        leading: Icon(CatchIcons.checkRounded),
        onPressed: viewState.canVerify
            ? () => _submit(_otpController.text)
            : null,
        status: (viewState.verifyButtonLoading)
            ? CatchButtonStatus.loading
            : CatchButtonStatus.idle,
        fullWidth: true,
        size: CatchButtonSize.lg,
      ),
      children: [
        CatchStepHeader(
          stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
          compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(
            context.l10n,
          ),
          title: l10n.authOtpTitle,
          subtitle: l10n.authOtpSentTo(
            phoneNumber: viewState.displayPhoneNumber.isEmpty
                ? l10n.authYourNumber
                : viewState.displayPhoneNumber,
          ),
          showBack: false,
          gutter: false,
        ),
        gapH28,
        CatchCodeInput(
          semanticsLabel: context.l10n.coreCatchOtpCodeFieldSemanticLabel,
          inputKey: AuthFormKeys.otpField,
          contract: CatchContractConstraints.mobileFormStateAuthOtpCode,
          controller: _otpController,
          autofocus: viewState.shouldAutofocus,
          onSubmitted: _submit,
          onChanged: _handleCodeChanged,
        ),
        if (verifyMutation.hasError) ...[
          gapH16,
          CatchBanner.error(
            message: appErrorMessage(
              (verifyMutation as MutationError).error,
              l10n: context.l10n,
              context: AppErrorContext.auth,
            ),
          ),
        ],
        if (sendMutation.hasError) ...[
          gapH16,
          CatchBanner.error(
            message: appErrorMessage(
              (sendMutation as MutationError).error,
              l10n: context.l10n,
              context: AppErrorContext.auth,
            ),
          ),
        ],
        gapH20,
        Text(
          resendStatus,
          style: CatchTextStyles.monoLabel(context, color: t.ink3),
        ),
        gapH12,
        Wrap(
          spacing: CatchSpacing.s3,
          runSpacing: CatchSpacing.s2,
          children: [
            CatchButton(
              key: AuthFormKeys.resendOtp,
              label: viewState.isSendPending
                  ? l10n.authSendingCodeAction
                  : l10n.authResendCodeAction,
              onPressed: viewState.canResend ? _resendOtp : null,
              variant: CatchButtonVariant.ghost,
              size: CatchButtonSize.sm,
              foregroundColor: t.ink,
            ),
            CatchButton(
              key: AuthFormKeys.changeNumber,
              label: l10n.authChangeNumberAction,
              onPressed: viewState.canChangeNumber
                  ? () => ref
                        .read(authControllerProvider.notifier)
                        .goToStep(AuthStep.phone)
                  : null,
              variant: CatchButtonVariant.ghost,
              size: CatchButtonSize.sm,
              foregroundColor: t.ink2,
            ),
          ],
        ),
      ],
    );
  }
}
