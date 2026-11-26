import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/hosts/insights/host_event_coach_section.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

// The post-event coach on an event report, and the line it shows when too
// few guests checked in for the group-size floor.

@widgetbook.UseCase(
  name: 'Coach figures',
  type: HostEventCoachSection,
  path: '[P1 product surfaces]/Host/Insights',
)
Widget hostEventCoachSectionUseCase(BuildContext context) => CatchRoot(
  child: CatchScreen(
    body: CatchPageBody(
      child: HostEventCoachSection(
        brief: EventSuccessFeatureSamples.postEventBrief,
      ),
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Withheld below the floor',
  type: HostEventCoachSection,
  path: '[P1 product surfaces]/Host/Insights',
)
Widget hostEventCoachSectionWithheldUseCase(BuildContext context) =>
    const CatchRoot(
      child: CatchScreen(
        body: CatchPageBody(
          child: HostEventCoachSection(
            withheld:
                'The coach report shows once at least 10 guests checked in.',
          ),
        ),
      ),
    );
