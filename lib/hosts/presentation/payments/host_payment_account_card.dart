import 'dart:async';

import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/payments/domain/host_payment_account.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

part 'host_payment_account_section.dart';

typedef HostPaymentStartOnboarding =
    Future<void> Function({
      required HostPaymentProvider provider,
      required String country,
      required String currency,
      RazorpayHostOnboardingDetails? razorpayDetails,
    });

Future<void> _noopStartOnboarding({
  required HostPaymentProvider provider,
  required String country,
  required String currency,
  RazorpayHostOnboardingDetails? razorpayDetails,
}) async {}

Future<void> _noopRefresh(HostPaymentProvider provider) async {}

class HostPaymentAccountCard extends StatelessWidget {
  const HostPaymentAccountCard({
    super.key,
    required this.club,
    this.account,
    this.accounts = const [],
    this.loading = false,
    this.error,
    this.actionErrorMessage,
    this.onboardingPending = false,
    this.refreshPending = false,
    this.onRetry,
    this.onStartOnboarding = _noopStartOnboarding,
    this.onRefresh = _noopRefresh,
  });

  final Club club;
  final HostPaymentAccount? account;
  final List<HostPaymentAccount> accounts;
  final bool loading;
  final Object? error;
  final String? actionErrorMessage;
  final bool onboardingPending;
  final bool refreshPending;
  final VoidCallback? onRetry;
  final HostPaymentStartOnboarding onStartOnboarding;
  final Future<void> Function(HostPaymentProvider provider) onRefresh;

