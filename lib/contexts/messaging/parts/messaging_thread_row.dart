import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One conversation in the host's Messages: the person's avatar and name,
/// a neutral badge (Tonight), the last message, its time, and bold while
/// it waits on the host.
class MessagingThreadRow extends StatelessWidget {
  const MessagingThreadRow({
    super.key,
    required this.name,
    required this.preview,
    required this.time,
    required this.onTap,
    this.photoUrl,
    this.badge,
    this.unread = false,
  });

  final String name;
  final String preview;
  final String time;
  final VoidCallback? onTap;
  final String? photoUrl;

  /// What the conversation is about, as a neutral badge.
  final String? badge;

  /// The last message is the guest's and waits on the host.
  final bool unread;

  @override
  Widget build(BuildContext context) => CatchIndexRow(
    title: name,
    subtitle: preview,
    value: time,
    leading: CatchAvatar.system(
      size: CatchAvatarSize.md,
      name: name,
      imageUrl: photoUrl,
    ),
    badge: badge == null ? null : CatchIndexRowBadge(label: badge!),
    emphasis: unread
        ? CatchIndexRowEmphasis.unread
        : CatchIndexRowEmphasis.regular,
    density: CatchIndexRowSize.compact,
    onTap: onTap,
  );
}
