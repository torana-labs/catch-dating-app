import 'package:catch_dating_app/hosts/create/create_copy.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// Step one in board order: the photo with two add cards, the name, the
/// format chips with the chosen format's note, and what it is like. A
/// social run adds distance and pace, as its note says.
class CreateBasicsBody extends StatelessWidget {
  const CreateBasicsBody({
    super.key,
    required this.state,
    required this.onName,
    required this.onFormat,
    required this.onDescription,
    required this.onDistance,
    required this.onPace,
    required this.onAddPhoto,
    this.showTitle = false,
  });

  final CreateFlowState state;
  final ValueChanged<String> onName;
  final ValueChanged<CreateFormat> onFormat;
  final ValueChanged<String> onDescription;
  final ValueChanged<String> onDistance;
  final ValueChanged<String> onPace;
  final VoidCallback onAddPhoto;

  /// The desktop editor names the step above the form.
  final bool showTitle;

  static const _paces = ['easy', 'moderate', 'fast', 'competitive'];

  @override
  Widget build(BuildContext context) {
    final copy = catchFieldCopy(context.l10n);
    final draft = state.draft;
    final format = state.format;
    final photos = state.photoUrls;
    final addPhoto = state.canAddPhotos && !state.uploadingPhotos
        ? onAddPhoto
        : null;
    final addCards = [
      for (var i = photos.length; i < 2 + photos.length && i < 3; i++)
        CatchChoiceTile(
          key: ValueKey<String>('create-add-photo-$i'),
          variant: CatchChoiceTileVariant.add,
          title: CreateCopy.addPhoto,
          onTap: addPhoto,
        ),
    ];
    return CatchStack(
      gap: CatchStackGap.g24,
      children: [
        if (showTitle)
          CatchText(
            CreateCopy.stepTitle(CreateStep.basics),
            variant: CatchTextVariant.displaySection,
          ),
        CatchStack(
          gap: CatchStackGap.g8,
          children: [
            if (photos.isNotEmpty)
              AspectRatio(
                aspectRatio: 16 / 9,
                child: CatchHeroImage(
                  imageUrl: photos.first,
                  showScrim: false,
                  semanticLabel: CreateCopy.photos,
                ),
              ),
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g8,
              equal: true,
              children: addCards.take(2).toList(),
            ),
            if (state.eventId == null)
              const CatchText(
                CreateCopy.addPhotoLater,
                variant: CatchTextVariant.bodySmall,
                tone: CatchTextTone.secondary,
              ),
          ],
        ),
        CatchField.input(
          key: const ValueKey<String>('create-name'),
          copy: copy,
          title: CreateCopy.name,
          initialValue: draft.name ?? '',
          onChanged: onName,
          textInputAction: TextInputAction.next,
          errorText: state.problems.contains(CreateProblem.name)
              ? CreateCopy.nameNeeded
              : null,
        ),
        CatchStack(
          children: [
            const CatchText(
              CreateCopy.format,
              variant: CatchTextVariant.labelAction,
            ),
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g8,
              wrap: true,
              children: [
                for (final option in CreateFormat.values)
                  CatchChip.choice(
                    key: ValueKey<String>('create-format-${option.name}'),
                    label: CreateCopy.formatLabel(option),
                    selected: option == format,
                    mode: CatchChipMode.single,
                    dot: option.tint,
                    colourWhenSelected: true,
                    onPressed: () => onFormat(option),
                  ),
              ],
            ),
            CatchText(
              state.problems.contains(CreateProblem.format)
                  ? CreateCopy.formatNeeded
                  : CreateCopy.formatNote(format ?? CreateFormat.quiz),
              variant: CatchTextVariant.bodySmall,
              tone: state.problems.contains(CreateProblem.format)
                  ? CatchTextTone.danger
                  : CatchTextTone.secondary,
            ),
          ],
        ),
        if (format == CreateFormat.run) ...[
          CatchField.input(
            key: const ValueKey<String>('create-distance'),
            copy: copy,
            title: CreateCopy.distance,
            initialValue: draft.distance ?? '',
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            suffixText: 'km',
            onChanged: onDistance,
          ),
          CatchStack(
            gap: CatchStackGap.g8,
            children: [
              const CatchText(
                CreateCopy.pace,
                variant: CatchTextVariant.labelAction,
              ),
              CatchStack(
                direction: CatchStackDirection.row,
                gap: CatchStackGap.g8,
                wrap: true,
                children: [
                  for (final pace in _paces)
                    CatchChip.choice(
                      label: CreateCopy.paceLabel(pace),
                      selected: draft.paceName == pace,
                      mode: CatchChipMode.single,
                      size: CatchChipSize.sm,
                      onPressed: () => onPace(pace),
                    ),
                ],
              ),
            ],
          ),
        ],
        CatchField.input(
          key: const ValueKey<String>('create-description'),
          copy: copy,
          title: CreateCopy.whatsItLike,
          initialValue: draft.description ?? '',
          onChanged: onDescription,
          minLines: 3,
          maxLines: 6,
          keyboardType: TextInputType.multiline,
          maxLength: 2000,
        ),
      ],
    );
  }
}
