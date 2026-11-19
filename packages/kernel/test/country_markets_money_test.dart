import 'package:catch_kernel/country_markets.dart';
import 'package:test/test.dart';

void main() {
  test('rupees group the Indian way', () {
    expect(formatMinorCurrency(95000), '₹950');
    expect(formatMinorCurrency(740000), '₹7,400');
    expect(formatMinorCurrency(16000000), '₹1,60,000');
    expect(formatMinorCurrency(-1234567800), '-₹1,23,45,678');
    expect(formatMinorCurrency(1234550), '₹12,345.50');
  });

  test('other currencies group in threes', () {
    expect(formatMinorCurrency(16000000, currencyCode: 'USD'), r'$160,000');
  });
}
