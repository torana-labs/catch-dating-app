import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/payments/data/host_payment_account_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_payment_account.dart';
import 'package:catch_platform/device/external_links.dart';
import 'package:catch_platform/errors/app_exception.dart';
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

/// Each action reads what it needs from [_ref] before its first `await`. The
/// payout accounts are a Firestore listener, so it delivers the server's
/// update itself and no action invalidates it.
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
    final accounts = _ref.read(hostPaymentAccountRepositoryProvider);
    if (provider == HostPaymentProvider.razorpay) {
      if (razorpayDetails == null) {
        throw ArgumentError.notNull('razorpayDetails');
      }
      requireSignedInUid(_ref, action: 'set up Razorpay payouts');
      await accounts.createRazorpayAccount(razorpayDetails);
      return;
    }
    final links = _ref.read(externalLinkControllerProvider);
    final link = await accounts.createOnboardingLink(
      provider: provider,
      country: country,
      defaultCurrency: defaultCurrency,
    );
    final opened = await links.openExternal(link.onboardingUrl);
    if (!opened) {
      throw ExternalActionException(
        'Could not open ${provider.name} onboarding.',
      );
    }
  }

  @override
  Future<void> refreshStatus(HostPaymentProvider provider) async {
    requireSignedInUid(_ref, action: 'refresh payouts');
    await _ref
        .read(hostPaymentAccountRepositoryProvider)
        .refreshStatus(provider);
  }
}
