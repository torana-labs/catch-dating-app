import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_revenue.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('attested manual offer payment parses as its own revenue source', () {
    final revenue = HostCustomerEventRevenue.fromMap(const {
      'currency': 'INR',
      'amountMinor': 50000,
      'source': 'hostAttested',
      'factCount': 1,
      'allocation': 'perAttendee',
    });
    expect(revenue.source, HostCustomerRevenueSource.hostAttested);
    expect(revenue.amountMinor, 50000);
    expect(
      HostCustomerRevenueSourceAmount.fromMap(const {
        'source': 'hostAttested',
        'amountMinor': 50000,
        'factCount': 1,
      }).source,
      HostCustomerRevenueSource.hostAttested,
    );
  });
}
