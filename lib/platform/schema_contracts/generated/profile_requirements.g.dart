// GENERATED from contracts/catalogs/profile_requirements.json. Do not edit.

const unrestrictedEventMinimumAge = 0;
const openEndedEventMaximumAge = 99;
const profileRequiredFields = <String, List<String>>{
  'account': <String>['name', 'phoneNumber'],
  'organizerFollow': <String>['name', 'phoneNumber'],
  'eventBooking': <String>['name', 'phoneNumber'],
  'socialIdentity': <String>[
    'name',
    'phoneNumber',
    'dateOfBirth',
    'gender',
    'interestedInGenders',
  ],
  'socialDiscovery': <String>[
    'name',
    'phoneNumber',
    'dateOfBirth',
    'gender',
    'interestedInGenders',
    'profilePhotos',
    'profilePrompts',
    'profileComplete',
  ],
};
const eventProfileRequirements = <String, List<String>>{
  'ageRestricted': <String>['dateOfBirth'],
  'cohortRestricted': <String>['gender', 'interestedInGenders'],
};
const optionalAccountFields = <String>['dateOfBirth'];

List<String> missingProfileFields(
  String capability,
  bool Function(String field) hasField, {
  Iterable<String> eventRequirements = const [],
}) {
  final required = profileRequiredFields[capability];
  if (required == null) throw ArgumentError.value(capability, 'capability');
  final fields = <String>{...required};
  if (capability == 'eventBooking') {
    for (final requirement in eventRequirements) {
      final extra = eventProfileRequirements[requirement];
      if (extra == null) throw ArgumentError.value(requirement, 'requirement');
      fields.addAll(extra);
    }
  }
  return fields.where((field) => !hasField(field)).toList(growable: false);
}
