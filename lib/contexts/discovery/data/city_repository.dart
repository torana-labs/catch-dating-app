import 'package:catch_kernel/city_catalog.dart';
import 'package:catch_kernel/city_data.dart';
import 'package:catch_kernel/location_coordinate.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/firebase/config_documents.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'city_repository.g.dart';

/// Fetches the list of supported cities from Firestore.
///
/// The primary source is the `config/cities` document. When that document
/// is missing or unreadable, the function falls back to the default city
/// catalog so the picker never renders empty.
class CityRepository {
  const CityRepository(this._configDocuments, this._errorLogger);

  static const _configDocPath = 'config/cities';

  final ConfigDocuments _configDocuments;
  final ErrorLogger _errorLogger;

  Future<List<CityData>> fetchCities() async {
    try {
      final configured = configuredCityData(
        await _configDocuments.read(_configDocPath),
      );
      if (configured != null) return configured;
    } catch (e, st) {
      // Fall through to defaults — network errors or missing indexes
      // should not prevent the city picker from rendering.
      _errorLogger.logAppException(
        normalizeBackendError(
          e,
          stackTrace: st,
          context: const BackendErrorContext(
            service: BackendService.firestore,
            action: 'fetch city config',
            resource: 'config/cities',
          ),
        ),
      );
    }

    return launchedDefaultCityData;
  }

  /// The configured city nearest to [lat] / [lng].
  Future<CityData?> nearestCity(double lat, double lng) async =>
      nearestCityData(LocationCoordinate(lat, lng), await fetchCities());
}

// keepalive: account-free: city repository backs global city selection and
// should remain a single cached Firestore facade.
@Riverpod(keepAlive: true)
CityRepository cityRepository(Ref ref) => CityRepository(
  ref.watch(configDocumentsProvider),
  ref.watch(errorLoggerProvider),
);

/// List of supported cities, fetched once and cached for the app lifetime.
///
/// Returns the Firestore-backed list or the launched defaults.
// keepalive: account-free: the city list is app-wide discovery configuration
// reused by Explore, onboarding and profile flows.
@Riverpod(keepAlive: true)
Future<List<CityData>> cityList(Ref ref) async {
  return ref.watch(cityRepositoryProvider).fetchCities();
}
