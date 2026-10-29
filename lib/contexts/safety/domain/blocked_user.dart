import 'package:catch_dating_app/core/firestore_converters.dart';

class BlockedUser {
  const BlockedUser({
    required this.uid,
    required this.createdAt,
    required this.source,
  });

  final String uid;
  final DateTime? createdAt;
  final String source;

  factory BlockedUser.fromFirestore(Map<String, dynamic> data) {
    return BlockedUser(
      uid: data['blockedUserId'] as String,
      createdAt: nullableDateTimeFromFirestoreValue(data['createdAt']),
      source: data['source'] as String? ?? 'profile',
    );
  }
}
