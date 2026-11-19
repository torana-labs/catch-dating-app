import 'package:catch_dating_app/hosts/presentation/widgets/host_door_poster_sheet.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/page_preview.dart';

@widgetbook.UseCase(
  name: 'Join-only door poster',
  type: HostDoorPoster,
  path: '[P1 product surfaces]/Host/Roster',
)
Widget hostDoorPosterState(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'HostDoorPoster',
      catalogId: 'host.door_poster',
      children: [
        WidgetbookPageStateCard(
          label: 'Printed at the entrance',
          child: HostDoorPoster(
            eventName: 'Sunday Sea-Face Run',
            joinLink: Uri.parse('https://catch.example/join/runtime-1'),
          ),
        ),
      ],
    );
