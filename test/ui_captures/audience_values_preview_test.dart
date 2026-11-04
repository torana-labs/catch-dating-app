import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_view.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import 'catalog/screen_capture_catalog.dart';
import 'support/capture_device.dart';
import 'support/capture_pump.dart';

const _output = String.fromEnvironment(
  'CAPTURE_OUTPUT_DIR',
  defaultValue: 'artifacts/ui-captures/audience-values-preview',
);

void main() {
  testWidgets(
    'captures Audience using selected platform typography',
    (tester) async {
      final semantics = tester.ensureSemantics();
      final measurements = <Map<String, Object>>[];
      final textScale = double.parse(
        const String.fromEnvironment('CAPTURE_TEXT_SCALE', defaultValue: '1'),
      );
      try {
        final entry = findScreenCapture('host_customers_populated');
        final artifacts = await captureCatchWidget(
          tester,
          id: entry.id,
          builder: entry.builder,
          providerOverrides: entry.providerOverrides,
          device: CaptureDevice.iphone17Pro,
          textScale: textScale,
          pixelRatio: 2,
          outputDirectory: Directory(_output),
          drive: (tester) async {
            Finder summaryChoice(String name) => find.byWidgetPredicate(
              (widget) =>
                  widget is CatchChoiceButton<HostCustomerFilter> &&
                  widget.option.value.name == name,
            );

            Map<String, double> rect(Finder finder) {
              final bounds = tester.getRect(finder);
              return {
                'x': bounds.left,
                'y': bounds.top,
                'width': bounds.width,
                'height': bounds.height,
              };
            }

            final personRows = find.byWidgetPredicate(
              (widget) =>
                  widget is CatchField &&
                  widget.key is ValueKey<String> &&
                  (widget.key! as ValueKey<String>).value.startsWith(
                    'host-customer-',
                  ),
            );
            final rowContext = tester.element(personRows.first);
            final tokens = CatchTokens.of(rowContext);
            for (final (foreground, background) in [
              (tokens.deepPink, tokens.tintPink),
              (tokens.deepMint, tokens.tintMint),
              (tokens.deepYellow, tokens.tintYellow),
            ]) {
              final a = foreground.computeLuminance();
              final b = background.computeLuminance();
              final contrast = (math.max(a, b) + .05) / (math.min(a, b) + .05);
              expect(
                contrast,
                greaterThanOrEqualTo(4.5),
                reason: 'Small status labels require readable contrast',
              );
            }

            final rowMetrics = <Map<String, Object>>[];
            for (final element in personRows.evaluate()) {
              final finder = find.byWidget(element.widget);
              final title = tester
                  .widget<Text>(
                    find
                        .descendant(of: finder, matching: find.byType(Text))
                        .first,
                  )
                  .data!;
              final bounds = tester.getRect(finder);
              expect(bounds.left, 0);
              for (final paragraph
                  in find
                      .descendant(of: finder, matching: find.byType(RichText))
                      .evaluate()) {
                expect(
                  (paragraph.renderObject! as RenderParagraph)
                      .didExceedMaxLines,
                  isFalse,
                  reason: 'Identity, activity and status remain readable',
                );
              }
              rowMetrics.add({
                'name': title,
                'row': rect(finder),
                'avatar': rect(
                  find.descendant(
                    of: finder,
                    matching: find.byType(CatchAvatar),
                  ),
                ),
                'nameLine': rect(
                  find.descendant(of: finder, matching: find.text(title)),
                ),
              });
            }
            final rail = tester.getRect(find.byType(HostAudienceTabRail));
            final tabLabel = tester.getRect(
              find.descendant(
                of: find.byType(HostAudienceTabRail),
                matching: find.text('People'),
              ),
            );
            expect(tabLabel.top, greaterThanOrEqualTo(rail.top));
            expect(
              tabLabel.bottom,
              lessThanOrEqualTo(rail.bottom),
              reason: 'The pinned rail must contain the enlarged label',
            );
            measurements.add({
              'textScale': textScale,
              'title': rect(
                find.descendant(
                  of: find.byType(CatchLegacyTopBar),
                  matching: find.text('Audience'),
                ),
              ),
              'tabRail': rect(find.byType(HostAudienceTabRail)),
              'groups': {
                for (final filter in ['all', 'repeat', 'newToOrganizer'])
                  filter: rect(summaryChoice(filter)),
              },
              'sort': rect(find.byKey(const ValueKey('host-customers-sort'))),
              'filters': rect(
                find.byKey(const ValueKey('host-customers-filters')),
              ),
              'rows': rowMetrics,
            });
            for (final filter in ['all', 'repeat', 'newToOrganizer']) {
              expect(
                tester.getSize(summaryChoice(filter)).height,
                greaterThanOrEqualTo(
                  CatchPlatformTokens.minimumInteractiveExtent,
                ),
              );
              final node = tester.getSemantics(summaryChoice(filter));
              expect(
                node.getSemanticsData().hasAction(SemanticsAction.tap),
                isTrue,
                reason: '$filter must expose its selection action',
              );
            }
          },
        );
        expect(artifacts, hasLength(2));
        expect(tester.takeException(), isNull);
        await tester.runAsync(() async {
          await File('$_output/geometry.json').writeAsString(
            const JsonEncoder.withIndent('  ').convert(measurements),
          );
        });
      } finally {
        semantics.dispose();
      }
    },
    variant: TargetPlatformVariant.only(
      const String.fromEnvironment('CAPTURE_PLATFORM') == 'android'
          ? TargetPlatform.android
          : TargetPlatform.iOS,
    ),
  );
}
