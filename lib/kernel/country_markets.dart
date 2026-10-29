// copy:allow-file(Canonical geographic proper-noun country catalog)
import 'package:catch_dating_app/kernel/labelled.dart';

const defaultCountryIsoCode = 'IN';
const defaultCountryDialCode = '+91';
const defaultCurrencyCode = 'INR';
const defaultTimeZone = 'Asia/Kolkata';

const supportedCountryPickerFavorites = ['IN', 'NP', 'AU', 'US'];

class CountryMarket implements Labelled {
  const CountryMarket({
    required this.isoCode,
    required this.label,
    required this.dialCode,
    required this.currencyCode,
    required this.currencySymbol,
    required this.defaultCityName,
    required this.timeZone,
  });

  final String isoCode;
  @override
  final String label;
  final String dialCode;
  final String currencyCode;
  final String currencySymbol;
  final String defaultCityName;
  final String timeZone;
}

class CurrencyDefinition {
  const CurrencyDefinition({
    required this.code,
    required this.symbol,
    this.minorUnitExponent = 2,
  }) : assert(minorUnitExponent >= 0 && minorUnitExponent <= 3);

  final String code;
  final String symbol;
  final int minorUnitExponent;

  int get minorUnitFactor {
    var factor = 1;
    for (var i = 0; i < minorUnitExponent; i++) {
      factor *= 10;
    }
    return factor;
  }
}

const defaultCountryMarket = CountryMarket(
  isoCode: 'IN',
  label: 'India',
  dialCode: '+91',
  currencyCode: 'INR',
  currencySymbol: '₹',
  defaultCityName: 'mumbai',
  timeZone: 'Asia/Kolkata',
);

const supportedCountryMarkets = [
  defaultCountryMarket,
  CountryMarket(
    isoCode: 'NP',
    label: 'Nepal',
    dialCode: '+977',
    currencyCode: 'NPR',
    currencySymbol: 'Rs ',
    defaultCityName: 'kathmandu',
    timeZone: 'Asia/Kathmandu',
  ),
  CountryMarket(
    isoCode: 'AU',
    label: 'Australia',
    dialCode: '+61',
    currencyCode: 'AUD',
    currencySymbol: 'A\$',
    defaultCityName: 'sydney',
    timeZone: 'Australia/Sydney',
  ),
  CountryMarket(
    isoCode: 'US',
    label: 'United States',
    dialCode: '+1',
    currencyCode: 'USD',
    currencySymbol: '\$',
    defaultCityName: 'new-york',
    timeZone: 'America/New_York',
  ),
];

const supportedCurrencyDefinitions = [
  CurrencyDefinition(code: 'INR', symbol: '₹'),
  CurrencyDefinition(code: 'NPR', symbol: 'Rs '),
  CurrencyDefinition(code: 'AUD', symbol: 'A\$'),
  CurrencyDefinition(code: 'USD', symbol: '\$'),
  CurrencyDefinition(code: 'CAD', symbol: 'C\$'),
  CurrencyDefinition(code: 'NZD', symbol: 'NZ\$'),
  CurrencyDefinition(code: 'SGD', symbol: 'S\$'),
  CurrencyDefinition(code: 'GBP', symbol: '£'),
  CurrencyDefinition(code: 'EUR', symbol: '€'),
  CurrencyDefinition(code: 'AED', symbol: 'د.إ '),
  CurrencyDefinition(code: 'JPY', symbol: '¥', minorUnitExponent: 0),
  CurrencyDefinition(code: 'KRW', symbol: '₩', minorUnitExponent: 0),
];

CountryMarket marketForIsoCode(String? isoCode) {
  final normalized = isoCode?.trim().toUpperCase();
  for (final market in supportedCountryMarkets) {
    if (market.isoCode == normalized) return market;
  }
  return defaultCountryMarket;
}

CountryMarket marketForDialCode(String? dialCode) {
  final normalized = dialCode?.trim();
  for (final market in supportedCountryMarkets) {
    if (market.dialCode == normalized) return market;
  }
  return defaultCountryMarket;
}

CurrencyDefinition currencyDefinitionForCode(String? currencyCode) {
  final normalized = currencyCode?.trim().toUpperCase();
  for (final currency in supportedCurrencyDefinitions) {
    if (currency.code == normalized) return currency;
  }
  if (normalized == null || !RegExp(r'^[A-Z]{3}$').hasMatch(normalized)) {
    return const CurrencyDefinition(code: defaultCurrencyCode, symbol: '₹');
  }
  return CurrencyDefinition(code: normalized, symbol: '$normalized ');
}

String countryIsoForDialCode(String? dialCode) =>
    marketForDialCode(dialCode).isoCode;

String formatMinorCurrency(
  int amountMinorUnits, {
  String currencyCode = defaultCurrencyCode,
}) {
  final currency = currencyDefinitionForCode(currencyCode);
  final factor = currency.minorUnitFactor;
  final sign = amountMinorUnits < 0 ? '-' : '';
  final absolute = amountMinorUnits.abs();
  final whole = absolute ~/ factor;
  final remainder = absolute % factor;
  final groupedWhole = _formatWholeCurrencyUnits(whole);
  final value = currency.minorUnitExponent == 0 || remainder == 0
      ? groupedWhole
      : '$groupedWhole.${remainder.toString().padLeft(currency.minorUnitExponent, '0')}';
  return '$sign${currency.symbol}$value';
}

int? parseMajorCurrencyAmountToMinorUnits(
  String input, {
  String currencyCode = defaultCurrencyCode,
}) {
  final normalized = input.trim().replaceAll(',', '');
  if (normalized.isEmpty) return null;
  final match = RegExp(r'^(\d+)(?:\.(\d*))?$').firstMatch(normalized);
  if (match == null) return null;

  final currency = currencyDefinitionForCode(currencyCode);
  final whole = int.tryParse(match.group(1)!);
  if (whole == null) return null;

  final exponent = currency.minorUnitExponent;
  final rawFraction = match.group(2) ?? '';
  if (exponent == 0) {
    if (rawFraction.replaceAll('0', '').isNotEmpty) return null;
    return whole;
  }

  if (rawFraction.length > exponent &&
      rawFraction.substring(exponent).replaceAll('0', '').isNotEmpty) {
    return null;
  }
  final fraction = rawFraction.padRight(exponent, '0').substring(0, exponent);
  final minor = int.tryParse(fraction);
  if (minor == null) return null;
  return whole * currency.minorUnitFactor + minor;
}

String minorCurrencyAmountInputText(
  int? amountMinorUnits, {
  String currencyCode = defaultCurrencyCode,
}) {
  if (amountMinorUnits == null) return '';
  final currency = currencyDefinitionForCode(currencyCode);
  final exponent = currency.minorUnitExponent;
  if (exponent == 0) return amountMinorUnits.toString();

  final sign = amountMinorUnits < 0 ? '-' : '';
  final absolute = amountMinorUnits.abs();
  final whole = absolute ~/ currency.minorUnitFactor;
  final remainder = absolute % currency.minorUnitFactor;
  if (remainder == 0) return '$sign$whole';
  return '$sign$whole.${remainder.toString().padLeft(exponent, '0')}';
}

String _formatWholeCurrencyUnits(int value) {
  final digits = value.toString();
  final firstGroupLength = digits.length % 3;
  final buffer = StringBuffer();

  for (var index = 0; index < digits.length; index++) {
    if (index > 0 &&
        (index - firstGroupLength) % 3 == 0 &&
        (firstGroupLength != 0 || index != 0)) {
      buffer.write(',');
    }
    buffer.write(digits[index]);
  }

  return buffer.toString();
}
