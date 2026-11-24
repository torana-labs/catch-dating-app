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
// public-api: Host composes verified endpoints from the shared inbox projection.
// public-api: Event detail composes the admission-gated chat entry owned by Chats.
