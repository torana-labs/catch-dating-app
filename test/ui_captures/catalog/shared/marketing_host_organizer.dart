// Capture fixtures shared by more than one catalog entry. Only the entries
// that import this file depend on it.

import '../../fixtures/sales_demo_synthetic_fixtures.dart';
import 'capture_fixtures.dart';

final marketingHostOrganizer = hostMarketingIndiaScenario.organizer(
  captureFixtures,
);
