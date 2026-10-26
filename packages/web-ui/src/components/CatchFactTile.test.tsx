import {cleanup, render} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchFactTile} from "./CatchFactTile";

afterEach(cleanup);

const tile = (container: HTMLElement) => container.firstElementChild as HTMLElement;

describe("CatchFactTile", () => {
  it("reads a fact's label, value and note in order on paper", () => {
    const {container} = render(<CatchFactTile label="When" note="5:45 to 8:30 AM" value="Sun 23 Nov" />);
    expect(tile(container).textContent).toBe("When Sun 23 Nov 5:45 to 8:30 AM");
    expect(tile(container).dataset).toMatchObject({emphasis: "fact", ground: "paper"});
  });

  it("sets a stat's value on the display step and a positive note in the positive role", () => {
    const {container} = render(<CatchFactTile emphasis="stat" ground="white" label="Visits" note="+18%" noteTone="positive" value="3,412" />);
    const [, value, note] = [...tile(container).children] as HTMLElement[];
    expect(value.dataset.variant).toBe("displayS");
    expect(note.dataset.variant).toBe("statusLabel");
    expect(note.dataset.color).toBe("positiveText");
  });

  it("drops an empty note", () => {
    const {container} = render(<CatchFactTile label="Distance" value="15 km" />);
    expect(tile(container).textContent).toBe("Distance 15 km");
  });
});
