/// Chats feature barrel file.
///
/// Export the public surface: domain models, repository interface, and
/// top-level screens and widgets that external features and Widgetbook
/// depend on.
library;

export 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart'
    show ConversationRepository;
export 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
export 'package:catch_dating_app/contexts/messaging/domain/suvbot_action_item.dart';
// public-api: Host shares Chat authorization and attachment commands.
export 'presentation/chat_controller.dart' show chatControllerProvider;
export 'presentation/chat_screen.dart'; // public-api: route entry point exposed to app routing
// public-api: Host composes verified endpoints from the shared inbox projection.
export 'presentation/inbox/chats_list_view_model.dart'
    show
        ChatThreadPreview,
        ChatsListViewModel,
        chatsListViewModelProvider,
        chatThreadPreviewForMatch;
export 'presentation/widgets/chat_input.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/widgets/chat_message_list.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/widgets/chat_share_card.dart'; // public-api: shared presentation component used outside this feature
// public-api: Event detail composes the admission-gated chat entry owned by Chats.
export 'presentation/widgets/event_chat_entry_section.dart'
    show EventChatEntrySection;
export 'presentation/widgets/message_bubble.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/widgets/suvbot_dock.dart'; // public-api: shared presentation component used outside this feature
