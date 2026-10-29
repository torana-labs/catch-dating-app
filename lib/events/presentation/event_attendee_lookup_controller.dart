import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/events/presentation/event_attendee_lookup.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_attendee_lookup_controller.g.dart';

@riverpod
EventAttendeeLookup eventAttendeeLookup(Ref ref) =>
    EventAttendeeLookup(ref.watch(publicProfileRepositoryProvider));
