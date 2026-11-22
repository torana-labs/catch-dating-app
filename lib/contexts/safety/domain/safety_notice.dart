import 'package:catch_platform/firebase/firestore_converters.dart';

/// What a safety notice says happened.
enum SafetyNoticeKind {
  warning,
  restriction,
  suspension,
  ban,
  lifted,
  appealDecision,
  reportReceived,
  reportHandled,
  unknown,
}

/// A message from Catch to one account about its standing or a report it
/// made, read from `accountSafetyNotices/{uid}/items`.
class SafetyNotice {
  const SafetyNotice({
    required this.id,
    required this.kind,
    required this.title,
    required this.body,
    required this.actionId,
    required this.appealable,
    required this.createdAt,
    required this.readAt,
  });

  final String id;
  final SafetyNoticeKind kind;
  final String title;
  final String body;

  /// The account action this notice is about; null for report notices.
  final String? actionId;
  final bool appealable;
  final DateTime? createdAt;
  final DateTime? readAt;

  /// Whether the account can appeal the decision from this notice.
  bool get canAppeal => appealable && actionId != null;

  /// Reads a stored notice, or null when it has no title or body to show.
  static SafetyNotice? fromFirestore(String id, Map<String, Object?> data) {
    final title = data['title'];
    final body = data['body'];
    if (title is! String || title.trim().isEmpty) return null;
    if (body is! String || body.trim().isEmpty) return null;
    final kind = data['kind'];
    final actionId = data['actionId'];
    return SafetyNotice(
      id: id,
      kind: SafetyNoticeKind.values.firstWhere(
        (value) => value != SafetyNoticeKind.unknown && value.name == kind,
        orElse: () => SafetyNoticeKind.unknown,
      ),
      title: title.trim(),
      body: body.trim(),
      actionId: actionId is String && actionId.isNotEmpty ? actionId : null,
      appealable: data['appealable'] == true,
      createdAt: nullableDateTimeFromFirestoreValue(data['createdAt']),
      readAt: nullableDateTimeFromFirestoreValue(data['readAt']),
    );
  }
}
