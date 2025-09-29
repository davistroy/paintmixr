#!/usr/bin/env python3
"""
Script to fix TypeScript syntax errors in test files by converting
multi-line comment blocks to line comments to avoid parsing issues.
"""
import re
import os

def fix_multiline_comments(content):
    """Convert multi-line comment blocks to line comments"""

    # Find all /* ... */ comment blocks
    def replace_block(match):
        comment_content = match.group(1)
        lines = comment_content.split('\n')

        # Convert each line to a line comment
        fixed_lines = []
        for line in lines:
            if line.strip():
                # Add // prefix, preserving existing indentation
                stripped = line.lstrip()
                if stripped:
                    indent = line[:len(line) - len(stripped)]
                    fixed_lines.append(f"{indent}// {stripped}")
                else:
                    fixed_lines.append(line)
            else:
                fixed_lines.append(line)

        # Add a header comment for disabled sections
        if fixed_lines:
            first_line = fixed_lines[0]
            indent = first_line[:len(first_line) - len(first_line.lstrip())]
            fixed_lines.insert(0, f"{indent}// DISABLED: Implementation pending")

        return '\n'.join(fixed_lines)

    # Pattern to match /* ... */ blocks, handling nested content
    # This is more robust than simple regex for nested structures
    result = ""
    i = 0
    while i < len(content):
        if i < len(content) - 1 and content[i:i+2] == '/*':
            # Found start of comment block
            j = i + 2
            depth = 1
            while j < len(content) - 1 and depth > 0:
                if content[j:j+2] == '/*':
                    depth += 1
                    j += 2
                elif content[j:j+2] == '*/':
                    depth -= 1
                    j += 2
                else:
                    j += 1

            if depth == 0:
                # Found complete comment block
                comment_content = content[i+2:j-2]
                fixed_comment = replace_block(type('Match', (), {'group': lambda self, n: comment_content})())
                result += fixed_comment
                i = j
            else:
                # Unclosed comment block
                result += content[i]
                i += 1
        else:
            result += content[i]
            i += 1

    return result

def fix_file(filepath):
    """Fix syntax errors in a single file"""
    print(f"Fixing {filepath}...")

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Skip the file header comment block (first /** ... */)
        header_match = re.match(r'^(/\*\*.*?\*/)', content, re.DOTALL)
        if header_match:
            header = header_match.group(1)
            rest_content = content[len(header):]
            fixed_content = header + fix_multiline_comments(rest_content)
        else:
            fixed_content = fix_multiline_comments(content)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fixed_content)

        print(f"Fixed {filepath}")
        return True

    except Exception as e:
        print(f"Error fixing {filepath}: {e}")
        return False

def main():
    """Main function to fix all test files"""
    files_to_fix = [
        'cypress/e2e/authentication.cy.ts',
        'cypress/e2e/user-journey.cy.ts',
        'tests/accessibility/wcag.test.ts'
    ]

    success_count = 0
    for filepath in files_to_fix:
        if os.path.exists(filepath):
            if fix_file(filepath):
                success_count += 1
        else:
            print(f"File not found: {filepath}")

    print(f"\nFixed {success_count}/{len(files_to_fix)} files")

if __name__ == '__main__':
    main()