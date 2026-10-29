import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'shell_fixture.dart';

String widgetbookHostComponentSlug(String name) {
  return name
      .replaceAllMapped(
        RegExp(r'([a-z0-9])([A-Z])'),
        (match) => '${match.group(1)}_${match.group(2)}',
      )
      .toLowerCase();
}

/// One catalog page per host component: each labelled state renders inside
/// the host component frame under `component.host.<slug>`.
Widget widgetbookHostComponentStates(
  String title,
  List<(String, Widget)> states,
) {
  return WidgetbookPageCatalogFrame(
    title: title,
    contractId: 'component.host.${widgetbookHostComponentSlug(title)}',
    children: [
      for (final (label, child) in states)
        WidgetbookPageStateCard(
          label: label,
          child: WidgetbookHostComponentFrame(child: child),
        ),
    ],
  );
}

class WidgetbookHostComponentFrame extends StatelessWidget {
  const WidgetbookHostComponentFrame({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return WidgetbookHostDeviceFrame(
      child: WidgetbookHostShellScope(
        child: WidgetbookHostComponentScaffold(child: child),
      ),
    );
  }
}

class WidgetbookHostComponentScaffold extends StatelessWidget {
  const WidgetbookHostComponentScaffold({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Scaffold(
      backgroundColor: t.bg,
      body: ListView(
        padding: CatchInsets.pageBodyUnderHeader,
        children: [child],
      ),
    );
  }
}

class WidgetbookHostHomeSectionFrame extends StatelessWidget {
  const WidgetbookHostHomeSectionFrame({
    super.key,
    required this.child,
    this.clubEventStreams = const {},
  });

  final Widget child;
  final Map<String, Stream<List<Event>>> clubEventStreams;

  @override
  Widget build(BuildContext context) {
    final framedChild = Builder(
      builder: (context) {
        final t = CatchTokens.of(context);
        return Scaffold(
          backgroundColor: t.bg,
          body: ListView(
            padding: CatchInsets.pageBodyUnderHeader,
            children: [child],
          ),
        );
      },
    );

    return WidgetbookHostDeviceFrame(
      child: WidgetbookHostShellScope(
        clubEventStreams: clubEventStreams,
        child: framedChild,
      ),
    );
  }
}

class WidgetbookHostDeviceFrame extends StatelessWidget {
  const WidgetbookHostDeviceFrame({
    super.key,
    required this.child,
    this.height,
  });
  final Widget child;
  final double? height;
  @override
  Widget build(BuildContext context) =>
      WidgetbookViewportFrame.constrainedDevice(
        size: Size(
          390,
          height ?? WidgetbookPreviewLayout.paperScaffoldViewportHeight,
        ),
        child: child,
      );
}
