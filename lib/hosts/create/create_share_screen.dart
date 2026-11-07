import 'package:catch_dating_app/hosts/create/create_copy.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_share_body.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// After publishing: the tool top bar with Done, and the share body.
class CreateShareScreen extends StatelessWidget {
  const CreateShareScreen({
    super.key,
    required this.state,
    required this.handlers,
    required this.link,
  });

  final CreateFlowState state;
  final CreateHandlers handlers;
  final String link;

  @override
  Widget build(BuildContext context) => CatchScreen(
    key: const ValueKey<String>('create-step-share'),
    topBar: CatchTopBar(
      variant: CatchTopBarVariant.tool,
      action: CatchTopBarAction(
        label: CreateCopy.done,
        onPressed: handlers.onDone,
      ),
    ),
    body: CatchPageBody(
      child: CreateShareBody(
        state: state,
        link: link,
        onCopyLink: handlers.onCopyLink,
        onPrint: handlers.onPrint,
        onShareStory: handlers.onShareStory,
        onShareWhatsApp: handlers.onShareWhatsApp,
      ),
    ),
  );
}
