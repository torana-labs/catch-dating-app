part of 'host_payment_account_card.dart';

class HostPaymentAccountSection extends StatelessWidget {
  const HostPaymentAccountSection({
    super.key,
    required this.accounts,
    required this.recommendedProvider,
    this.actionErrorMessage,
    required this.onboardingPending,
    required this.refreshPending,
    required this.onShowPayoutsHandoff,
    required this.onRefresh,
  });

  final List<HostPaymentAccount> accounts;
  final HostPaymentProvider recommendedProvider;
  final String? actionErrorMessage;
  final bool onboardingPending;
  final bool refreshPending;
  final Future<void> Function(
    HostPaymentProvider provider,
    HostPaymentAccount? account,
    HostPaymentPresentation presentation,
  )
  onShowPayoutsHandoff;
  final Future<void> Function(HostPaymentProvider provider) onRefresh;

  @override
  Widget build(BuildContext context) {
    HostPaymentAccount? accountFor(HostPaymentProvider provider) {
      for (final account in accounts) {
        if (account.provider == provider) return account;
      }
      return null;
    }

    final account = accountFor(recommendedProvider);
    final presentation = _presentation(account, context.l10n);
    final providers = [
      recommendedProvider,
      ...HostPaymentProvider.values.where(
        (provider) => provider != recommendedProvider,
      ),
    ];

    return CatchSection.fieldRows(
      title: context.l10n.hostsHostPaymentAccountCardTitlePayouts,
      trailing: CatchBadge.functional(
        label: presentation.badge,
        tone: presentation.tone,
      ),
      children: [
        CatchField.content(
          copy: catchFieldCopy(context.l10n),
          title: presentation.title,
          body: presentation.body,
          icon: CatchIcons.payment,
        ),
        if (account != null) ...[
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsHostPaymentAccountCardTitleCountry,
            valueText: _countryLabel(account.country),
            icon: CatchIcons.location,
          ),
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsHostPaymentAccountCardTitleDefaultCurrency,
            valueText: account.defaultCurrency.toUpperCase(),
            icon: CatchIcons.payment,
          ),
        ],
        if (actionErrorMessage != null)
          CatchField.content(
            copy: catchFieldCopy(context.l10n),
            title: presentation.title,
            body: actionErrorMessage!,
            icon: CatchIcons.error,
            tone: CatchFieldTone.danger,
          ),
        for (final provider in providers) ...[
          CatchField.action(
            copy: catchFieldCopy(context.l10n),
            title: _providerTitle(context.l10n, provider),
            body: _providerBody(
              context.l10n,
              provider,
              recommended: provider == recommendedProvider,
              account: accountFor(provider),
            ),
            icon: CatchIcons.openExternal,
            status: onboardingPending
                ? CatchFieldStatus.saving
                : CatchFieldStatus.idle,
            onTap: onboardingPending
                ? null
                : () => unawaited(
                    onShowPayoutsHandoff(
                      provider,
                      accountFor(provider),
                      _presentation(accountFor(provider), context.l10n),
                    ),
                  ),
          ),
          if (accountFor(provider) != null)
            CatchField.action(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostsHostPaymentAccountCardLabelRefresh,
              body: _providerTitle(context.l10n, provider),
              icon: CatchIcons.refresh,
              status: refreshPending
                  ? CatchFieldStatus.saving
                  : CatchFieldStatus.idle,
              onTap: refreshPending
                  ? null
                  : () => unawaited(onRefresh(provider)),
            ),
        ],
      ],
    );
  }

  HostPaymentPresentation _presentation(
    HostPaymentAccount? account,
    AppLocalizations l10n,
  ) {
    if (account == null) {
      return HostPaymentPresentation(
        badge: l10n.hostsHostPaymentAccountCardVisiblecopyNotSetUp,
        tone: CatchBadgeTone.warning,
        title: l10n.hostsHostPaymentAccountCardTitleSetUpInternationalPayouts,
        body: l10n.hostsHostPaymentAccountCardBodyRequiredBeforePaidNon,
      );
    }
    if (account.canAcceptPayments) {
      return HostPaymentPresentation(
        badge: l10n.hostsHostPaymentAccountCardVisiblecopyReady,
        tone: CatchBadgeTone.success,
        title: account.provider == HostPaymentProvider.razorpay
            ? l10n.hostsHostPaymentAccountCardTitleRazorpayPayoutAccountReady
            : l10n.hostsHostPaymentAccountCardTitleInternationalCheckoutIsReady,
        body: account.provider == HostPaymentProvider.razorpay
            ? l10n.hostsHostPaymentAccountCardBodyRazorpayInr
            : l10n.hostsHostPaymentAccountCardBodyNonInrPaidBookings,
      );
    }
    if (account.onboardingStatus == HostPaymentOnboardingStatus.restricted) {
      return HostPaymentPresentation(
        badge: l10n.hostsHostPaymentAccountCardVisiblecopyActionNeeded,
        tone: CatchBadgeTone.warning,
        title: account.provider == HostPaymentProvider.razorpay
            ? l10n.hostsHostPaymentAccountCardTitleRazorpay
            : l10n.hostsHostPaymentAccountCardTitleStripeNeedsMoreInformation,
        body:
            account.disabledReason ??
            l10n.hostsHostPaymentAccountCardBodyFinishTheOutstandingStripe,
      );
    }
    return HostPaymentPresentation(
      badge: l10n.hostsHostPaymentAccountCardVisiblecopyPending,
      tone: CatchBadgeTone.warning,
      title: account.provider == HostPaymentProvider.razorpay
          ? l10n.hostsHostPaymentAccountCardTitleRazorpay
          : l10n.hostsHostPaymentAccountCardTitleStripeOnboardingIsIn,
      body: account.provider == HostPaymentProvider.razorpay
          ? l10n.hostsHostPaymentAccountCardTextCatchPaysIndiaHostsThrough
          : l10n.hostsHostPaymentAccountCardBodyRefreshAfterCompletingStripe,
    );
  }
}

String _providerTitle(AppLocalizations l10n, HostPaymentProvider provider) =>
    switch (provider) {
      HostPaymentProvider.razorpay =>
        l10n.hostsHostPaymentAccountCardTitleRazorpay,
      HostPaymentProvider.stripe => l10n.hostsHostPaymentAccountCardTitleStripe,
    };

String _providerBody(
  AppLocalizations l10n,
  HostPaymentProvider provider, {
  required bool recommended,
  required HostPaymentAccount? account,
}) {
  final purpose = switch (provider) {
    HostPaymentProvider.razorpay =>
      l10n.hostsHostPaymentAccountCardBodyRazorpayInr,
    HostPaymentProvider.stripe =>
      l10n.hostsHostPaymentAccountCardBodyStripeInternational,
  };
  final status = account == null
      ? l10n.hostsHostPaymentAccountCardVisiblecopyNotSetUp
      : account.canAcceptPayments
      ? l10n.hostsHostPaymentAccountCardVisiblecopyReady
      : account.onboardingStatus == HostPaymentOnboardingStatus.restricted
      ? l10n.hostsHostPaymentAccountCardVisiblecopyActionNeeded
      : l10n.hostsHostPaymentAccountCardVisiblecopyPending;
  final recommendation = recommended
      ? '${l10n.hostsHostPaymentAccountCardLabelRecommended} · '
      : '';
  return '$recommendation$status · $purpose';
}
