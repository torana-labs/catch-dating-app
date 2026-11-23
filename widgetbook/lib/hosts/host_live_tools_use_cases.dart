import 'package:catch_dating_app/hosts/live/live_tools_screen.dart';
import 'package:catch_test_support/design_fixtures/host_operations_fixtures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

// Night tools: the old console's assistance sections the rebuilt console
// opens, for a social run on the night.

@widgetbook.UseCase(
  name: 'A social run',
  type: HostLiveToolsScreen,
  path: '[P1 product surfaces]/Host/Live',
)
Widget hostLiveToolsScreenUseCase(BuildContext context) => ProviderScope(
  child: HostLiveToolsScreen(event: HostOperationsFixtures.upcomingEvent),
);
