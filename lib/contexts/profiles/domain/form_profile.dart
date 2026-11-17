import 'package:catch_platform/schema_contracts/generated/profile_schema_contracts.g.dart';
import 'package:meta/meta.dart';

@immutable
class FormProfileSummary {
  const FormProfileSummary({
    required this.responseId,
    required this.organizerId,
    required this.formTitle,
    required this.organizerName,
    required this.submittedAt,
    required this.claimedAt,
    required this.cardFieldCount,
  });

  /// One `participantFormProfileViews` row. Organizer names are not stored
  /// on the row; the caller names it from the public organizer lookup.
  factory FormProfileSummary.fromView(
    String responseId,
    Map<String, Object?> view, {
    String? organizerName,
  }) => FormProfileSummary(
    responseId: responseId,
    organizerId: view['organizerId']! as String,
    formTitle: view['formTitle']! as String,
    organizerName: organizerName,
    submittedAt: DateTime.fromMillisecondsSinceEpoch(
      view['submittedAtMillis']! as int,
    ),
    claimedAt: _optionalMillis(view['claimedAtMillis']),
    cardFieldCount: (view['selectedCardQuestionIds']! as List).length,
  );

  FormProfileSummary withOrganizerName(String? name) => FormProfileSummary(
    responseId: responseId,
    organizerId: organizerId,
    formTitle: formTitle,
    organizerName: name,
    submittedAt: submittedAt,
    claimedAt: claimedAt,
    cardFieldCount: cardFieldCount,
  );

  final String responseId;
  final String organizerId;
  final String formTitle;
  final String? organizerName;
  final DateTime submittedAt;
  final DateTime? claimedAt;
  final int cardFieldCount;
}

@immutable
class FormProfilePage {
  FormProfilePage({
    required Iterable<FormProfileSummary> items,
    required this.nextCursor,
  }) : items = List.unmodifiable(items);
  final List<FormProfileSummary> items;
  final String? nextCursor;

  /// Group by the stable organizer id, never by a possibly shared display name.
  /// Counts describe loaded submissions only; pagination may add more later.
  List<List<FormProfileSummary>> get organizerGroups {
    final grouped = <String, List<FormProfileSummary>>{};
    for (final item in items) {
      (grouped[item.organizerId] ??= []).add(item);
    }
    for (final rows in grouped.values) {
      rows.sort((a, b) {
        final date = b.submittedAt.compareTo(a.submittedAt);
        return date == 0 ? a.responseId.compareTo(b.responseId) : date;
      });
    }
    final groups = grouped.values.toList();
    groups.sort((a, b) {
      final name = (a.first.organizerName ?? '').compareTo(
        b.first.organizerName ?? '',
      );
      return name == 0
          ? a.first.organizerId.compareTo(b.first.organizerId)
          : name;
    });
    return List.unmodifiable(groups.map(List<FormProfileSummary>.unmodifiable));
  }
}

enum FormProfileDestination { catchProfile, organizerCard }

@immutable
class FormProfileField {
  FormProfileField({
    required this.questionId,
    required this.destination,
    required this.canonicalFieldId,
    required this.label,
    required this.kind,
    required Object? value,
    this.eventProfileEligible = false,
    Map<String, String> options = const {},
  }) : value = value is List
           ? List<String>.unmodifiable(value.cast<String>())
           : value,
       options = Map.unmodifiable(options);

  factory FormProfileField.fromView(Map<Object?, Object?> json) =>
      FormProfileField(
        questionId: json['questionId']! as String,
        destination: FormProfileDestination.values.byName(
          json['destination']! as String,
        ),
        canonicalFieldId: json['canonicalFieldId'] as String?,
        label: json['label']! as String,
        kind: json['kind']! as String,
        value: json['value'],
        eventProfileEligible: json['eventProfileEligible'] == true,
        options: {
          for (final option in json['options']! as List)
            (option as Map)['value']! as String: option['label']! as String,
        },
      );

  final String questionId;
  final FormProfileDestination destination;
  final String? canonicalFieldId;
  final String label;
  final String kind;
  final bool eventProfileEligible;
  final Object? value;
  final Map<String, String> options;

  bool get isVerifiedPhone => canonicalFieldId == 'phoneNumber';

