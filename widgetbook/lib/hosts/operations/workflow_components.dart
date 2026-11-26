import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_route_loading_screen.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'preview.dart';

const _path = '[P1 product surfaces]/Host operations/Workflow components';

@widgetbook.UseCase(
  name: 'Loading dock',
  type: CreateEventDockSkeleton,
  path: _path,
)
Widget createEventDockSkeletonStates(BuildContext context) =>
    widgetbookHostComponentStates('CreateEventDockSkeleton', [
      ('route loading', const CreateEventDockSkeleton()),
    ]);
