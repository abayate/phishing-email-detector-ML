from __future__ import annotations

import argparse
import json
from pathlib import Path

from .ml.training import train_from_csv


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m app.training",
        description="PhishGuard model training utilities (no external CLI deps).",
    )
    sub = parser.add_subparsers(dest="command")

    p_train = sub.add_parser("train", help="Train a model from a labeled CSV")
    p_train.add_argument(
        "--csv",
        required=True,
        type=Path,
        help="Path to CSV with at least text,label columns (optionally attack_type).",
    )
    p_train.add_argument(
        "--out",
        type=Path,
        default=Path("./phishing_model"),
        help="Output model directory",
    )
    p_train.add_argument("--text-col", default="text", help="Name of the text column")
    p_train.add_argument("--label-col", default="label", help="Name of the label column")

    return parser


def main(argv: list[str] | None = None) -> int:
    import sys

    if argv is None:
        argv = sys.argv[1:]

    # Back-compat: allow `python -m app.training --csv ... --out ...`
    # by assuming `train` when the first token isn't a known subcommand.
    if argv and argv[0] not in {"train", "-h", "--help"}:
        argv = ["train"] + argv

    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command in (None, ""):
        parser.print_help()
        return 2

    if args.command == "train":
        res = train_from_csv(args.csv, args.out, text_col=args.text_col, label_col=args.label_col)
        print(json.dumps(res.get("meta", {}), indent=2))
        print("Saved model to", args.out)
        return 0

    parser.print_help()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
