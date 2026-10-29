import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/payments/data/host_payment_account_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_payment_account.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_payment_account_controller.g.dart';

@riverpod
HostPaymentAccountActions hostPaymentAccountController(Ref ref) =>
    HostPaymentAccountController(ref);

abstract interface class HostPaymentAccountActions {
  Future<void> startOnboarding({
    required HostPaymentProvider provider,
    required String country,
    required String defaultCurrency,
    RazorpayHostOnboardingDetails? razorpayDetails,
  });

  Future<void> refreshStatus(HostPaymentProvider provider);
}

class HostPaymentAccountController implements HostPaymentAccountActions {
  const HostPaymentAccountController(this._ref);

  static final startOnboardingMutation = Mutation<void>();
  static final refreshStatusMutation = Mutation<void>();

  final Ref _ref;

  @override
  Future<void> startOnboarding({
    required HostPaymentProvider provider,
    required String country,
    required String defaultCurrency,
    RazorpayHostOnboardingDetails? razorpayDetails,
  }) async {
    requireSignedInUid(_ref, action: 'set up payouts');
    if (provider == HostPaymentProvider.razorpay) {
      if (razorpayDetails == null) {
        throw ArgumentError.notNull('razorpayDetails');
      }
      final uid = requireSignedInUid(_ref, action: 'set up Razorpay payouts');
      await _ref
          .read(hostPaymentAccountRepositoryProvider)
          .createRazorpayAccount(razorpayDetails);
      _ref.invalidate(watchHostPaymentAccountsProvider(uid));
      return;
    }
    final link = await _ref
        .read(hostPaymentAccountRepositoryProvider)
        .createOnboardingLink(
          provider: provider,
          country: country,
          defaultCurrency: defaultCurrency,
        );
    final opened = await _ref
        .read(externalLinkControllerProvider)
        .openExternal(link.onboardingUrl);
    if (!opened) {
      throw ExternalActionException(
        'Could not open ${provider.name} onboarding.',
      );
    }
  }

  @override
  Future<void> refreshStatus(HostPaymentProvider provider) async {
    final uid = requireSignedInUid(_ref, action: 'refresh payouts');
    await _ref
        .read(hostPaymentAccountRepositoryProvider)
        .refreshStatus(provider);
    _ref.invalidate(watchHostPaymentAccountsProvider(uid));
  }
}
