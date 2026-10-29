import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';

/// Batches public attendee-profile reads outside the widget rendering layer.
class EventAttendeeLookup {
  const EventAttendeeLookup(this._publicProfiles);

  final PublicProfileRepository _publicProfiles;

  Future<List<PublicProfile>> fetchProfiles(List<String> uids) =>
      _publicProfiles.fetchPublicProfiles(uids);
}
