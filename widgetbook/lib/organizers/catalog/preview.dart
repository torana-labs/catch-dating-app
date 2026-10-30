import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';

import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';

class WidgetbookOrganizerDeviceFrame extends StatelessWidget {
  const WidgetbookOrganizerDeviceFrame({
    super.key,
    required this.child,
    this.height = 720,
  });
  final Widget child;
  final double height;
  @override
  Widget build(BuildContext context) =>
      WidgetbookViewportFrame.constrainedDevice(
        size: Size(390, height),
        child: child,
      );
}

class _OrganizerDiscoveryFrame extends StatelessWidget {
  const _OrganizerDiscoveryFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 360),
        child: child,
      ),
    );
  }
}

class WidgetbookOrganizerOrganizerMediaFrame extends StatelessWidget {
  const WidgetbookOrganizerOrganizerMediaFrame({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return _OrganizerDiscoveryFrame(
      child: AspectRatio(
        aspectRatio: 1,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(CatchRadius.lg),
          child: child,
        ),
      ),
    );
  }
}

class WidgetbookOrganizerSliverFrame extends StatelessWidget {
  const WidgetbookOrganizerSliverFrame({
    super.key,
    required this.slivers,
    this.height = 420,
  });
  final List<Widget> slivers;
  final double height;
  @override
  Widget build(BuildContext context) => WidgetbookContentFrame(
    child: SizedBox(
      height: height,
      child: CustomScrollView(slivers: slivers),
    ),
  );
}
