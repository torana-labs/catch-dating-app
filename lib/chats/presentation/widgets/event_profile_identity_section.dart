import 'dart:async';
import 'package:catch_dating_app/chats/domain/event_chat_profile.dart';
import 'package:catch_dating_app/chats/presentation/event_profile_copy.dart';
import 'package:catch_dating_app/chats/presentation/widgets/event_profile_answer_field.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Renders the protected event projection with an ephemeral in-memory photo.
class EventProfileIdentitySection extends StatefulWidget {
  const EventProfileIdentitySection({super.key, required this.profile});
  final EventParticipantProfile profile;
  @override
  State<EventProfileIdentitySection> createState() =>
      _EventProfileIdentitySectionState();
}

class _EventProfileIdentitySectionState
    extends State<EventProfileIdentitySection> {
  MemoryImage? _image;
  @override
  void initState() {
    super.initState();
    _replaceImage();
  }

  void _replaceImage() {
    final old = _image;
    if (old != null) unawaited(old.evict());
    final photo = widget.profile.photo;
    _image = photo == null ? null : MemoryImage(photo.bytes);
  }

  @override
  void didUpdateWidget(EventProfileIdentitySection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.profile.photo, widget.profile.photo)) {
      _replaceImage();
    }
  }

  @override
  void dispose() {
    final image = _image;
    if (image != null) unawaited(image.evict());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final profile = widget.profile, l = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            if (_image case final image?) ...[
              SizedBox.square(
                dimension: CatchLayout.avatarIdentityExtent,
                child: ClipOval(
                  child: Image(
                    image: image,
                    fit: BoxFit.cover,
                    semanticLabel: profile.displayName,
                    errorBuilder: (_, _, _) => CatchAvatar(
                      size: CatchLayout.avatarIdentityExtent,
                      name: profile.displayName,
                    ),
                  ),
                ),
              ),
              gapW16,
            ],
            Expanded(
              child: Text(
                profile.displayName,
                style: CatchTextStyles.headlineS(context),
              ),
            ),
          ],
        ),
        gapH12,
        CatchText(
          l.eventProfileSharedHere,
          variant: CatchTextVariant.supporting,
        ),
        if (profile.introduction case final introduction?) ...[
          gapH12,
          CatchText(
            introduction,
            variant: CatchTextVariant.bodyL,
            color: CatchTokens.of(context).ink,
          ),
        ],
        gapH24,
        if (profile.coreFields.isEmpty &&
            profile.cardFields.isEmpty &&
            profile.photo == null &&
            profile.introduction == null)
          CatchEmptyState(
            icon: CatchIcons.personOutlineRounded,
            title: l.eventProfileEmpty,
            message: l.eventProfileEmptyBody,
          ),
        if (profile.coreFields.isNotEmpty)
          CatchSection.fieldRows(
            title: l.eventProfileCore,
            children: [
              for (final field in profile.coreFields)
                EventProfileAnswerField.read(
                  label: l.hostFormPersonFieldName(field: field.id),
                  answer: eventProfileValue(context, field),
                ),
            ],
          ),
        if (profile.cardFields.isNotEmpty) ...[
          gapH24,
          CatchSection.fieldRows(
            title: l.eventProfileSelectedAnswers,
            children: [
              for (final field in profile.cardFields)
                EventProfileAnswerField.read(
                  label: field.id,
                  answer: eventProfileValue(context, field, core: false),
                ),
            ],
          ),
        ],
      ],
    );
  }
}
