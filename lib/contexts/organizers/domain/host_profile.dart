enum HostProfileStatus { active, pending, suspended }

class HostProfile {
  const HostProfile({
    required this.uid,
    required this.displayName,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.avatarUrl,
    this.roleTitle,
    this.bio,
    this.verified = false,
    this.linkedOrganizerIds = const [],
  });

  final String uid;
  final String displayName;
  final String? avatarUrl;
  final String? roleTitle;
  final String? bio;
  final HostProfileStatus status;
  final bool verified;
  final List<String> linkedOrganizerIds;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  bool get isActive => status == HostProfileStatus.active;
}
