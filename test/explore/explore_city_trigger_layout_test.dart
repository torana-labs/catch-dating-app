import 'package:catch_dating_app/explore/presentation/explore_chrome_state.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_city_picker.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_header.dart';
import 'package:catch_dating_app/kernel/city_data.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  for (final width in [320.0, 390.0]) {
    for (final scale in [1.0, 2.0]) {
      for (final label in ['Hyderabad', 'Thiruvananthapuram']) {
        testWidgets(
          'city header contains $label at $width / $scale',
          (tester) async {
            tester.view.devicePixelRatio = 1;
            tester.view.physicalSize = Size(width, 844);
            addTearDown(tester.view.resetDevicePixelRatio);
            addTearDown(tester.view.resetPhysicalSize);
            final city = CityData(
              name: 'fixture-city',
              label: label,
              latitude: 0,
              longitude: 0,
            );
            await tester.pumpWidget(
              MaterialApp(
                theme: AppTheme.light,
                home: MediaQuery(
                  data: MediaQueryData(textScaler: TextScaler.linear(scale)),
                  child: Scaffold(
                    body: ExploreDiscoveryCoverHeader(
                      cityPickerState: ExploreCityPickerState.from(
                        selectedCity: city,
                        cities: [city],
                        cityListLoading: false,
                        cityListError: null,
                      ),
                      onCitySelected: (_) {},
                    ),
                  ),
                ),
              ),
            );
            await tester.pump();
            expect(tester.takeException(), isNull);
            expect(find.byTooltip('Choose city: $label'), findsOneWidget);
            expect(
              find.bySemanticsLabel(RegExp(RegExp.escape(label))),
              findsWidgets,
            );
            expect(find.byType(FittedBox), findsNothing);
            final labelRect = tester.getRect(find.text(label));
            final paragraph = tester.renderObject<RenderParagraph>(
              find.text(label),
            );
            for (final box in paragraph.getBoxesForSelection(
              TextSelection(baseOffset: 0, extentOffset: label.length),
            )) {
              expect(box.left, greaterThanOrEqualTo(0));
              expect(box.right, lessThanOrEqualTo(paragraph.size.width));
              expect(
                box.bottom,
                lessThanOrEqualTo(paragraph.size.height),
                reason:
                    'Every city-name line must paint inside the label lane.',
              );
            }
            final triggerRect = tester.getRect(find.byType(ExploreCityButton));
            final headerRect = tester.getRect(find.byType(CatchTopBar));
            expect(labelRect.left, greaterThanOrEqualTo(triggerRect.left));
            expect(labelRect.right, lessThanOrEqualTo(triggerRect.right));
            expect(labelRect.top, greaterThanOrEqualTo(triggerRect.top));
            expect(labelRect.bottom, lessThanOrEqualTo(triggerRect.bottom));
            expect(triggerRect.bottom, lessThanOrEqualTo(headerRect.bottom));
            expect(
              find.byTooltip('Search events or organizers').hitTestable(),
              findsOneWidget,
            );
          },
          variant: const TargetPlatformVariant({
            TargetPlatform.iOS,
            TargetPlatform.android,
          }),
        );
      }
    }
  }
}
