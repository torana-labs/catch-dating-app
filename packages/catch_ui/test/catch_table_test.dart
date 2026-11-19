import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(Widget child) => MaterialApp(
  theme: CatchTheme.light,
  home: Scaffold(body: SizedBox(width: 600, child: child)),
);

const _columns = [
  CatchTableColumn(label: 'Item', flex: 5),
  CatchTableColumn(label: 'Owner', flex: 3, placement: CatchTablePlacement.end),
];

void main() {
  testWidgets(
    'renders sentence-case headers and lays rows out against columns',
    (tester) async {
      await tester.pumpWidget(
        _host(
          const CatchTable(
            columns: _columns,
            children: [
              CatchTableRow(children: [Text('Venue deposit'), Text('Finance')]),
            ],
          ),
        ),
      );
      expect(find.text('Item'), findsOneWidget);
      expect(find.text('Owner'), findsOneWidget);
      final itemCell = tester.getRect(find.text('Venue deposit'));
      final ownerCell = tester.getRect(find.text('Finance'));
      expect(itemCell.left, lessThan(ownerCell.left));
      // The end-placed column aligns its cell to the right edge of the row.
      final table = tester.getRect(find.byType(CatchTable));
      expect(table.right - ownerCell.right, lessThan(48));
    },
  );

  testWidgets('the empty builder replaces rows below the header', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(
        CatchTable(
          columns: _columns,
          emptyBuilder: (context) => const Text('Nothing to list'),
          children: const [
            CatchTableRow(children: [Text('Hidden row'), Text('x')]),
          ],
        ),
      ),
    );
    expect(find.text('Nothing to list'), findsOneWidget);
    expect(find.text('Hidden row'), findsNothing);
  });

  testWidgets('the scope publishes columns to descendants', (tester) async {
    late List<CatchTableColumn> seen;
    await tester.pumpWidget(
      _host(
        CatchTableScope(
          columns: _columns,
          child: Builder(
            builder: (context) {
              seen = CatchTableScope.columnsOf(context);
              return const SizedBox();
            },
          ),
        ),
      ),
    );
    expect(seen, same(_columns));
  });
}