  Future<void> _showPayoutsHandoff(
    BuildContext context,
    HostPaymentProvider provider,
    HostPaymentAccount? account,
    HostPaymentPresentation presentation,
  ) async {
    final t = CatchTokens.of(context);
    final derivedCountry = countryIsoCodeForCityName(club.location);
    final derivedCurrency = currencyCodeForCityName(club.location);
    final country = account?.country ?? derivedCountry;
    final currency = provider == HostPaymentProvider.razorpay
        ? 'INR'
        : account?.defaultCurrency ?? derivedCurrency;
    final isRazorpay = provider == HostPaymentProvider.razorpay;

    await showCatchBottomSheet<void>(
      context: context,
      backgroundColor: t.bg,
      barrierColor: t.overlay,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(CatchRadius.lg),
        ),
      ),
      builder: (sheetContext) {
        final sheetTokens = CatchTokens.of(sheetContext);
        return CatchSheet.standard(
          title: context.l10n.hostsHostPaymentAccountCardTitleSetUpPayouts,
          subtitle: isRazorpay
              ? context
                    .l10n
                    .hostsHostPaymentAccountCardSubtitlePoweredByRazorpay
              : context.l10n.hostsHostPaymentAccountCardSubtitlePoweredByStripe,
          footer: CatchButton.sheet(
            role: CatchButtonEmphasis.commit,
            label: isRazorpay
                ? context
                      .l10n
                      .hostsHostPaymentAccountCardLabelContinueToRazorpay
                : context.l10n.hostsHostPaymentAccountCardLabelContinueToStripe,
            leading: Icon(CatchIcons.openInNewRounded),

            status: (onboardingPending)
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed: onboardingPending
                ? null
                : () {
                    Navigator.of(sheetContext).pop();
                    unawaited(
                      isRazorpay
                          ? _showRazorpaySetup(context, country, currency)
                          : onStartOnboarding(
                              provider: provider,
                              country: country,
                              currency: currency,
                            ),
                    );
                  },
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CatchBadge.functional(
                label: presentation.badge,
                tone: presentation.tone,
              ),
              gapH14,
              Text(
                isRazorpay
                    ? context
                          .l10n
                          .hostsHostPaymentAccountCardTextCatchPaysIndiaHostsThrough
                    : context
                          .l10n
                          .hostsHostPaymentAccountCardTextCatchPaysHostsThrough,
                style: CatchTextStyles.supporting(
                  sheetContext,
                  color: sheetTokens.ink2,
                ),
              ),
              gapH16,
              CatchSection.fieldRows(
                first: true,
                children: [
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.hostsHostPaymentAccountCardTitleCountry,
                    valueText: _countryLabel(country),
                    icon: CatchIcons.locationOnOutlined,
                  ),
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: context
                        .l10n
                        .hostsHostPaymentAccountCardTitleDefaultCurrency,
                    valueText: currency.toUpperCase(),
                    icon: CatchIcons.paymentsOutlined,
                  ),
                ],
              ),
              gapH12,
              Text(
                context.l10n.hostsHostPaymentAccountCardTextWeWillRefreshYour,
                textAlign: TextAlign.center,
                style: CatchTextStyles.supporting(
                  sheetContext,
                  color: sheetTokens.ink3,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _showRazorpaySetup(
    BuildContext context,
    String country,
    String currency,
  ) => showCatchBottomSheet<void>(
    context: context,
    isDismissible: !onboardingPending,
    enableDrag: !onboardingPending,
    builder: (sheetContext) => _RazorpaySetupSheet(
      club: club,
      pending: onboardingPending,
      onSubmit: (details) async {
        Navigator.of(sheetContext).pop();
        await onStartOnboarding(
          provider: HostPaymentProvider.razorpay,
          country: country,
          currency: currency,
          razorpayDetails: details,
        );
      },
    ),
  );

  @override
  Widget build(BuildContext context) {
    final error = this.error;
    if (loading) return const HostPaymentAccountLoadingCard();
    if (error != null) {
      return HostPaymentAccountErrorCard(error: error, onRetry: onRetry);
    }
    return HostPaymentAccountSection(
      accounts: account == null ? accounts : [account!, ...accounts],
      recommendedProvider: defaultHostPaymentProviderForCountry(
        countryIsoCodeForCityName(club.location),
      ),
      actionErrorMessage: actionErrorMessage,
      onboardingPending: onboardingPending,
      refreshPending: refreshPending,
      onShowPayoutsHandoff: (provider, account, presentation) =>
          _showPayoutsHandoff(context, provider, account, presentation),
      onRefresh: onRefresh,
    );
  }
}

class _RazorpaySetupSheet extends StatefulWidget {
  const _RazorpaySetupSheet({
    required this.club,
    required this.pending,
    required this.onSubmit,
  });

  final Club club;
  final bool pending;
  final Future<void> Function(RazorpayHostOnboardingDetails details) onSubmit;

  @override
  State<_RazorpaySetupSheet> createState() => _RazorpaySetupSheetState();
}

class _RazorpaySetupSheetState extends State<_RazorpaySetupSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _legalBusinessName;
  late final TextEditingController _contactName;
  late final TextEditingController _email;
  late final TextEditingController _phone;
  late final TextEditingController _businessModel;
  final _businessPan = TextEditingController();
  final _bankAccountNumber = TextEditingController();
  final _ifscCode = TextEditingController();
  late final TextEditingController _beneficiaryName;
  late final TextEditingController _stakeholderName;
  late final TextEditingController _stakeholderEmail;
  late final TextEditingController _stakeholderPhone;
  final _stakeholderPan = TextEditingController();
  final _ownershipPercent = TextEditingController(text: '100');
  var _businessType = RazorpayHostBusinessType.individual;
  var _isDirector = true;
  var _isExecutive = true;
  var _termsAccepted = false;

  Iterable<TextEditingController> get _controllers => [
    _legalBusinessName,
    _contactName,
    _email,
    _phone,
    _businessModel,
    _businessPan,
    _bankAccountNumber,
    _ifscCode,
    _beneficiaryName,
    _stakeholderName,
    _stakeholderEmail,
    _stakeholderPhone,
    _stakeholderPan,
    _ownershipPercent,
  ];

  @override
  void initState() {
    super.initState();
    final contactName = widget.club.hostName ?? widget.club.name;
    _legalBusinessName = TextEditingController(text: widget.club.name);
    _contactName = TextEditingController(text: contactName);
    _email = TextEditingController(text: widget.club.email ?? '');
    _phone = TextEditingController(text: widget.club.phoneNumber ?? '');
    _businessModel = TextEditingController(text: widget.club.description);
    _beneficiaryName = TextEditingController(text: contactName);
    _stakeholderName = TextEditingController(text: contactName);
    _stakeholderEmail = TextEditingController(text: widget.club.email ?? '');
    _stakeholderPhone = TextEditingController(
      text: widget.club.phoneNumber ?? '',
    );
  }

  @override
  void dispose() {
    for (final controller in _controllers) {
      controller.dispose();
    }
    super.dispose();
  }

  String? _required(String? value) => value == null || value.trim().isEmpty
      ? context.l10n.sharedValidationRequired
      : null;

  String? _pattern(String? value, RegExp pattern, String field) {
    final requiredError = _required(value);
    if (requiredError != null) return requiredError;
    return pattern.hasMatch(value!.trim())
        ? null
        : context.l10n.coreCatchFormValidationPattern(field: field);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_termsAccepted) {
      setState(() {});
      return;
    }
    await widget.onSubmit(
      RazorpayHostOnboardingDetails(
        legalBusinessName: _legalBusinessName.text,
        businessType: _businessType,
        contactName: _contactName.text,
        email: _email.text,
        phone: _phone.text,
        businessModel: _businessModel.text,
        businessPan: _businessPan.text,
        bankAccountNumber: _bankAccountNumber.text,
        ifscCode: _ifscCode.text,
        beneficiaryName: _beneficiaryName.text,
        stakeholderName: _stakeholderName.text,
        stakeholderEmail: _stakeholderEmail.text,
        stakeholderPhone: _stakeholderPhone.text,
        stakeholderPan: _stakeholderPan.text,
        stakeholderOwnershipPercent:
            double.tryParse(_ownershipPercent.text) ?? 0,
        stakeholderIsDirector: _isDirector,
        stakeholderIsExecutive: _isExecutive,
        termsAccepted: _termsAccepted,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    const gap = SizedBox(height: CatchSpacing.s3);
    return CatchSheet.standard(
      title: l10n.hostsHostPaymentAccountCardTitleSetUpPayouts,
      subtitle: l10n.hostsHostPaymentAccountCardSubtitlePoweredByRazorpay,
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,
        label: l10n.hostsHostPaymentAccountCardLabelSubmitRazorpay,

        status: (widget.pending)
            ? CatchButtonStatus.loading
            : CatchButtonStatus.idle,
        onPressed: widget.pending || !_termsAccepted ? null : _submit,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CatchText(
              l10n.hostsHostPaymentAccountCardTextCatchPaysIndiaHostsThrough,
              variant: CatchTextVariant.supporting,
              color: CatchTokens.of(context).ink2,
            ),
            gapH16,
            CatchFieldLanes.single(
              child: CatchField<RazorpayHostBusinessType>.select(
                copy: catchFieldCopy(context.l10n),
                title: l10n.hostsHostPaymentAccountCardTitleBusinessType,
                contract: CatchContractConstraints
                    .createRazorpayHostPaymentAccountCallablePayloadBusinessType,
                contractValueBuilder: (value) => value.wireValue,
                values: RazorpayHostBusinessType.values,
                itemLabelBuilder: _businessTypeLabel,
                value: _businessType,
                states: <WidgetState>{if (widget.pending) WidgetState.disabled},
                onChanged: (value) {
                  if (value != null) setState(() => _businessType = value);
                },
              ),
            ),
            gap,
            _RazorpaySetupInput(
              l10n.hostsHostPaymentAccountCardTitleLegalBusinessName,
              _legalBusinessName,
              CatchContractConstraints
                  .createRazorpayHostPaymentAccountCallablePayloadLegalBusinessName,
              pending: widget.pending,
            ),
            gap,
            _RazorpaySetupInput(
              l10n.hostsHostPaymentAccountCardTitleContactName,
              _contactName,
              CatchContractConstraints
                  .createRazorpayHostPaymentAccountCallablePayloadContactName,
              pending: widget.pending,
            ),
            gap,
            _RazorpaySetupInput(
              l10n.hostsHostPaymentAccountCardTitleEmail,
              _email,
              CatchContractConstraints
                  .createRazorpayHostPaymentAccountCallablePayloadEmail,
              pending: widget.pending,
              keyboardType: TextInputType.emailAddress,
            ),
            gap,
            _RazorpaySetupInput(
              l10n.hostsHostPaymentAccountCardTitlePhone,
              _phone,
              CatchContractConstraints
                  .createRazorpayHostPaymentAccountCallablePayloadPhone,
              pending: widget.pending,
              keyboardType: TextInputType.phone,
              validator: (value) => _pattern(
                value,
                RegExp(r'^\+?[0-9]{8,15}$'),
                l10n.hostsHostPaymentAccountCardTitlePhone,
              ),
            ),
            gap,
            _RazorpaySetupInput(
              l10n.hostsHostPaymentAccountCardTitleBusinessModel,
              _businessModel,
              CatchContractConstraints
                  .createRazorpayHostPaymentAccountCallablePayloadBusinessModel,
              pending: widget.pending,
              maxLines: 3,
            ),
            gap,
            _RazorpaySetupInput(
              l10n.hostsHostPaymentAccountCardTitleBusinessPan,
              _businessPan,
              CatchContractConstraints
                  .createRazorpayHostPaymentAccountCallablePayloadBusinessPan,
              pending: widget.pending,
              validator: (value) => _pattern(
                value?.toUpperCase(),
                RegExp(r'^[A-Z]{5}[0-9]{4}[A-Z]$'),
                l10n.hostsHostPaymentAccountCardTitleBusinessPan,
              ),
            ),
            gap,
            _RazorpaySetupInput(
              l10n.hostsHostPaymentAccountCardTitleBankAccountNumber,
              _bankAccountNumber,
              CatchContractConstraints
                  .createRazorpayHostPaymentAccountCallablePayloadBankAccountNumber,
              pending: widget.pending,
              keyboardType: TextInputType.number,
              obscureText: true,
            ),
            gap,
            _RazorpaySetupInput(
              l10n.hostsHostPaymentAccountCardTitleIfscCode,
              _ifscCode,
              CatchContractConstraints
                  .createRazorpayHostPaymentAccountCallablePayloadIfscCode,
              pending: widget.pending,
              validator: (value) => _pattern(
                value?.toUpperCase(),
                RegExp(r'^[A-Z]{4}0[A-Z0-9]{6}$'),
                l10n.hostsHostPaymentAccountCardTitleIfscCode,
              ),
            ),
            gap,
            _RazorpaySetupInput(
              l10n.hostsHostPaymentAccountCardTitleBeneficiaryName,
              _beneficiaryName,
              CatchContractConstraints
                  .createRazorpayHostPaymentAccountCallablePayloadBeneficiaryName,
              pending: widget.pending,
            ),
            gapH16,
            _RazorpaySetupInput(
              l10n.hostsHostPaymentAccountCardTitleStakeholderName,
              _stakeholderName,
              CatchContractConstraints
                  .createRazorpayHostPaymentAccountCallablePayloadStakeholderName,
              pending: widget.pending,
            ),
            gap,
            _RazorpaySetupInput(
              l10n.hostsHostPaymentAccountCardTitleStakeholderEmail,
              _stakeholderEmail,
              CatchContractConstraints
                  .createRazorpayHostPaymentAccountCallablePayloadStakeholderEmail,
              pending: widget.pending,
              keyboardType: TextInputType.emailAddress,
            ),
            gap,
            _RazorpaySetupInput(
              l10n.hostsHostPaymentAccountCardTitleStakeholderPhone,
              _stakeholderPhone,
              CatchContractConstraints
                  .createRazorpayHostPaymentAccountCallablePayloadStakeholderPhone,
              pending: widget.pending,
              keyboardType: TextInputType.phone,
              validator: (value) => _pattern(
                value,
                RegExp(r'^\+?[0-9]{8,15}$'),
                l10n.hostsHostPaymentAccountCardTitleStakeholderPhone,
              ),
            ),
            gap,
            _RazorpaySetupInput(
              l10n.hostsHostPaymentAccountCardTitleStakeholderPan,
              _stakeholderPan,
              CatchContractConstraints
                  .createRazorpayHostPaymentAccountCallablePayloadStakeholderPan,
              pending: widget.pending,
              validator: (value) => _pattern(
                value?.toUpperCase(),
                RegExp(r'^[A-Z]{5}[0-9]{4}[A-Z]$'),
                l10n.hostsHostPaymentAccountCardTitleStakeholderPan,
              ),
            ),
            gap,
            _RazorpaySetupInput(
              l10n.hostsHostPaymentAccountCardTitleOwnershipPercent,
              _ownershipPercent,
              CatchContractConstraints
                  .createRazorpayHostPaymentAccountCallablePayloadStakeholderOwnershipPercent,
              pending: widget.pending,
              keyboardType: TextInputType.number,
              validator: (value) {
                final parsed = double.tryParse(value?.trim() ?? '');
                return parsed != null && parsed >= 0 && parsed <= 100
                    ? null
                    : l10n.coreCatchFormValidationPattern(
                        field: l10n
                            .hostsHostPaymentAccountCardTitleOwnershipPercent,
                      );
              },
            ),
            gap,
            CatchFieldLanes.divided(
              children: [
                CatchField.toggle(
                  copy: catchFieldCopy(context.l10n),
                  title:
                      l10n.hostsHostPaymentAccountCardTitleStakeholderDirector,
                  contract: CatchContractConstraints
                      .createRazorpayHostPaymentAccountCallablePayloadStakeholderIsDirector,
                  value: _isDirector,
                  onChanged: widget.pending
                      ? null
                      : (value) => setState(() => _isDirector = value),
                ),
                CatchField.toggle(
                  copy: catchFieldCopy(context.l10n),
                  title:
                      l10n.hostsHostPaymentAccountCardTitleStakeholderExecutive,
                  contract: CatchContractConstraints
                      .createRazorpayHostPaymentAccountCallablePayloadStakeholderIsExecutive,
                  value: _isExecutive,
                  onChanged: widget.pending
                      ? null
                      : (value) => setState(() => _isExecutive = value),
                ),
                CatchField.toggle(
                  copy: catchFieldCopy(context.l10n),
                  title:
                      l10n.hostsHostPaymentAccountCardTitleAcceptRazorpayTerms,
                  body: l10n.hostsHostPaymentAccountCardBodyRazorpayTerms,
                  contract: CatchContractConstraints
                      .createRazorpayHostPaymentAccountCallablePayloadTermsAccepted,
                  value: _termsAccepted,
                  onChanged: widget.pending
                      ? null
                      : (value) => setState(() => _termsAccepted = value),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _businessTypeLabel(RazorpayHostBusinessType value) => value.wireValue
      .split('_')
      .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
      .join(' ');
}

class _RazorpaySetupInput extends StatelessWidget {
  const _RazorpaySetupInput(
    this.title,
    this.controller,
    this.contract, {
    required this.pending,
    this.keyboardType,
    this.obscureText = false,
    this.maxLines,
    this.validator,
  });

  final String title;
  final TextEditingController controller;
  final CatchContractFieldConstraints contract;
  final bool pending;
  final TextInputType? keyboardType;
  final bool obscureText;
  final int? maxLines;
  final FormFieldValidator<String>? validator;

  @override
  Widget build(BuildContext context) {
    return CatchFieldLanes.single(
      child: CatchField.input(
        copy: catchFieldCopy(context.l10n),
        title: title,
        controller: controller,
        contract: contract,
        states: <WidgetState>{if (pending) WidgetState.disabled},
        keyboardType: keyboardType,
        inputVariant: obscureText
            ? CatchTextInputVariant.obscured
            : CatchTextInputVariant.plain,
        maxLines: maxLines,
        onValidate:
            validator ??
            (value) => value == null || value.trim().isEmpty
                ? context.l10n.sharedValidationRequired
                : null,
      ),
    );
  }
}

class HostPaymentAccountLoadingCard extends StatelessWidget {
  const HostPaymentAccountLoadingCard({super.key});

  @override
  Widget build(BuildContext context) {
    return CatchSection.fieldRows(
      title: context.l10n.hostsHostPaymentAccountCardTitlePayouts,
      trailing: CatchSkeleton.box(
        width: CatchLayout.skeletonStatusPillWidth,
        height: CatchSpacing.s6,
        radius: CatchRadius.pill,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchSkeleton.text(width: CatchLayout.skeletonTextLongWidth),
          gapH8,
          CatchSkeleton.textBlock(lines: 2),
          gapH14,
          CatchSkeleton.box(
            height: CatchLayout.hostPaymentActionSkeletonHeight,
            radius: CatchRadius.sm,
          ),
        ],
      ),
    );
  }
}

class HostPaymentAccountErrorCard extends StatelessWidget {
  const HostPaymentAccountErrorCard({
    super.key,
    required this.error,
    this.onRetry,
  });

  final Object error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return CatchSection.fieldRows(
      title: context.l10n.hostsHostPaymentAccountCardTitlePayouts,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchLocalizedErrorState(
            error,
            context: AppErrorContext.payments,
            mode: CatchErrorStateMode.compact,
            onRetry: onRetry,
          ),
        ],
      ),
    );
  }
}

class HostPaymentPresentation {
  const HostPaymentPresentation({
    required this.badge,
    required this.tone,
    required this.title,
    required this.body,
  });

  final String badge;
  final CatchBadgeTone tone;
  final String title;
  final String body;
}

String _countryLabel(String countryCode) {
  return switch (countryCode.toUpperCase()) {
    'IN' => 'India',
    _ => countryCode.toUpperCase(),
  };
}
