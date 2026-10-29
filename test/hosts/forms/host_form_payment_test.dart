import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('decimal rupees become exact bounded integer paise', () {
    expect(HostFormPayment.parseRupees('100'), 10000);
    expect(HostFormPayment.parseRupees('200.50'), 20050);
    expect(HostFormPayment.parseRupees(' 1.01 '), 101);
    expect(HostFormPayment.parseRupees('100000.00'), 10000000);
    for (final value in [
      '0',
      '0.99',
      '-100',
      '1.001',
      '1e2',
      '1,000',
      '100000.01',
      '',
    ]) {
      expect(HostFormPayment.parseRupees(value), isNull, reason: value);
    }
  });

  test(
    'legacy forms remain free and fee edits preserve other answer policy',
    () {
      final definition = HostFormDefinition.fromMap(const {
        'title': 'Application',
        'futurePolicy': {'scope': 'organizer'},
      });
      expect(definition.payment, isNull);
      const fee = HostFormPayment(
        connectionId: 'rpc_test',
        amountPaise: 10050,
        description: 'Application fee',
        refundPolicy: 'Refunded if declined.',
      );
      final paid = definition.withPayment(fee).copyWith(title: 'Updated');
      expect(paid.payment!.rupees, '100.50');
      expect(paid.payment!.toJson(), fee.toJson());
      expect(paid.toJson()['futurePolicy'], {'scope': 'organizer'});
      expect(paid.withPayment(null).payment, isNull);
      expect(
        () => HostFormPayment.fromMap({...fee.toJson(), 'amountPaise': 1.5}),
        throwsFormatException,
      );
      expect(
        () => HostFormPayment.fromMap({...fee.toJson(), 'currency': 'USD'}),
        throwsFormatException,
      );
    },
  );

  test('OAuth navigation accepts only the provider authorization endpoint', () {
    final payload = {
      'available': true,
      'connections': <Object?>[],
      'authorizationUrl': null,
    };
    const valid = 'https://auth.razorpay.com/authorize?state=one-use';
    expect(
      HostFormPaymentSetup.fromCallableData({
        ...payload,
        'authorizationUrl': valid,
      }).authorizationUri.toString(),
      valid,
    );
    for (final value in [
      'https://auth.razorpay.com.evil.test/authorize',
      'http://auth.razorpay.com/authorize',
      'https://user@auth.razorpay.com/authorize',
      'https://auth.razorpay.com:8443/authorize',
      'https://auth.razorpay.com/other',
      'javascript:alert(1)',
    ]) {
      expect(
        () => HostFormPaymentSetup.fromCallableData({
          ...payload,
          'authorizationUrl': value,
        }),
        throwsFormatException,
        reason: value,
      );
    }
  });

  test(
    'ready status alone cannot enable a fee without merchant webhook binding',
    () {
      final payload = {
        'connectionId': 'rpc_test',
        'mode': 'test',
        'status': 'ready',
        'accountId': 'acc_test',
        'webhookVerified': false,
      };
      expect(HostFormPaymentConnection.fromMap(payload).ready, isFalse);
      expect(
        HostFormPaymentConnection.fromMap({
          ...payload,
          'webhookVerified': true,
        }).ready,
        isTrue,
      );
      expect(
        HostFormPaymentConnection.fromMap({
          ...payload,
          'webhookVerified': true,
          'status': 'disconnected',
        }).ready,
        isFalse,
      );
    },
  );
}
