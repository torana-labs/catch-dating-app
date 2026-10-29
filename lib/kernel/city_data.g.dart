// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'city_data.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CityData _$CityDataFromJson(Map<String, dynamic> json) => _CityData(
  name: json['name'] as String,
  cityId: json['cityId'] as String? ?? '',
  marketId: json['marketId'] as String? ?? '',
  slug: json['slug'] as String? ?? '',
  label: json['label'] as String,
  latitude: (json['latitude'] as num).toDouble(),
  longitude: (json['longitude'] as num).toDouble(),
  countryIsoCode: json['countryIsoCode'] as String? ?? defaultCountryIsoCode,
  currencyCode: json['currencyCode'] as String? ?? defaultCurrencyCode,
  dialCode: json['dialCode'] as String? ?? defaultCountryDialCode,
  timeZone: json['timeZone'] as String? ?? defaultTimeZone,
  launchStatus: json['launchStatus'] as String? ?? 'planned',
  profileSelectable: json['profileSelectable'] as bool? ?? false,
  hostCreatable: json['hostCreatable'] as bool? ?? false,
  eventCreatable: json['eventCreatable'] as bool? ?? false,
  exploreVisible: json['exploreVisible'] as bool? ?? false,
);

Map<String, dynamic> _$CityDataToJson(_CityData instance) => <String, dynamic>{
  'name': instance.name,
  'cityId': instance.cityId,
  'marketId': instance.marketId,
  'slug': instance.slug,
  'label': instance.label,
  'latitude': instance.latitude,
  'longitude': instance.longitude,
  'countryIsoCode': instance.countryIsoCode,
  'currencyCode': instance.currencyCode,
  'dialCode': instance.dialCode,
  'timeZone': instance.timeZone,
  'launchStatus': instance.launchStatus,
  'profileSelectable': instance.profileSelectable,
  'hostCreatable': instance.hostCreatable,
  'eventCreatable': instance.eventCreatable,
  'exploreVisible': instance.exploreVisible,
};
