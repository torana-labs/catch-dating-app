import 'package:catch_dating_app/pages/frame/consumer_bootstrap.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/phone_preview.dart';

@widgetbook.UseCase(
  name: 'Consumer cold-start states',
  type: CatchConsumerBootScreen,
  path: '[P1 product surfaces]/Onboarding/Pages',
)
Widget consumerColdStartStates(BuildContext context) {
  return WidgetbookWrapCatalogFrame(
    title: 'CatchConsumerBootScreen',
    children: const [
      WidgetbookPhoneStateCard(
        label: 'animated cold start',
        child: WidgetbookMaterialPhoneFrame(
          child: CatchConsumerBootScreen(
            onFirstFlutterFrameReady: widgetbookNoop,
            onAnimationComplete: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPhoneStateCard(
        label: 'landed / reduced motion',
        child: WidgetbookMaterialPhoneFrame(
          child: CatchConsumerBootScreen(
            playIntro: false,
            onFirstFlutterFrameReady: widgetbookNoop,
            onAnimationComplete: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Consumer bootstrap lifecycle',
  type: CatchConsumerBootstrap,
  path: '[P1 product surfaces]/Onboarding/Pages',
)
Widget consumerBootstrapLifecycle(BuildContext context) {
  return consumerColdStartStates(context);
}
