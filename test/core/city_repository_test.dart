import 'package:catch_dating_app/kernel/city_data.dart';
import 'package:catch_dating_app/platform/cities/city_repository.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late FakeFirebaseFirestore firestore;
  late CityRepository repository;

  setUp(() {
    firestore = FakeFirebaseFirestore();
    repository = CityRepository(
      firestore,
      ErrorLogger(shouldReportErrors: false),
    );
  });

  test('fetchCities reads Firestore config when present', () async {
    const cities = [
      CityData(
        name: 'indore',
        marketId: 'in-mp-indore',
        cityId: 'in-mp-indore',
        slug: 'indore',
        label: 'Indore',
        latitude: 22.7196,
        longitude: 75.8577,
        profileSelectable: true,
        exploreVisible: true,
      ),
      CityData(
        name: 'mumbai',
        marketId: 'in-mh-mumbai',
        cityId: 'in-mh-mumbai',
        slug: 'mumbai',
        label: 'Mumbai',
        latitude: 19.0760,
        longitude: 72.8777,
        profileSelectable: true,
        exploreVisible: true,
      ),
    ];
    await firestore.doc('config/cities').set({
      'cities': cities.map((city) => city.toJson()).toList(),
    });

    await expectLater(repository.fetchCities(), completion(cities));
  });

  test('fetchCities falls back to default catalog when config is missing', () {
    expect(repository.fetchCities(), completion(isNotEmpty));
  });

  test('nearestCity chooses the closest configured city', () async {
    const indore = CityData(
      name: 'indore',
      marketId: 'in-mp-indore',
      cityId: 'in-mp-indore',
      slug: 'indore',
      label: 'Indore',
      latitude: 22.7196,
      longitude: 75.8577,
      profileSelectable: true,
      exploreVisible: true,
    );
    const mumbai = CityData(
      name: 'mumbai',
      marketId: 'in-mh-mumbai',
      cityId: 'in-mh-mumbai',
      slug: 'mumbai',
      label: 'Mumbai',
      latitude: 19.0760,
      longitude: 72.8777,
      profileSelectable: true,
      exploreVisible: true,
    );
    await firestore.doc('config/cities').set({
      'cities': [indore.toJson(), mumbai.toJson()],
    });

    final nearest = await repository.nearestCity(22.72, 75.86);

    expect(nearest, indore);
  });
}
