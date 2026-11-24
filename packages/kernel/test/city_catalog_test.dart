import 'package:catch_kernel/city_catalog.dart';
import 'package:catch_kernel/city_data.dart';
import 'package:catch_kernel/country_markets.dart';
import 'package:catch_kernel/location_coordinate.dart';
import 'package:test/test.dart';

void main() {
  group('city catalog', () {
    test('default city options have stable names, labels, and coordinates', () {
      expect(defaultCityOptions.map((city) => city.name), contains('mumbai'));
      expect(
        defaultCityOptions.map((city) => city.name),
        contains('kathmandu'),
      );
      expect(defaultCityOptions.map((city) => city.name), contains('sydney'));
      expect(defaultCityOptions.map((city) => city.name), contains('new-york'));
      expect(cityLabel('mumbai'), 'Mumbai');

      for (final city in defaultCityOptions) {
        expect(city.label, isNotEmpty);
        expect(city.latitude, inClosedOpenRange(-90, 90));
        expect(city.longitude, inClosedOpenRange(-180, 180));
        expect(city.countryIsoCode, hasLength(2));
        expect(city.currencyCode, hasLength(3));
        expect(city.dialCode, startsWith('+'));
        expect(city.timeZone, contains('/'));
      }
    });

    test('derives market metadata from city names', () {
      expect(currencyCodeForCityName('sydney'), 'AUD');
      expect(dialCodeForCityName('kathmandu'), '+977');
      expect(marketForCityName('new-york').isoCode, 'US');
      expect(defaultCityDataForMarket().name, 'in-mh-mumbai');
    });

    test('cities carry their catalog lifecycle and website listing', () {
      final mumbai = cityOptionByName('mumbai')!;
      expect(mumbai.lifecycle, 'live');
      expect(mumbai.websiteListed, isTrue);
      expect(mumbai.toCityData().effectiveLifecycle, 'live');
      expect(cityOptionByName('pune')!.lifecycle, 'waitlist');
      final kathmandu = cityOptionByName('kathmandu')!;
      expect(kathmandu.lifecycle, 'hidden');
      expect(kathmandu.websiteListed, isFalse);
      for (final city in defaultCityOptions) {
        expect(city.launchStatus == 'launched', city.lifecycle == 'live');
      }
    });

    test('config written before lifecycles infers one from launchStatus', () {
      CityData legacy(String launchStatus) => CityData.fromJson({
        'name': 'in-mh-pune',
        'label': 'Pune',
        'latitude': 18.5204,
        'longitude': 73.8567,
        'launchStatus': launchStatus,
      });
      expect(legacy('launched').effectiveLifecycle, 'live');
      expect(legacy('paused').effectiveLifecycle, 'paused');
      expect(legacy('planned').effectiveLifecycle, 'hidden');
      expect(legacy('planned').websiteListed, isFalse);
      final current = CityData.fromJson({
        'name': 'in-mh-pune',
        'label': 'Pune',
        'latitude': 18.5204,
        'longitude': 73.8567,
        'lifecycle': 'launching',
        'launchDate': '2027-01-15',
      });
      expect(current.effectiveLifecycle, 'launching');
      expect(current.launchDate, '2027-01-15');
    });

    test('unknown city labels fall back to title case', () {
      expect(cityLabel('race-course-road'), 'Race Course Road');
      expect(cityOptionByName('unknown-city'), isNull);
    });

    test('resolves canonical market and city ids to display labels', () {
      expect(cityLabel('in-mp-indore'), 'Indore');
      expect(cityLabel('in-dl-delhi-ncr'), 'Delhi NCR');
      expect(cityLabel('in-dl-new-delhi'), 'Delhi NCR');
      expect(cityLabel('IN-DL-DELHI-NCR'), 'Delhi NCR');
      expect(cityLabel('delhi'), 'Delhi NCR');
      expect(cityLabel('in-ga-goa'), 'Goa');
      expect(cityLabel('in-ga-panaji'), 'Goa');
      expect(cityLabel('panjim'), 'Goa');
    });

    test('parses currency amounts using each currency exponent', () {
      expect(parseMajorCurrencyAmountToMinorUnits('249.50'), 24950);
      expect(
        parseMajorCurrencyAmountToMinorUnits('19.99', currencyCode: 'USD'),
        1999,
      );
      expect(
        parseMajorCurrencyAmountToMinorUnits('2500', currencyCode: 'JPY'),
        2500,
      );
      expect(
        parseMajorCurrencyAmountToMinorUnits('2500.25', currencyCode: 'JPY'),
        isNull,
      );
      expect(minorCurrencyAmountInputText(1999, currencyCode: 'USD'), '19.99');
    });
  });

  group('city selection', () {
    const pune = CityData(
      name: 'pune',
      marketId: 'in-mh-pune',
      cityId: 'in-mh-pune',
      slug: 'pune',
      label: 'Pune',
      latitude: 18.5204,
      longitude: 73.8567,
      profileSelectable: true,
      exploreVisible: true,
    );
    const hidden = CityData(
      name: 'hidden',
      marketId: 'in-xx-hidden',
      cityId: 'in-xx-hidden',
      slug: 'hidden',
      label: 'Hidden',
      latitude: 18.52,
      longitude: 73.85,
    );

    test('configuredCityData keeps the cities a profile or Explore shows', () {
      expect(
        configuredCityData({
          'cities': [pune.toJson(), hidden.toJson()],
        }),
        [pune],
      );
      expect(configuredCityData(null), isNull);
      expect(configuredCityData({'cities': <Object>[]}), isNull);
    });

    test('nearestCityData picks the closest city, or none', () {
      final mumbai = launchedDefaultCityData.firstWhere(
        (city) => city.slug == 'mumbai',
      );
      expect(
        nearestCityData(const LocationCoordinate(18.6, 73.9), [mumbai, pune]),
        pune,
      );
      expect(nearestCityData(const LocationCoordinate(0, 0), const []), isNull);
    });
  });
}
