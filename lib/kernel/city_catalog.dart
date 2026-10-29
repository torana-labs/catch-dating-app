// copy:allow-file(Canonical geographic proper-noun market catalog)
import 'package:catch_dating_app/kernel/city_data.dart';
import 'package:catch_dating_app/kernel/country_markets.dart';
import 'package:catch_dating_app/kernel/labelled.dart';

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

const defaultCityOptions = [
  CityOption(
    name: 'mumbai',
    cityId: 'in-mh-mumbai',
    marketId: 'in-mh-mumbai',
    slug: 'mumbai',
    label: 'Mumbai',
    latitude: 19.0760,
    longitude: 72.8777,
    countryIsoCode: 'IN',
    currencyCode: 'INR',
    dialCode: '+91',
    timeZone: 'Asia/Kolkata',
    launchStatus: 'launched',
    profileSelectable: true,
    hostCreatable: true,
    eventCreatable: true,
    exploreVisible: true,
    aliases: ['bombay'],
  ),
  CityOption(
    name: 'delhi',
    cityId: 'in-dl-new-delhi',
    marketId: 'in-dl-delhi-ncr',
    slug: 'delhi-ncr',
    label: 'Delhi NCR',
    latitude: 28.7041,
    longitude: 77.1025,
    countryIsoCode: 'IN',
    currencyCode: 'INR',
    dialCode: '+91',
    timeZone: 'Asia/Kolkata',
  ),
  CityOption(
    name: 'bangalore',
    cityId: 'in-ka-bengaluru',
    marketId: 'in-ka-bengaluru',
    slug: 'bengaluru',
    label: 'Bengaluru',
    latitude: 12.9716,
    longitude: 77.5946,
    countryIsoCode: 'IN',
    currencyCode: 'INR',
    dialCode: '+91',
    timeZone: 'Asia/Kolkata',
    aliases: ['bangalore'],
  ),
  CityOption(
    name: 'hyderabad',
    cityId: 'in-tg-hyderabad',
    marketId: 'in-tg-hyderabad',
    slug: 'hyderabad',
    label: 'Hyderabad',
    latitude: 17.3850,
    longitude: 78.4867,
    countryIsoCode: 'IN',
    currencyCode: 'INR',
    dialCode: '+91',
    timeZone: 'Asia/Kolkata',
  ),
  CityOption(
    name: 'chennai',
    cityId: 'in-tn-chennai',
    marketId: 'in-tn-chennai',
    slug: 'chennai',
    label: 'Chennai',
    latitude: 13.0827,
    longitude: 80.2707,
    countryIsoCode: 'IN',
    currencyCode: 'INR',
    dialCode: '+91',
    timeZone: 'Asia/Kolkata',
  ),
  CityOption(
    name: 'kolkata',
    cityId: 'in-wb-kolkata',
    marketId: 'in-wb-kolkata',
    slug: 'kolkata',
    label: 'Kolkata',
    latitude: 22.5726,
    longitude: 88.3639,
    countryIsoCode: 'IN',
    currencyCode: 'INR',
    dialCode: '+91',
    timeZone: 'Asia/Kolkata',
  ),
  CityOption(
    name: 'pune',
    cityId: 'in-mh-pune',
    marketId: 'in-mh-pune',
    slug: 'pune',
    label: 'Pune',
    latitude: 18.5204,
    longitude: 73.8567,
    countryIsoCode: 'IN',
    currencyCode: 'INR',
    dialCode: '+91',
    timeZone: 'Asia/Kolkata',
  ),
  CityOption(
    name: 'ahmedabad',
    cityId: 'in-gj-ahmedabad',
    marketId: 'in-gj-ahmedabad',
    slug: 'ahmedabad',
    label: 'Ahmedabad',
    latitude: 23.0225,
    longitude: 72.5714,
    countryIsoCode: 'IN',
    currencyCode: 'INR',
    dialCode: '+91',
    timeZone: 'Asia/Kolkata',
  ),
  CityOption(
    name: 'goa',
    cityId: 'in-ga-panaji',
    marketId: 'in-ga-goa',
    slug: 'goa',
    label: 'Goa',
    latitude: 15.4909,
    longitude: 73.8278,
    countryIsoCode: 'IN',
    currencyCode: 'INR',
    dialCode: '+91',
    timeZone: 'Asia/Kolkata',
    aliases: ['panaji', 'panjim'],
  ),
  CityOption(
    name: 'indore',
    cityId: 'in-mp-indore',
    marketId: 'in-mp-indore',
    slug: 'indore',
    label: 'Indore',
    latitude: 22.7196,
    longitude: 75.8577,
    countryIsoCode: 'IN',
    currencyCode: 'INR',
    dialCode: '+91',
    timeZone: 'Asia/Kolkata',
    launchStatus: 'launched',
    profileSelectable: true,
    hostCreatable: true,
    eventCreatable: true,
    exploreVisible: true,
  ),
  CityOption(
    name: 'kathmandu',
    cityId: 'np-p3-kathmandu',
    marketId: 'np-p3-kathmandu',
    slug: 'kathmandu',
    label: 'Kathmandu',
    latitude: 27.7172,
    longitude: 85.3240,
    countryIsoCode: 'NP',
    currencyCode: 'NPR',
    dialCode: '+977',
    timeZone: 'Asia/Kathmandu',
  ),
  CityOption(
    name: 'pokhara',
    cityId: 'np-p4-pokhara',
    marketId: 'np-p4-pokhara',
    slug: 'pokhara',
    label: 'Pokhara',
    latitude: 28.2096,
    longitude: 83.9856,
    countryIsoCode: 'NP',
    currencyCode: 'NPR',
    dialCode: '+977',
    timeZone: 'Asia/Kathmandu',
  ),
  CityOption(
    name: 'sydney',
    cityId: 'au-nsw-sydney',
    marketId: 'au-nsw-sydney',
    slug: 'sydney',
    label: 'Sydney',
    latitude: -33.8688,
    longitude: 151.2093,
    countryIsoCode: 'AU',
    currencyCode: 'AUD',
    dialCode: '+61',
    timeZone: 'Australia/Sydney',
  ),
  CityOption(
    name: 'melbourne',
    cityId: 'au-vic-melbourne',
    marketId: 'au-vic-melbourne',
    slug: 'melbourne',
    label: 'Melbourne',
    latitude: -37.8136,
    longitude: 144.9631,
    countryIsoCode: 'AU',
    currencyCode: 'AUD',
    dialCode: '+61',
    timeZone: 'Australia/Melbourne',
  ),
  CityOption(
    name: 'brisbane',
    cityId: 'au-qld-brisbane',
    marketId: 'au-qld-brisbane',
    slug: 'brisbane',
    label: 'Brisbane',
    latitude: -27.4698,
    longitude: 153.0251,
    countryIsoCode: 'AU',
    currencyCode: 'AUD',
    dialCode: '+61',
    timeZone: 'Australia/Brisbane',
  ),
  CityOption(
    name: 'new-york',
    cityId: 'us-ny-new-york',
    marketId: 'us-ny-new-york',
    slug: 'new-york',
    label: 'New York',
    latitude: 40.7128,
    longitude: -74.0060,
    countryIsoCode: 'US',
    currencyCode: 'USD',
    dialCode: '+1',
    timeZone: 'America/New_York',
  ),
  CityOption(
    name: 'san-francisco',
    cityId: 'us-ca-san-francisco',
    marketId: 'us-ca-san-francisco',
    slug: 'san-francisco',
    label: 'San Francisco',
    latitude: 37.7749,
    longitude: -122.4194,
    countryIsoCode: 'US',
    currencyCode: 'USD',
    dialCode: '+1',
    timeZone: 'America/Los_Angeles',
  ),
  CityOption(
    name: 'los-angeles',
    cityId: 'us-ca-los-angeles',
    marketId: 'us-ca-los-angeles',
    slug: 'los-angeles',
    label: 'Los Angeles',
    latitude: 34.0522,
    longitude: -118.2437,
    countryIsoCode: 'US',
    currencyCode: 'USD',
    dialCode: '+1',
    timeZone: 'America/Los_Angeles',
  ),
];

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
