import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One court this round as a row: "Court 2", the time left in the game and
/// the two players under it. The row draws nothing of its own.
class FormatsCourtRow extends StatelessWidget {
  const FormatsCourtRow({
    super.key,
    required this.index,
    required this.players,
    this.status,
  });

  /// Zero-based: court 1 is index 0.
  final int index;
  final List<String> players;

  /// The time left in the game: "9:40 left".
  final String? status;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchIndexRow(
      title: l10n.hostFormatsCourt(number: index + 1),
      onTap: null,
      density: CatchIndexRowSize.compact,
      status: status,
      footer: FormatsPlayers(players: players),
    );
  }
}

/// One court as a tablet tile: its name, the time left as a badge, and the
/// two players.
class FormatsCourtTile extends StatelessWidget {
  const FormatsCourtTile({
    super.key,
    required this.index,
    required this.players,
    this.status,
  });

  final int index;
  final List<String> players;
  final String? status;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final status = this.status;
    return CatchSurface(
      child: CatchStack(
        children: [
          CatchStack(
            direction: CatchStackDirection.row,
            justify: CatchStackJustify.between,
            align: CatchStackAlign.center,
            children: [
              CatchText(
                l10n.hostFormatsCourt(number: index + 1),
                variant: CatchTextVariant.titleBar,
              ),
              if (status != null) CatchBadge(label: status),
            ],
          ),
          FormatsPlayers(
            players: players,
            size: GeneratedCatchSizeTokens.avatarMd,
          ),
        ],
      ),
    );
  }
}

/// A few people as overlapping avatars and their first names: "Aanya and
/// Dev".
class FormatsPlayers extends StatelessWidget {
  const FormatsPlayers({
    super.key,
    required this.players,
    this.size = GeneratedCatchSizeTokens.avatarSm,
    this.limit = 4,
  });

  final List<String> players;
  final double size;
  final int limit;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchStack(
      direction: CatchStackDirection.row,
      gap: CatchStackGap.g8,
      align: CatchStackAlign.center,
      children: [
        CatchAvatarRow(
          items: [
            for (final name in players) CatchPersonAvatarItem(name: name),
          ],
          size: size,
          limit: limit,
          countLabelBuilder: (count) => l10n.hostFormatsMore(count: count),
        ),
        Flexible(
          child: CatchText(
            formatsFirstNames(context, players),
            variant: CatchTextVariant.bodySmall,
            maxLines: 1,
          ),
        ),
      ],
    );
  }
}

/// First names joined for a sentence: "Aanya", "Aanya and Dev", "Aanya,
/// Dev and 2 more".
String formatsFirstNames(BuildContext context, List<String> names) {
  final l10n = context.l10n;
  final first = [
    for (final name in names)
      name.trim().split(RegExp(r'\s+')).firstOrNull ?? name,
  ];
  return switch (first.length) {
    0 => '',
    1 => first.single,
    2 => l10n.hostFormatsTwoNames(first: first[0], second: first[1]),
    _ => l10n.hostFormatsManyNames(
      first: first[0],
      second: first[1],
      count: first.length - 2,
    ),
  };
}
