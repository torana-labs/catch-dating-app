// copy:allow-file(Canonical geographic proper-noun country catalog)
import 'package:catch_kernel/labelled.dart';
import 'package:catch_kernel/market_catalog.dart';

// Countries come from contracts/catalogs/markets.json through the generated
// market_catalog.dart.
const defaultCountryIsoCode = generatedDefaultCountryIsoCode;
const defaultCountryDialCode = generatedDefaultCountryDialCode;
const defaultCurrencyCode = generatedDefaultCurrencyCode;
const defaultTimeZone = generatedDefaultTimeZone;

const supportedCountryPickerFavorites = generatedCountryPickerFavorites;

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

const defaultCountryMarket = generatedDefaultCountryMarket;

const supportedCountryMarkets = generatedCountryMarkets;

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
  final groupedWhole = _formatWholeCurrencyUnits(
    whole,
    indian: currency.code == 'INR',
  );
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

/// Thousands groups of three; rupees group the Indian way, so the last
/// three digits stand alone and the rest pair up: 1,48,000.
String _formatWholeCurrencyUnits(int value, {bool indian = false}) {
  final digits = value.toString();
  if (digits.length <= 3) return digits;
  final tail = digits.substring(digits.length - 3);
  final head = digits.substring(0, digits.length - 3);
  final size = indian ? 2 : 3;
  final groups = <String>[];
  for (var end = head.length; end > 0; end -= size) {
    groups.insert(0, head.substring(end - size < 0 ? 0 : end - size, end));
  }
  return [...groups, tail].join(',');
}
