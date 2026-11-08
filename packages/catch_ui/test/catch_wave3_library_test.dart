import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(Widget child, {double width = 390}) => MaterialApp(
  home: Scaffold(
    body: CatchRoot(
      size: CatchWindowSize.compact,
      format: CatchFormat.nightsOut,
      child: Center(
        child: SizedBox(width: width, child: child),
      ),
    ),
  ),
);

void main() {
  testWidgets('an outline badge draws a dashed edge and reads its label', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(
        const Center(
          child: CatchBadge(
            label: '?',
            emphasis: CatchBadgeEmphasis.outline,
            semanticLabel: 'No reply yet',
          ),
        ),
      ),
    );
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is CustomPaint &&
            widget.foregroundPainter is CatchDashedOutlinePainter,
      ),
      findsOneWidget,
    );
    expect(find.bySemanticsLabel('No reply yet'), findsOneWidget);
  });

  testWidgets(
    'data rows draw cells by kind and number columns sit at the end',
    (tester) async {
      var opened = 0;
      await tester.pumpWidget(
        _host(
          CatchTable(
            label: 'Guests by household',
            columns: const [
              CatchTableColumn(
                label: 'Household',
                flex: 2,
                variant: CatchTableColumnVariant.title,
              ),
              CatchTableColumn(
                label: 'Guests',
                variant: CatchTableColumnVariant.number,
              ),
              CatchTableColumn(
                label: 'Reply',
                variant: CatchTableColumnVariant.badge,
              ),
            ],
            children: [
              CatchTableRow.cells(
                onTap: () => opened++,
                cells: const [
                  CatchTableCell.title('The Mehras', subtitle: 'Bride side'),
                  CatchTableCell.number(6),
                  CatchTableCell.badge(
                    CatchBadge(label: 'Yes', tone: CatchBadgeTone.success),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
      expect(find.text('The Mehras'), findsOneWidget);
      expect(find.text('Bride side'), findsOneWidget);
      expect(find.text('Yes'), findsOneWidget);
      expect(
        tester.getTopRight(find.text('6')).dx,
        closeTo(tester.getTopRight(find.text('GUESTS')).dx, 1),
      );
      expect(
        find.bySemanticsLabel(RegExp('Guests by household')),
        findsWidgets,
      );
      await tester.tap(find.text('The Mehras'));
      expect(opened, 1);
    },
  );

  testWidgets('a map keeps its aspect, draws its pins and opens', (
    tester,
  ) async {
    var opened = 0;
    await tester.pumpWidget(
      _host(
        CatchMap(
          label: 'Map of the crawl',
          aspect: 2,
          onOpen: () => opened++,
          route: const [
            CatchMapPoint(x: 10, y: 80),
            CatchMapPoint(x: 50, y: 40),
          ],
          pins: const [
            CatchMapPin(x: 10, y: 80, label: 'Start'),
            CatchMapPin(
              x: 50,
              y: 40,
              label: 'Bar Paradiso',
              format: CatchFormat.nightsOut,
              status: CatchMapPinStatus.selected,
            ),
          ],
          footer: const Text('Four stops'),
        ),
        width: 300,
      ),
    );
    expect(tester.getSize(find.byType(AspectRatio)), const Size(300, 150));
    expect(find.text('Start'), findsOneWidget);
    expect(find.text('Bar Paradiso'), findsOneWidget);
    expect(find.text('Four stops'), findsOneWidget);
    expect(find.bySemanticsLabel('Map of the crawl'), findsOneWidget);
    await tester.tap(find.byType(AspectRatio));
    expect(opened, 1);
  });

  testWidgets('an author names the first bubble of a run only', (tester) async {
    await tester.pumpWidget(
      _host(
        const Column(
          children: [
            CatchChatBubble(
              text: 'Bus leaves at 9',
              variant: CatchChatBubbleVariant.host,
              author: CatchChatAuthor(name: 'Asha', note: 'host'),
            ),
            CatchChatBubble(
              text: 'Meet at the gate',
              author: CatchChatAuthor(name: 'Kabir'),
              footer: Text('Map attached'),
            ),
            CatchChatBubble(
              text: 'Then the lobby',
              continued: true,
              author: CatchChatAuthor(name: 'Kabir'),
            ),
          ],
        ),
      ),
    );
    expect(find.text('Asha · host'), findsOneWidget);
    expect(find.text('Kabir'), findsOneWidget);
    expect(find.text('Map attached'), findsOneWidget);
    expect(find.text('KA'), findsOneWidget);
  });

  testWidgets('the composer sends trimmed text and clears', (tester) async {
    final sent = <String>[];
    await tester.pumpWidget(
      _host(
        CatchComposerInput(
          placeholder: 'Message',
          sendLabel: 'Send',
          onSend: sent.add,
        ),
      ),
    );
    final send = find.byTooltip('Send');
    await tester.tap(send);
    expect(sent, isEmpty);
    await tester.enterText(find.byType(TextField), '  See you  ');
    await tester.pump();
    await tester.tap(send);
    await tester.pump();
    expect(sent, ['See you']);
    expect(find.text('See you'), findsNothing);
  });

  testWidgets('a closed chat shows its note instead of the field', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(
        const CatchComposerInput(
          placeholder: 'Message',
          sendLabel: 'Send',
          closedNote: 'This chat closed when the event ended.',
        ),
      ),
    );
    expect(find.byType(TextField), findsNothing);
    expect(find.text('This chat closed when the event ended.'), findsOneWidget);
  });

  testWidgets('the identity draws a leading avatar in place of its own', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(
        CatchTabBarIdentity(
          name: 'Torana Weddings',
          leading: CatchAvatar.system(
            key: const Key('logo'),
            size: CatchAvatarSize.sm,
            name: 'Torana Weddings',
            variant: CatchAvatarVariant.square,
          ),
        ),
        width: 240,
      ),
    );
    expect(find.byKey(const Key('logo')), findsOneWidget);
    expect(find.byType(CatchAvatar), findsOneWidget);
  });

  testWidgets('an attention card takes the games ring', (tester) async {
    await tester.pumpWidget(
      _host(
        CatchChoiceTile(
          title: '216',
          subtitle: 'Mehra · Dadi',
          variant: CatchChoiceTileVariant.tile,
          emphasis: CatchChoiceTileEmphasis.attention,
          onTap: () {},
        ),
        width: 160,
      ),
    );
    final games = CatchTokens.of(
      tester.element(find.byType(CatchChoiceTile)),
    ).formatGames;
    final ring = find.byWidgetPredicate(
      (widget) =>
          widget is DecoratedBox &&
          widget.decoration is BoxDecoration &&
          (widget.decoration as BoxDecoration).border is Border &&
          ((widget.decoration as BoxDecoration).border! as Border).top.color ==
              games,
    );
    expect(ring, findsOneWidget);
  });

  testWidgets('a notice footer replaces the single action', (tester) async {
    await tester.pumpWidget(
      _host(
        CatchNotice.inline(
          body: 'Flight AI 865 landed 40 minutes early.',
          tone: CatchNoticeTone.warning,
          action: CatchNoticeAction(label: 'Ignored', onPressed: () {}),
          footer: const Row(children: [Text('Call them')]),
        ),
      ),
    );
    expect(find.text('Call them'), findsOneWidget);
    expect(find.text('Ignored'), findsNothing);
  });

  testWidgets('a dock header sits above an accent primary', (tester) async {
    await tester.pumpWidget(
      _host(
        CatchDock(
          header: const Text('Offline · 3 check-ins to send'),
          primary: CatchDockAction(
            label: 'Reveal the tables',
            onPressed: () {},
            emphasis: CatchDockActionEmphasis.accent,
          ),
        ),
      ),
    );
    expect(
      tester.getBottomLeft(find.text('Offline · 3 check-ins to send')).dy,
      lessThan(tester.getTopLeft(find.text('Reveal the tables')).dy),
    );
    final button = tester.widget<CatchButton>(find.byType(CatchButton));
    expect(button.backgroundColor, CatchFormat.nightsOut.accent);
  });

  testWidgets('a slider writes its value and reports a drag', (tester) async {
    double? changed;
    await tester.pumpWidget(
      _host(
        CatchSliderInput(
          value: 3,
          min: 3,
          max: 5,
          divisions: 2,
          label: 'Rounds',
          valueLabelBuilder: (value) => '${value.round()} rounds',
          onChanged: (value) => changed = value,
        ),
      ),
    );
    expect(find.text('Rounds'), findsOneWidget);
    expect(find.text('3 rounds'), findsOneWidget);
    await tester.drag(find.byType(Slider), const Offset(400, 0));
    expect(changed, 5);
  });

  testWidgets('a countdown ticks down and calls back at zero', (tester) async {
    var done = 0;
    await tester.pumpWidget(
      _host(
        CatchCountdownIndicator(
          seconds: 3,
          label: 'Tables in',
          variant: CatchCountdownIndicatorVariant.ring,
          onDone: () => done++,
        ),
      ),
    );
    expect(find.text('3'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 1500));
    expect(find.text('2'), findsOneWidget);
    await tester.pump(const Duration(seconds: 2));
    expect(find.text('0'), findsOneWidget);
    expect(done, 1);
  });
}
