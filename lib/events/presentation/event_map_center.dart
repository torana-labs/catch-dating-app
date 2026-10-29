import 'package:catch_dating_app/kernel/city_data.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';

LocationCoordinate resolveEventMapInitialCenter({
  LocationCoordinate? deviceLocation,
  required CityData selectedCity,
  required bool selectedCityWasUserSelected,
}) {
  if (!selectedCityWasUserSelected && deviceLocation != null) {
    return deviceLocation;
  }

  return LocationCoordinate(selectedCity.latitude, selectedCity.longitude);
}
