import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

void main() {
  for (final direction in [AnimationStatus.forward, AnimationStatus.reverse]) {
    testWidgets('reveal and flight curves preserve ${direction.name} poses', (
      tester,
    ) async {
      await matchCatchGolden(
        tester,
        'reveal_viewport_family.${direction.name}',
        size: const Size(440, 500),
        // Pin explicit animation poses even though ordinary goldens disable motion.
        builder: (context) => MediaQuery(
          data: MediaQuery.of(context).copyWith(disableAnimations: false),
          child: Builder(
            builder: (context) => Padding(
              padding: const EdgeInsets.all(20),
              child: Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  for (final progress in [0.0, 0.5, 1.0])
                    for (final recipe in ['content', 'stationary', 'flight'])
                      SizedBox(
                        width: 124,
                        height: 140,
                        child: _pose(
                          context,
                          recipe,
                          _SnapshotAnimation(progress, direction),
                        ),
                      ),
                ],
              ),
            ),
          ),
        ),
      );
    }, tags: const ['golden']);
  }
}

Widget _pose(BuildContext context, String recipe, Animation<double> animation) {
  final child = ColoredBox(
    color: CatchTokens.of(context).primarySoft,
    child: Center(
      child: Text(recipe, style: TextStyle(color: CatchTokens.of(context).ink)),
    ),
  );
  if (recipe == 'content') {
    return CatchRevealViewport(animation: animation, child: child);
  }
  if (recipe == 'stationary') {
    return CatchRevealViewport.stationary(animation: animation, child: child);
  }
  final ticket = CatchHeroViewport.ticket(
    prefix: 'test',
    id: '1',
    child: child,
  );
  final hero = ticket;
  return hero.flightShuttleBuilder!(
    context,
    animation,
    HeroFlightDirection.push,
    context,
    context,
  );
}

class _SnapshotAnimation extends AlwaysStoppedAnimation<double> {
  const _SnapshotAnimation(super.value, this.direction);

  final AnimationStatus direction;

  @override
  AnimationStatus get status => direction;
}
