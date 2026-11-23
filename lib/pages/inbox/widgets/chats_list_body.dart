import 'package:catch_dating_app/pages/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/pages/inbox/widgets/chat_conversations_list.dart';
import 'package:flutter/material.dart';

class ChatsListBody extends StatelessWidget {
  const ChatsListBody({
    super.key,
    required this.viewModel,
    required this.onThreadSelected,
  });

  final ChatsListViewModel viewModel;
  final ChatThreadSelectedCallback onThreadSelected;

  @override
  Widget build(BuildContext context) {
    final threads = [...viewModel.newMatches, ...viewModel.conversations];

    return SliverMainAxisGroup(
      slivers: [
        if (threads.isNotEmpty)
          ChatConversationsList(
            matches: threads,
            onThreadSelected: onThreadSelected,
          ),
      ],
    );
  }
}
