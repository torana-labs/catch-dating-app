import 'package:catch_dating_app/contexts/events/data/event_live_position_service.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_route_screen.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_check_in_qr_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_live_location_field.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_manage_section.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'manage_fixture.dart';
import 'preview.dart';

Widget _hostEventManageExactCatalog(BuildContext context, String focus) {
  return WidgetbookPageCatalogFrame(
    title: focus,
    contractId:
        'component.host.event_manage.${widgetbookHostComponentSlug(focus)}',
    children: [
      WidgetbookPageStateCard(
        label: 'exact component',
        child: _HostManageComponentFrame(
          child: _hostEventManagePreviewFor(context, focus),
        ),
      ),
    ],
  );
}

Widget _hostEventManagePreviewFor(BuildContext context, String focus) {
  final event = HostOperationsFixtures.privateEvent;
  final organizer = HostOperationsFixtures.primaryOrganizer;
  return switch (focus) {
    'HostEventCheckInQrSection' => HostEventCheckInQrSection(event: event),
    'HostPublicRegistrationField' => Consumer(
      builder: (context, ref, _) => HostPublicRegistrationField(
        organizer: organizer,
        event: event,
        mutation: ref.watch(
          HostEventBookingController.publicRegistrationMutation,
        ),
        onChanged: (_) {},
      ),
    ),
    _ => Text('No exact preview registered for $focus.'),
  };
}

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostEventManageRouteScreen,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostEventManageRouteScreenCatalogStates(
  BuildContext context,
) => _hostEventManageExactCatalog(context, 'HostEventManageRouteScreen');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostEventCheckInQrSection,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostEventCheckInQrSectionCatalogStates(BuildContext context) =>
    _hostEventManageExactCatalog(context, 'HostEventCheckInQrSection');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostPublicRegistrationField,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostPublicRegistrationFieldCatalogStates(
  BuildContext context,
) => _hostEventManageExactCatalog(context, 'HostPublicRegistrationField');

class _HostManageComponentFrame extends StatelessWidget {
  const _HostManageComponentFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return WidgetbookHostDeviceFrame(
      child: WidgetbookHostManageRouteScope(
        child: WidgetbookHostComponentScaffold(child: child),
      ),
    );
  }
}

@widgetbook.UseCase(
  name: 'Operator location sharing',
  type: HostEventLiveLocationField,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostEventLiveLocationFieldStates(BuildContext context) {
  final plan = RouteEventPlan.socialRun.copyWith(
    liveTrackingPolicy: const RouteLiveTrackingPolicy(
      mode: RouteLiveTrackingMode.authorizedOperators,
      staleAfterSeconds: 120,
      retentionMinutes: 15,
    ),
  );
  final event = HostOperationsFixtures.upcomingEvent.copyWith(
    eventFormat: EventFormatSnapshot.fromActivityKind(
      ActivityKind.socialRun,
      activityDetails: {'routePlan': plan.toJson()},
    ),
  );
  return widgetbookHostComponentStates('HostEventLiveLocationField', [
    (
      'sharing off',
      ProviderScope(
        overrides: [
          eventLivePositionPublisherProvider.overrideWithValue(
            const _PreviewLivePositionPublisher(),
          ),
        ],
        child: CatchSection.fieldRows(
          first: true,
          children: [HostEventLiveLocationField(event: event)],
        ),
      ),
    ),
  ]);
}

class _PreviewLivePositionPublisher implements EventLivePositionPublisher {
  const _PreviewLivePositionPublisher();

  @override
  Future<void> publish({
    required String eventId,
    required EventLivePositionSample position,
  }) async {}

  @override
  Future<void> stop({required String eventId}) async {}
}
