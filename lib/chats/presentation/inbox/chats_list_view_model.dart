import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profiles_lookup.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/l10n/generated/structured_domain_copy.g.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'chats_list_view_model.freezed.dart';
part 'chats_list_view_model.g.dart';

@freezed
abstract class ChatsListViewModel with _$ChatsListViewModel {
  const ChatsListViewModel._();

  const factory ChatsListViewModel({
    required List<ChatThreadPreview> newMatches,
    required List<ChatThreadPreview> conversations,
    required int totalThreadCount,
    @Default(false) bool sourceWindowMayHaveMore,
  }) = _ChatsListViewModel;

  bool get isEmpty => newMatches.isEmpty && conversations.isEmpty;
  int get visibleThreadCount => newMatches.length + conversations.length;

  ChatsListViewModel filterByQuery(String query) {
    final normalized = query.trim().toLowerCase();
    if (normalized.isEmpty) return this;
    bool matches(ChatThreadPreview preview) =>
        preview.displayName.toLowerCase().contains(normalized);
    return copyWith(
      newMatches: List.unmodifiable(newMatches.where(matches)),
      conversations: List.unmodifiable(conversations.where(matches)),
    );
  }
}

class ChatThreadPreview {
  const ChatThreadPreview({
    required this.match,
    required this.matchId,
    required this.otherUid,
    required this.displayName,
    required this.photoUrl,
    required this.previewText,
    required this.timestamp,
    required this.unreadCount,
    required this.hasConversation,
    required this.eventIds,
  });

  final Match match;
  final String matchId;
  final String otherUid;
  final String displayName;
  final String? photoUrl;
  final String previewText;
  final DateTime timestamp;
  final int unreadCount;
  final bool hasConversation;
  final List<String> eventIds;

  String? get latestEventId => eventIds.isEmpty ? null : eventIds.last;
}

// keepalive: preserve inbox search text across tab switches and route re-entry.
@Riverpod(keepAlive: true)
class ChatSearchQuery extends _$ChatSearchQuery {
  @override
  String build() => '';

  void setQuery(String query) {
    final normalizedQuery = query.trimLeft();
    if (state != normalizedQuery) {
      state = normalizedQuery;
    }
  }

  void clear() => state = '';
}

@riverpod
AsyncValue<ChatsListViewModel> chatsListViewModel(Ref ref) {
  final uidAsync = ref.watch(uidProvider);
  final String? uid;
  switch (uidAsync) {
    case AsyncData(:final value):
      uid = value;
    case AsyncError(:final error, :final stackTrace):
      return AsyncError<ChatsListViewModel>(error, stackTrace);
    default:
      return const AsyncLoading();
  }
  if (uid == null) return const AsyncLoading();
  final currentUid = uid;

  final matchesAsync = ref.watch(watchMatchesForUserProvider(currentUid));
  return matchesAsync.whenData((matches) {
    final roleMatches = AppConfig.appRole.isHost
        ? matches.where((match) => match.isOrganizerHostInquiry)
        : matches;
    final displayMatches = AppConfig.appRole.isHost
        ? roleMatches.toList(growable: false)
        : collapseMatchesByOtherUser(
            roleMatches.toList(growable: false),
            currentUid,
          );
    final hostInquiryOrganizerIds = {
      for (final match in displayMatches)
        if (match.isOrganizerHostInquiry && match.organizerId != null)
          match.organizerId!,
    };
    final organizersState = hostInquiryOrganizerIds.isEmpty
        ? null
        : catchAsyncStateFromAsyncValue(
            ref.watch(
              watchOrganizersForMessagingByIdsProvider(
                OrganizersByIdQuery(hostInquiryOrganizerIds),
              ),
            ),
          );
    final organizersById = hostInquiryOrganizerIds.isEmpty
        ? const <String, Organizer>{}
        : {
            for (final organizer
                in organizersState?.value ?? const <Organizer>[])
              organizer.id: organizer,
          };
    final publicProfileUids = <String>{};
    for (final match in displayMatches) {
      final otherUid = match.otherId(currentUid);
      final organizer =
          match.isOrganizerHostInquiry && match.organizerId != null
          ? organizersById[match.organizerId!]
          : null;
      final hostProfile = _hostProfileFor(organizer, otherUid);
      final otherParticipantIsHost = hostProfile != null;
      final shouldReadPublicProfile =
          !match.isOrganizerHostInquiry ||
          (organizer != null && !otherParticipantIsHost);
      if (shouldReadPublicProfile) publicProfileUids.add(otherUid);
    }
    final profilesState = publicProfileUids.isEmpty
        ? null
        : catchAsyncStateFromAsyncValue(
            ref.watch(
              publicProfilesByIdsProvider(
                PublicProfilesQuery(publicProfileUids),
              ),
            ),
          );
    final profilesByUid = publicProfileUids.isEmpty
        ? const <String, PublicProfile>{}
        : profilesState?.value ?? const <String, PublicProfile>{};
    final previews = displayMatches
        .map(
          (match) => chatThreadPreviewForMatch(
            match,
            currentUid,
            organizersById: organizersById,
            profilesByUid: profilesByUid,
          ),
        )
        .toList();

    final newMatches = <ChatThreadPreview>[];
    final conversations = <ChatThreadPreview>[];

    for (final preview in previews) {
      if (preview.hasConversation) {
        conversations.add(preview);
      } else {
        newMatches.add(preview);
      }
    }

    newMatches.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    conversations.sort((a, b) => b.timestamp.compareTo(a.timestamp));

    return ChatsListViewModel(
      newMatches: List.unmodifiable(newMatches),
      conversations: List.unmodifiable(conversations),
      totalThreadCount: displayMatches.length,
      sourceWindowMayHaveMore: matches.length >= ReadLimitPolicy.historyPage,
    );
  });
}

