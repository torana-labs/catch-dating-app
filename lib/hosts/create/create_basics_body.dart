import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// Step one in board order: the photo with two add cards, the name, the
/// format chips with the chosen format's note, and what it is like. A
/// social run adds distance and pace, as its note says.
///
/// Editing a saved event keeps its format and photos as they are, checks
/// the distance of a moving event, and adds [trailing] fields under the
/// description.
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
    this.trailing = const <Widget>[],
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

  /// Fields an edit adds under the description.
  final List<Widget> trailing;

  static const _paces = ['easy', 'moderate', 'fast', 'competitive'];

  @override
  Widget build(BuildContext context) {
    final copy = catchFieldCopy(context.l10n);
    final draft = state.draft;
    final format = state.format;
    final photos = state.photoUrls;
    final edit = state.edit;
    final states = <WidgetState>{
      if (edit != null && !state.canChange) WidgetState.disabled,
    };
    final moving =
        edit?.event.eventFormat.activityKind.isDistanceBased ??
        format == CreateFormat.run;
    final addPhoto = state.canAddPhotos && !state.uploadingPhotos
        ? onAddPhoto
        : null;
    final addCards = [
      for (var i = photos.length; i < 2 + photos.length && i < 3; i++)
        CatchChoiceTile(
          key: ValueKey<String>('create-add-photo-$i'),
          variant: CatchChoiceTileVariant.add,
          title: context.l10n.hostCreateAddPhoto,
          contract: CatchContractConstraints
              .updatePrivateEventDetailsCallablePayloadDetailsEventPhotos,
          onTap: addPhoto,
        ),
    ];
    return CatchStack(
      gap: CatchStackGap.g24,
      children: [
        if (showTitle)
          CatchText(
            context.l10n.hostCreateStepTitle(step: CreateStep.basics.name),
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
                  semanticLabel: context.l10n.hostCreatePhotos,
                ),
              ),
            if (edit == null)
              CatchStack(
                direction: CatchStackDirection.row,
                gap: CatchStackGap.g8,
                equal: true,
                children: addCards.take(2).toList(),
              ),
            if (state.eventId == null)
              CatchText(
                context.l10n.hostCreateAddPhotoLater,
                variant: CatchTextVariant.bodySmall,
                tone: CatchTextTone.secondary,
              ),
          ],
        ),
        CatchFieldLanes.single(
          child: CatchField.input(
            key: const ValueKey<String>('create-name'),
            copy: copy,
            title: context.l10n.hostCreateName,
            contract: CatchContractConstraints
                .createPrivateEventSetupCallablePayloadBasicsName,
            initialValue: draft.name ?? '',
            onChanged: onName,
            states: states,
            textInputAction: TextInputAction.next,
            errorText: state.problems.contains(CreateProblem.name)
                ? context.l10n.hostCreateNameNeeded
                : null,
          ),
        ),
        CatchStack(
          children: [
            CatchText(
              context.l10n.hostCreateFormat,
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
                    label: context.l10n.hostCreateFormatLabel(
                      format: option.name,
                    ),
                    selected: option == format,
                    mode: CatchChipMode.single,
                    dot: option.tint,
                    colourWhenSelected: true,
                    // A saved event keeps the format it was set up with.
                    onPressed: edit == null ? () => onFormat(option) : null,
                  ),
              ],
            ),
            CatchText(
              state.problems.contains(CreateProblem.format)
                  ? context.l10n.hostCreateFormatNeeded
                  : context.l10n.hostCreateFormatNote(
                      format: (format ?? CreateFormat.quiz).name,
                    ),
              variant: CatchTextVariant.bodySmall,
              tone: state.problems.contains(CreateProblem.format)
                  ? CatchTextTone.danger
                  : CatchTextTone.secondary,
            ),
          ],
        ),
        if (moving) ...[
          CatchFieldLanes.single(
            child: CatchField.input(
              key: const ValueKey<String>('create-distance'),
              copy: copy,
              title: context.l10n.hostCreateDistance,
              contract: CatchContractConstraints
                  .updatePrivateEventDetailsCallablePayloadDetailsDistanceKm,
              initialValue: draft.distance ?? '',
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              suffixText: 'km',
              inputFormatters: [
                FilteringTextInputFormatter.allow(
                  RegExp(context.l10n.hostsEditHostedEventScreenBodyDD),
                ),
              ],
              onChanged: onDistance,
              states: states,
              errorText: state.problems.contains(CreateProblem.distance)
                  ? _distanceError(context.l10n, draft.distance)
                  : null,
            ),
          ),
          CatchStack(
            gap: CatchStackGap.g8,
            children: [
              CatchText(
                context.l10n.hostCreatePace,
                variant: CatchTextVariant.labelAction,
              ),
              CatchStack(
                direction: CatchStackDirection.row,
                gap: CatchStackGap.g8,
                wrap: true,
                children: [
                  for (final pace in _paces)
                    CatchChip.choice(
                      label: context.l10n.hostCreatePaceLabel(pace: pace),
                      selected: draft.paceName == pace,
                      mode: CatchChipMode.single,
                      size: CatchChipSize.sm,
                      onPressed: states.isEmpty ? () => onPace(pace) : null,
                    ),
                ],
              ),
            ],
          ),
        ],
        CatchFieldLanes.single(
          child: CatchField.input(
            key: const ValueKey<String>('create-description'),
            copy: copy,
            title: context.l10n.hostCreateWhatsItLike,
            contract: CatchContractConstraints
                .updatePrivateEventDetailsCallablePayloadDetailsDescription,
            initialValue: draft.description ?? '',
            onChanged: onDescription,
            states: states,
            minLines: 3,
            maxLines: 6,
            keyboardType: TextInputType.multiline,
            maxLength: 2000,
          ),
        ),
        ...trailing,
      ],
    );
  }
}

/// Why an edited distance cannot be saved.
String _distanceError(AppLocalizations l10n, String? value) {
  final text = (value ?? '').trim();
  if (text.isEmpty) return l10n.hostsEditHostedEventScreenBodyRequired;
  if (double.tryParse(text) == null) {
    return l10n.hostsEditHostedEventScreenBodyInvalid;
  }
  return l10n.hostsEditHostedEventScreenBodyMustBe0;
}
