#!/usr/bin/env python3
"""Audit runtime sprite transitions and render visual contact sheets.

Usage:
  uv run --with pillow python scripts/audit_animation_continuity.py \
    --graph /tmp/shiba-animation-graph.json \
    --output /tmp/shiba-animation-audit
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageStat


CANVAS = 256
THUMB = 152
LABEL_HEIGHT = 34


@dataclass(frozen=True)
class Metrics:
    exact: bool
    alpha_iou: float
    centroid_shift: float
    bbox_shift: float
    pixel_mad: float

    @property
    def risk(self) -> float:
        return (
            (1.0 - self.alpha_iou) * 0.36
            + min(self.centroid_shift / 0.25, 1.0) * 0.24
            + min(self.bbox_shift / 0.30, 1.0) * 0.18
            + min(self.pixel_mad / 0.40, 1.0) * 0.22
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--graph", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument(
        "--project-root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
    )
    return parser.parse_args()


def resolve_asset(project_root: Path, source: str) -> Path:
    return project_root / "public" / source.removeprefix("/")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def render_contain(path: Path, size: int = CANVAS) -> Image.Image:
    with Image.open(path) as source:
        image = source.convert("RGBA")
    scale = min(size / image.width, size / image.height)
    resized = image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(
        resized,
        ((size - resized.width) // 2, (size - resized.height) // 2),
    )
    return canvas


def alpha_bbox(alpha: Image.Image) -> tuple[int, int, int, int]:
    return alpha.point(lambda value: 255 if value > 8 else 0).getbbox() or (0, 0, 0, 0)


def alpha_centroid(alpha: Image.Image) -> tuple[float, float]:
    pixels = alpha.load()
    total = 0.0
    weighted_x = 0.0
    weighted_y = 0.0
    for y in range(alpha.height):
        for x in range(alpha.width):
            weight = pixels[x, y] / 255.0
            total += weight
            weighted_x += x * weight
            weighted_y += y * weight
    if total == 0:
        return (alpha.width / 2, alpha.height / 2)
    return (weighted_x / total, weighted_y / total)


def premultiplied_rgb(image: Image.Image) -> Image.Image:
    background = Image.new("RGBA", image.size, (0, 0, 0, 255))
    background.alpha_composite(image)
    return background.convert("RGB")


def compare(left_path: Path, right_path: Path) -> Metrics:
    if sha256(left_path) == sha256(right_path):
        return Metrics(True, 1.0, 0.0, 0.0, 0.0)

    left = render_contain(left_path)
    right = render_contain(right_path)
    left_alpha = left.getchannel("A")
    right_alpha = right.getchannel("A")
    left_mask = left_alpha.point(lambda value: 255 if value > 8 else 0)
    right_mask = right_alpha.point(lambda value: 255 if value > 8 else 0)
    intersection = ImageChops.multiply(left_mask, right_mask)
    union = ImageChops.lighter(left_mask, right_mask)
    intersection_area = ImageStat.Stat(intersection).sum[0] / 255.0
    union_area = ImageStat.Stat(union).sum[0] / 255.0
    iou = intersection_area / union_area if union_area else 1.0

    left_centroid = alpha_centroid(left_alpha)
    right_centroid = alpha_centroid(right_alpha)
    centroid_shift = math.dist(left_centroid, right_centroid) / CANVAS

    left_bbox = alpha_bbox(left_alpha)
    right_bbox = alpha_bbox(right_alpha)
    bbox_shift = max(
        abs(left_bbox[index] - right_bbox[index]) / CANVAS for index in range(4)
    )

    difference = ImageChops.difference(
        premultiplied_rgb(left),
        premultiplied_rgb(right),
    )
    pixel_mad = sum(ImageStat.Stat(difference).mean) / (3 * 255)
    return Metrics(False, iou, centroid_shift, bbox_shift, pixel_mad)


def short_name(source: str) -> str:
    path = Path(source)
    return f"{path.parent.name}/{path.name}" if path.parent.name != "cartoon-v1" else path.name


def checkerboard(size: tuple[int, int], tile: int = 12) -> Image.Image:
    image = Image.new("RGBA", size, (238, 238, 238, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], tile):
        for x in range(0, size[0], tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle(
                    (x, y, min(x + tile - 1, size[0]), min(y + tile - 1, size[1])),
                    fill=(215, 215, 215, 255),
                )
    return image


def render_sheet(
    title: str,
    sources: list[str],
    project_root: Path,
    destination: Path,
) -> None:
    columns = min(8, len(sources))
    rows = math.ceil(len(sources) / columns)
    cell_width = THUMB + 12
    cell_height = THUMB + LABEL_HEIGHT
    header_height = 30
    sheet = Image.new(
        "RGBA",
        (columns * cell_width, header_height + rows * cell_height),
        (250, 250, 250, 255),
    )
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    draw.text((8, 8), title, fill=(20, 20, 20, 255), font=font)
    for index, source in enumerate(sources):
        row, column = divmod(index, columns)
        x = column * cell_width + 6
        y = header_height + row * cell_height
        tile = checkerboard((THUMB, THUMB))
        frame = render_contain(resolve_asset(project_root, source), THUMB)
        tile.alpha_composite(frame)
        sheet.alpha_composite(tile, (x, y))
        label = short_name(source)
        if len(label) > 25:
            label = f"{label[:22]}..."
        draw.text((x, y + THUMB + 4), label, fill=(30, 30, 30, 255), font=font)
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(destination, quality=92)


def iter_pairs(sources: list[str]) -> Iterable[tuple[str, str]]:
    return zip(sources, sources[1:])


def main() -> None:
    args = parse_args()
    project_root = args.project_root.resolve()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    graph = json.loads(args.graph.read_text())
    sprites: dict[str, str] = graph["sprites"]

    records: list[dict[str, object]] = []
    missing: list[str] = []
    endpoint_exact = 0
    endpoint_total = 0

    for family in ("pose", "motion"):
        for transition, frames in graph[family].items():
            source_state, target_state = transition.split(">")
            sources = [sprites[source_state], *frames, sprites[target_state]]
            for source in sources:
                if not resolve_asset(project_root, source).is_file():
                    missing.append(source)
            if any(source in missing for source in sources):
                continue

            pair_metrics = []
            for left, right in iter_pairs(sources):
                metrics = compare(
                    resolve_asset(project_root, left),
                    resolve_asset(project_root, right),
                )
                pair_metrics.append(
                    {
                        "left": left,
                        "right": right,
                        **metrics.__dict__,
                        "risk": metrics.risk,
                    }
                )

            start = compare(
                resolve_asset(project_root, sprites[source_state]),
                resolve_asset(project_root, frames[0]),
            )
            end = compare(
                resolve_asset(project_root, frames[-1]),
                resolve_asset(project_root, sprites[target_state]),
            )
            endpoint_total += 2
            endpoint_exact += int(start.exact) + int(end.exact)
            records.append(
                {
                    "family": family,
                    "transition": transition,
                    "frame_count": len(frames),
                    "start": {**start.__dict__, "risk": start.risk},
                    "end": {**end.__dict__, "risk": end.risk},
                    "max_pair_risk": max(metric["risk"] for metric in pair_metrics),
                    "pairs": pair_metrics,
                }
            )
            render_sheet(
                f"{family}: {transition}",
                sources,
                project_root,
                output / "sheets" / family / f"{transition.replace('>', '-to-')}.jpg",
            )

    # Animation loops are checked at the wrap boundary as well as frame-to-frame.
    loops: list[dict[str, object]] = []
    for state, frames in graph["animations"].items():
        if not frames:
            continue
        sources = list(frames) + [frames[0]]
        metrics = []
        for left, right in iter_pairs(sources):
            result = compare(
                resolve_asset(project_root, left),
                resolve_asset(project_root, right),
            )
            metrics.append(
                {
                    "left": left,
                    "right": right,
                    **result.__dict__,
                    "risk": result.risk,
                }
            )
        loops.append(
            {
                "state": state,
                "frame_count": len(frames),
                "wrap": metrics[-1],
                "max_pair_risk": max(metric["risk"] for metric in metrics),
                "pairs": metrics,
            }
        )
        render_sheet(
            f"loop: {state}",
            list(frames),
            project_root,
            output / "sheets" / "loops" / f"{state}.jpg",
        )

    payload = {
        "summary": {
            "transition_count": len(records),
            "loop_count": len(loops),
            "endpoint_total": endpoint_total,
            "endpoint_exact": endpoint_exact,
            "missing_assets": sorted(set(missing)),
        },
        "transitions": records,
        "loops": loops,
    }
    (output / "audit.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    )

    ranked = sorted(
        records,
        key=lambda record: max(
            float(record["start"]["risk"]),
            float(record["end"]["risk"]),
            float(record["max_pair_risk"]),
        ),
        reverse=True,
    )
    report = [
        "# Animation continuity audit",
        "",
        f"- Transitions: {len(records)}",
        f"- Animation loops: {len(loops)}",
        f"- Exact transition endpoints: {endpoint_exact}/{endpoint_total}",
        f"- Missing assets: {len(set(missing))}",
        "",
        "## Highest-risk transitions",
        "",
        "| Transition | Start | Internal | End |",
        "|---|---:|---:|---:|",
    ]
    for record in ranked:
        report.append(
            "| {family}: `{transition}` | {start:.3f} | {internal:.3f} | {end:.3f} |".format(
                family=record["family"],
                transition=record["transition"],
                start=record["start"]["risk"],
                internal=record["max_pair_risk"],
                end=record["end"]["risk"],
            )
        )
    report.extend(
        [
            "",
            "## Animation loop wrap risk",
            "",
            "| State | Wrap | Maximum pair |",
            "|---|---:|---:|",
        ]
    )
    for loop in sorted(loops, key=lambda item: item["wrap"]["risk"], reverse=True):
        report.append(
            f"| `{loop['state']}` | {loop['wrap']['risk']:.3f} | "
            f"{loop['max_pair_risk']:.3f} |"
        )
    (output / "report.md").write_text("\n".join(report) + "\n")
    print(output / "report.md")


if __name__ == "__main__":
    main()
