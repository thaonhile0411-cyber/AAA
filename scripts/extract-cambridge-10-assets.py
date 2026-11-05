"""Create clean reference-page assets from the user-provided Cambridge IELTS 10 scan.

The source scan includes handwritten red answers.  They are intentionally removed
from the question-page images so an answer is never disclosed before submission.
The original black/blue printed material, including charts and diagrams, is kept.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import fitz


def remove_red_annotations(pixmap: fitz.Pixmap) -> fitz.Pixmap:
    channels = pixmap.n
    pixels = bytearray(pixmap.samples)
    mask = bytearray(pixmap.width * pixmap.height)
    for index in range(0, len(pixels), channels):
        red, green, blue = pixels[index : index + 3]
        # Written answers are vivid red. Avoid touching the book's blue headings.
        if red > 80 and red - green > 10 and red - blue > 10:
            mask[index // channels] = 1

    # Include anti-aliased fringes around red pen strokes. Without this, JPEG
    # compression can leave a readable coloured outline after inpainting.
    expanded = bytearray(mask)
    for point, marked in enumerate(mask):
        if not marked:
            continue
        y, x = divmod(point, pixmap.width)
        for offset_y in (-1, 0, 1):
            for offset_x in (-1, 0, 1):
                next_x, next_y = x + offset_x, y + offset_y
                if 0 <= next_x < pixmap.width and 0 <= next_y < pixmap.height:
                    expanded[next_y * pixmap.width + next_x] = 1
    mask = expanded

    # Replace annotation pixels with neighbouring printed/background pixels.
    # A small iterative fill keeps blue form/table backgrounds intact rather
    # than painting red handwriting white and exposing its letter shapes.
    active = [point for point, marked in enumerate(mask) if marked]
    for _ in range(80):
        next_active: list[int] = []
        for point in active:
            y, x = divmod(point, pixmap.width)
            if x in (0, pixmap.width - 1) or y in (0, pixmap.height - 1):
                next_active.append(point)
                continue
            for offset_x, offset_y in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                neighbour = (y + offset_y) * pixmap.width + x + offset_x
                if mask[neighbour]:
                    continue
                target = point * channels
                origin = neighbour * channels
                pixels[target : target + 3] = pixels[origin : origin + 3]
                mask[point] = 0
                break
            else:
                next_active.append(point)
        active = next_active
        if not active:
            break
    return fitz.Pixmap(
        fitz.csRGB,
        pixmap.width,
        pixmap.height,
        bytes(pixels),
        False,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("public/assets/cambridge-10/pages"),
    )
    parser.add_argument("--start", type=int, default=11)
    parser.add_argument("--end", type=int, default=151)
    args = parser.parse_args()

    document = fitz.open(args.input)
    args.output.mkdir(parents=True, exist_ok=True)
    for page_number in range(args.start, args.end + 1):
        page = document[page_number - 1]
        pixmap = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
        remove_red_annotations(pixmap).save(
            args.output / f"page-{page_number:03}.jpg",
            jpg_quality=88,
        )
        print(f"page-{page_number:03}.jpg")


if __name__ == "__main__":
    main()
