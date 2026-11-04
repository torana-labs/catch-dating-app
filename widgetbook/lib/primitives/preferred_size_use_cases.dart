import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Direct and nested scaled header reservation',
  type: CatchScaledPreferredSize,
  path: '[Core patterns]/Header sizing',
)
Widget scaledHeaderReservationStates(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Scaled header reservation',
      catalogId: 'catch.screen_body',
      children: [
        for (final nested in [false, true]) ...[
          Text(
            nested ? 'Top bar with rail' : 'Rail as header',
            style: CatchTextStyles.bodyM(context),
          ),
          WidgetbookViewportFrame.device(
            size: const Size(360, 300),
            child: Builder(
              builder: (context) {
                final rail = CatchPageTabBar<String>(
                  selected: 'people',
                  options: const [
                    CatchOption(value: 'people', label: 'People'),
                    CatchOption(value: 'forms', label: 'Forms'),
                  ],
                  onChanged: (_) {},
                );
                final CatchScaledPreferredSize header = nested
                    ? CatchLegacyTopBar.route(
                        title: 'Audience',
                        navigation: const CatchTopBarNavigation(
                          mode: CatchTopBarNavigationMode.none,
                        ),
                        footer: rail,
                      )
                    : rail;
                return CatchScaffold.workspace(
                  title: header,
                  body: Align(
                    alignment: Alignment.topCenter,
                    child: ColoredBox(
                      color: CatchTokens.of(context).primarySoft,
                      child: SizedBox(
                        width: double.infinity,
                        child: Padding(
                          padding: const EdgeInsets.all(CatchSpacing.s4),
                          child: Text(
                            'Body starts here',
                            style: CatchTextStyles.bodyM(context),
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ],
    );
