// copy:allow-file(Canonical geographic proper-noun market catalog)
import 'package:catch_kernel/city_data.dart';
import 'package:catch_kernel/country_markets.dart';
import 'package:catch_kernel/labelled.dart';
import 'package:catch_kernel/market_catalog.dart';

class CityOption implements Labelled {
  const CityOption({
    required this.name,
    required this.label,
    required this.latitude,
    required this.longitude,
    required this.countryIsoCode,
    required this.currencyCode,
    required this.dialCode,
    required this.timeZone,
    this.cityId,
    this.marketId,
    this.slug,
    this.launchStatus = 'planned',
    this.profileSelectable = false,
    this.hostCreatable = false,
    this.eventCreatable = false,
    this.exploreVisible = false,
    this.aliases = const [],
  });

  final String name;
  final String? cityId;
  final String? marketId;
  final String? slug;
  @override
  final String label;
  final double latitude;
  final double longitude;
  final String countryIsoCode;
  final String currencyCode;
  final String dialCode;
  final String timeZone;
  final String launchStatus;
  final bool profileSelectable;
  final bool hostCreatable;
  final bool eventCreatable;
  final bool exploreVisible;
  final List<String> aliases;

  String get effectiveMarketId => marketId ?? name;
  String get effectiveCityId => cityId ?? effectiveMarketId;
  String get effectiveSlug => slug ?? name;

  CityData toCityData() => CityData(
    name: effectiveMarketId,
    cityId: effectiveCityId,
    marketId: effectiveMarketId,
    slug: effectiveSlug,
    label: label,
    latitude: latitude,
    longitude: longitude,
    countryIsoCode: countryIsoCode,
    currencyCode: currencyCode,
    dialCode: dialCode,
    timeZone: timeZone,
    launchStatus: launchStatus,
    profileSelectable: profileSelectable,
    hostCreatable: hostCreatable,
    eventCreatable: eventCreatable,
    exploreVisible: exploreVisible,
  );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CityOption &&
          runtimeType == other.runtimeType &&
          effectiveMarketId == other.effectiveMarketId;

  @override
  int get hashCode => effectiveMarketId.hashCode;

  @override
  String toString() => effectiveMarketId;
}

/// Every catalog city, in display order. Generated from
/// contracts/catalogs/markets.json into market_catalog.dart.
const defaultCityOptions = generatedCityOptions;

final defaultCityData = defaultCityOptions
    .map((city) => city.toCityData())
    .toList(growable: false);

final launchedDefaultCityData = defaultCityOptions
    .where((city) => city.profileSelectable || city.exploreVisible)
    .map((city) => city.toCityData())
    .toList(growable: false);

CityOption? cityOptionByName(String? name) {
  if (name == null) return null;
  final normalized = _normalizeCityKey(name);
  for (final city in defaultCityOptions) {
    if (_normalizeCityKey(city.name) == normalized ||
        _normalizeCityKey(city.effectiveMarketId) == normalized ||
        _normalizeCityKey(city.effectiveCityId) == normalized ||
        _normalizeCityKey(city.effectiveSlug) == normalized ||
        city.aliases.any((alias) => _normalizeCityKey(alias) == normalized)) {
      return city;
    }
  }
  return null;
}

String cityLabel(String? name) {
  final configured = cityOptionByName(name);
  if (configured != null) return configured.label;
  if (name == null || name.isEmpty) return '';
  return name
      .split(RegExp(r'[-_\s]+'))
      .where((part) => part.isNotEmpty)
      .map((part) => part[0].toUpperCase() + part.substring(1))
      .join(' ');
}

CityData defaultCityDataForMarket([
  CountryMarket market = defaultCountryMarket,
]) {
  final configured = cityOptionByName(market.defaultCityName);
  return configured?.toCityData() ?? launchedDefaultCityData.first;
}

CountryMarket marketForCityName(String? cityName) {
  final city = cityOptionByName(cityName);
  return marketForIsoCode(city?.countryIsoCode);
}

String countryIsoCodeForCityName(String? cityName) =>
    marketForCityName(cityName).isoCode;

String currencyCodeForCityName(String? cityName) =>
    marketForCityName(cityName).currencyCode;

String dialCodeForCityName(String? cityName) =>
    marketForCityName(cityName).dialCode;

String _normalizeCityKey(String value) => value
    .trim()
    .toLowerCase()
    .replaceAll('&', ' and ')
    .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
    .replaceAll(RegExp(r'^-+|-+$'), '');
