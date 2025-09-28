# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Specify-based project** using a structured approach to feature development. The project follows a phase-based development methodology with clear workflows for specification, planning, and implementation.

## Development Workflow Commands

### Core Slash Commands
Available commands through Claude's SlashCommand tool:

- `/specify [description]` - Create feature specification from natural language
- `/clarify` - Identify underspecified areas and ask clarification questions
- `/plan` - Generate implementation plan with architecture and contracts
- `/tasks` - Create actionable task list from design artifacts
- `/implement` - Execute implementation following generated tasks
- `/analyze` - Analyze consistency across spec, plan, and tasks
- `/constitution` - Create/update project constitution

### Development Scripts
Key scripts in `.specify/scripts/bash/`:

- `create-new-feature.sh` - Initialize new feature branch and structure
- `setup-plan.sh` - Prepare planning environment
- `check-prerequisites.sh` - Validate required documents exist
- `update-agent-context.sh` - Update agent-specific guidance files

## Project Structure

### Documentation Architecture
```
specs/[###-feature]/
├── spec.md          # Feature specification (from /specify)
├── plan.md          # Implementation plan (from /plan)
├── research.md      # Technical research (from /plan)
├── data-model.md    # Entity definitions (from /plan)
├── quickstart.md    # Integration scenarios (from /plan)
├── contracts/       # API specifications (from /plan)
└── tasks.md         # Actionable task list (from /tasks)
```

### Constitutional Framework
- Constitution file: `.specify/memory/constitution.md`
- Contains project principles and constraints
- Must be checked during planning phase
- Violations require explicit justification

### Templates System
Located in `.specify/templates/`:
- `spec-template.md` - Feature specification structure
- `plan-template.md` - Implementation planning template
- `tasks-template.md` - Task generation template
- `agent-file-template.md` - Agent context template

## Feature Development Process

### 1. Specification Phase
- Use `/specify [description]` to create initial spec
- Creates new feature branch (###-feature-name format)
- Generates `spec.md` with user scenarios and requirements

### 2. Clarification Phase
- Use `/clarify` if spec contains ambiguities
- Resolves unclear requirements before planning
- Updates spec with clarification sessions

### 3. Planning Phase
- Use `/plan` to generate implementation design
- Creates research.md, data-model.md, contracts/, quickstart.md
- Updates agent context file (CLAUDE.md)
- Validates against constitutional principles

### 4. Task Generation
- Use `/tasks` to create executable task list
- Generates dependency-ordered tasks
- Marks parallel tasks with [P] indicator
- Follows TDD approach (tests before implementation)

### 5. Implementation
- Use `/implement` to execute tasks systematically
- Follows phase-based execution (Setup → Tests → Core → Integration → Polish)
- Respects task dependencies and parallel execution rules

## Key Conventions

### Branch Naming
- Feature branches: `###-feature-name` (e.g., `001-user-auth`)
- Enforced by scripts when Git is available

### File Organization
- All feature docs in `specs/[branch-name]/`
- Source code structure determined during planning phase
- Agent context files updated incrementally

### Task Execution Rules
- Tests written before implementation (TDD)
- Parallel tasks [P] can run simultaneously
- Sequential tasks must complete in order
- Phase completion required before proceeding

### Error Handling
- Constitutional violations must be justified or resolved
- Missing prerequisites halt workflow
- All ambiguities must be clarified before implementation

## Agent Context Management

The `update-agent-context.sh` script maintains this CLAUDE.md file by:
- Adding new technology decisions from current plans
- Preserving manual additions between markers
- Keeping recent changes (last 3 features)
- Maintaining token efficiency (<150 lines)

This ensures future Claude instances have current project context without manual maintenance.
