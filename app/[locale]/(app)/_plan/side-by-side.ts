// Shared by the phone week view and the laptop Wochenplan: when sessions in the
// same column overlap, they are shown next to each other instead of on top.

// Anything with a start and end, in minutes since midnight.
type Timed = { start: number; end: number };

// `column` is the item's sub-column, `columns` how many sub-columns its run of
// overlapping items needs (so the item is `1 / columns` wide).
export type SideBySide<T> = T & { column: number; columns: number };

// Items must be ordered by start. Each item takes the first sub-column that is
// free again, and a run of overlapping items shares one column count.
export function placeSideBySide<T extends Timed>(items: T[]): SideBySide<T>[] {
  const placed: SideBySide<T>[] = [];
  let run: SideBySide<T>[] = [];
  let columnEnds: number[] = []; // end minute of the last item in each sub-column of the current run

  for (const item of items) {
    if (run.length > 0 && item.start >= Math.max(...columnEnds)) {
      run.forEach((p) => (p.columns = columnEnds.length));
      run = [];
      columnEnds = [];
    }
    let column = columnEnds.findIndex((columnEnd) => columnEnd <= item.start);
    if (column === -1) column = columnEnds.length;
    columnEnds[column] = item.end;
    const p = { ...item, column, columns: 1 };
    run.push(p);
    placed.push(p);
  }
  run.forEach((p) => (p.columns = columnEnds.length));
  return placed;
}
