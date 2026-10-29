import 'package:catch_dating_app/contexts/profiles/profiles.dart';

/// Typed response for the server-owned `fetchSwipeCandidates` callable.
final class FetchSwipeCandidatesCallableResponse {
  const FetchSwipeCandidatesCallableResponse({required this.profiles});

  factory FetchSwipeCandidatesCallableResponse.fromCallableData(Object? data) {
    return FetchSwipeCandidatesCallableResponse(
      profiles: publicProfilesFromCallableResponse(
        data,
        callableName: 'fetchSwipeCandidates',
      ),
    );
  }

  final List<PublicProfile> profiles;
}
