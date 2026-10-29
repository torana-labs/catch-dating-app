import 'package:meta/meta.dart';

enum MessagingPermissionStatus { unknown, optedIn, optedOut }
enum MessagingPermissionPurpose { eventOperations, marketing }

@immutable
class MessagingPurposeDecision {
  const MessagingPurposeDecision({required this.status, required this.receiptId});
  factory MessagingPurposeDecision.fromMap(Map<Object?, Object?> json) =>
      MessagingPurposeDecision(
        status: MessagingPermissionStatus.values.byName(
          json['status']! as String,
        ),
        receiptId: json['receiptId'] as String?,
      );
  final MessagingPermissionStatus status;
  final String? receiptId;
}

@immutable
class MessagingPermission {
  const MessagingPermission({
    required this.organizerId,
    required this.organizerName,
    required this.status,
    required this.receiptId,
    this.purposes = const {},
  });
  factory MessagingPermission.fromMap(
    Map<Object?, Object?> json, {
    String? organizerId,
    String? organizerName,
  }) => MessagingPermission(
    organizerId: organizerId,
    organizerName: organizerName,
    status: MessagingPermissionStatus.values.byName(json['status']! as String),
    receiptId: json['receiptId'] as String?,
    purposes: {
      for (final entry in (json['purposes'] as Map? ?? const {}).entries)
        MessagingPermissionPurpose.values.byName(entry.key as String):
            MessagingPurposeDecision.fromMap(entry.value as Map),
    },
  );
  final String? organizerId;
  final String? organizerName;
  final MessagingPermissionStatus status;
  final String? receiptId;
  final Map<MessagingPermissionPurpose, MessagingPurposeDecision> purposes;
  MessagingPermissionStatus get effectiveStatus => purposes.values.any(
    (decision) => decision.status == MessagingPermissionStatus.optedIn,
  ) ? MessagingPermissionStatus.optedIn : status;
  String get key => organizerId == null ? 'catch' : 'organizer:$organizerId';
  String get scope => organizerId == null ? 'catch' : 'organizer';

  MessagingPermission afterWithdrawal(
    MessagingPermissionPurpose? purpose,
    String withdrawalReceiptId,
  ) {
    final stopped = MessagingPurposeDecision(
      status: MessagingPermissionStatus.optedOut,
      receiptId: withdrawalReceiptId,
    );
    final updatedPurposes = purpose == null
        ? {
            for (final key in purposes.keys) key: stopped,
          }
        : {...purposes, purpose: stopped};
    final anyActive = updatedPurposes.values.any(
      (value) => value.status == MessagingPermissionStatus.optedIn,
    );
    return MessagingPermission(
      organizerId: organizerId,
      organizerName: organizerName,
      status: anyActive
          ? MessagingPermissionStatus.optedIn
          : MessagingPermissionStatus.optedOut,
      receiptId: purpose == null ? withdrawalReceiptId : receiptId,
      purposes: updatedPurposes,
    );
  }
}

@immutable
class MessagingPermissionPage {
  MessagingPermissionPage({
    required this.catchPermission,
    required Iterable<MessagingPermission> organizers,
    required this.nextCursor,
  }) : organizers = List.unmodifiable(organizers);
  factory MessagingPermissionPage.fromMap(Map<Object?, Object?> json) =>
      MessagingPermissionPage(
        catchPermission: MessagingPermission.fromMap(
          json['catchPreference']! as Map,
        ),
        organizers: (json['organizers']! as List).map((value) {
          final row = value as Map;
          return MessagingPermission.fromMap(
            row['preference']! as Map,
            organizerId: row['organizerId']! as String,
            organizerName: row['organizerName'] as String?,
          );
        }),
        nextCursor: json['nextCursor'] as String?,
      );
  final MessagingPermission catchPermission;
  final List<MessagingPermission> organizers;
  final String? nextCursor;
  MessagingPermission? permission(String key) => key == catchPermission.key
      ? catchPermission
      : organizers.where((row) => row.key == key).firstOrNull;
  MessagingPermissionPage replacing(MessagingPermission permission) =>
      MessagingPermissionPage(
        catchPermission: permission.organizerId == null
            ? permission
            : catchPermission,
        organizers: organizers.map(
          (row) => row.key == permission.key ? permission : row,
        ),
        nextCursor: nextCursor,
      );
}