  bool get isProfilePhoto =>
      destination == FormProfileDestination.catchProfile &&
      canonicalFieldId == 'profilePhoto' &&
      kind == 'file';

  /// Only catalog bindings can write core profile fields. A custom question's
  /// label is never used to infer a binding, even if it says "First name".
  SchemaPersonFieldDefinition? get definition {
    if (destination != FormProfileDestination.catchProfile) return null;
    for (final field in schemaPersonFieldCatalog) {
      if (field.id == canonicalFieldId) return field;
    }
    return null;
  }

  String answerText({
    required String yes,
    required String no,
    required String empty,
    required String attachment,
  }) => switch (value) {
    _ when kind == 'file' => attachment,
    null => empty,
    final bool answer => answer ? yes : no,
    final List<String> answers =>
      answers.map((v) => options[v] ?? v).join(', '),
    final String answer => options[answer] ?? answer,
    final num answer => answer.toString(),
    _ => throw const FormatException('Invalid form profile answer'),
  };
}

@immutable
class FormProfileReview {
  FormProfileReview({
    required this.responseId,
    required this.organizerId,
    required this.formTitle,
    required this.organizerName,
    required this.profileRevision,
    required this.intakeRevision,
    required this.termsVersion,
    required Iterable<FormProfileField> fields,
    required Iterable<String> selectedCardQuestionIds,
    required Map<String, Object?>? currentProfile,
    required this.currentLinkedinUrl,
    required this.cardRevision,
    required this.claimedAt,
  }) : fields = List.unmodifiable(fields),
       selectedCardQuestionIds = Set.unmodifiable(selectedCardQuestionIds),
       currentProfile = currentProfile == null
           ? null
           : Map.unmodifiable({
               for (final entry in currentProfile.entries)
                 entry.key: entry.value is List
                     ? List<Object?>.unmodifiable(entry.value! as List)
                     : entry.value,
             });

  /// The review from the guest's own read models: the
  /// `participantFormProfileViews` row, the profile revision and reviewed
  /// profile values from `users/{uid}`, and the intake revision and LinkedIn
  /// URL from `participantIntakeProfileViews` (none reads as revision 0).
  factory FormProfileReview.fromViews({
    required String responseId,
    required Map<String, Object?> view,
    required int profileRevision,
    required Map<String, Object?>? currentProfile,
    required Map<String, Object?>? intake,
    String? organizerName,
  }) => FormProfileReview(
    responseId: responseId,
    organizerId: view['organizerId']! as String,
    formTitle: view['formTitle']! as String,
    organizerName: organizerName,
    profileRevision: profileRevision,
    intakeRevision: intake?['intakeRevision'] as int? ?? 0,
    termsVersion: view['termsVersion']! as String,
    fields: (view['fields']! as List).map(
      (field) => FormProfileField.fromView(field as Map),
    ),
    selectedCardQuestionIds: (view['selectedCardQuestionIds']! as List)
        .cast<String>(),
    currentProfile: currentProfile,
    currentLinkedinUrl: intake?['linkedinUrl'] as String?,
    cardRevision: view['cardRevision']! as int,
    claimedAt: _optionalMillis(view['claimedAtMillis']),
  );

  FormProfileReview withOrganizerName(String? name) => FormProfileReview(
    responseId: responseId,
    organizerId: organizerId,
    formTitle: formTitle,
    organizerName: name,
    profileRevision: profileRevision,
    intakeRevision: intakeRevision,
    termsVersion: termsVersion,
    fields: fields,
    selectedCardQuestionIds: selectedCardQuestionIds,
    currentProfile: currentProfile,
    currentLinkedinUrl: currentLinkedinUrl,
    cardRevision: cardRevision,
    claimedAt: claimedAt,
  );

  final String responseId;
  final String organizerId;
  final String formTitle;
  final String? organizerName;
  final int profileRevision;
  final int intakeRevision;
  final String termsVersion;
  final List<FormProfileField> fields;
  final Set<String> selectedCardQuestionIds;
  final Map<String, Object?>? currentProfile;
  final String? currentLinkedinUrl;
  final int cardRevision;
  final DateTime? claimedAt;
}

DateTime? _optionalMillis(Object? value) => switch (value) {
  final int millis => DateTime.fromMillisecondsSinceEpoch(millis),
  null => null,
  _ => throw const FormatException('Invalid form profile date'),
};
