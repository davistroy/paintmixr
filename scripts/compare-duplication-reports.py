#!/usr/bin/env python3
"""
Compare jscpd duplication reports to measure refactoring impact.

Usage:
    python3 scripts/compare-duplication-reports.py <baseline.json> <final.json>
"""

import json
import sys
from pathlib import Path


def load_report(filepath: str) -> dict:
    """Load a jscpd JSON report."""
    with open(filepath, 'r') as f:
        return json.load(f)


def extract_metrics(report: dict) -> dict:
    """Extract key metrics from jscpd report."""
    stats = report['statistics']

    # Get totals across all formats
    total_lines = 0
    total_tokens = 0
    total_dup_lines = 0
    total_dup_tokens = 0
    total_clones = 0

    for format_name, format_data in stats['formats'].items():
        if 'total' in format_data:
            total_data = format_data['total']
            total_lines += total_data.get('lines', 0)
            total_tokens += total_data.get('tokens', 0)
            total_dup_lines += total_data.get('duplicatedLines', 0)
            total_dup_tokens += total_data.get('duplicatedTokens', 0)
            total_clones += total_data.get('clones', 0)

    # Calculate percentages
    line_pct = (total_dup_lines / total_lines * 100) if total_lines > 0 else 0
    token_pct = (total_dup_tokens / total_tokens * 100) if total_tokens > 0 else 0

    return {
        'total_lines': total_lines,
        'total_tokens': total_tokens,
        'duplicated_lines': total_dup_lines,
        'duplicated_tokens': total_dup_tokens,
        'total_clones': total_clones,
        'line_duplication_pct': line_pct,
        'token_duplication_pct': token_pct
    }


def compare_metrics(baseline: dict, final: dict) -> None:
    """Compare baseline and final metrics and print results."""
    print("=" * 80)
    print("CODE DUPLICATION REDUCTION ANALYSIS")
    print("=" * 80)
    print()

    # Baseline metrics
    print("BASELINE METRICS:")
    print(f"  Total Lines: {baseline['total_lines']:,}")
    print(f"  Total Tokens: {baseline['total_tokens']:,}")
    print(f"  Duplicated Lines: {baseline['duplicated_lines']:,} ({baseline['line_duplication_pct']:.2f}%)")
    print(f"  Duplicated Tokens: {baseline['duplicated_tokens']:,} ({baseline['token_duplication_pct']:.2f}%)")
    print(f"  Clone Blocks: {baseline['total_clones']}")
    print()

    # Final metrics
    print("FINAL METRICS:")
    print(f"  Total Lines: {final['total_lines']:,}")
    print(f"  Total Tokens: {final['total_tokens']:,}")
    print(f"  Duplicated Lines: {final['duplicated_lines']:,} ({final['line_duplication_pct']:.2f}%)")
    print(f"  Duplicated Tokens: {final['duplicated_tokens']:,} ({final['token_duplication_pct']:.2f}%)")
    print(f"  Clone Blocks: {final['total_clones']}")
    print()

    # Calculate reductions
    line_reduction = baseline['duplicated_lines'] - final['duplicated_lines']
    token_reduction = baseline['duplicated_tokens'] - final['duplicated_tokens']
    clone_reduction = baseline['total_clones'] - final['total_clones']

    line_reduction_pct = (line_reduction / baseline['duplicated_lines'] * 100) if baseline['duplicated_lines'] > 0 else 0
    token_reduction_pct = (token_reduction / baseline['duplicated_tokens'] * 100) if baseline['duplicated_tokens'] > 0 else 0
    clone_reduction_pct = (clone_reduction / baseline['total_clones'] * 100) if baseline['total_clones'] > 0 else 0

    # Percentage point changes
    line_pct_change = baseline['line_duplication_pct'] - final['line_duplication_pct']
    token_pct_change = baseline['token_duplication_pct'] - final['token_duplication_pct']

    print("=" * 80)
    print("REDUCTION SUMMARY:")
    print(f"  Duplicated Lines: {line_reduction:,} fewer ({line_reduction_pct:+.1f}%)")
    print(f"  Duplicated Tokens: {token_reduction:,} fewer ({token_reduction_pct:+.1f}%)")
    print(f"  Clone Blocks: {clone_reduction:,} fewer ({clone_reduction_pct:+.1f}%)")
    print()
    print(f"  Line Duplication %: {baseline['line_duplication_pct']:.2f}% → {final['line_duplication_pct']:.2f}% ({line_pct_change:+.2f} pts)")
    print(f"  Token Duplication %: {baseline['token_duplication_pct']:.2f}% → {final['token_duplication_pct']:.2f}% ({token_pct_change:+.2f} pts)")
    print()

    # Success criteria check (from DUPLICATION_REDUCTION_PLAN.md)
    print("=" * 80)
    print("SUCCESS CRITERIA:")
    print()

    target_token_pct = 4.5
    target_clones = 100

    token_pct_pass = final['token_duplication_pct'] <= target_token_pct
    clones_pass = final['total_clones'] <= target_clones
    reduction_pass = token_reduction_pct >= 40

    print(f"  ✓ Token Duplication ≤ {target_token_pct}%: {'PASS' if token_pct_pass else 'FAIL'} ({final['token_duplication_pct']:.2f}%)")
    print(f"  ✓ Clone Blocks ≤ {target_clones}: {'PASS' if clones_pass else 'FAIL'} ({final['total_clones']})")
    print(f"  ✓ Reduction ≥ 40%: {'PASS' if reduction_pass else 'FAIL'} ({token_reduction_pct:.1f}%)")
    print()

    all_pass = token_pct_pass and clones_pass and reduction_pass

    if all_pass:
        print("🎉 ALL SUCCESS CRITERIA MET! 🎉")
    else:
        print("⚠️  Some criteria not met. Further refactoring needed.")

    print("=" * 80)


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 compare-duplication-reports.py <baseline.json> <final.json>")
        sys.exit(1)

    baseline_path = sys.argv[1]
    final_path = sys.argv[2]

    # Validate files exist
    if not Path(baseline_path).exists():
        print(f"Error: Baseline report not found: {baseline_path}")
        sys.exit(1)

    if not Path(final_path).exists():
        print(f"Error: Final report not found: {final_path}")
        sys.exit(1)

    # Load reports
    baseline_report = load_report(baseline_path)
    final_report = load_report(final_path)

    # Extract metrics
    baseline_metrics = extract_metrics(baseline_report)
    final_metrics = extract_metrics(final_report)

    # Compare and print
    compare_metrics(baseline_metrics, final_metrics)


if __name__ == '__main__':
    main()
