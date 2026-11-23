import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_route_screen.dart';
import 'package:catch_platform/device/connectivity_service.dart';
import 'package:catch_test_support/design_fixtures/host_operations_fixtures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'manage_fixture.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Route and section states',
  type: HostEventManageRouteScreen,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostEventManageRouteAndSectionStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostEventManageRouteScreen',
    contractId: 'screen.host.event.manage',
    children: [
      WidgetbookPageStateCard(
        label: 'route loading',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            initialSection: HostEventManageSection.live,
            organizerValue: const AsyncLoading<Organizer?>(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'route error',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            initialSection: HostEventManageSection.live,
            organizerValue: AsyncError<Organizer?>(
              StateError('Club fetch failed'),
              StackTrace.empty,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'route offline',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            initialSection: HostEventManageSection.live,
            organizerValue: AsyncError<Organizer?>(
              obviousOfflineException(),
              StackTrace.empty,
            ),
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'event not found',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            initialSection: HostEventManageSection.live,
            eventValue: AsyncData<Event?>(null),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'unauthorized host',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            initialSection: HostEventManageSection.live,
            uid: HostOperationsFixtures.guestUid,
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'setup workspace',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'guests workspace',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            initialSection: HostEventManageSection.guests,
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'live workspace',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            initialSection: HostEventManageSection.live,
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'report workspace',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            initialSection: HostEventManageSection.report,
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            textScaler: TextScaler.linear(2),
            child: WidgetbookHostManageRouteScope(),
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'reduced motion',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            disableAnimations: true,
            child: WidgetbookHostManageRouteScope(),
          ),
        ),
      ),
    ],
  );
}
