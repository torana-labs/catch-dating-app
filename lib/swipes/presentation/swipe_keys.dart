import 'package:flutter/foundation.dart';

abstract final class SwipeKeys {
  static const passButton = ValueKey('catches.profile.pass');
  static const applyFiltersButton = ValueKey('swipes.filters.apply');
  static const resetFiltersButton = ValueKey('swipes.filters.reset');
  static const ageRangeSlider = ValueKey('swipes.filters.age_range');
  static const afterEventGroupChat = ValueKey('after_event.group_chat');
  static const afterEventNext = ValueKey('after_event.next_event');
  static const afterEventFollowOrganizer = ValueKey('after_event.follow');
  static const afterEventOrganizer = ValueKey('after_event.organizer');

  static ValueKey<String> genderFilterChip(String genderName) =>
      ValueKey('swipes.filters.gender.$genderName');

  static ValueKey<String> afterEventPerson(String uid) =>
      ValueKey('after_event.person.$uid');

  static ValueKey<String> afterEventRatingStar(int rating) =>
      ValueKey('after_event.rating.$rating');
}
