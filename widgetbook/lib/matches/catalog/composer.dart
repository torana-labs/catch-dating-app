import 'package:catch_dating_app/pages/chat/widgets/chat_input.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class WidgetbookMatchesComposerStatesPreview extends StatefulWidget {
  const WidgetbookMatchesComposerStatesPreview({super.key});

  @override
  State<WidgetbookMatchesComposerStatesPreview> createState() =>
      _ComposerStatesPreviewState();
}

class _ComposerStatesPreviewState
    extends State<WidgetbookMatchesComposerStatesPreview> {
  late final TextEditingController _readyController;
  late final TextEditingController _sendingController;
  late final TextEditingController _imagePendingController;
  late final TextEditingController _disabledController;

  @override
  void initState() {
    super.initState();
    _readyController = TextEditingController(text: 'That last loop was fun.');
    _sendingController = TextEditingController(text: 'Sending this now...');
    _imagePendingController = TextEditingController(
      text: 'Uploading a photo...',
    );
    _disabledController = TextEditingController();
  }

  @override
  void dispose() {
    _readyController.dispose();
    _sendingController.dispose();
    _imagePendingController.dispose();
    _disabledController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(),
            ChatInput(
              controller: _readyController,
              sending: false,
              onSend: () {},
              onSendImage: () {},
            ),
            gapH12,
            ChatInput(
              controller: _sendingController,
              sending: true,
              onSend: () {},
              onSendImage: () {},
            ),
            gapH12,
            ChatInput(
              controller: _imagePendingController,
              sending: false,
              sendingImage: true,
              onSend: () {},
              onSendImage: () {},
            ),
            gapH12,
            ChatInput(
              controller: _disabledController,
              sending: false,
              disabledReason: 'This chat is closed.',
              onSend: null,
              onSendImage: null,
            ),
          ],
        ),
      ),
    );
  }
}
