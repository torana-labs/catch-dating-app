import 'package:catch_dating_app/chats/presentation/widgets/chat_input.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  testWidgets(
    'uses canonical symmetric one-line geometry',
    (tester) async {
      final controller = TextEditingController();
      addTearDown(controller.dispose);

      await _pumpComposer(tester, controller: controller);

      final pillRect = tester.getRect(find.byKey(ChatInput.pillKey));
      final imageRect = tester.getRect(find.byKey(ChatInput.imageButtonKey));
      final sendRect = tester.getRect(find.byKey(ChatInput.sendButtonKey));
      final targetExtent = defaultTargetPlatform == TargetPlatform.iOS
          ? 44.0
          : 48.0;

      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is CatchDock && widget.variant == CatchDockVariant.utility,
        ),
        findsNothing,
      );
      expect(pillRect.left, CatchSpacing.screenPx);
      expect(pillRect.right, 390 - CatchSpacing.screenPx);
      expect(pillRect.height, targetExtent + 2 * CatchSpacing.s2);
      expect(imageRect.size, Size.square(targetExtent));
      expect(sendRect.size, Size.square(targetExtent));
      expect(imageRect.left - pillRect.left, CatchSpacing.s2);
      expect(imageRect.top - pillRect.top, CatchSpacing.s2);
      expect(pillRect.bottom - imageRect.bottom, CatchSpacing.s2);
      expect(pillRect.right - sendRect.right, CatchSpacing.s2);
      expect(sendRect.top - pillRect.top, CatchSpacing.s2);
      expect(pillRect.bottom - sendRect.bottom, CatchSpacing.s2);
      expect(imageRect.center.dy, sendRect.center.dy);
      expect(find.byTooltip('Send an image'), findsOneWidget);
      expect(find.byTooltip('Send message'), findsOneWidget);
      expect(find.text('Message...'), findsOneWidget);
    },
    variant: const TargetPlatformVariant({
      TargetPlatform.iOS,
      TargetPlatform.android,
    }),
  );

  testWidgets('derives sendability from the trimmed draft', (tester) async {
    final controller = TextEditingController();
    addTearDown(controller.dispose);
    var sends = 0;

    await _pumpComposer(tester, controller: controller, onSend: () => sends++);

    CatchIconAction sendButton() =>
        tester.widget(find.byKey(ChatInput.sendButtonKey));

    expect(sendButton().status, CatchIconActionStatus.disabled);
    await tester.tap(find.byKey(ChatInput.sendButtonKey));
    expect(sends, 0);

    await tester.enterText(find.byType(TextField), '   ');
    await tester.pump();
    expect(sendButton().status, CatchIconActionStatus.disabled);

    await tester.enterText(find.byType(TextField), 'Hello');
    await tester.pump();
    expect(sendButton().status, CatchIconActionStatus.enabled);
    await tester.tap(find.byKey(ChatInput.sendButtonKey));
    expect(sends, 1);

    controller.clear();
    await tester.pump();
    expect(sendButton().status, CatchIconActionStatus.disabled);
  });

  testWidgets('renders real focus chrome without changing geometry', (
    tester,
  ) async {
    final controller = TextEditingController(text: 'Draft');
    addTearDown(controller.dispose);

    await _pumpComposer(tester, controller: controller);
    final beforePill = tester.getRect(find.byKey(ChatInput.pillKey));
    final beforeImage = tester.getRect(find.byKey(ChatInput.imageButtonKey));
    final beforeSend = tester.getRect(find.byKey(ChatInput.sendButtonKey));
    expect(
      tester.widget<CatchControlSurface>(find.byKey(ChatInput.pillKey)).status,
      CatchControlSurfaceStatus.resting,
    );

    await tester.tap(find.byKey(ChatInput.fieldLaneKey));
    await pumpFeatureUi(tester);

    expect(
      tester.widget<CatchControlSurface>(find.byKey(ChatInput.pillKey)).status,
      CatchControlSurfaceStatus.focused,
    );
    expect(tester.getRect(find.byKey(ChatInput.pillKey)), beforePill);
    expect(tester.getRect(find.byKey(ChatInput.imageButtonKey)), beforeImage);
    expect(tester.getRect(find.byKey(ChatInput.sendButtonKey)), beforeSend);
  });

  testWidgets(
    'animates multiline growth and keeps actions bottom aligned',
    (tester) async {
      final controller = TextEditingController(text: 'One line');
      addTearDown(controller.dispose);

      await _pumpComposer(tester, controller: controller);
      final initialPill = tester.getRect(find.byKey(ChatInput.pillKey));

      controller.text = 'Line one\nLine two\nLine three\nLine four';
      await tester.pump();
      final animationStart = tester.getRect(find.byKey(ChatInput.pillKey));
      await pumpFeatureUiFor(tester, const Duration(milliseconds: 60));
      final animationMiddle = tester.getRect(find.byKey(ChatInput.pillKey));
      await pumpFeatureUi(tester);
      final finalPill = tester.getRect(find.byKey(ChatInput.pillKey));
      final imageRect = tester.getRect(find.byKey(ChatInput.imageButtonKey));
      final sendRect = tester.getRect(find.byKey(ChatInput.sendButtonKey));
      final targetExtent = defaultTargetPlatform == TargetPlatform.iOS
          ? 44.0
          : 48.0;

      expect(animationStart.height, initialPill.height);
      expect(animationMiddle.height, greaterThan(initialPill.height));
      expect(animationMiddle.height, lessThan(finalPill.height));
      expect(finalPill.height, greaterThan(initialPill.height));
      expect(finalPill.bottom - imageRect.bottom, CatchSpacing.s2);
      expect(finalPill.bottom - sendRect.bottom, CatchSpacing.s2);
      expect(imageRect.size, Size.square(targetExtent));
      expect(sendRect.size, Size.square(targetExtent));
    },
    variant: const TargetPlatformVariant({
      TargetPlatform.iOS,
      TargetPlatform.android,
    }),
  );

  testWidgets('keeps focus for keyboard and internal action taps', (
    tester,
  ) async {
    final controller = TextEditingController(text: 'Ready');
    addTearDown(controller.dispose);
    var sends = 0;
    var images = 0;

    await _pumpComposer(
      tester,
      controller: controller,
      onSend: () => sends++,
      onSendImage: () => images++,
    );

    await tester.tap(find.byType(TextField));
    await tester.pump();
    final textField = tester.widget<TextField>(find.byType(TextField));
    expect(textField.focusNode?.hasFocus, isTrue);

    await tester.tap(find.byKey(ChatInput.imageButtonKey));
    await tester.pump();
    expect(images, 1);
    expect(textField.focusNode?.hasFocus, isTrue);

    await tester.tap(find.byKey(ChatInput.sendButtonKey));
    await tester.pump();
    expect(sends, 1);
    expect(textField.focusNode?.hasFocus, isTrue);

    await tester.testTextInput.receiveAction(TextInputAction.send);
    await tester.pump();
    expect(sends, 2);
    expect(textField.focusNode?.hasFocus, isTrue);
  });

  testWidgets('pending actions leave the editor and peer action usable', (
    tester,
  ) async {
    final controller = TextEditingController(text: 'Draft');
    addTearDown(controller.dispose);

    await _pumpComposer(tester, controller: controller, sending: true);

    var field = tester.widget<TextField>(find.byType(TextField));
    var image = tester.widget<CatchIconAction>(
      find.byKey(ChatInput.imageButtonKey),
    );
    var send = tester.widget<CatchIconAction>(
      find.byKey(ChatInput.sendButtonKey),
    );
    final sendingRects = _actionRects(tester);
    expect(field.enabled, isTrue);
    expect(image.onPressed, isNotNull);
    expect(image.status, CatchIconActionStatus.enabled);
    expect(send.onPressed, isNull);
    expect(send.status, CatchIconActionStatus.enabled);
    expect(find.byTooltip('Sending message'), findsOneWidget);

    await _pumpComposer(tester, controller: controller, sendingImage: true);

    field = tester.widget<TextField>(find.byType(TextField));
    image = tester.widget<CatchIconAction>(
      find.byKey(ChatInput.imageButtonKey),
    );
    send = tester.widget<CatchIconAction>(find.byKey(ChatInput.sendButtonKey));
    expect(field.enabled, isTrue);
    expect(image.onPressed, isNull);
    expect(image.status, CatchIconActionStatus.enabled);
    expect(send.onPressed, isNotNull);
    expect(send.status, CatchIconActionStatus.enabled);
    expect(find.byTooltip('Uploading image'), findsOneWidget);
    expect(_actionRects(tester), sendingRects);
  });

  testWidgets('exposes one editable node and one node per action', (
    tester,
  ) async {
    final controller = TextEditingController();
    addTearDown(controller.dispose);
    final semantics = tester.ensureSemantics();

    await _pumpComposer(tester, controller: controller);

    final editableNode = tester.getSemantics(find.byType(TextField));
    expect(editableNode.flagsCollection.isTextField, isTrue);
    expect(editableNode.label, 'Message');
    expect(find.bySemanticsLabel('Message'), findsOne);
    expect(find.bySemanticsLabel('Send an image'), findsOne);
    expect(find.bySemanticsLabel('Send message'), findsOne);
    semantics.dispose();
  });
}

Future<void> _pumpComposer(
  WidgetTester tester, {
  required TextEditingController controller,
  bool sending = false,
  bool sendingImage = false,
  VoidCallback? onSend,
  VoidCallback? onSendImage,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 844);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);

  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      home: MediaQuery(
        data: const MediaQueryData(
          size: Size(390, 844),
          padding: EdgeInsets.only(bottom: 34),
          viewPadding: EdgeInsets.only(bottom: 34),
        ),
        child: Scaffold(
          body: Column(
            children: [
              const Spacer(),
              ChatInput(
                controller: controller,
                sending: sending,
                sendingImage: sendingImage,
                onSend: onSend ?? () {},
                onSendImage: onSendImage ?? () {},
              ),
            ],
          ),
        ),
      ),
    ),
  );
  await tester.pump();
  await pumpFeatureUiFor(tester, const Duration(milliseconds: 200));
}

(Rect, Rect) _actionRects(WidgetTester tester) => (
  tester.getRect(find.byKey(ChatInput.imageButtonKey)),
  tester.getRect(find.byKey(ChatInput.sendButtonKey)),
);
