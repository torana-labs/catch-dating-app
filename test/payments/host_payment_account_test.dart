import 'package:catch_dating_app/contexts/payments/domain/host_payment_account.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('India defaults to Razorpay and other countries default to Stripe', () {
    expect(
      defaultHostPaymentProviderForCountry('in'),
      HostPaymentProvider.razorpay,
    );
    expect(
      defaultHostPaymentProviderForCountry('US'),
      HostPaymentProvider.stripe,
    );
  });

  test('legacy host account documents remain Stripe-compatible', () {
    final account = HostPaymentAccount.fromJson({
      'userId': 'host-1',
      'country': 'US',
      'defaultCurrency': 'USD',
      'stripeAccountId': 'acct_legacy',
      'chargesEnabled': true,
      'payoutsEnabled': true,
      'detailsSubmitted': true,
      'onboardingStatus': 'complete',
    });

    expect(account.provider, HostPaymentProvider.stripe);
    expect(account.accountId, 'acct_legacy');
    expect(account.canAcceptInternationalPayments, isTrue);
    expect(account.supportsCurrency('USD'), isTrue);
    expect(account.supportsCurrency('INR'), isFalse);
  });

  test('Razorpay onboarding serialization normalizes sensitive inputs', () {
    final json = const RazorpayHostOnboardingDetails(
      legalBusinessName: ' Catch Events Pvt Ltd ',
      businessType: RazorpayHostBusinessType.privateLimited,
      contactName: ' Mira Shah ',
      email: ' host@example.com ',
      phone: ' 9876543210 ',
      businessModel: ' Curated events ',
      businessPan: 'abcde1234f',
      bankAccountNumber: ' 123456789 ',
      ifscCode: 'hdfc0000317',
      beneficiaryName: ' Catch Events ',
      stakeholderName: ' Mira Shah ',
      stakeholderEmail: ' mira@example.com ',
      stakeholderPhone: ' 9876543210 ',
      stakeholderPan: 'abcde1234f',
      stakeholderOwnershipPercent: 100,
      stakeholderIsDirector: true,
      stakeholderIsExecutive: true,
      termsAccepted: true,
    ).toJson();

    expect(json['businessType'], 'private_limited');
    expect(json['businessPan'], 'ABCDE1234F');
    expect(json['stakeholderPan'], 'ABCDE1234F');
    expect(json['ifscCode'], 'HDFC0000317');
    expect(json['bankAccountNumber'], '123456789');
  });
}