ChatThreadPreview chatThreadPreviewForMatch(
  Match match,
  String uid, {
  required Map<String, Organizer> organizersById,
  required Map<String, PublicProfile> profilesByUid,
  bool isHostViewer = false,
}) {
  final otherUid = match.otherId(uid);
  final organizer = match.isOrganizerHostInquiry && match.organizerId != null
      ? organizersById[match.organizerId!]
      : null;
  final hostProfile = _hostProfileFor(organizer, otherUid);
  final otherParticipantIsHost = hostProfile != null;
  final shouldReadPublicProfile =
      isHostViewer ||
      !match.isOrganizerHostInquiry ||
      (organizer != null && !otherParticipantIsHost);
  final profile = shouldReadPublicProfile ? profilesByUid[otherUid] : null;
  final displayName =
      hostProfile?.displayName ??
      profile?.name ??
      (match.isOrganizerHostInquiry
          ? StructuredDomainCopy.chatHostConversationTitle
          : StructuredDomainCopy.chatUnknownDisplayName);
  final photoUrl = hostProfile?.avatarUrl ?? profile?.primaryPhotoThumbnailUrl;
  final hasConversation = match.lastMessagePreview != null;
  final String previewText;
  if (!hasConversation) {
    previewText = match.isOrganizerHostInquiry
        ? 'Ask the host'
        : match.isCrossPathsEventPlan
        ? StructuredDomainCopy.chatCrossPathsEventPlanReady
        : 'You matched!';
  } else if (match.lastMessageSenderId == uid) {
    previewText = 'You: ${match.lastMessagePreview}';
  } else {
    previewText = match.lastMessagePreview!;
  }

  return ChatThreadPreview(
    match: match,
    matchId: match.id,
    otherUid: otherUid,
    displayName: displayName,
    photoUrl: photoUrl,
    previewText: previewText,
    timestamp: match.lastMessageAt ?? match.createdAt,
    unreadCount: match.unreadConversationCountFor(uid),
    hasConversation: hasConversation,
    eventIds: match.eventIds,
  );
}

OrganizerHostProfile? _hostProfileFor(Organizer? organizer, String uid) {
  if (organizer == null) return null;
  for (final host in organizer.displayHostProfiles) {
    if (host.uid == uid) return host;
  }
  return null;
}
