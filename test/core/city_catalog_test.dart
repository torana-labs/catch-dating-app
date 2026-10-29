import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/kernel/country_markets.dart';
import 'package:flutter_test/flutter_test.dart';

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
}
