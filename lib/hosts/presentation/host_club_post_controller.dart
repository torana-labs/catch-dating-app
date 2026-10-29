import 'dart:math';

import 'package:catch_dating_app/contexts/organizers/data/club_callable_responses.dart';
import 'package:catch_dating_app/contexts/organizers/data/club_posts_repository.dart';
import 'package:catch_dating_app/core/analytics/app_analytics.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_club_post_controller.g.dart';

@riverpod
HostClubPostController hostClubPostController(Ref ref) =>
    HostClubPostController(
      ref.watch(clubPostsRepositoryProvider),
      ref.watch(appAnalyticsProvider),
    );

/// Owns the create-post operation and its analytics side effect.
class HostClubPostController {
  const HostClubPostController(this._postsRepository, this._analytics);

  final ClubPostsRepository _postsRepository;
  final AppAnalytics _analytics;

  static final Random _secureRandom = Random.secure();

  static String generateRequestId() {
    final timestamp = DateTime.now().microsecondsSinceEpoch.toRadixString(36);
    final entropy = List.generate(
      3,
      (_) => _secureRandom.nextInt(1 << 32).toRadixString(36),
    ).join();
    return 'post-$timestamp-$entropy';
  }

  Future<CreateClubPostCallableResponse> createPost({
    required String clubId,
    required String requestId,
    required String text,
  }) async {
    final response = await _postsRepository.createPost(
      clubId: clubId,
      requestId: requestId,
      text: text,
    );
    _analytics.logEvent(
      AnalyticsEvents.clubPostCreated,
      parameters: {AnalyticsParameters.clubId: clubId},
    );
    return response;
  }
}
